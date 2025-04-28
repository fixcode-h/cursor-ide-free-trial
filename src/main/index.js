const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const net = require('net');
const fs = require('fs').promises;

/**
 * 日志输出函数
 * @param {string} message - 日志消息
 * @param {string} level - 日志级别
 */
function logMessage(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logMsg);
    
    try {
        // 在程序所在目录创建logs文件夹
        const exeDir = path.dirname(app.getPath('exe'));
        const logDir = path.join(exeDir, 'logs');
        if (!require('fs').existsSync(logDir)) {
            require('fs').mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
        require('fs').appendFileSync(logFile, logMsg + '\n');
    } catch (err) {
        console.error('写入日志文件失败:', err);
    }
}

// 设置应用根目录和资源目录
global.appRoot = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../..')
    : path.dirname(app.getPath('exe'));

// 设置资源目录
global.resourcePath = process.env.NODE_ENV === 'development'
    ? global.appRoot
    : process.resourcesPath;

logMessage(`应用启动 - 应用根目录: ${global.appRoot}`, 'info');
logMessage(`应用启动 - 资源目录: ${global.resourcePath}`, 'info');
logMessage(`应用启动 - 当前工作目录: ${process.cwd()}`, 'info');
logMessage(`应用启动 - NODE_ENV: ${process.env.NODE_ENV || '未定义'}`, 'info');

let mainWindow = null;
let splashWindow = null;
let serverProcess = null;

// 获取随机端口号
function getRandomPort() {
    return Math.floor(Math.random() * (65535 - 10000) + 10000);
}

// 检查端口是否可用
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => {
            resolve(false);
        });
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        server.listen(port);
    });
}

// 获取可用的随机端口
async function getAvailablePort() {
    let port;
    let isAvailable = false;
    
    while (!isAvailable) {
        port = getRandomPort();
        isAvailable = await isPortAvailable(port);
    }
    
    logMessage(`获取到可用端口: ${port}`, 'info');
    return port;
}

// 启动服务器
async function startServer() {
    const maxRetries = 5;
    let retryCount = 0;

    logMessage('开始启动服务器进程', 'info');

    while (retryCount < maxRetries) {
        try {
            const port = await getAvailablePort();
            
            // 调试环境变量
            const nodeEnv = (process.env.NODE_ENV || '').trim();
            logMessage(`NODE_ENV value: ${nodeEnv}`, 'debug');
            logMessage(`NODE_ENV length: ${nodeEnv.length}`, 'debug');
            logMessage(`Is development?: ${nodeEnv === 'development'}`, 'debug');
            
            // 根据平台选择服务器目录
            const serverDir = nodeEnv === 'development'
                ? path.join(global.appRoot, `server`)
                : path.join(process.resourcesPath, `server`);
            
            logMessage(`服务器目录: ${serverDir}`, 'info');
            
            // 检查服务器目录是否存在
            try {
                await fs.access(serverDir);
                logMessage(`服务器目录存在: ${serverDir}`, 'info');
            } catch (err) {
                logMessage(`服务器目录不存在: ${serverDir}`, 'error');
                throw new Error(`服务器目录不存在: ${serverDir}`);
            }
            
            // 保存当前工作目录
            const originalCwd = process.cwd();
            // 切换到服务器目录
            process.chdir(serverDir);
            
            logMessage(`切换到服务器目录后的当前工作目录: ${process.cwd()}`, 'info');
            
            // 根据平台选择 Node.js 可执行文件路径
            const nodePath = process.platform === 'win32'
                ? path.join(serverDir, 'node', 'node.exe')
                : path.join(serverDir, 'node', 'node');

            // 检查node可执行文件是否存在
            try {
                await fs.access(nodePath);
                logMessage(`Node.js 可执行文件存在: ${nodePath}`, 'info');
            } catch (err) {
                logMessage(`Node.js 可执行文件不存在: ${nodePath}`, 'error');
                throw new Error(`Node.js 可执行文件不存在: ${nodePath}`);
            }

            return new Promise((resolve, reject) => {
                // 设置环境变量
                const env = {
                    ...process.env,
                    PORT: port.toString(),
                    NODE_ENV: nodeEnv,  // 使用处理过的 nodeEnv
                    APP_ROOT: global.appRoot, // 使用 global.appRoot 而不是 process.env.APP_ROOT
                    RES_PATH: process.resourcesPath,
                };
                
                // 如果是生产环境，添加 resourcesPath
                if (nodeEnv !== 'development') {
                    env.RESOURCES_PATH = process.resourcesPath;
                }

                logMessage(`服务器环境: PORT=${env.PORT}, NODE_ENV=${env.NODE_ENV}`, 'info');
                logMessage(`服务器环境: APP_ROOT=${env.APP_ROOT}, RES_PATH=${env.RES_PATH}`, 'info');

                // 检查server.js文件是否存在
                const serverJsPath = path.join(process.cwd(), 'server.js');
                try {
                    if (require('fs').existsSync(serverJsPath)) {
                        logMessage(`Server.js 文件存在: ${serverJsPath}`, 'info');
                    } else {
                        logMessage(`Server.js 文件不存在: ${serverJsPath}`, 'error');
                    }
                } catch (err) {
                    logMessage(`检查 server.js 文件时出错: ${err.message}`, 'error');
                }

                // 使用 spawn 启动 Node.js 进程
                logMessage(`启动服务器进程: ${nodePath} server.js ${port.toString()}`, 'info');
                serverProcess = require('child_process').spawn(
                    nodePath,
                    ['server.js', port.toString()],  // 使用相对路径，因为已经切换到server目录
                    {
                        env,
                        stdio: ['inherit', 'pipe', 'pipe', 'ipc'],  // 修改为pipe以便我们可以处理输出
                        cwd: process.cwd(), // 使用当前工作目录（server目录）
                        windowsHide: true
                    }
                );
                
                logMessage(`服务器进程已启动，PID: ${serverProcess.pid}`, 'info');
                
                // 设置输出编码
                if (serverProcess.stdout) {
                    serverProcess.stdout.setEncoding('utf8');
                }
                if (serverProcess.stderr) {
                    serverProcess.stderr.setEncoding('utf8');
                }

                // 转发输出到主进程
                if (serverProcess.stdout) {
                    serverProcess.stdout.on('data', (data) => {
                        logMessage(`服务器标准输出: ${data.toString().trim()}`, 'server');
                    });
                }
                if (serverProcess.stderr) {
                    serverProcess.stderr.on('data', (data) => {
                        logMessage(`服务器错误输出: ${data.toString().trim()}`, 'error');
                    });
                }

                // 等待服务器启动
                const timeout = setTimeout(() => {
                    // 恢复原始工作目录
                    process.chdir(originalCwd);
                    logMessage('服务器启动超时', 'error');
                    reject(new Error('Server startup timeout'));
                }, 10000);

                // 监听服务器消息
                serverProcess.once('message', (message) => {
                    clearTimeout(timeout);
                    if (message.status === 'ready') {
                        logMessage(`服务器准备就绪，端口: ${port}`, 'info');
                        resolve(port);
                    } else {
                        // 恢复原始工作目录
                        process.chdir(originalCwd);
                        logMessage(`服务器启动失败: ${JSON.stringify(message)}`, 'error');
                        reject(new Error('Server failed to start'));
                    }
                });

                // 监听错误
                serverProcess.once('error', (err) => {
                    clearTimeout(timeout);
                    // 恢复原始工作目录
                    process.chdir(originalCwd);
                    logMessage(`服务器进程错误: ${err.message}`, 'error');
                    reject(err);
                });

                // 监听退出
                serverProcess.once('exit', (code) => {
                    // 恢复原始工作目录
                    process.chdir(originalCwd);
                    if (code !== 0) {
                        logMessage(`服务器进程异常退出，退出码: ${code}`, 'error');
                        reject(new Error(`Server exited with code ${code}`));
                    } else {
                        logMessage('服务器进程正常退出', 'info');
                    }
                });
            });
        } catch (error) {
            logMessage(`服务器启动重试 ${retryCount + 1}/${maxRetries}: ${error.message}`, 'error');
            retryCount++;
            if (retryCount >= maxRetries) {
                logMessage('服务器启动失败，达到最大重试次数', 'error');
                throw new Error('Failed to start server after maximum retries');
            }
        }
    }
}

function createSplashWindow() {
    logMessage('创建启动画面窗口', 'info');
    
    try {
        splashWindow = new BrowserWindow({
            width: 400,
            height: 500,
            frame: false,
            transparent: true,
            alwaysOnTop: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // 修改为从资源目录加载 splash.html
        const splashPath = path.join(global.resourcePath, 'public', 'splash.html');
        logMessage(`加载启动画面: ${splashPath}`, 'info');
        
        // 检查文件是否存在
        if (require('fs').existsSync(splashPath)) {
            logMessage(`启动画面文件存在: ${splashPath}`, 'info');
        } else {
            logMessage(`启动画面文件不存在: ${splashPath}`, 'error');
        }
        
        splashWindow.loadFile(splashPath);
        
        // 监听加载失败
        splashWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            logMessage(`启动画面加载失败: ${errorDescription} (${errorCode})`, 'error');
        });
        
        // 监听加载完成
        splashWindow.webContents.on('did-finish-load', () => {
            logMessage('启动画面加载完成', 'info');
        });
        
        // 捕获渲染进程的未处理异常
        splashWindow.webContents.on('render-process-gone', (event, details) => {
            logMessage(`启动画面渲染进程崩溃: ${details.reason}`, 'error');
        });
    } catch (error) {
        logMessage(`创建启动画面窗口失败: ${error.message}`, 'error');
        throw error;
    }
}

async function createWindow() {
    logMessage('开始创建主窗口', 'info');
    
    try {
        // 创建浏览器窗口
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            show: false,  // 初始时不显示主窗口
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, 'preload.js')
            }
        });

        // 隐藏菜单栏
        mainWindow.setMenuBarVisibility(false);
        logMessage('主窗口创建成功', 'info');

        // 在开发环境下打开开发者工具
        if (process.env.NODE_ENV === 'development') {
            mainWindow.webContents.openDevTools();
            logMessage('已打开开发者工具', 'debug');
        }

        try {
            // 启动服务器并获取端口
            logMessage('准备启动后端服务器', 'info');
            const port = await startServer();
            if (!port) {
                throw new Error('Server port not available');
            }
            
            const url = `http://localhost:${port}`;
            logMessage(`加载主窗口URL: ${url}`, 'info');
            
            // 等待页面加载完成
            mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
                logMessage(`主窗口加载失败: ${errorDescription} (${errorCode})`, 'error');
            });
            
            mainWindow.webContents.on('did-finish-load', () => {
                logMessage('主窗口加载完成', 'info');
            });
            
            mainWindow.webContents.on('render-process-gone', (event, details) => {
                logMessage(`主窗口渲染进程崩溃: ${details.reason}`, 'error');
            });
            
            await mainWindow.loadURL(url);
            logMessage('URL加载完成', 'info');
            
            // URL加载完成后，关闭启动页面并显示主窗口
            if (splashWindow && !splashWindow.isDestroyed()) {
                logMessage('关闭启动画面窗口', 'info');
                splashWindow.close();
                splashWindow = null;
            }
            
            logMessage('显示主窗口', 'info');
            mainWindow.show();
        } catch (error) {
            logMessage(`加载URL失败: ${error.message}`, 'error');
            throw error;
        }

        mainWindow.on('closed', () => {
            logMessage('主窗口已关闭', 'info');
            mainWindow = null;
        });

        return mainWindow;
    } catch (error) {
        logMessage(`创建主窗口失败: ${error.message}`, 'error');
        throw error;
    }
}

// 确保应用准备就绪后按顺序创建窗口
app.whenReady().then(async () => {
    logMessage('Electron应用准备就绪', 'info');
    try {
        // 1. 创建并显示启动页面
        createSplashWindow();

        // 2. 创建主窗口
        await createWindow();

        // 3. 设置IPC通信
        setupIPC();
        logMessage('应用初始化完成', 'info');
    } catch (error) {
        logMessage(`应用初始化失败: ${error.message}`, 'error');
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
            splashWindow = null;
        }
        app.quit();
    }
});

// 清理资源
app.on('window-all-closed', () => {
    logMessage('所有窗口已关闭', 'info');
    if (serverProcess) {
        logMessage('终止服务器进程', 'info');
        serverProcess.kill();
        serverProcess = null;
    }
    if (process.platform !== 'darwin') {
        logMessage('应用退出', 'info');
        app.quit();
    }
});

app.on('activate', () => {
    logMessage('应用被激活', 'info');
    if (mainWindow === null) {
        createWindow();
    }
});

// 设置IPC通信
function setupIPC() {
    logMessage('设置IPC通信', 'info');
    
    // 显示文件选择对话框
    ipcMain.handle('showOpenDialog', async (event, options) => {
        logMessage('显示打开文件对话框', 'debug');
        return dialog.showOpenDialog(mainWindow, options);
    });

    // 显示文件保存对话框
    ipcMain.handle('showSaveDialog', async (event, options) => {
        logMessage('显示保存文件对话框', 'debug');
        return dialog.showSaveDialog(mainWindow, options);
    });

    // 读取文件内容
    ipcMain.handle('readFile', async (event, filePath) => {
        try {
            logMessage(`读取文件: ${filePath}`, 'debug');
            const content = await fs.readFile(filePath, 'utf8');
            return content;
        } catch (error) {
            logMessage(`读取文件失败: ${error.message}`, 'error');
            throw error;
        }
    });

    // 写入文件内容
    ipcMain.handle('writeFile', async (event, filePath, content) => {
        try {
            logMessage(`写入文件: ${filePath}`, 'debug');
            await fs.writeFile(filePath, content, 'utf8');
            return true;
        } catch (error) {
            logMessage(`写入文件失败: ${error.message}`, 'error');
            throw error;
        }
    });
} 