const express = require('express');
const path = require('path');
const router = express.Router();
const logger = require('../utils/logger');
const { getConfig } = require('../utils/config');
const AccountDataHandler = require('../utils/account-data-handler');
const EmailHandler = require('../utils/email-handler');
const BrowserInitializer = require('../utils/browser-initializer');
const AccountGenerator = require('../utils/account-generator');
const Cursor = require('../flows/cursor');
const Copilot = require('../flows/copilot');

async function getVerificationCode(account, config, { browser = null, registrationFlow = null, emailHandler = null, requestStartTime = null } = {}) {
    logger.info('等待接收验证码邮件...');
    let verificationCode;
    let attempts = 0;
    const maxAttempts = 10; // 最大重试次数
    const retryInterval = 10000; // 重试间隔，10秒

    // 如果没有提供请求开始时间，使用当前时间
    if (!requestStartTime) {
        requestStartTime = Date.now();
        logger.info(`未提供请求开始时间，使用当前时间: ${new Date(requestStartTime).toLocaleString()}`);
    } else {
        logger.info(`使用提供的请求开始时间: ${new Date(requestStartTime).toLocaleString()}`);
    }

    while (attempts < maxAttempts) {
        attempts++;
        logger.info(`尝试获取验证码 (第 ${attempts}/${maxAttempts} 次)`);

        try {
            if (!emailHandler || !registrationFlow) {
                throw new Error('IMAP 模式下需要提供 emailHandler 和 registrationFlow');
            }
            // 调用时传入请求开始时间
            verificationCode = await emailHandler.waitForVerificationEmail(registrationFlow, account, 300000, 5000, requestStartTime);

            // 确保验证码是字符串
            if (verificationCode) {
                if (typeof verificationCode === 'object') {
                    logger.warn('收到的验证码是对象类型，尝试提取字符串值');
                    // 尝试从对象中提取验证码
                    if (verificationCode.verificationCode) {
                        verificationCode = verificationCode.verificationCode;
                    } else if (verificationCode.code) {
                        verificationCode = verificationCode.code;
                    } else {
                        // 尝试找到任何看起来像验证码的值
                        for (const key in verificationCode) {
                            const value = verificationCode[key];
                            if (typeof value === 'string' && /^\d{6}$/.test(value)) {
                                verificationCode = value;
                                break;
                            }
                        }
                    }
                }

                // 最终验证
                if (typeof verificationCode !== 'string') {
                    verificationCode = String(verificationCode);
                    logger.warn(`转换后的验证码类型: ${typeof verificationCode}`);
                }

                logger.info(`收到验证码: ${verificationCode}`);
                return verificationCode;
            } else {
                logger.warn('获取验证码失败，将重试');
            }
        } catch (error) {
            logger.error(`获取验证码失败，重试 ${attempts}/${maxAttempts}:`, error);
            verificationCode = null;
        }

        // 等待重试
        await new Promise(resolve => setTimeout(resolve, retryInterval));
    }

    throw new Error('获取验证码失败，达到最大重试次数');
}

// 完整的一键注册流程
router.post('/complete', async (req, res) => {
    let accountDataHandler = null;
    let emailHandler = null;
    let browser = null;
    let page = null;
    
    try {
        // 获取配置
        const config = getConfig();

        // 初始化数据处理器
        logger.info('初始化数据处理器...');
        accountDataHandler = new AccountDataHandler();
        await accountDataHandler.initialize();
        logger.info('数据处理器初始化完成');

        // 根据配置初始化邮件处理器
        logger.info('初始化邮件处理器...');
        emailHandler = new EmailHandler(config);
        await emailHandler.initialize();
        logger.info('EmailHandler 初始化完成');

        // 初始化浏览器
        logger.info('初始化浏览器...');
        const browserInitializer = new BrowserInitializer(config);
        const { browser: initBrowser, page: initialPage } = await browserInitializer.initBrowser();
        browser = initBrowser;
        logger.info('浏览器初始化完成');

        // 创建账号生成器实例
        logger.info('创建账号生成器实例...');
        const accountGenerator = new AccountGenerator(config);
        
        // 生成新的账号信息
        logger.info('开始生成新的账号信息...');
        const account = await accountGenerator.generateAccount();
        logger.info('账号信息生成完成，但尚未保存到数据库');
        
        // 执行注册流程
        logger.info(`开始执行 ${config.registration.type} 注册流程...`);
        let registrationFlow;
        if (config.registration.type === 'cursor') {
            registrationFlow = new Cursor();
        } else if (config.registration.type === 'copilot') {
            registrationFlow = new Copilot();
        } else {
            throw new Error(`不支持的注册流程类型: ${config.registration.type}`);
        }

        // 自动注册流程
        const registerStartTime = Date.now();
        logger.info(`开始注册流程的时间: ${new Date(registerStartTime).toLocaleString()}`);
        
        if (config.registration.manual) {
            // 手动注册流程
            const { browser: registerBrowser, page: registrationPage } = await registrationFlow.manualRegister(browser, initialPage, account);
            browser = registerBrowser;
            page = registrationPage;
            
            logger.info('请在浏览器中手动完成注册步骤');
            return res.json({
                success: true,
                message: '请在浏览器中完成手动注册步骤',
                account
            });
        } else {
            // 自动注册流程
            const { browser: registerBrowser, page: registrationPage } = await registrationFlow.register(browser, initialPage, account);
            browser = registerBrowser;
            page = registrationPage;
            logger.info(`${config.registration.type} 注册流程执行完成，等待验证码`);
        }

        // 等待接收验证码邮件
        logger.info(`使用IMAP邮箱 ${config.email.user} 接收验证码`);
        const verificationCode = await getVerificationCode(account, config, {
            browser,
            registrationFlow,
            emailHandler,
            requestStartTime: registerStartTime
        });

        if (config.registration.manual) {
            return res.json({
                success: true,
                message: '请在页面中手动输入验证码',
                account,
                verificationCode
            });
        } else {
            // 自动填写验证码
            const { browser: verifiedBrowser, page: verifiedPage } = await registrationFlow.fillVerificationCode(browser, page, account, verificationCode);
            browser = verifiedBrowser;
            page = verifiedPage;
        }

        // 获取 session token
        logger.info('正在获取登录信息...');
        const sessionCookie = await registrationFlow.getSessionCookie(page);
        const sessionToken = await registrationFlow.getSessionToken(sessionCookie);
        if (!sessionToken) {
            throw new Error('获取 session token 失败');
        }
        logger.info('成功获取 session token');

        // 更新认证信息
        const authSuccess = await registrationFlow.updateAuth(
            account.email,
            sessionToken,
            sessionToken
        );

        if (!authSuccess) {
            throw new Error('更新认证信息失败');
        }
        logger.info('认证信息更新成功');

        // 重置机器码
        logger.info('正在重置机器码...');
        await registrationFlow.resetMachineCodes();
        logger.info('机器码重置完成');

        // 只有在整个流程都成功完成后，才将账号添加到数据库
        const newRecord = {
            ...account,
            status: AccountDataHandler.AccountStatus.VERIFIED,
            verificationCode,
            cookie: sessionCookie,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 检查邮箱是否已存在
        const existingRecords = await accountDataHandler.readRecords();
        const existingRecord = existingRecords.find(r => r.email === account.email);
        
        if (existingRecord) {
            logger.info('邮箱已存在于数据库中，更新现有记录');
            await accountDataHandler.updateRecord(account.email, newRecord);
        } else {
            await accountDataHandler.appendRecord(newRecord);
        }
        logger.info('账号信息已保存到数据库');

        res.json({
            success: true,
            message: '注册流程已完成',
            account: { ...account, verificationCode }
        });

    } catch (error) {
        logger.error('注册流程执行失败:', error);
        res.status(500).json({
            success: false,
            error: '注册流程执行失败',
            message: error.message
        });
    } finally {
        // 清理资源
        try {
            // 按照依赖关系顺序关闭资源
            if (emailHandler) {
                logger.info('正在关闭邮件处理器...');
                await emailHandler.close().catch(err => logger.warn('关闭邮件处理器时出错:', err));
                logger.info('邮件处理器已关闭');
            }
            
            if (page) {
                logger.info('正在关闭页面...');
                await page.close().catch(err => logger.warn('关闭页面时出错:', err));
            }
            
            if (browser) {
                logger.info('正在关闭浏览器...');
                await browser.close().catch(err => logger.warn('关闭浏览器时出错:', err));
                logger.info('浏览器已关闭');
            }
            
            logger.info('所有资源已清理完毕');
        } catch (cleanupError) {
            logger.error('清理资源时发生错误:', cleanupError);
        }
    }
});

// 单独的注册流程
router.post('/register', async (req, res) => {
    let browser = null;
    let page = null;
    let emailHandler = null;
    let accountDataHandler = null;

    try {
        const { email, firstname, lastname, username, password } = req.body;

        // 验证必要的输入参数
        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: '无效的邮箱地址'
            });
        }

        if (!firstname || !lastname || !username || !password) {
            return res.status(400).json({
                success: false,
                error: '缺少必要的注册信息'
            });
        }

        // 获取配置
        const config = getConfig();

        // 初始化数据处理器
        logger.info('初始化数据处理器...');
        accountDataHandler = new AccountDataHandler();
        await accountDataHandler.initialize();
        logger.info('数据处理器初始化完成');

        // 根据配置初始化邮件处理器
        logger.info('初始化邮件处理器...');
        emailHandler = new EmailHandler(config);
        await emailHandler.initialize();
        logger.info('EmailHandler 初始化完成');

        // 初始化浏览器
        logger.info('初始化浏览器...');
        const browserInitializer = new BrowserInitializer(config);
        const { browser: initBrowser, page: initialPage } = await browserInitializer.initBrowser();
        browser = initBrowser;
        logger.info('浏览器初始化完成');

        // 准备账号信息
        const account = {
            email,
            firstname,
            lastname,
            username,
            password,
            status: AccountDataHandler.AccountStatus.CREATED,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 添加新记录
        const newRecord = {
            ...account,
            status: AccountDataHandler.AccountStatus.CREATED,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        try {
            // 检查邮箱是否已存在
            const existingRecords = await accountDataHandler.readRecords();
            const existingRecord = existingRecords.find(r => r.email === account.email);
            
            if (existingRecord) {
                logger.info('邮箱已存在于数据库中，更新现有记录');
                await accountDataHandler.updateRecord(account.email, newRecord);
            } else {
                await accountDataHandler.appendRecord(newRecord);
            }
            logger.info('账号信息已保存到数据库');
        } catch (error) {
            logger.error('保存账号信息失败，但继续执行:', error);
            // 即使数据库操作失败，仍继续执行流程
        }

        // 执行注册流程
        logger.info(`开始执行 ${config.registration.type} 注册流程...`);
        let registrationFlow;
        if (config.registration.type === 'cursor') {
            registrationFlow = new Cursor();
        } else if (config.registration.type === 'copilot') {
            registrationFlow = new Copilot();
        } else {
            throw new Error(`不支持的注册流程类型: ${config.registration.type}`);
        }

        // 执行自动注册流程
        const registerStartTime = Date.now();
        logger.info(`开始注册流程的时间: ${new Date(registerStartTime).toLocaleString()}`);
        
        const { browser: registerBrowser, page: registrationPage } = await registrationFlow.register(browser, initialPage, account);
        browser = registerBrowser;
        page = registrationPage;
        logger.info(`${config.registration.type} 注册流程执行完成，等待验证码`);

        // 等待接收验证码邮件
        logger.info(`使用IMAP邮箱 ${config.email.user} 接收验证码`);
        const verificationCode = await getVerificationCode(account, config, {
            browser,
            registrationFlow,
            emailHandler,
            requestStartTime: registerStartTime
        });

        // 更新记录
        try {
            await accountDataHandler.updateRecord(
                account.email,
                { 
                    status: AccountDataHandler.AccountStatus.CODE_RECEIVED,
                    verificationCode,
                    updatedAt: new Date().toISOString()
                }
            );
            logger.info('验证码已更新到数据库');
        } catch (error) {
            logger.error('更新验证码到数据库失败，但继续执行:', error);
            // 即使数据库操作失败，仍继续执行流程
        }

        // 自动填写验证码
        const { browser: verifiedBrowser, page: verifiedPage } = await registrationFlow.fillVerificationCode(browser, page, account, verificationCode);
        browser = verifiedBrowser;
        page = verifiedPage;

        // 更新账号状态为已验证
        try {
            await accountDataHandler.updateRecord(
                account.email,
                { 
                    status: AccountDataHandler.AccountStatus.VERIFIED,
                    updatedAt: new Date().toISOString()
                }
            );
            logger.info('账号状态已更新为已验证');
        } catch (error) {
            logger.error('更新账号状态失败，但继续执行:', error);
            // 即使数据库操作失败，仍继续执行流程
        }

        res.json({
            success: true,
            message: '注册流程已完成',
            account: { ...account, verificationCode }
        });

    } catch (error) {
        logger.error('注册流程执行失败:', error);
        res.status(500).json({
            success: false,
            error: '注册流程执行失败',
            message: error.message
        });
    } finally {
        // 清理资源
        try {
            // 按照依赖关系顺序关闭资源
            if (emailHandler) {
                logger.info('正在关闭邮件处理器...');
                await emailHandler.close().catch(err => logger.warn('关闭邮件处理器时出错:', err));
                logger.info('邮件处理器已关闭');
            }
            
            if (page) {
                logger.info('正在关闭页面...');
                await page.close().catch(err => logger.warn('关闭页面时出错:', err));
            }
            
            if (browser) {
                logger.info('正在关闭浏览器...');
                await browser.close().catch(err => logger.warn('关闭浏览器时出错:', err));
                logger.info('浏览器已关闭');
            }
            
            logger.info('所有资源已清理完毕');
        } catch (cleanupError) {
            logger.error('清理资源时发生错误:', cleanupError);
        }
    }
});

// 单步登录流程
router.post('/login', async (req, res) => {
    let accountDataHandler = null;

    try {
        const { email, password } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({
                success: false,
                error: '无效的邮箱地址'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                error: '密码不能为空'
            });
        }

        // 初始化数据处理器
        logger.info('初始化数据处理器...');
        accountDataHandler = new AccountDataHandler();
        await accountDataHandler.initialize();
        logger.info('数据处理器初始化完成');

        // 初始化浏览器
        logger.info('正在初始化浏览器...');
        
        const config = getConfig();
        const browserInitializer = new BrowserInitializer(config);
        const { browser, page } = await browserInitializer.initBrowser();

        if (!browser || !page) {
            throw new Error('浏览器实例未初始化，请先调用初始化接口');
        }

        // 根据配置初始化对应的 flow
        const Flow = config.registration.type === 'copilot' ? Copilot : Cursor;
        const flow = new Flow();

        // 重置机器码
        logger.info('正在重置机器码...');
        await flow.resetMachineCodes();
        logger.info('机器码重置完成');

        // 执行登录流程
        logger.info('正在执行登录流程...');
        const account = { email, password };
        const { browser: loginBrowser, page: loginPage } = await flow.login(browser, page, account);
        logger.info('浏览器已准备就绪，请在浏览器中完成登录');

        logger.info('正在获取登录信息...');

        // 获取 session token
        const sessionCookie = await flow.getSessionCookie(loginPage);
        const sessionToken = await flow.getSessionToken(sessionCookie);
        if (!sessionToken) {
            throw new Error('获取 session token 失败');
        }
        logger.info('成功获取 session token');

        // 设置token
        await flow.updateAuth(account.email, sessionToken, sessionToken)

        // 更新账号Cooie
        await accountDataHandler.updateRecord(
            account.email,
            { 
                cookie: sessionCookie,
                updatedAt: new Date().toISOString()
            }
        );
        logger.info('账号Cookie已更新');

        // 清理资源
        if (loginPage) {
            await loginPage.close();
        }
        if (loginBrowser) {
            await loginBrowser.close();
        }

        logger.info('登录流程已完成');

        res.json({
            success: true,
            message: '登录流程已完成'
        });

    } catch (error) {
        logger.error('初始化登录流程失败:', error);
        res.status(500).json({
            success: false,
            error: '初始化登录流程失败',
            message: error.message
        });
    }
});

// 快速生成/绑定账号（不执行退出Cursor和重置机器码）
router.post('/quick-generate', async (req, res) => {
    let accountDataHandler = null;
    let emailHandler = null;
    let browser = null;
    let page = null;
    
    try {
        // 获取配置
        const config = getConfig();

        // 初始化数据处理器
        logger.info('初始化数据处理器...');
        accountDataHandler = new AccountDataHandler();
        await accountDataHandler.initialize();
        logger.info('数据处理器初始化完成');

        // 根据配置初始化邮件处理器
        logger.info('初始化邮件处理器...');
        emailHandler = new EmailHandler(config);
        await emailHandler.initialize();
        logger.info('EmailHandler 初始化完成');

        // 初始化浏览器
        logger.info('初始化浏览器...');
        const browserInitializer = new BrowserInitializer(config);
        const { browser: initBrowser, page: initialPage } = await browserInitializer.initBrowser();
        browser = initBrowser;
        logger.info('浏览器初始化完成');

        // 创建账号生成器实例
        logger.info('创建账号生成器实例...');
        const accountGenerator = new AccountGenerator(config);
        
        // 生成新的账号信息
        logger.info('开始生成新的账号信息...');
        const account = await accountGenerator.generateAccount();
        logger.info('账号信息生成完成，但尚未保存到数据库');
        
        // 执行注册流程
        logger.info(`开始执行 ${config.registration.type} 注册流程...`);
        let registrationFlow;
        if (config.registration.type === 'cursor') {
            registrationFlow = new Cursor();
        } else if (config.registration.type === 'copilot') {
            registrationFlow = new Copilot();
        } else {
            throw new Error(`不支持的注册流程类型: ${config.registration.type}`);
        }

        // 自动注册流程
        const registerStartTime = Date.now();
        logger.info(`开始注册流程的时间: ${new Date(registerStartTime).toLocaleString()}`);
        
        if (config.registration.manual) {
            // 手动注册流程
            const { browser: registerBrowser, page: registrationPage } = await registrationFlow.manualRegister(browser, initialPage, account);
            browser = registerBrowser;
            page = registrationPage;
            
            logger.info('请在浏览器中手动完成注册步骤');
            return res.json({
                success: true,
                message: '请在浏览器中完成手动注册步骤',
                account
            });
        } else {
            // 自动注册流程
            const { browser: registerBrowser, page: registrationPage } = await registrationFlow.register(browser, initialPage, account);
            browser = registerBrowser;
            page = registrationPage;
            logger.info(`${config.registration.type} 注册流程执行完成，等待验证码`);
        }

        // 等待接收验证码邮件
        logger.info(`使用IMAP邮箱 ${config.email.user} 接收验证码`);
        const verificationCode = await getVerificationCode(account, config, {
            browser,
            registrationFlow,
            emailHandler,
            requestStartTime: registerStartTime
        });

        if (config.registration.manual) {
            return res.json({
                success: true,
                message: '请在页面中手动输入验证码',
                account,
                verificationCode
            });
        } else {
            // 自动填写验证码
            const { browser: verifiedBrowser, page: verifiedPage } = await registrationFlow.fillVerificationCode(browser, page, account, verificationCode);
            browser = verifiedBrowser;
            page = verifiedPage;
        }

        // 获取 session token
        logger.info('正在获取登录信息...');
        const sessionCookie = await registrationFlow.getSessionCookie(page);
        const sessionToken = await registrationFlow.getSessionToken(sessionCookie);
        if (!sessionToken) {
            throw new Error('获取 session token 失败');
        }
        logger.info('成功获取 session token');

        // 更新认证信息
        const authSuccess = await registrationFlow.updateAuth(
            account.email,
            sessionToken,
            sessionToken
        );

        if (!authSuccess) {
            throw new Error('更新认证信息失败');
        }
        logger.info('认证信息更新成功');

        // 注意这里不执行退出Cursor和重置机器码操作
        logger.info('账号生成/绑定完成，不执行退出Cursor和重置机器码操作');

        // 只有在整个流程都成功完成后，才将账号添加到数据库
        const newRecord = {
            ...account,
            status: AccountDataHandler.AccountStatus.VERIFIED,
            verificationCode,
            cookie: sessionCookie,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // 检查邮箱是否已存在
        const existingRecords = await accountDataHandler.readRecords();
        const existingRecord = existingRecords.find(r => r.email === account.email);
        
        if (existingRecord) {
            logger.info('邮箱已存在于数据库中，更新现有记录');
            await accountDataHandler.updateRecord(account.email, newRecord);
        } else {
            await accountDataHandler.appendRecord(newRecord);
        }
        logger.info('账号信息已保存到数据库');

        res.json({
            success: true,
            message: '账号生成/绑定完成',
            account: { ...account, verificationCode }
        });

    } catch (error) {
        logger.error('账号生成/绑定失败:', error);
        res.status(500).json({
            success: false,
            error: '账号生成/绑定失败',
            message: error.message
        });
    } finally {
        // 清理资源
        try {
            // 按照依赖关系顺序关闭资源
            if (emailHandler) {
                logger.info('正在关闭邮件处理器...');
                await emailHandler.close().catch(err => logger.warn('关闭邮件处理器时出错:', err));
                logger.info('邮件处理器已关闭');
            }
            
            if (page) {
                logger.info('正在关闭页面...');
                await page.close().catch(err => logger.warn('关闭页面时出错:', err));
            }
            
            if (browser) {
                logger.info('正在关闭浏览器...');
                await browser.close().catch(err => logger.warn('关闭浏览器时出错:', err));
                logger.info('浏览器已关闭');
            }
            
            logger.info('所有资源已清理完毕');
        } catch (cleanupError) {
            logger.error('清理资源时发生错误:', cleanupError);
        }
    }
});

module.exports = router; 