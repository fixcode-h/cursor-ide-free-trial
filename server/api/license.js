const express = require('express');
const router = express.Router();
const { checkLicenseStatus, validateLicense, clearLicense } = require('../utils/license');
const { getConfig } = require('../utils/config');
const { generateMachineCode } = require('../utils/hardware');

// 获取机器码
router.get('/machine-code', async (req, res) => {
    try {
        const machineCode = await generateMachineCode();
        res.json({
            success: true,
            message: '获取机器码成功',
            machineCode
        });
    } catch (error) {
        console.error('获取机器码失败:', error);
        res.status(500).json({
            success: false,
            message: '获取机器码失败: ' + error.message
        });
    }
});

// 获取授权状态
router.get('/status', async (req, res) => {
    try {
        const status = await checkLicenseStatus();
        res.json({
            success: true,
            message: '获取成功',
            status
        });
    } catch (error) {
        console.error('获取授权状态失败:', error);
        res.status(500).json({
            success: false,
            message: '获取授权状态失败: ' + error.message
        });
    }
});

// 验证授权码
router.post('/validate', async (req, res) => {
    try {
        const { licenseKey } = req.body;
        if (!licenseKey) {
            return res.status(400).json({
                success: false,
                message: '授权码不能为空'
            });
        }

        const licenseInfo = await validateLicense(licenseKey);
        res.json({
            success: true,
            message: '授权验证成功',
            licenseInfo
        });
    } catch (error) {
        console.error('授权验证失败:', error);
        res.status(400).json({
            success: false,
            message: '授权验证失败: ' + error.message
        });
    }
});

// 清除授权
router.post('/clear', (req, res) => {
    try {
        clearLicense();
        res.json({
            success: true,
            message: '授权已清除'
        });
    } catch (error) {
        console.error('清除授权失败:', error);
        res.status(500).json({
            success: false,
            message: '清除授权失败: ' + error.message
        });
    }
});

// 获取当前授权码
router.get('/current', (req, res) => {
    try {
        const config = getConfig();
        const token = config.auth?.token;
        
        if (!token) {
            return res.status(404).json({
                success: false,
                message: '未找到授权信息'
            });
        }

        res.json({
            success: true,
            token
        });
    } catch (error) {
        console.error('获取授权码失败:', error);
        res.status(500).json({
            success: false,
            message: '获取授权码失败: ' + error.message
        });
    }
});

module.exports = router; 