const express = require('express');
const path = require('path');
const logger = require('./utils/logger');
const { initWebSocket } = require('./utils/websocket');
const fs = require('fs');

// 添加直接日志记录函数，输出到程序所在目录
function writeDirectLog(message) {
    try {
        const timestamp = new Date().toISOString();
        const logMsg = `[${timestamp}] ${message}\n`;
        
        // 尝试获取资源路径
        let logDir;
        if (process.env.RES_PATH) {
            // 使用资源路径的上级目录 (exe所在目录)
            const exeDir = path.dirname(path.dirname(process.env.RES_PATH));
            logDir = path.join(exeDir, 'logs');
        } else {
            // 如果没有资源路径，使用当前目录
            logDir = path.join(process.cwd(), 'logs');
        }
        
        // 确保日志目录存在
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, `server-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, logMsg);
    } catch (err) {
        console.error('写入直接日志失败:', err);
    }
}

const appServer = express();
let serverPort = null;
let serverReady = false;

/**
 * 检查路径是否存在
 * @param {string} pathToCheck - 要检查的路径
 * @returns {boolean} - 路径是否存在
 */
function checkPathExists(pathToCheck) {
    try {
        if (fs.existsSync(pathToCheck)) {
            logger.info(`路径存在: ${pathToCheck}`);
            writeDirectLog(`路径存在: ${pathToCheck}`);
            return true;
        } else {
            logger.error(`路径不存在: ${pathToCheck}`);
            writeDirectLog(`路径不存在: ${pathToCheck}`);
            return false;
        }
    } catch (err) {
        logger.error(`检查路径出错: ${pathToCheck}`, err);
        writeDirectLog(`检查路径出错: ${pathToCheck} - ${err.message}`);
        return false;
    }
}

/**
 * 列出目录内容
 * @param {string} dirPath - 要列出内容的目录路径
 */
function listDirectory(dirPath) {
    try {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            logger.info(`目录 ${dirPath} 内容: ${files.join(', ')}`);
            writeDirectLog(`目录 ${dirPath} 内容: ${files.join(', ')}`);
        } else {
            logger.error(`无法列出目录内容，目录不存在: ${dirPath}`);
            writeDirectLog(`无法列出目录内容，目录不存在: ${dirPath}`);
        }
    } catch (err) {
        logger.error(`列出目录内容出错: ${dirPath}`, err);
        writeDirectLog(`列出目录内容出错: ${dirPath} - ${err.message}`);
    }
}

async function startServer(port) {
    // 设置端口
    serverPort = port;
    
    logger.info('====================== 服务器启动 ======================');
    logger.info(`启动时间: ${new Date().toISOString()}`);
    logger.info(`进程ID: ${process.pid}`);
    logger.info(`Node.js版本: ${process.version}`);
    logger.info(`平台: ${process.platform}`);
    logger.info(`当前工作目录: ${process.cwd()}`);
    logger.info(`服务器目录: ${__dirname}`);
    logger.info(`NODE_ENV: ${process.env.NODE_ENV || '未定义'}`);
    logger.info(`APP_ROOT: ${process.env.APP_ROOT || '未定义'}`);
    logger.info(`RES_PATH: ${process.env.RES_PATH || '未定义'}`);
    logger.info('=====================================================');
    
    // 写入直接日志
    writeDirectLog('====================== 服务器启动 ======================');
    writeDirectLog(`启动时间: ${new Date().toISOString()}`);
    writeDirectLog(`进程ID: ${process.pid}`);
    writeDirectLog(`Node.js版本: ${process.version}`);
    writeDirectLog(`平台: ${process.platform}`);
    writeDirectLog(`当前工作目录: ${process.cwd()}`);
    writeDirectLog(`服务器目录: ${__dirname}`);
    writeDirectLog(`NODE_ENV: ${process.env.NODE_ENV || '未定义'}`);
    writeDirectLog(`APP_ROOT: ${process.env.APP_ROOT || '未定义'}`);
    writeDirectLog(`RES_PATH: ${process.env.RES_PATH || '未定义'}`);
    writeDirectLog('=====================================================');

    // 获取资源路径 - 根据环境变量调整
    const resourcePath = process.env.NODE_ENV === 'development'
        ? process.env.APP_ROOT  // 开发环境：使用 APP_ROOT
        : process.env.RES_PATH; // 生产环境：使用传入的 resourcesPath

    logger.info(`使用资源路径: ${resourcePath}`);
    writeDirectLog(`使用资源路径: ${resourcePath}`);
    
    // 检查关键路径
    logger.info('检查关键路径:');
    writeDirectLog('检查关键路径:');
    checkPathExists(resourcePath);
    
    const publicPath = path.join(resourcePath, 'public');
    logger.info(`检查公共资源目录: ${publicPath}`);
    writeDirectLog(`检查公共资源目录: ${publicPath}`);
    checkPathExists(publicPath);
    
    const viewsPath = path.join(resourcePath, 'views');
    logger.info(`检查视图目录: ${viewsPath}`);
    writeDirectLog(`检查视图目录: ${viewsPath}`);
    if (checkPathExists(viewsPath)) {
        listDirectory(viewsPath);
    }

    // 中间件设置
    appServer.use(express.json());
    appServer.use(express.urlencoded({ extended: true }));
    
    // 设置静态文件目录
    logger.info(`设置静态文件目录: ${publicPath}`);
    writeDirectLog(`设置静态文件目录: ${publicPath}`);
    appServer.use(express.static(publicPath));
    
    // 视图引擎设置
    logger.info(`设置视图目录: ${viewsPath}`);
    writeDirectLog(`设置视图目录: ${viewsPath}`);
    appServer.set('views', viewsPath);
    appServer.set('view engine', 'ejs');
    
    // 添加更多关于视图引擎的调试
    logger.info(`视图引擎设置:`);
    logger.info(`- 引擎: ${appServer.get('view engine')}`);
    logger.info(`- 视图目录: ${appServer.get('views')}`);
    writeDirectLog(`视图引擎设置:`);
    writeDirectLog(`- 引擎: ${appServer.get('view engine')}`);
    writeDirectLog(`- 视图目录: ${appServer.get('views')}`);

    // 路由设置
    appServer.get('/', (req, res) => {
        logger.info('收到首页请求');
        writeDirectLog('收到首页请求');
        
        try {
            const indexPath = path.join(viewsPath, 'index.ejs');
            if (fs.existsSync(indexPath)) {
                logger.info(`找到index.ejs文件: ${indexPath}`);
                writeDirectLog(`找到index.ejs文件: ${indexPath}`);
            } else {
                logger.error(`index.ejs文件不存在: ${indexPath}`);
                writeDirectLog(`index.ejs文件不存在: ${indexPath}`);
            }
            
            res.render('index', { title: 'Cursor IDE Free Trial' });
            logger.info('成功渲染首页');
            writeDirectLog('成功渲染首页');
        } catch (error) {
            logger.error('渲染首页出错:', error);
            writeDirectLog(`渲染首页出错: ${error.message}`);
            res.status(500).send('无法渲染首页: ' + error.message);
        }
    });

    // API 路由
    logger.info('加载API路由');
    const apiRouter = require('./api');
    appServer.use('/api', apiRouter);

    // 错误处理中间件
    appServer.use((err, req, res, next) => {
        logger.error('服务器错误:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    });

    // 创建 HTTP 服务器并启动 WebSocket
    logger.info('创建HTTP服务器');
    const server = require('http').createServer(appServer);
    
    logger.info('初始化WebSocket');
    initWebSocket(server);

    try {
        logger.info(`尝试在端口 ${serverPort} 上启动服务器`);
        await new Promise((resolve, reject) => {
            server.listen(serverPort, () => {
                logger.info(`服务器成功启动，正在监听端口 ${serverPort}`);
                serverReady = true;
                // 通知父进程服务器已就绪
                if (process.send) {
                    logger.info('通知父进程服务器已就绪');
                    process.send({ status: 'ready' });
                } else {
                    logger.warn('无法通知父进程，process.send不可用');
                }
                resolve(server);
            }).on('error', (err) => {
                serverReady = false;
                logger.error(`服务器启动失败:`, err);
                reject(err);
            });
        });
        return true;
    } catch (error) {
        logger.error(`在端口 ${serverPort} 上启动服务器失败:`, error);
        return false;
    }
}

// 导出服务器端口和启动函数
module.exports = { startServer, getServerPort: () => serverPort };

// 如果直接运行此文件
if (require.main === module) {
    const port = parseInt(process.argv[2]) || 3000;
    logger.info(`作为主模块运行，使用端口: ${port}`);
    startServer(port).catch(error => {
        logger.error('启动服务器失败:', error);
        process.exit(1);
    });
} 