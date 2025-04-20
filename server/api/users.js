const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const Cursor = require('../flows/cursor');
const AccountDataHandler = require('../utils/account-data-handler');

// 创建单例Cursor实例
const cursorInstance = new Cursor();
// 创建单例AccountDataHandler实例
let accountHandlerInstance = null;

// 获取用户信息
router.get('/info', async (req, res) => {
    try {
        // 获取 Cursor 认证信息
        const cursorAuth = await cursorInstance.getAuth();

        // 初始化 AccountDataHandler 并获取用户 cookie
        if (!accountHandlerInstance) {
            accountHandlerInstance = new AccountDataHandler();
            await accountHandlerInstance.initialize();
        }
        
        const records = await accountHandlerInstance.readRecords();
        const userRecord = records.find(record => record.email === cursorAuth.email);

        let usage = null;
        if (userRecord && userRecord.cookie) {
            try {
                usage = await cursorInstance.getUseage(userRecord.cookie);
                logger.info('成功获取用户使用情况');
            } catch (error) {
                logger.warn('获取用户使用情况失败:', error);
            }
        }

        const responseData = {
            success: true,
            data: {
                cursor: {
                    email: cursorAuth.email,
                    accessToken: cursorAuth.accessToken,
                    refreshToken: cursorAuth.refreshToken,
                    maxRequestUsage: usage?.maxRequestUsage || 0,
                    numRequests: usage?.numRequests || 0,
                }
            }
        };

        res.json(responseData);
    } catch (error) {
        logger.error('获取用户信息失败:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message || '获取用户信息失败'
        });
    }
});

module.exports = router;