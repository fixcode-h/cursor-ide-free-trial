const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// 设置环境变量
process.env.NODE_ENV = 'development'; // 生成工具始终使用开发环境模式
process.env.APP_ROOT = path.resolve(__dirname, '..');

// 密钥相关函数
function getKeysPath() {
    return path.join(process.env.APP_ROOT, 'keys');
}

function getKeyFilePath(filename) {
    return path.join(getKeysPath(), filename);
}

const PUBLIC_KEY_PATH = getKeyFilePath('public.pem');
const PRIVATE_KEY_PATH = getKeyFilePath('private.pem');

// 生成密钥对
function generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    // 确保密钥目录存在
    const keysDir = getKeysPath();
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
    }

    // 保存密钥
    fs.writeFileSync(PUBLIC_KEY_PATH, publicKey);
    fs.writeFileSync(PRIVATE_KEY_PATH, privateKey);

    return { publicKey, privateKey };
}

// 加载私钥
function loadPrivateKey() {
    try {
        return fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    } catch (error) {
        console.error('加载私钥失败:', error);
        throw error;
    }
}

// 使用私钥签名
function sign(data, privateKey = null) {
    try {
        const key = privateKey || loadPrivateKey();
        const buffer = Buffer.from(JSON.stringify(data));
        const signature = crypto.privateEncrypt(
            {
                key,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            buffer
        );
        return signature.toString('base64');
    } catch (error) {
        console.error('签名失败:', error);
        throw error;
    }
}

// 确保密钥对存在
if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.log('生成新的密钥对...');
    generateKeyPair();
}

// 生成授权码
function generateLicense(options) {
    const {
        username,
        machineCode,
        expiryDate,
        features = [],
        type = 'standard'
    } = options;

    const licenseData = {
        username,
        machineCode,
        expiryDate: new Date(expiryDate).toISOString(),
        features,
        type,
        issueDate: new Date().toISOString()
    };

    return sign(licenseData);
}

// 命令行参数处理
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        username: '',
        machineCode: '',
        expiryDate: '',
        features: [],
        type: 'standard'
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--username':
            case '-u':
                options.username = args[++i];
                break;
            case '--machine-code':
            case '-m':
                options.machineCode = args[++i];
                break;
            case '--expiry':
            case '-e':
                options.expiryDate = args[++i];
                break;
            case '--features':
            case '-f':
                options.features = args[++i].split(',');
                break;
            case '--type':
            case '-t':
                options.type = args[++i];
                break;
            case '--help':
            case '-h':
                showHelp();
                process.exit(0);
                break;
        }
    }

    return options;
}

// 显示帮助信息
function showHelp() {
    console.log(`
生成授权码工具

用法: node generate-license.js [选项]

选项:
  -u, --username <name>      用户名
  -m, --machine-code <code>  机器码
  -e, --expiry <date>       过期时间 (YYYY-MM-DD)
  -f, --features <list>     功能列表 (逗号分隔)
  -t, --type <type>         授权类型 (standard/pro/enterprise)
  -h, --help                显示帮助信息

示例:
  node generate-license.js -u "John Doe" -m "XXXX-XXXX-XXXX-XXXX" -e "2024-12-31" -f "feature1,feature2" -t "pro"
`);
}

// 验证必需参数
function validateOptions(options) {
    if (!options.username) {
        console.error('错误: 缺少用户名');
        return false;
    }
    if (!options.machineCode) {
        console.error('错误: 缺少机器码');
        return false;
    }
    if (!options.expiryDate) {
        console.error('错误: 缺少过期时间');
        return false;
    }

    // 验证日期格式
    const date = new Date(options.expiryDate);
    if (isNaN(date.getTime())) {
        console.error('错误: 无效的日期格式');
        return false;
    }

    return true;
}

// 主函数
function main() {
    const options = parseArgs();

    if (process.argv.length <= 2) {
        showHelp();
        process.exit(1);
    }

    if (!validateOptions(options)) {
        process.exit(1);
    }

    try {
        const licenseKey = generateLicense(options);
        console.log('\n授权码生成成功!\n');
        console.log('授权码:');
        console.log(licenseKey);
        console.log('\n请妥善保管此授权码。\n');
    } catch (error) {
        console.error('生成授权码失败:', error);
        process.exit(1);
    }
}

// 运行脚本
main(); 