const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const net = require('net');

// 设置应用根目录和资源目录
global.appRoot = process.env.NODE_ENV === 'development'
    ? path.join(__dirname, '../..')
    : path.dirname(app.getPath('exe'));

// 设置资源目录
global.resourcePath = process.env.NODE_ENV === 'development'
    ? global.appRoot
    : process.resourcesPath;

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
    
    return port;
}

// 启动服务器
async function startServer() {
    const maxRetries = 5;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const port = await getAvailablePort();
            
            // 调试环境变量
            const nodeEnv = (process.env.NODE_ENV || '').trim();
            console.log('NODE_ENV value:', nodeEnv);
            console.log('NODE_ENV length:', nodeEnv.length);
            console.log('Is development?', nodeEnv === 'development');
            
            // 根据平台选择服务器目录
            const serverDir = nodeEnv === 'development'
                ? path.join(global.appRoot, `server`)
                : path.join(process.resourcesPath, `server`);
            
            // 保存当前工作目录
            const originalCwd = process.cwd();
            // 切换到服务器目录
            process.chdir(serverDir);
            
            console.log('Current working directory:', process.cwd());
            
            // 根据平台选择 Node.js 可执行文件路径
            const nodePath = process.platform === 'win32'
                ? path.join(serverDir, 'node', 'node.exe')
                : path.join(serverDir, 'node', 'node');

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

                console.log('Server directory:', serverDir);
                console.log('Node path:', nodePath);
                console.log('Platform:', process.platform);
                console.log('Environment APP_ROOT:', env.APP_ROOT);
                console.log('Environment RES_PATH:', env.RES_PATH);

                // 使用 spawn 启动 Node.js 进程
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
                        console.log(data.toString());
                    });
                }
                if (serverProcess.stderr) {
                    serverProcess.stderr.on('data', (data) => {
                        console.error(data.toString());
                    });
                }

                // 等待服务器启动
                const timeout = setTimeout(() => {
                    // 恢复原始工作目录
                    process.chdir(originalCwd);
                    reject(new Error('Server startup timeout'));
                }, 10000);

                // 监听服务器消息
                serverProcess.once('message', (message) => {
                    clearTimeout(timeout);
                    if (message.status === 'ready') {
                        resolve(port);
                    } else {
                        // 恢复原始工作目录
                        process.chdir(originalCwd);
                        reject(new Error('Server failed to start'));
                    }
                });

                // 监听错误
                serverProcess.once('error', (err) => {
                    clearTimeout(timeout);
                    // 恢复原始工作目录
                    process.chdir(originalCwd);
                    reject(err);
                });

                // 监听退出
                serverProcess.once('exit', (code) => {
                    // 恢复原始工作目录
                    process.chdir(originalCwd);
                    if (code !== 0) {
                        reject(new Error(`Server exited with code ${code}`));
                    }
                });
            });
        } catch (error) {
            console.error(`Retry ${retryCount + 1}/${maxRetries}:`, error);
            retryCount++;
            if (retryCount >= maxRetries) {
                throw new Error('Failed to start server after maximum retries');
            }
        }
    }
}

function createSplashWindow() {
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
    splashWindow.loadFile(path.join(global.resourcePath, 'public', 'splash.html'));
}

async function createWindow() {
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

    // 在开发环境下打开开发者工具
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    try {
        // 启动服务器并获取端口
        const port = await startServer();
        if (!port) {
            throw new Error('Server port not available');
        }
        
        // 等待页面加载完成
        await mainWindow.loadURL(`http://localhost:${port}`);
        console.log('URL加载完成');
        
        // URL加载完成后，关闭启动页面并显示主窗口
        if (splashWindow) {
            splashWindow.close();
            splashWindow = null;
        }
        mainWindow.show();
    } catch (error) {
        console.error('Failed to load URL:', error);
        throw error;
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    return mainWindow;
}

// 确保应用准备就绪后按顺序创建窗口
app.whenReady().then(async () => {
    try {
        // 1. 创建并显示启动页面
        createSplashWindow();

        // 2. 创建主窗口
        await createWindow();

        // 3. 设置IPC通信
        setupIPC();
    } catch (error) {
        console.error('Failed to initialize:', error);
        if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
            splashWindow = null;
        }
        app.quit();
    }
});

// 清理资源
app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// 设置IPC通信
function setupIPC() {
    // 处理文件选择对话框
    ipcMain.handle('select-file', async (event, options) => {
        try {
            const result = await dialog.showOpenDialog({
                properties: ['openFile'],
                filters: options.filters,
                title: options.title
            });

            return {
                success: !result.canceled && result.filePaths.length > 0,
                data: result.filePaths[0] || null,
                error: result.canceled ? '未选择文件' : null
            };
        } catch (error) {
            console.error('File selection error:', error);
            return {
                success: false,
                data: null,
                error: error.message
            };
        }
    });
} 