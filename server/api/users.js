const express = require('express');
const router = express.Router();
const PublicMailApi = require('../utils/public-mail-api');
const logger = require('../utils/logger');
const Cursor = require('../flows/cursor');
const AccountDataHandler = require('../utils/account-data-handler');

// 获取用户信息
router.get('/info', async (req, res) => {
    try {
        const mailApi = new PublicMailApi();
        const mailResult = await mailApi.getUserInfo();
        
        if (!mailResult.success) {
            throw new Error(mailResult.message || '获取邮箱信息失败');
        }

        // 获取 Cursor 认证信息
        const cursor = new Cursor();
        const cursorAuth = await cursor.getAuth();

        // 初始化 AccountDataHandler 并获取用户 cookie
        const accountHandler = new AccountDataHandler();
        await accountHandler.initialize();
        const records = await accountHandler.readRecords();
        const userRecord = records.find(record => record.email === cursorAuth.email);

        let usage = null;
        if (userRecord && userRecord.cookie) {
            try {
                usage = await cursor.getUseage(userRecord.cookie);
                logger.info('成功获取用户使用情况');
            } catch (error) {
                logger.warn('获取用户使用情况失败:', error);
            }
        }

        // 添加 Cursor 信息到现有结果中
        mailResult.data.cursor = {
            email: cursorAuth.email,
            accessToken: cursorAuth.accessToken,
            refreshToken: cursorAuth.refreshToken,
            maxRequestUsage: usage?.maxRequestUsage || 0,
            numRequests: usage?.numRequests || 0,
        };

        res.json(mailResult);
    } catch (error) {
        logger.error('获取用户信息失败:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '获取用户信息失败'
        });
    }
});

module.exports = router; 