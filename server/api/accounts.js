const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const AccountDataHandler = require('../utils/account-data-handler');
const AccountGenerator = require('../utils/account-generator');
const CloudflareEmailManager = require('../utils/cloudflare-email-router');
const { getConfig } = require('../utils/config');
const { broadcastMessage } = require('../utils/websocket');
const PublicMailApi = require('../utils/public-mail-api');

// 初始化数据处理器
const accountDataHandler = new AccountDataHandler();

// 确保数据库已初始化
(async () => {
    try {
        await accountDataHandler.initialize();
        logger.info('数据处理器初始化完成');
    } catch (error) {
        logger.error('数据处理器初始化失败:', error);
    }
})();

// 获取所有账号
router.get('/', async (req, res) => {
    try {
        const accounts = await accountDataHandler.readRecords();
        res.json({ success: true, data: accounts });
    } catch (error) {
        logger.error('获取账号列表失败:', error);
        res.status(500).json({ success: false, error: '获取账号列表失败' });
    }
});

// 创建新账号
router.post('/', async (req, res) => {
    try {
        const count = parseInt(req.body.count) || 1;
        const config = getConfig();
        const createdAccounts = [];

        for (let i = 0; i < count; i++) {
            try {
                logger.info(`开始生成第 ${i + 1}/${count} 个账号...`);
                
                let account;
                // 如果是 publicApi 类型，直接使用 public mail api
                if (config.email.type === 'publicApi') {
                    const publicMailApi = new PublicMailApi();
                    const response = await publicMailApi.addEmailRoute();
                    account = response.data;
                } else {
                    // 原有的账号生成和 Cloudflare 邮箱绑定流程
                    const accountGenerator = new AccountGenerator(config);
                    const cloudflareManager = new CloudflareEmailManager(config);
                    account = await accountGenerator.generateAccount();
                    await cloudflareManager.registerEmailAccount(account);
                }
                
                // 添加新记录
                const newRecord = {
                    ...account,
                    status: AccountDataHandler.AccountStatus.CREATED,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                await accountDataHandler.appendRecord(newRecord);
                createdAccounts.push(newRecord);
                
                // 通过 WebSocket 发送账号创建消息
                broadcastMessage({
                    type: 'account_created',
                    data: {
                        account: {
                            username: newRecord.username,
                            email: newRecord.email,
                            status: newRecord.status,
                            createdAt: newRecord.createdAt
                        },
                        progress: {
                            current: i + 1,
                            total: count
                        }
                    }
                });
                
                logger.info(`第 ${i + 1} 个账号创建成功:`, account.username);
                
            } catch (error) {
                logger.error(`第 ${i + 1} 个账号创建失败:`, error);
                // 发送错误消息
                broadcastMessage({
                    type: 'account_creation_error',
                    data: {
                        error: error.message,
                        progress: {
                            current: i + 1,
                            total: count
                        }
                    }
                });
                // 继续创建下一个账号
                continue;
            }
        }

        res.json({
            success: true,
            data: {
                total: count,
                created: createdAccounts.length,
                accounts: createdAccounts
            }
        });
        
    } catch (error) {
        logger.error('批量创建账号失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '批量创建账号失败',
            message: error.message 
        });
    }
});

// 删除账号
router.delete('/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const accounts = await accountDataHandler.readRecords();
        const accountIndex = accounts.findIndex(a => a.email === email);
        
        if (accountIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: '账号不存在' 
            });
        }

        const account = accounts[accountIndex];
        const config = getConfig();

        // 尝试删除远程邮件路由，但即使失败也继续删除本地记录
        try {
            // 根据邮箱类型选择不同的删除方式
            if (config.email.type === 'publicApi') {
                const publicMailApi = new PublicMailApi();
                await publicMailApi.deleteEmailRoute(email);
                logger.info('已删除 Public API 邮件路由:', email);
            } else {
                const cloudflareManager = new CloudflareEmailManager(config);
                // 获取所有邮件路由规则
                const emailRoutes = await cloudflareManager.listEmailRoutes();
                
                // 查找对应的路由规则
                const routeToDelete = emailRoutes.find(route => 
                    route.matchers.some(matcher => 
                        matcher.type === 'literal' && 
                        matcher.field === 'to' && 
                        matcher.value === email
                    )
                );

                // 如果找到对应的路由规则，删除它
                if (routeToDelete) {
                    await cloudflareManager.removeEmailRoute(routeToDelete.id);
                    logger.info('已删除 Cloudflare 邮件路由:', email);
                }
            }
        } catch (remoteError) {
            // 记录远程删除失败，但不中断流程
            logger.error('远程邮件路由删除失败，继续删除本地记录:', remoteError);
        }

        // 无论远程删除是否成功，都删除本地记录
        await accountDataHandler.deleteRecord(email);
        logger.info('本地账号记录已删除:', email);
        
        res.json({ success: true, message: '账号已删除' });
    } catch (error) {
        logger.error('删除账号失败:', error);
        res.status(500).json({ success: false, error: '删除账号失败' });
    }
});

// 更新账号状态
router.patch('/:username/status', async (req, res) => {
    try {
        const { username } = req.params;
        const { status } = req.body;
        
        // 验证状态是否有效
        if (!Object.values(AccountDataHandler.AccountStatus).includes(status)) {
            return res.status(400).json({
                success: false,
                error: '无效的账号状态'
            });
        }

        const accounts = await accountDataHandler.readRecords();
        const account = accounts.find(a => a.username === username);

        if (!account) {
            return res.status(404).json({
                success: false,
                error: '账号不存在'
            });
        }

        await accountDataHandler.updateRecord(username, { 
            status,
            updatedAt: new Date().toISOString()
        });

        logger.info(`账号 ${username} 状态已更新为: ${status}`);
        res.json({ success: true, data: account });
    } catch (error) {
        logger.error('更新账号状态失败:', error);
        res.status(500).json({ success: false, error: '更新账号状态失败' });
    }
});

module.exports = router; 