const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { generateMachineCode } = require('./hardware');
const { getConfig, updateConfig } = require('./config');

// 获取密钥存放路径
function getKeysPath() {
    const basePath = process.env.NODE_ENV === 'development'
        ? process.env.APP_ROOT  // 开发环境：使用 APP_ROOT
        : process.env.RES_PATH; // 生产环境：使用传入的 resourcesPath
    return path.join(basePath, 'keys');
}

// 获取公钥文件路径
const PUBLIC_KEY_PATH = path.join(getKeysPath(), 'public.pem');

// 加载公钥
function loadPublicKey() {
    try {
        return fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    } catch (error) {
        console.error('加载公钥失败:', error);
        throw error;
    }
}

// 使用公钥验证签名数据
function verifyLicense(signedData) {
    try {
        const publicKey = loadPublicKey();
        const buffer = Buffer.from(signedData, 'base64');
        const decrypted = crypto.publicDecrypt(
            {
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_PADDING,
            },
            buffer
        );
        return JSON.parse(decrypted.toString());
    } catch (error) {
        console.error('验证失败:', error);
        throw error;
    }
}

// 授权信息结构
class LicenseInfo {
    constructor(data) {
        this.username = data.username;
        this.machineCode = data.machineCode;
        this.expiryDate = new Date(data.expiryDate);
        this.features = data.features || [];
        this.type = data.type;
        this.issueDate = new Date(data.issueDate);
    }

    isValid() {
        return new Date() <= this.expiryDate;
    }

    hasFeature(feature) {
        return this.features.includes(feature);
    }

    getRemainingDays() {
        const now = new Date();
        const diff = this.expiryDate.getTime() - now.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
}

// 验证授权码
async function validateLicense(licenseKey) {
    try {
        // 验证并解密授权码
        const decryptedData = verifyLicense(licenseKey);
        const licenseInfo = new LicenseInfo(decryptedData);

        // 获取当前机器码
        const currentMachineCode = await generateMachineCode();

        // 验证机器码
        if (licenseInfo.machineCode && licenseInfo.machineCode !== currentMachineCode) {
            throw new Error('授权码与当前机器不匹配');
        }

        // 验证有效期
        if (!licenseInfo.isValid()) {
            throw new Error('授权已过期');
        }

        // 更新配置中的授权信息
        const config = getConfig();
        config.auth = {
            ...config.auth,
            token: licenseKey,
            username: licenseInfo.username,
            type: licenseInfo.type,
            expiryDate: licenseInfo.expiryDate.toISOString(),
            features: licenseInfo.features
        };
        updateConfig(config);

        return licenseInfo;
    } catch (error) {
        console.error('验证授权码失败:', error);
        throw error;
    }
}

// 检查当前授权状态
async function checkLicenseStatus() {
    try {
        const config = getConfig();
        if (!config.auth || !config.auth.token) {
            return {
                isValid: false,
                message: '未授权'
            };
        }

        const licenseInfo = await validateLicense(config.auth.token);
        return {
            isValid: true,
            licenseInfo,
            remainingDays: licenseInfo.getRemainingDays(),
            message: '授权有效'
        };
    } catch (error) {
        return {
            isValid: false,
            message: error.message
        };
    }
}

// 清除授权信息
function clearLicense() {
    const config = getConfig();
    config.auth = {
        token: ''
    };
    updateConfig(config);
}

module.exports = {
    validateLicense,
    checkLicenseStatus,
    clearLicense,
    LicenseInfo
}; 