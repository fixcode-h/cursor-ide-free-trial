class WebSocketClient {
    constructor() {
        this.ws = null;
        this.messageHandlers = new Map();
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // 初始重连延迟 1 秒
    }

    // 初始化 WebSocket 连接
    init() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.connect(wsUrl);
    }

    // 建立连接
    connect(url) {
        try {
            this.ws = new WebSocket(url);
            this.setupEventListeners();
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.handleReconnect();
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.appendToConsole('系统已连接');
        };

        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.appendToConsole('系统已断开连接');
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.appendToConsole('连接发生错误', 'error');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
    }

    // 处理重连
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            this.appendToConsole(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`, 'warn');
            
            setTimeout(() => {
                this.init();
            }, delay);
        } else {
            this.appendToConsole('重连失败，请刷新页面重试', 'error');
        }
    }

    // 注册消息处理器
    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, new Set());
        }
        this.messageHandlers.get(messageType).add(handler);
    }

    // 取消注册消息处理器
    off(messageType, handler) {
        if (this.messageHandlers.has(messageType)) {
            this.messageHandlers.get(messageType).delete(handler);
        }
    }

    // 处理接收到的消息
    handleMessage(message) {
        // 添加到控制台
        this.appendToConsole(this.formatMessage(message), message.type);

        // 触发注册的处理器
        if (this.messageHandlers.has(message.type)) {
            this.messageHandlers.get(message.type).forEach(handler => {
                try {
                    handler(message.data);
                } catch (error) {
                    console.error('Error in message handler:', error);
                }
            });
        }
    }

    // 格式化消息用于显示
    formatMessage(message) {
        const timestamp = new Date(message.data.timestamp).toLocaleTimeString();
        let formattedMessage = `[${timestamp}] `;

        switch (message.type) {
            case 'account_created':
                formattedMessage += `账号创建成功: ${message.data.account.username}`;
                break;
            case 'account_creation_error':
                formattedMessage += `账号创建失败: ${message.data.error}`;
                break;
            case 'log':
            case 'log_info':
            case 'log_error':
            case 'log_warn':
                // 处理 message 可能是对象的情况
                formattedMessage += typeof message.data.message === 'object' 
                    ? JSON.stringify(message.data.message)
                    : message.data.message;
                
                // 只在 details 有实际内容时才添加
                if (message.data.details && 
                    message.data.details.length > 0 && 
                    JSON.stringify(message.data.details) !== '[]') {
                    // 处理 details 中的每个条目，如果是对象则转换为字符串
                    const processedDetails = message.data.details.map(detail => 
                        typeof detail === 'object' ? JSON.stringify(detail) : detail
                    );
                    return {
                        mainMessage: formattedMessage,
                        details: processedDetails
                    };
                }
                break;
            default:
                formattedMessage += JSON.stringify(message.data);
        }

        return { mainMessage: formattedMessage };
    }

    // 添加消息到控制台
    appendToConsole(message, type = 'info') {
        const console = document.getElementById('console');
        if (!console) return;

        // 处理格式化后的消息对象
        if (typeof message === 'object' && message.mainMessage) {
            // 添加主消息
            const mainLine = document.createElement('div');
            mainLine.className = `console-line ${type}`;
            mainLine.textContent = message.mainMessage;
            console.appendChild(mainLine);

            // 如果有详情数组，添加详情
            if (Array.isArray(message.details)) {
                message.details.forEach(detail => {
                    const detailLine = document.createElement('div');
                    detailLine.className = `console-line ${type} console-detail`;
                    detailLine.textContent = `  └─ ${detail}`;
                    console.appendChild(detailLine);
                });
            }
        } else {
            // 处理普通消息
            const line = document.createElement('div');
            line.className = `console-line ${type}`;
            line.textContent = message;
            console.appendChild(line);
        }
        
        console.scrollTop = console.scrollHeight;
    }
}

// 创建全局实例
window.wsClient = new WebSocketClient();

// 页面加载完成后初始化 WebSocket
document.addEventListener('DOMContentLoaded', () => {
    window.wsClient.init();
}); 