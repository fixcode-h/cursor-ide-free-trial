const WebSocket = require('ws');

/**
 * WebSocket 消息类型定义：
 * 
 * 1. 账号相关消息：
 *    - account_created: 账号创建成功
 *      {
 *        type: 'account_created',
 *        data: {
 *          account: { username, email, status, createdAt },
 *          progress: { current, total }
 *        }
 *      }
 *    - account_creation_error: 账号创建失败
 *      {
 *        type: 'account_creation_error',
 *        data: {
 *          error: string,
 *          progress: { current, total }
 *        }
 *      }
 * 
 * 2. 日志相关消息：
 *    - log_info: 信息日志
 *      {
 *        type: 'log_info',
 *        data: {
 *          message: string,
 *          timestamp: string,
 *          details?: any
 *        }
 *      }
 *    - log_error: 错误日志
 *      {
 *        type: 'log_error',
 *        data: {
 *          message: string,
 *          timestamp: string,
 *          error?: any
 *        }
 *      }
 *    - log_warn: 警告日志
 *      {
 *        type: 'log_warn',
 *        data: {
 *          message: string,
 *          timestamp: string,
 *          details?: any
 *        }
 *      }
 */

let wss = null;

function initWebSocket(server) {
    wss = new WebSocket.Server({ 
        server,
        path: '/ws'
    });

    wss.on('connection', (ws) => {
        console.log('[WebSocket] New client connected');
        
        ws.on('message', (message) => {
            console.log('[WebSocket] Received:', message);
        });

        ws.on('close', () => {
            console.log('[WebSocket] Client disconnected');
        });
    });

    console.log('[WebSocket] Server initialized');
}

function broadcastMessage(message) {
    if (!wss) {
        console.error('[WebSocket] Server not initialized');
        return;
    }

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// 导出消息类型常量
const MessageTypes = {
    ACCOUNT_CREATED: 'account_created',
    ACCOUNT_CREATION_ERROR: 'account_creation_error',
    LOG_INFO: 'log_info',
    LOG_ERROR: 'log_error',
    LOG_WARN: 'log_warn'
};

module.exports = {
    initWebSocket,
    broadcastMessage,
    MessageTypes
}; 