// 创建一个延迟加载的 websocket 引用
let websocket = null;
const getWebsocket = () => {
    if (!websocket) {
        try {
            websocket = require('./websocket');
        } catch (error) {
            console.error('Failed to load websocket module:', error);
        }
    }
    return websocket;
};

const fs = require('fs');
const path = require('path');

// 获取日志目录路径
function getLogsDir() {
    return path.join(process.env.APP_ROOT, 'logs');
}

// 确保日志目录存在
const logsDir = getLogsDir();
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// 获取当前日期的日志文件名
const getLogFileName = () => {
    const now = new Date();
    return path.join(logsDir, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.log`);
};

// 写入日志文件
const writeToLogFile = (level, message, ...args) => {
    const now = new Date();
    const timestamp = now.toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message} ${args.length ? JSON.stringify(args) : ''}`;
    
    fs.appendFile(getLogFileName(), logMessage + '\n', (err) => {
        if (err) {
            console.error('Failed to write to log file:', err);
        }
    });
};

class Logger {
    constructor() {
        this.level = 'info'; // 默认日志级别
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        }
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.level];
    }

    debug(message, ...args) {
        if (!this.shouldLog('debug')) return;
        
        const timestamp = new Date().toISOString();
        console.log(`\x1b[90m[${timestamp}]\x1b[0m \x1b[36m[调试]\x1b[0m`, message, ...args);
        writeToLogFile('debug', message, ...args);
        
        try {
            const ws = getWebsocket();
            if (ws) {
                const logData = {
                    type: ws.MessageTypes.LOG_DEBUG,
                    data: {
                        message,
                        details: args,
                        timestamp: new Date().toISOString()
                    }
                };
                ws.broadcastMessage(logData);
            }
        } catch (error) {
            console.error('Failed to broadcast debug message:', error);
        }
    }

    info(message, ...args) {
        if (!this.shouldLog('info')) return;

        const timestamp = new Date().toISOString();
        console.log(`\x1b[90m[${timestamp}]\x1b[0m \x1b[32m[信息]\x1b[0m`, message, ...args);
        writeToLogFile('info', message, ...args);
        
        try {
            const ws = getWebsocket();
            if (ws) {
                const logData = {
                    type: ws.MessageTypes.LOG_INFO,
                    data: {
                        message,
                        details: args,
                        timestamp: new Date().toISOString()
                    }
                };
                ws.broadcastMessage(logData);
            }
        } catch (error) {
            console.error('Failed to broadcast log message:', error);
        }
    }

    warn(message, ...args) {
        if (!this.shouldLog('warn')) return;

        const timestamp = new Date().toISOString();
        console.log(`\x1b[90m[${timestamp}]\x1b[0m \x1b[33m[警告]\x1b[0m`, message, ...args);
        writeToLogFile('warn', message, ...args);
        
        try {
            const ws = getWebsocket();
            if (ws) {
                const logData = {
                    type: ws.MessageTypes.LOG_WARN,
                    data: {
                        message,
                        details: args,
                        timestamp: new Date().toISOString()
                    }
                };
                ws.broadcastMessage(logData);
            }
        } catch (error) {
            console.error('Failed to broadcast warning message:', error);
        }
    }

    error(message, ...args) {
        if (!this.shouldLog('error')) return;

        const timestamp = new Date().toISOString();
        console.error(`\x1b[90m[${timestamp}]\x1b[0m \x1b[31m[错误]\x1b[0m`, message, ...args);
        writeToLogFile('error', message, ...args);
        
        try {
            const ws = getWebsocket();
            if (ws) {
                const logData = {
                    type: ws.MessageTypes.LOG_ERROR,
                    data: {
                        message,
                        error: args[0] ? args[0].message || args[0] : null,
                        timestamp: new Date().toISOString()
                    }
                };
                ws.broadcastMessage(logData);
            }
        } catch (broadcastError) {
            console.error('Failed to broadcast error message:', broadcastError);
        }
    }
}

// 创建单例实例
const logger = new Logger();

// 从配置文件加载日志级别
try {
    const { getConfig } = require('./config');
    const config = getConfig();
    if (config && config.logging && config.logging.level) {
        logger.setLevel(config.logging.level);
    }
} catch (error) {
    console.warn('Failed to load logging configuration:', error);
}

module.exports = logger;