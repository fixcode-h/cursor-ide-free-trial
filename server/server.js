const express = require('express');
const path = require('path');
const logger = require('./utils/logger');
const { initWebSocket } = require('./utils/websocket');

const appServer = express();
let serverPort = null;
let serverReady = false;

async function startServer(port) {
    // 设置端口
    serverPort = port;
    
    logger.debug('NODE_ENV:', process.env.NODE_ENV);
    logger.debug('Current directory:', __dirname);
    logger.debug('APP_ROOT:', process.env.APP_ROOT);

    // 获取资源路径 - 根据环境变量调整
    const resourcePath = process.env.NODE_ENV === 'development'
        ? process.env.APP_ROOT  // 开发环境：使用 APP_ROOT
        : process.env.RES_PATH; // 生产环境：使用传入的 resourcesPath

    logger.debug('Resource Path:', resourcePath);

    // 中间件设置
    appServer.use(express.json());
    appServer.use(express.urlencoded({ extended: true }));
    appServer.use(express.static(path.join(resourcePath, 'public')));

    // 视图引擎设置
    appServer.set('views', path.join(resourcePath, 'views'));
    appServer.set('view engine', 'ejs');

    // 路由设置
    appServer.get('/', (req, res) => {
        res.render('index', { title: 'Cursor IDE Free Trial' });
    });

    // API 路由
    const apiRouter = require('./api');
    appServer.use('/api', apiRouter);

    // 错误处理中间件
    appServer.use((err, req, res, next) => {
        logger.error('Server error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    });

    // 创建 HTTP 服务器并启动 WebSocket
    const server = require('http').createServer(appServer);
    initWebSocket(server);

    try {
        await new Promise((resolve, reject) => {
            server.listen(serverPort, () => {
                logger.info(`Server is running on port ${serverPort}`);
                serverReady = true;
                // 通知父进程服务器已就绪
                if (process.send) {
                    process.send({ status: 'ready' });
                }
                resolve(server);
            }).on('error', (err) => {
                serverReady = false;
                reject(err);
            });
        });
        return true;
    } catch (error) {
        logger.error(`Failed to start server on port ${serverPort}:`, error);
        return false;
    }
}

// 导出服务器端口和启动函数
module.exports = { startServer, getServerPort: () => serverPort };

// 如果直接运行此文件
if (require.main === module) {
    const port = parseInt(process.argv[2]) || 3000;
    startServer(port).catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
} 