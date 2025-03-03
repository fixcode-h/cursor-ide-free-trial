const readline = require('readline');
const logger = require('./logger');
const { exec, spawn } = require('child_process');
const os = require('os');
const path = require('path');

class ConsoleHelper {
    constructor() {
        // 创建 readline 接口
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true // 确保在 Windows 上正确处理终端输入
        });

        // 处理 SIGINT (Ctrl+C)
        process.on('SIGINT', () => {
            this.close();
            process.exit(0);
        });
    }

    /**
     * 以管理员权限执行 PowerShell 脚本并捕获输出
     * @param {string} scriptPath - PowerShell 脚本的完整路径
     * @param {Object} options - 可选配置项
     * @param {boolean} options.noProfile - 是否使用 -NoProfile 参数，默认 true
     * @param {boolean} options.nonInteractive - 是否使用 -NonInteractive 参数，默认 true
     * @param {string[]} options.additionalArgs - 额外的命令行参数
     * @returns {Promise<boolean>} - 执行成功返回 true，失败返回 false
     */
    async executePowerShellScript(scriptPath, options = {}) {
        const {
            noProfile = true,
            nonInteractive = true,
            additionalArgs = []
        } = options;

        try {
            logger.info(`正在执行脚本: ${path.basename(scriptPath)}`);
            
            return new Promise((resolve, reject) => {
                // 构建 PowerShell 命令
                const psCommand = `
                    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
                    $processInfo.FileName = "powershell.exe"
                    $processInfo.Arguments = "${noProfile ? '-NoProfile' : ''} ${nonInteractive ? '-NonInteractive' : ''} -ExecutionPolicy Bypass -File \`"${scriptPath.replace(/\\/g, '\\\\')}\`" ${additionalArgs.join(' ')}"
                    $processInfo.Verb = "RunAs"
                    $processInfo.UseShellExecute = $false
                    $processInfo.RedirectStandardOutput = $true
                    $processInfo.RedirectStandardError = $true
                    $processInfo.CreateNoWindow = $true
                    
                    $process = [System.Diagnostics.Process]::Start($processInfo)
                    $stdout = $process.StandardOutput.ReadToEnd()
                    $stderr = $process.StandardError.ReadToEnd()
                    $process.WaitForExit()
                    
                    Write-Output "===OUTPUT_START==="
                    Write-Output $stdout
                    Write-Output "===OUTPUT_END==="
                    Write-Output "===ERROR_START==="
                    Write-Output $stderr
                    Write-Output "===ERROR_END==="
                    Write-Output "===EXIT_CODE==="
                    Write-Output $process.ExitCode
                    exit $process.ExitCode
                `;

                // 启动 PowerShell 进程
                const ps = spawn('powershell.exe', ['-Command', psCommand], {
                    stdio: ['ignore', 'pipe', 'pipe']
                });

                let stdoutData = '';
                let stderrData = '';

                // 收集标准输出
                ps.stdout.on('data', (data) => {
                    const text = data.toString();
                    stdoutData += text;
                    
                    // 处理输出
                    text.split('\n').forEach(line => {
                        line = line.trim();
                        // 过滤掉不需要的输出
                        if (line && 
                            !line.includes('===') && 
                            !line.match(/^\d+$/) &&
                            !line.includes('.ToString("x")') &&
                            !line.includes('at System.Management.Automation') &&
                            !line.includes('at Microsoft.PowerShell')) {
                            
                            // 移除 ANSI 转义序列
                            line = line.replace(/\x1b\[[0-9;]*[mGKH]/g, '');
                            
                            // 如果经过过滤后还有内容，则输出
                            if (line.trim()) {
                                logger.info(line);
                            }
                        }
                    });
                });

                // 收集标准错误
                ps.stderr.on('data', (data) => {
                    const text = data.toString();
                    stderrData += text;
                    
                    // 处理错误输出
                    text.split('\n').forEach(line => {
                        line = line.trim();
                        // 过滤掉不需要的错误输出
                        if (line && 
                            !line.includes('===') && 
                            !line.includes('at System.Management.Automation') &&
                            !line.includes('at Microsoft.PowerShell')) {
                            
                            // 移除 ANSI 转义序列
                            line = line.replace(/\x1b\[[0-9;]*[mGKH]/g, '');
                            
                            // 如果经过过滤后还有内容，则输出
                            if (line.trim()) {
                                logger.error(line);
                            }
                        }
                    });
                });

                // 监听进程结束
                ps.on('close', async (code) => {
                    // 解析退出码
                    const exitCodeMatch = stdoutData.match(/===EXIT_CODE===\r?\n(\d+)/);
                    const actualExitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : code;

                    if (actualExitCode === 0) {
                        resolve(true);
                    } else {
                        logger.error(`脚本执行失败，退出码: ${actualExitCode}`);
                        resolve(false);
                    }
                });

                // 监听错误
                ps.on('error', (err) => {
                    logger.error('启动 PowerShell 进程失败:', err);
                    reject(err);
                });
            });
            
        } catch (error) {
            logger.error('执行 PowerShell 脚本失败:', error);
            return false;
        }
    }

    // 检查是否具有管理员权限
    async checkAdminPrivilege() {
        return new Promise((resolve) => {
            const platform = os.platform();

            // Windows 系统
            if (platform === 'win32') {
                const command = 'powershell.exe -NoProfile -Command "&{([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)}"';
                
                exec(command, (error, stdout) => {
                    if (error) {
                        logger.error('检查 Windows 管理员权限时出错:', error);
                        resolve(false);
                        return;
                    }
                    resolve(stdout.trim() === 'True');
                });
                return;
            }

            // Linux 和 macOS 系统
            if (platform === 'linux' || platform === 'darwin') {
                // 首先尝试使用 id 命令
                exec('id -u', (error, stdout) => {
                    if (error) {
                        // 如果 id 命令失败，尝试使用 whoami
                        exec('whoami', (err, out) => {
                            if (err) {
                                logger.error('检查 Unix 管理员权限时出错:', err);
                                resolve(false);
                                return;
                            }
                            resolve(out.trim() === 'root');
                        });
                        return;
                    }
                    // id -u 返回 0 表示 root 权限
                    resolve(stdout.trim() === '0');
                });
                return;
            }

            // 不支持的操作系统
            logger.warn(`不支持的操作系统: ${platform}`);
            resolve(false);
        });
    }

    // 等待用户按回车的函数
    async waitForEnter(message = '请按回车继续...') {
        // 清空输入缓冲区
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        return new Promise((resolve) => {
            // 先输出消息
            console.log(message);
            
            // 使用事件监听器而不是 question
            const onData = (data) => {
                // 检查是否是回车键
                if (data.toString().trim() === '') {
                    // 移除监听器
                    process.stdin.removeListener('data', onData);
                    process.stdin.pause();
                    resolve();
                }
            };

            // 添加数据监听器
            process.stdin.on('data', onData);
        });
    }

    // 获取用户输入
    async getUserInput(prompt) {
        // 确保输入流处于原始模式，以支持粘贴操作
        process.stdin.setRawMode(false);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        return new Promise((resolve) => {
            this.rl.question(prompt, (answer) => {
                resolve(answer.trim());
            });
        });
    }

    // 关闭 readline 接口
    close() {
        if (this.rl) {
            this.rl.close();
            process.stdin.removeAllListeners('data');
            process.stdin.pause();
        }
    }
}

module.exports = new ConsoleHelper(); 