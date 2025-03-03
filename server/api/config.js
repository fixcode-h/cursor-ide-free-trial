const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../utils/config');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// 获取服务基础信息
router.get('/info', (req, res) => {
    try {
        // 获取资源路径
        const resourcePath = process.env.NODE_ENV === 'development'
            ? process.env.APP_ROOT
            : process.env.RES_PATH;

        // 读取 package.json
        const packagePath = path.join(resourcePath, 'package.json');
        const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        // 构建服务信息
        const serviceInfo = {
            name: packageInfo.name,
            version: packageInfo.version,
            author: packageInfo.author,
            description: packageInfo.description,
            license: packageInfo.license,
            keywords: packageInfo.keywords,
            environment: process.env.NODE_ENV || 'production',
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };

        res.json({ success: true, data: serviceInfo });
    } catch (error) {
        logger.error('Error getting service information:', error);
        res.status(500).json({ success: false, error: 'Failed to get service information' });
    }
});

// 获取配置
router.get('/', (req, res) => {
    try {
        const config = getConfig();
        res.json({ success: true, data: config });
    } catch (error) {
        logger.error('Error getting configuration:', error);
        res.status(500).json({ success: false, error: 'Failed to get configuration' });
    }
});

// 更新配置
router.post('/', (req, res) => {
    try {
        const newConfig = req.body;
        updateConfig(newConfig);
        res.json({ success: true, message: 'Configuration updated successfully' });
    } catch (error) {
        logger.error('Error updating configuration:', error);
        res.status(500).json({ success: false, error: 'Failed to update configuration' });
    }
});

module.exports = router; 