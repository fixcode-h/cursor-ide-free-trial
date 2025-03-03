const express = require('express');
const router = express.Router();
const PublicMailApi = require('../utils/public-mail-api');
const logger = require('../utils/logger');

// 获取用户信息
router.get('/info', async (req, res) => {
    try {
        const mailApi = new PublicMailApi();
        const result = await mailApi.getUserInfo();
        
        if (result.success) {
            res.json(result);
        } else {
            throw new Error(result.message || '获取用户信息失败');
        }
    } catch (error) {
        logger.error('获取用户信息失败:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '获取用户信息失败'
        });
    }
});

module.exports = router; 