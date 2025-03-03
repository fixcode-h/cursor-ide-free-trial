const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { getConfig } = require('../utils/config');
const BrowserInitializer = require('../utils/browser-initializer');
const Cursor = require('../flows/cursor');
const Copilot = require('../flows/copilot');
const AccountDataHandler = require('../utils/account-data-handler');

let browserInstance = null;
let pageInstance = null;

// 开启调试模式浏览器
router.post('/open-debug-browser', async (req, res) => {
    try {
        // 清理之前的实例（如果存在）
        if (browserInstance) {
            await browserInstance.close();
            browserInstance = null;
        }

        const config = getConfig();
        const browserInitializer = new BrowserInitializer(config);
        
        // 初始化浏览器，开启调试模式
        logger.info('正在启动调试浏览器...');
        const { browser, page } = await browserInitializer.initBrowser();
        browserInstance = browser;
        pageInstance = page;
        
        // 监听浏览器关闭事件
        browserInstance.on('disconnected', () => {
            logger.info('调试浏览器已关闭');
            browserInstance = null;
            pageInstance = null;
        });

        res.json({
            success: true,
            message: '调试浏览器已启动'
        });

    } catch (error) {
        logger.error('启动调试浏览器失败:', error);
        res.status(500).json({
            success: false,
            error: '启动调试浏览器失败',
            message: error.message
        });
    }
});

// 测试重置机器码
router.post('/machine-code', async (req, res) => {
    try {
        // 清理之前的实例（如果存在）
        if (browserInstance) {
            await browserInstance.close();
            browserInstance = null;
        }
        const config = getConfig();

        // 根据配置初始化对应的 flow
        const Flow = config.registration.type === 'copilot' ? Copilot : Cursor;
        const flow = new Flow();

        // 重置机器码
        logger.info('正在重置机器码...');
        await flow.resetMachineCodes();
        logger.info('机器码重置完成');

        // 清理资源
        if (pageInstance) {
            await pageInstance.close();
        }
        if (browserInstance) {
            await browserInstance.close();
        }
        browserInstance = null;
        pageInstance = null;

        res.json({
            success: true,
            message: '机器码重置测试完成'
        });

    } catch (error) {
        logger.error('测试重置机器码失败:', error);
        res.status(500).json({
            success: false,
            error: '测试重置机器码失败',
            message: error.message
        });
    }
});

// 禁用自动更新
router.post('/disable-auto-update', async (req, res) => {
    try {
        // 清理之前的实例（如果存在）
        if (browserInstance) {
            await browserInstance.close();
            browserInstance = null;
        }
        const config = getConfig();

        // 根据配置初始化对应的 flow
        const Flow = config.registration.type === 'copilot' ? Copilot : Cursor;
        const flow = new Flow();

        // 禁用自动更新
        logger.info('正在禁用自动更新...');
        const result = await flow.disableAutoUpdate();
        
        if (result) {
            logger.info('自动更新已禁用');
        } else {
            logger.error('禁用自动更新失败');
        }

        // 清理资源
        if (pageInstance) {
            await pageInstance.close();
        }
        if (browserInstance) {
            await browserInstance.close();
        }
        browserInstance = null;
        pageInstance = null;

        res.json({
            success: result,
            message: result ? '自动更新已禁用' : '禁用自动更新失败'
        });

    } catch (error) {
        logger.error('禁用自动更新失败:', error);
        res.status(500).json({
            success: false,
            error: '禁用自动更新失败',
            message: error.message
        });
    }
});

// 更新账号状态
router.post('/update-account-status', async (req, res) => {
    try {
        const { email, status } = req.body;

        // 验证必要的参数
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: '无效的邮箱地址'
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                error: '状态不能为空'
            });
        }

        // 验证状态是否有效
        if (!Object.values(AccountDataHandler.AccountStatus).includes(status)) {
            return res.status(400).json({
                success: false,
                error: '无效的账号状态',
                validStatuses: Object.values(AccountDataHandler.AccountStatus)
            });
        }

        // 初始化数据处理器
        const accountDataHandler = new AccountDataHandler();
        await accountDataHandler.initialize();

        // 更新账号状态
        const updatedRecords = await accountDataHandler.updateRecord(email, {
            status,
            updatedAt: new Date().toISOString()
        });

        // 查找更新后的记录
        const updatedAccount = updatedRecords.find(record => record.email === email);
        if (!updatedAccount) {
            return res.status(404).json({
                success: false,
                error: '未找到指定账号'
            });
        }

        res.json({
            success: true,
            message: '账号状态更新成功',
            account: {
                email: updatedAccount.email,
                status: updatedAccount.status,
                updatedAt: updatedAccount.updatedAt
            }
        });

    } catch (error) {
        logger.error('更新账号状态失败:', error);
        res.status(500).json({
            success: false,
            error: '更新账号状态失败',
            message: error.message
        });
    }
});

module.exports = router; 