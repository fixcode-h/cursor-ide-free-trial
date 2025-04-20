const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const AccountDataHandler = require('../utils/account-data-handler');
const AccountGenerator = require('../utils/account-generator');
const { getConfig } = require('../utils/config');
const { broadcastMessage } = require('../utils/websocket');
const csv = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const Cursor = require('../flows/cursor');

// 初始化数据处理器
const accountDataHandler = new AccountDataHandler();
// 创建Cursor单例
const cursorInstance = new Cursor();

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
                
                // 直接使用账号生成器生成账号
                const accountGenerator = new AccountGenerator(config);
                const account = await accountGenerator.generateAccount();
                logger.info('已生成随机邮箱账号:', account.email);
                
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
        
        // 验证账号是否存在
        const accounts = await accountDataHandler.readRecords();
        const accountIndex = accounts.findIndex(a => a.email === email);
        
        if (accountIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: '账号不存在' 
            });
        }

        // 删除本地记录
        await accountDataHandler.deleteRecord(email);
        
        // 通过 WebSocket 发送删除消息
        broadcastMessage({
            type: 'account_deleted',
            data: {
                email: email
            }
        });
        
        res.json({ 
            success: true, 
            message: '账号已删除',
            data: { email } 
        });
        
    } catch (error) {
        logger.error('删除账号失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '删除账号失败',
            message: error.message 
        });
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

// 更新账号信息
router.put('/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const {
            username,
            newEmail,
            password,
            firstname,
            lastname,
            status,
            registrationType,
            verificationCode,
            cookie
        } = req.body;
        
        const accounts = await accountDataHandler.readRecords();
        const accountIndex = accounts.findIndex(a => a.email === email);
        
        if (accountIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                error: '账号不存在' 
            });
        }

        // 验证状态是否有效
        if (status && !Object.values(AccountDataHandler.AccountStatus).includes(status)) {
            return res.status(400).json({
                success: false,
                error: '无效的账号状态'
            });
        }

        // 构建更新数据
        const updateData = {
            updatedAt: new Date().toISOString()
        };

        // 如果提供了新邮箱，更新邮箱
        if (newEmail && newEmail !== email) {
            updateData.email = newEmail;
        }

        // 更新其他字段
        if (username !== undefined) updateData.username = username;
        if (password !== undefined) updateData.password = password;
        if (firstname !== undefined) updateData.firstname = firstname;
        if (lastname !== undefined) updateData.lastname = lastname;
        if (status !== undefined) updateData.status = status;
        if (registrationType !== undefined) updateData.registrationType = registrationType;
        if (verificationCode !== undefined) updateData.verificationCode = verificationCode;
        if (cookie !== undefined) updateData.cookie = cookie;

        // 更新记录
        await accountDataHandler.updateRecord(email, updateData);
        
        logger.info(`账号 ${email} 信息已更新`);
        res.json({ success: true, message: '账号信息已更新' });
    } catch (error) {
        logger.error('更新账号信息失败:', error);
        res.status(500).json({ success: false, error: '更新账号信息失败' });
    }
});

// 手动添加账号
router.post('/manual', async (req, res) => {
    try {
        const {
            username,
            email,
            password,
            firstname,
            lastname,
            status,
            registrationType,
            verificationCode,
            cookie
        } = req.body;
        
        // 验证必填字段
        if (!email || !password || !username) {
            return res.status(400).json({
                success: false,
                error: '邮箱、密码和用户名为必填项'
            });
        }

        // 验证状态是否有效
        if (status && !Object.values(AccountDataHandler.AccountStatus).includes(status)) {
            return res.status(400).json({
                success: false,
                error: '无效的账号状态'
            });
        }

        // 检查邮箱是否已存在
        const accounts = await accountDataHandler.readRecords();
        if (accounts.some(a => a.email === email)) {
            return res.status(400).json({
                success: false,
                error: '该邮箱已存在'
            });
        }

        // 创建新记录
        const newRecord = {
            username,
            email,
            password,
            firstname,
            lastname,
            status: status || AccountDataHandler.AccountStatus.CREATED,
            registrationType,
            verificationCode,
            cookie,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await accountDataHandler.appendRecord(newRecord);
        
        logger.info('手动添加账号成功:', email);
        res.json({ 
            success: true, 
            data: newRecord,
            message: '账号添加成功' 
        });
    } catch (error) {
        logger.error('手动添加账号失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '手动添加账号失败',
            message: error.message 
        });
    }
});

// 导出账号到CSV
router.get('/export', async (req, res) => {
    try {
        const accounts = await accountDataHandler.readRecords();
        
        // 将账号数据转换为CSV格式
        const csvData = stringify(accounts, {
            header: true,
            columns: [
                'username',
                'email',
                'password',
                'firstname',
                'lastname',
                'status',
                'registrationType',
                'verificationCode',
                'cookie'
            ]
        });

        // 设置响应头
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=accounts.csv');
        
        // 发送CSV数据
        res.send(csvData);
        
        logger.info('账号数据已导出为CSV');
    } catch (error) {
        logger.error('导出账号数据失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '导出账号数据失败',
            message: error.message 
        });
    }
});

// 从CSV导入账号
router.post('/import', async (req, res) => {
    try {
        const csvData = req.body.csvData;
        
        // 解析CSV数据
        const records = csv.parse(csvData, {
            columns: true,
            skip_empty_lines: true
        });

        const importedAccounts = [];
        const errors = [];

        // 验证并导入每个账号
        for (const record of records) {
            try {
                // 验证必填字段
                if (!record.email || !record.password || !record.username) {
                    throw new Error('邮箱、密码和用户名为必填项');
                }

                // 验证状态是否有效
                if (record.status && !Object.values(AccountDataHandler.AccountStatus).includes(record.status)) {
                    throw new Error('无效的账号状态');
                }

                // 检查邮箱是否已存在
                const accounts = await accountDataHandler.readRecords();
                if (accounts.some(a => a.email === record.email)) {
                    throw new Error('该邮箱已存在');
                }

                // 创建新记录
                const newRecord = {
                    ...record,
                    status: record.status || AccountDataHandler.AccountStatus.CREATED,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                await accountDataHandler.appendRecord(newRecord);
                importedAccounts.push(newRecord);

                // 通过 WebSocket 发送账号创建消息
                broadcastMessage({
                    type: 'account_created',
                    data: {
                        account: {
                            username: newRecord.username,
                            email: newRecord.email,
                            status: newRecord.status,
                            createdAt: newRecord.createdAt
                        }
                    }
                });

            } catch (error) {
                errors.push({
                    email: record.email,
                    error: error.message
                });
                logger.error(`导入账号失败 ${record.email}:`, error);
            }
        }

        res.json({
            success: true,
            data: {
                total: records.length,
                imported: importedAccounts.length,
                failed: errors.length,
                accounts: importedAccounts,
                errors: errors
            }
        });

    } catch (error) {
        logger.error('导入账号数据失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '导入账号数据失败',
            message: error.message 
        });
    }
});

// 获取账号使用量
router.get('/:email/usage', async (req, res) => {
    try {
        const { email } = req.params;
        const accounts = await accountDataHandler.readRecords();
        const account = accounts.find(a => a.email === email);
        
        if (!account) {
            return res.status(404).json({ 
                success: false, 
                error: '账号不存在' 
            });
        }

        // 检查账号是否有cookie
        if (!account.cookie) {
            return res.status(400).json({ 
                success: false, 
                error: '该账号未登录，无法获取使用量' 
            });
        }

        // 获取使用量
        try {
            const usage = await cursorInstance.getUseage(account.cookie);
            logger.info(`成功获取账号 ${email} 使用情况: ${usage.numRequests}/${usage.maxRequestUsage}`);
            
            // 更新账号记录中的使用量信息
            try {
                // 构建更新数据
                const updateData = {
                    maxRequestUsage: usage.maxRequestUsage || 0,
                    numRequests: usage.numRequests || 0,
                    updatedAt: new Date().toISOString()
                };
                
                // 使用账号邮箱作为标识符更新记录
                await accountDataHandler.updateRecord(email, updateData);
                logger.info(`成功更新账号 ${email} 的使用量记录`);
                
                return res.json({
                    success: true,
                    data: {
                        email: account.email,
                        maxRequestUsage: usage.maxRequestUsage || 0,
                        numRequests: usage.numRequests || 0
                    }
                });
            } catch (updateError) {
                logger.error(`更新账号 ${email} 使用量记录失败:`, updateError);
                
                // 即使更新失败，仍然返回成功获取的使用量数据
                return res.json({
                    success: true,
                    warning: '获取使用量成功，但更新账号记录失败',
                    data: {
                        email: account.email,
                        maxRequestUsage: usage.maxRequestUsage || 0,
                        numRequests: usage.numRequests || 0
                    }
                });
            }
        } catch (error) {
            logger.error(`获取账号 ${email} 使用量失败:`, error);
            return res.status(500).json({
                success: false,
                error: '获取使用量失败',
                message: error.message
            });
        }
    } catch (error) {
        logger.error('获取账号使用量失败:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取账号使用量失败',
            message: error.message 
        });
    }
});

module.exports = router; 