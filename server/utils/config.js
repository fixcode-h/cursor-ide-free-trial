const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// 默认配置
const defaultConfig = {
    server: {
        port: 3000,
        host: 'localhost'
    },
    auth: {
        token: '', // 授权令牌，用于验证使用权限
    },
    proxy: {
        enabled: false,
        host: '127.0.0.1',
        port: 10808,
        protocol: 'socks5' // 可选: http, https, socks5
    },
    cloudflare: {
        apiToken: '',
        zoneId: '',
        emailForward: '',
        virtualDomain: '',
    },
    email: {
        type: 'publicApi', // 可选: 'tempmail', 'imap', 'publicApi'
        user: '',
        pass: '',
        tempmail: {
            // 可用域名列表:
            // 'mailto.plus',
            // 'fexpost.com',
            // 'fexbox.org',
            // 'mailbox.in.ua',
            // 'rover.info',
            // 'chitthi.in',
            // 'fextemp.com',
            // 'any.pink',
            // 'merepost.com'
            preferredDomain: 'fexpost.com', // 默认使用的域名
            customizeUsername: true, // 是否允许自定义用户名
            username: '', // 指定的邮箱用户名
            pin: '', // pin码
            lifetime: '2days' // 可选: '10min', '60min', '2days', '7days'
        },
        publicApi: {
            apiEndpoint: 'https://emailapi.goaiwork.online', // API服务地址
        },
        smtp: {
            enabled: false, // 默认不连接
            host: 'smtp.gmail.com',
            port: 465,
            secure: true
        },
        imap: {
            enabled: true, // 默认连接
            host: 'imap.gmail.com',
            port: 993,
            secure: true
        }
    },
    logging: {
        level: 'info',  // 可选: error, warn, info, debug
        path: 'logs',   // 日志文件存储路径
        maxSize: '10m', // 单个日志文件大小上限
        maxFiles: 5     // 保留的日志文件数量
    },
    registration: {
        type: 'cursor', // 可选: 'cursor', 'copilot'
        manual: false,  // 是否启用手动注册模式
    },
    browser: {
        headless: false, // 是否启用无头模式
        checkFingerprint: false, // 是否检查浏览器指纹
        executablePath: '', // Chrome可执行文件的路径
        fingerprintRandom: false, // 是否随机指纹浏览器种子
        fingerprintSeed: '', // 固定指纹浏览器种子
    },
    cursor: {
        executablePath: '', // Cursor可执行文件的路径，根据不同平台有不同默认路径
    },
    human_behavior: {
        enabled: true, // 是否启用人类行为模拟
        typingSpeed: {
            min: 50, // 最小打字延迟（毫秒）
            max: 200 // 最大打字延迟（毫秒）
        },
        movementDelay: {
            min: 500, // 最小移动延迟（毫秒）
            max: 2000 // 最大移动延迟（毫秒）
        }
    }
};

let config = { ...defaultConfig };

// 获取配置文件路径
function getConfigPath() {
    const fileName = 'config.yaml';
    return path.join(process.env.APP_ROOT, fileName);
}

function loadConfig() {
    const configPath = getConfigPath();
    try {
        // 确保配置目录存在
        const configDir = path.dirname(configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        if (fs.existsSync(configPath)) {
            const fileContents = fs.readFileSync(configPath, 'utf8');
            const yamlConfig = yaml.load(fileContents);
            config = { ...defaultConfig, ...yamlConfig };
        } else {
            // 创建默认配置文件
            fs.writeFileSync(configPath, yaml.dump(defaultConfig), 'utf8');
        }
    } catch (error) {
        console.error('加载配置文件失败:', error);
        throw error;
    }
}

function getConfig() {
    return config;
}

function updateConfig(newConfig) {
    const configPath = getConfigPath();
    try {
        const updatedConfig = { ...config, ...newConfig };
        fs.writeFileSync(configPath, yaml.dump(updatedConfig), 'utf8');
        config = updatedConfig;
        return true;
    } catch (error) {
        console.error('更新配置文件失败:', error);
        throw error;
    }
}

// 初始化时加载配置
loadConfig();

module.exports = {
    getConfig,
    updateConfig
}; 