const logger = require('../utils/logger');
const delay = require('../utils/delay');
const HumanBehavior = require('../utils/human-behavior');
const os = require('os');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const { execSync } = require('child_process');
const { spawn } = require('child_process');
const consoleHelper = require('../utils/console-helper');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const config = require('../utils/config');

class Cursor {
    constructor() {
        this.url = 'https://cursor.sh';
        this.humanBehavior = new HumanBehavior();
        
        // 获取资源路径 - 根据环境变量调整
        this.resourcePath = process.env.NODE_ENV === 'development'
            ? process.env.APP_ROOT  // 开发环境：使用 APP_ROOT
            : process.env.RES_PATH; // 生产环境：使用传入的 resourcesPath
    }

    /**
     * 获取脚本文件的完整路径
     * @param {string} scriptName - 脚本文件名
     * @returns {string} 脚本的完整路径
     */
    getScriptPath(scriptName) {
        return path.join(this.resourcePath, 'scripts', scriptName);
    }

    // 登录方法
    async login(browser, initPage, account) {
        let page;
        try {
            // 验证账号信息
            if (!account || !account.email || !account.password) {
                throw new Error('登录账号信息不完整');
            }
            logger.info('开始 Cursor 登录流程...');
            
            // 创建新的页面
            page = await browser.newPage();
            logger.info('创建新页面');
            
            // 构造登录链接并访问
            const challenge = crypto.randomBytes(16).toString('base64url');
            const uuid = crypto.randomUUID();
            const loginUrl = `${this.url}/loginDeepControl?challenge=${challenge}&uuid=${uuid}&mode=login`;
            logger.info(`访问登录链接: ${loginUrl}`);
            await page.goto(loginUrl);

            // 模拟初始浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);
            logger.info('完成初始人类行为模拟');

            // 填写邮箱
            const emailSelector = 'input[type="email"][placeholder="Your email address"]';
            await this.humanBehavior.simulateHumanTyping(page, emailSelector, account.email);
            logger.info('已填写邮箱');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 点击继续按钮
            const continueButtonSelector = 'button[type="submit"]';
            await page.waitForSelector(continueButtonSelector);
            await page.click(continueButtonSelector);
            logger.info('已点击继续按钮');

            // 等待页面跳转到密码输入页面
            await page.waitForNavigation().catch(() => {
                logger.info('页面可能没有跳转，继续执行');
            });

            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);
            
            // 填写密码
            const passwordSelector = 'input[type="password"][name="password"]';
            await this.humanBehavior.simulateHumanTyping(page, passwordSelector, account.password);
            logger.info('已填写密码');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 点击登录按钮
            const signInButtonSelector = 'button[type="submit"][name="intent"][value="password"]';
            await page.waitForSelector(signInButtonSelector);
            await page.click(signInButtonSelector);
            logger.info('已点击登录按钮');

            // 等待登录完成
            await page.waitForNavigation().catch(() => {
                logger.info('页面可能没有跳转，继续执行');
            });
            logger.info('登录流程执行完成');

            // 验证是否成功跳转到loginDeepControl页面
            const currentUrl = page.url();
            if (!currentUrl.includes('loginDeepControl')) {
                logger.error('页面未跳转到loginDeepControl页面');
                throw new Error('登录验证失败：未能进入loginDeepControl页面');
            }

            logger.info('登录验证成功：已进入loginDeepControl页面');

            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 点击"Yes, Log In"按钮
            const yesLoginButtonSelector = 'button:has-text("Yes, Log In")';
            await page.waitForSelector(yesLoginButtonSelector);
            await page.click(yesLoginButtonSelector);
            logger.info('已点击"Yes, Log In"按钮');

            // 等待页面跳转
            await page.waitForNavigation().catch(() => {
                logger.info('页面可能没有跳转，继续执行');
            });

            // 返回浏览器和页面对象，以便后续操作
            return { browser, page };
        } catch (error) {
            logger.error('Cursor 登录流程出错:', error);
            throw error;
        }
    }

    validateUserInfo(userInfo) {
        if (!userInfo || !userInfo.email || !userInfo.password || !userInfo.firstname || !userInfo.lastname) {
            throw new Error('用户信息不完整');
        }
    }

    // 手动注册方法
    async manualRegister(browser, initPage, userInfo) {
        let page;
        try {
            // 验证用户信息
            this.validateUserInfo(userInfo);
            logger.info('开始 Cursor 手动注册流程...');
            
            // 创建新的页面
            page = await browser.newPage();
            logger.info('创建新页面');
            
            // 打开 cursor.sh 页面
            await page.goto(this.url);
            logger.info('已打开 Cursor 页面');

            return { browser, page };
        } catch (error) {
            // 如果出错，关闭页面并抛出错误
            if (page) {
                await page.close();
                logger.info('出错关闭页面');
            }
            logger.error('Cursor 手动注册流程出错:', error);
            throw error;
        }
    }

    async register(browser, initPage, userInfo) {
        let page;
        try {
            // 验证用户信息
            this.validateUserInfo(userInfo);
            logger.info('开始 Cursor 注册流程...');
            
            // 创建新的页面
            page = await browser.newPage();
            logger.info('创建新页面');
            
            // 打开 cursor.sh 页面
            await page.goto(this.url);
            logger.info('已打开 Cursor 页面');
            
            // 模拟初始浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 等待并点击登录按钮
            const loginButtonSelector = 'a[href^="/api/auth/login"]';
            await page.waitForSelector(loginButtonSelector);
            await page.click(loginButtonSelector);
            await page.waitForNavigation();
            logger.info('已点击登录按钮并等待页面跳转完成');
            
            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);
            
            const signUpSelector = 'a[href^="/sign-up"]';
            await page.waitForSelector(signUpSelector);
            await page.click(signUpSelector);
            await page.waitForNavigation();
            logger.info('已点击注册链接并等待页面跳转完成');

            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 填写注册表单
            logger.info('开始填写注册表单...');
            
            // 填写名字
            const firstNameSelector = 'input[name="first_name"][placeholder="Your first name"]';
            await this.humanBehavior.simulateHumanTyping(page, firstNameSelector, userInfo.firstname.toString().trim());
            logger.info('已填写名字');

            // 填写姓氏
            const lastNameSelector = 'input[name="last_name"][placeholder="Your last name"]';
            await this.humanBehavior.simulateHumanTyping(page, lastNameSelector, userInfo.lastname.toString().trim());
            logger.info('已填写姓氏');

            // 填写邮箱
            const emailSelector = 'input[type="email"][name="email"][placeholder="Your email address"]';
            await this.humanBehavior.simulateHumanTyping(page, emailSelector, userInfo.email.toString().trim());
            logger.info('已填写邮箱');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 点击继续按钮
            const continueButtonSelector = 'button[type="submit"][value="sign-up"]';
            await page.waitForSelector(continueButtonSelector);
            await page.click(continueButtonSelector);
            logger.info('已点击继续按钮');

            // 等待跳转到密码页面
            await page.waitForNavigation();
            logger.info('已跳转到密码页面');

            // 模拟浏览行为
            await this.humanBehavior.simulateHumanBehavior(page);

            // 填写密码
            const passwordSelector = 'input[type="password"]';
            await this.humanBehavior.simulateHumanTyping(page, passwordSelector, userInfo.password.toString().trim());
            logger.info('已填写密码');

            // 模拟思考行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });

            // 点击注册按钮
            const registerButtonSelector = 'button[type="submit"]';
            await page.waitForSelector(registerButtonSelector);
            await page.click(registerButtonSelector);
            logger.info('已点击注册按钮');

            // 等待跳转到验证码页面
            await page.waitForNavigation();
            logger.info('已跳转到验证码页面');

            // 返回浏览器和页面对象，以便后续填写验证码
            return { browser, page };
        } catch (error) {
            // 如果出错，关闭页面并抛出错误
            if (page) {
                await page.close();
                logger.info('出错关闭页面');
            }
            logger.error('Cursor 注册流程出错:', error);
            throw error;
        }
    }

    async fillVerificationCode(browser, page, account, verificationCode) {
        try {
            logger.info('开始填写验证码...');
            
            // 验证验证码格式
            if (!verificationCode || typeof verificationCode !== 'string' || verificationCode.trim() === '') {
                throw new Error('验证码不能为空');
            }

            // 模拟初始浏览行为
            await this.humanBehavior.simulateHumanBehavior(page, { duration: 1500, movements: 3 });

            // 等待第一个验证码输入框出现
            const codeInputSelector = 'input[data-test="otp-input"]';
            await page.waitForSelector(codeInputSelector);

            // 获取所有验证码输入框
            const inputs = await page.$$('input[inputmode="numeric"][maxlength="1"]');
            
            // 逐个填写验证码数字，每个数字之间添加随机延迟
            const codeDigits = verificationCode.trim().split('');
            for (let i = 0; i < codeDigits.length && i < inputs.length; i++) {
                // 每个数字输入前添加随机延迟
                await delay(500 + Math.random() * 1000);
                await inputs[i].type(codeDigits[i]);
                logger.info(`已填写第 ${i + 1} 位验证码`);
            }

            // 等待页面自动跳转
            await page.waitForNavigation({ timeout: 30000 }).catch(error => {
                logger.warn('等待页面跳转超时，可能已经跳转完成');
            });
            logger.info('验证码填写完成');

            // 验证是否成功跳转到设置页面
            const currentUrl = page.url();
            if (!currentUrl.includes('/settings')) {
                logger.error('页面未跳转到设置页面');
                throw new Error('登录验证失败：未能进入设置页面');
            }

            logger.info('登录验证成功：已进入设置页面');
            return { browser, page };
        } catch (error) {
            logger.error('验证码填写出错:', error);
            throw error;
        }
    }

    // 解析验证码
    extractVerificationCode(emailContent) {
        try {
            // 查找验证码的几种模式:
            // 1. 在 "code below" 之后的 6 位数字
            // 2. 在邮件正文中单独出现的 6 位数字
            // 3. 在 "code is" 之后的 6 位数字
            const patterns = [
                /code below[^0-9]*(\d{6})/i,
                /\b(\d{6})\b(?=(?:[^"]*"[^"]*")*[^"]*$)/,
                /code is[^0-9]*(\d{6})/i
            ];

            for (const pattern of patterns) {
                const matches = emailContent.match(pattern);
                if (matches && matches[1]) {
                    return matches[1];
                }
            }

            // 如果上述模式都没匹配到，抛出错误
            throw new Error('无法从邮件中提取验证码');
        } catch (error) {
            logger.error('提取验证码失败:', error);
            throw error;
        }
    }

    // 获取验证邮件发送者地址
    getVerificationEmailSender() {
        return 'no-reply@cursor.sh';
    }

    async getSessionCookie(page, maxAttempts = 3, retryInterval = 2000) {
        logger.info('开始获取 Cursor session token...');
        let attempts = 0;

        while (attempts < maxAttempts) {
            try {
                // 获取所有 cookies
                const client = await page.target().createCDPSession();
                const { cookies } = await client.send('Network.getAllCookies');
                
                // 查找 WorkosCursorSessionToken
                const sessionCookie = cookies.find(cookie => cookie.name === 'WorkosCursorSessionToken');
                
                if (sessionCookie) {
                    logger.info('成功获取 Cursor session cookie');
                    await client.detach();
                    return sessionCookie.value;
                }

                await client.detach();
                attempts++;
                if (attempts < maxAttempts) {
                    logger.warn(`第 ${attempts} 次尝试未获取到 CursorSessionCookie，${retryInterval/1000}秒后重试...`);
                    await delay(retryInterval);
                } else {
                    logger.error(`已达到最大尝试次数(${maxAttempts})，获取 CursorSessionCookie 失败`);
                }
            } catch (error) {
                logger.error('获取 cookie 失败:', error);
                attempts++;
                if (attempts < maxAttempts) {
                    logger.info(`将在 ${retryInterval/1000} 秒后重试...`);
                    await delay(retryInterval);
                }
            }
        }

        return null;
    }

    async getSessionToken(sessionCookie = '') {
        logger.info('开始获取 Cursor session token...');

        if (sessionCookie) {
            const tokenValue = decodeURIComponent(sessionCookie).split('::')[1];
            logger.info('成功获取 Cursor session token');
            return tokenValue;
        }

        logger.error('获取 cookie 失败:', error);
        return null;
    }

    async getUseage(sessionCookie = '') {
        logger.info('开始获取 Cursor 使用情况...');

        try {
            if (!sessionCookie) {
                throw new Error('Session cookie 不能为空');
            }

            // 从 cookie 中提取 user ID
            const userId = decodeURIComponent(sessionCookie).split('::')[0];
            
            // 创建基础请求配置
            const axiosConfig = {
                baseURL: 'https://www.cursor.com',
                headers: {
                    'accept': '*/*',
                    'accept-encoding': 'gzip, deflate, br, zstd',
                    'accept-language': 'en-US,en;q=0.9',
                    'cookie': `NEXT_LOCALE=en; WorkosCursorSessionToken=${sessionCookie}`,
                    'referer': 'https://www.cursor.com/settings',
                    'sec-ch-ua': this.humanBehavior.getRandomSecChUa(),
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'user-agent': this.humanBehavior.getRandomUserAgent()
                }
            };

            // 如果启用了代理，添加代理配置
            if (this.proxyConfig && this.proxyConfig.enabled) {
                const { protocol, host, port } = this.proxyConfig;
                const proxyUrl = `${protocol}://${host}:${port}`;

                switch (protocol) {
                    case 'socks5':
                        axiosConfig.httpsAgent = new SocksProxyAgent(proxyUrl);
                        break;
                    case 'http':
                        axiosConfig.httpAgent = new HttpProxyAgent(proxyUrl);
                        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
                        break;
                    case 'https':
                        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
                        break;
                }
                logger.info('已启用代理配置:', { protocol, host, port });
            }

            // 创建 axios 实例并发送请求
            const axiosInstance = axios.create(axiosConfig);
            const response = await axiosInstance.get(`/api/usage?user=${userId}`);

            if (response.status === 200) {
                logger.info('成功获取使用情况');
                const usage = response.data['gpt-4'];
                const data = {
                    maxRequestUsage: usage.maxRequestUsage,
                    numRequests: usage.numRequests,
                }
                return data;
            } else {
                throw new Error(`请求失败: ${response.status}`);
            }

        } catch (error) {
            logger.error('获取使用情况失败:', error);
            throw error;
        }
    }

    async getDbPath() {
        const os = require('os');
        const path = require('path');
        const platform = os.platform();

        let dbPath;
        if (platform === 'win32') {
            const appdata = process.env.APPDATA;
            if (!appdata) {
                throw new Error('APPDATA 环境变量未设置');
            }
            dbPath = path.join(appdata, 'Cursor', 'User', 'globalStorage', 'state.vscdb');
        } else if (platform === 'darwin') {
            dbPath = path.resolve(os.homedir(), 'Library/Application Support/Cursor/User/globalStorage/state.vscdb');
        } else if (platform === 'linux') {
            dbPath = path.resolve(os.homedir(), '.config/Cursor/User/globalStorage/state.vscdb');
        } else {
            throw new Error(`不支持的操作系统: ${platform}`);
        }

        return dbPath;
    }

    async updateAuth(email = null, accessToken = null, refreshToken = null) {
        logger.info('开始更新 Cursor 认证信息...');

        const updates = [
            ['cursorAuth/cachedSignUpType', 'Auth_0']
        ];

        if (email !== null) {
            updates.push(['cursorAuth/cachedEmail', email]);
        }
        if (accessToken !== null) {
            updates.push(['cursorAuth/accessToken', accessToken]);
        }
        if (refreshToken !== null) {
            updates.push(['cursorAuth/refreshToken', refreshToken]);
        }

        if (updates.length === 1) {
            logger.warn('没有提供任何要更新的值');
            return false;
        }

        try {
            const dbPath = await this.getDbPath();
            
            return new Promise((resolve, reject) => {
                // 打开数据库连接
                const db = new sqlite3.Database(dbPath, async (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    try {
                        for (const [key, value] of updates) {
                            // 检查键是否存在
                            await new Promise((res, rej) => {
                                db.get('SELECT COUNT(*) as count FROM itemTable WHERE key = ?', [key], async (err, row) => {
                                    if (err) {
                                        rej(err);
                                        return;
                                    }

                                    try {
                                        if (row.count === 0) {
                                            // 插入新记录
                                            await new Promise((resolve, reject) => {
                                                db.run('INSERT INTO itemTable (key, value) VALUES (?, ?)', [key, value], (err) => {
                                                    if (err) reject(err);
                                                    else {
                                                        logger.info(`插入新记录: ${key.split('/').pop()}`);
                                                        resolve();
                                                    }
                                                });
                                            });
                                        } else {
                                            // 更新现有记录
                                            await new Promise((resolve, reject) => {
                                                db.run('UPDATE itemTable SET value = ? WHERE key = ?', [value, key], function(err) {
                                                    if (err) reject(err);
                                                    else {
                                                        if (this.changes > 0) {
                                                            logger.info(`成功更新: ${key.split('/').pop()}`);
                                                        } else {
                                                            logger.warn(`未找到 ${key.split('/').pop()} 或值未变化`);
                                                        }
                                                        resolve();
                                                    }
                                                });
                                            });
                                        }
                                        res();
                                    } catch (error) {
                                        rej(error);
                                    }
                                });
                            });
                        }

                        db.close((err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            logger.info('认证信息更新完成');
                            resolve(true);
                        });
                    } catch (error) {
                        db.close(() => reject(error));
                    }
                });
            });

        } catch (error) {
            logger.error('更新认证信息失败:', error);
            return false;
        }
    }

    /**
     * 从 SQLite 数据库中获取 Cursor 认证信息
     * @returns {Promise<{email: string|null, accessToken: string|null, refreshToken: string|null}>} 包含认证信息的对象
     */
    async getAuth() {
        logger.info('开始获取 Cursor 认证信息...');

        try {
            const dbPath = await this.getDbPath();
            
            return new Promise((resolve, reject) => {
                // 打开数据库连接
                const db = new sqlite3.Database(dbPath, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // 准备查询的键
                    const keys = [
                        'cursorAuth/cachedEmail',
                        'cursorAuth/accessToken',
                        'cursorAuth/refreshToken'
                    ];

                    // 存储结果的对象
                    const result = {
                        email: null,
                        accessToken: null,
                        refreshToken: null
                    };

                    // 使用 Promise.all 并行查询所有键
                    Promise.all(keys.map(key => {
                        return new Promise((resolve, reject) => {
                            db.get('SELECT value FROM itemTable WHERE key = ?', [key], (err, row) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }

                                // 根据键名设置对应的值
                                switch (key) {
                                    case 'cursorAuth/cachedEmail':
                                        result.email = row ? row.value : null;
                                        break;
                                    case 'cursorAuth/accessToken':
                                        result.accessToken = row ? row.value : null;
                                        break;
                                    case 'cursorAuth/refreshToken':
                                        result.refreshToken = row ? row.value : null;
                                        break;
                                }
                                resolve();
                            });
                        });
                    }))
                    .then(() => {
                        db.close((err) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            logger.info('成功获取认证信息');
                            resolve(result);
                        });
                    })
                    .catch(error => {
                        db.close(() => reject(error));
                    });
                });
            });

        } catch (error) {
            logger.error('获取认证信息失败:', error);
            return {
                email: null,
                accessToken: null,
                refreshToken: null
            };
        }
    }

    /**
     * 获取Cursor的storage.json文件路径
     * @returns {string} storage.json文件的完整路径
     */
    getStoragePath() {
        const platform = os.platform();
        
        let storagePath;
        if (platform === 'win32') {
            const appdata = process.env.APPDATA;
            if (!appdata) {
                throw new Error('APPDATA 环境变量未设置');
            }
            storagePath = path.join(appdata, 'Cursor', 'User', 'globalStorage', 'storage.json');
        } else if (platform === 'darwin') {
            storagePath = path.resolve(os.homedir(), 'Library/Application Support/Cursor/User/globalStorage/storage.json');
        } else if (platform === 'linux') {
            storagePath = path.resolve(os.homedir(), '.config/Cursor/User/globalStorage/storage.json');
        } else {
            throw new Error(`不支持的操作系统: ${platform}`);
        }

        return storagePath;
    }

    /**
     * 获取Cursor配置文件目录
     * @returns {string} Cursor配置文件的根目录
     */
    getCursorConfigDir() {
        const platform = os.platform();
        
        let configDir;
        if (platform === 'win32') {
            const appdata = process.env.APPDATA;
            if (!appdata) {
                throw new Error('APPDATA 环境变量未设置');
            }
            configDir = path.join(appdata, 'Cursor');
        } else if (platform === 'darwin') {
            configDir = path.resolve(os.homedir(), 'Library/Application Support/Cursor');
        } else if (platform === 'linux') {
            configDir = path.resolve(os.homedir(), '.config/Cursor');
        } else {
            throw new Error(`不支持的操作系统: ${platform}`);
        }

        return configDir;
    }

    /**
     * 获取Cursor可执行文件路径
     * @returns {string} Cursor可执行文件的完整路径
     */
    getCursorExecutablePath() {
        const platform = os.platform();
        const configuration = config.getConfig();
        
        // 如果配置文件中指定了路径，则使用配置的路径
        if (configuration.cursor && configuration.cursor.executablePath) {
            return configuration.cursor.executablePath;
        }
        
        // 否则根据平台返回默认路径
        if (platform === 'win32') {
            return path.join(process.env.LOCALAPPDATA, 'Programs', 'cursor', 'Cursor.exe');
        } else if (platform === 'darwin') {
            return '/Applications/Cursor.app/Contents/MacOS/Cursor';
        } else if (platform === 'linux') {
            return '/usr/bin/cursor'; // 假设安装在标准位置
        } else {
            throw new Error(`不支持的操作系统: ${platform}`);
        }
    }

    /**
     * 终止Cursor进程
     * @returns {Promise<boolean>} 终止成功返回true，否则返回false
     */
    async killCursorProcess() {
        try {
            const platform = os.platform();
            logger.info('正在终止Cursor进程...');
            
            let killed = false;
            if (platform === 'win32') {
                try {
                    execSync('taskkill /F /IM Cursor.exe', { stdio: 'ignore' });
                    killed = true;
                } catch (error) {
                    logger.warn('通过taskkill终止Cursor进程失败:', error.message);
                }
            } else {
                try {
                    execSync('pkill -f Cursor', { stdio: 'ignore' });
                    killed = true;
                } catch (error) {
                    logger.warn('通过pkill终止Cursor进程失败:', error.message);
                }
            }
            
            // 验证进程是否已终止
            const retryCount = 5;
            const retryDelay = 1000; // 1秒
            
            for (let i = 0; i < retryCount; i++) {
                // 检查进程是否仍在运行
                let isRunning = false;
                
                if (platform === 'win32') {
                    try {
                        const result = execSync('tasklist /FI "IMAGENAME eq Cursor.exe" /NH', { encoding: 'utf8' });
                        isRunning = result.includes('Cursor.exe');
                    } catch (error) {
                        logger.warn('检查Windows进程状态失败:', error.message);
                    }
                } else {
                    try {
                        const result = execSync('pgrep -f Cursor', { encoding: 'utf8' });
                        isRunning = result.trim().length > 0;
                    } catch (error) {
                        // pgrep返回非零状态码表示没有找到进程，这是我们想要的
                        isRunning = false;
                    }
                }
                
                if (!isRunning) {
                    logger.info('Cursor进程已成功终止');
                    return true;
                }
                
                logger.warn(`Cursor进程仍在运行，等待终止 (尝试 ${i+1}/${retryCount})...`);
                await delay(retryDelay);
            }
            
            logger.error('无法完全终止Cursor进程');
            return killed;
        } catch (error) {
            logger.error('终止Cursor进程时出错:', error);
            return false;
        }
    }

    /**
     * 生成新的随机ID
     * @returns {Object} 包含新ID的对象
     */
    generateNewMachineIds() {
        // 生成新的UUID (devDeviceId)
        const devDeviceId = crypto.randomUUID();
        
        // 生成新的machineId (64个字符的十六进制)
        const machineId = crypto.randomBytes(32).toString('hex');
        
        // 生成新的macMachineId (64个字符的十六进制，与machineId格式相同)
        const macMachineId = crypto.randomBytes(32).toString('hex');
        
        // 生成新的sqmId，格式为 {UUID}，且为大写
        const sqmId = `{${crypto.randomUUID().toUpperCase()}}`;
        
        return {
            'telemetry.machineId': machineId,
            'telemetry.macMachineId': macMachineId,
            'telemetry.devDeviceId': devDeviceId,
            'telemetry.sqmId': sqmId
        };
    }

    /**
     * 重置机器码
     * 不依赖外部脚本，直接在JS中实现
     * @returns {Promise<boolean>} 重置成功返回 true，失败返回 false
     */
    async resetMachineCodes() {
        try {
            logger.info('开始重置Cursor机器码...');
            
            // 步骤1: 终止Cursor进程
            const processKilled = await this.killCursorProcess();
            if (!processKilled) {
                logger.warn('Cursor进程终止不完全，继续尝试重置...');
            }
            
            // 步骤2: 获取storage.json文件路径和配置目录
            const storagePath = this.getStoragePath();
            const configDir = this.getCursorConfigDir();
            
            // 步骤3: 检查配置目录是否存在，存在则清理
            const configDirExists = await fs.access(configDir).then(() => true).catch(() => false);
            
            if (configDirExists) {
                logger.info('配置目录已存在，将清理整个配置目录...');
                try {
                    // 删除整个配置目录
                    await fs.rm(configDir, { recursive: true, force: true });
                    logger.info('已清理整个配置目录');
                } catch (error) {
                    logger.warn('清理配置目录时出错:', error.message);
                }
            } else {
                logger.info('配置目录不存在，将创建新配置...');
            }
            
            // 步骤4: 启动Cursor生成配置文件
            logger.info('将启动Cursor生成配置文件...');
            
            // 获取Cursor可执行文件路径
            const cursorExecutable = this.getCursorExecutablePath();
            
            // 检查可执行文件是否存在
            try {
                await fs.access(cursorExecutable);
            } catch (error) {
                logger.error(`Cursor可执行文件不存在: ${cursorExecutable}`);
                return false;
            }
            
            // 启动Cursor进程
            logger.info(`正在启动Cursor: ${cursorExecutable}`);
            const cursorProcess = spawn(cursorExecutable, [], {
                detached: true,
                stdio: 'ignore'
            });
            
            // 分离进程，让它在后台运行
            cursorProcess.unref();
            
            // 等待配置文件生成，最多等待30秒
            logger.info('等待配置文件生成...');
            const maxWaitTime = 30000; // 30秒
            const checkInterval = 1000; // 每秒检查一次
            const startTime = Date.now();
            
            let configCreated = false;
            while (Date.now() - startTime < maxWaitTime) {
                // 检查配置文件是否存在
                configCreated = await fs.access(storagePath).then(() => true).catch(() => false);
                if (configCreated) {
                    logger.info('配置文件已生成');
                    break;
                }
                logger.info(`等待配置文件生成... (${Math.floor((Date.now() - startTime) / 1000)}秒)`);
                await delay(checkInterval);
            }
            
            // 终止新启动的Cursor进程
            await this.killCursorProcess();
            
            // 检查配置文件是否已生成
            if (!configCreated) {
                logger.error('无法创建配置文件，启动Cursor后仍未生成storage.json');
                return false;
            }
            
            // 步骤5: 读取配置文件
            logger.info('正在读取配置文件...');
            const configContent = await fs.readFile(storagePath, 'utf8');
            let config;
            
            try {
                config = JSON.parse(configContent);
            } catch (error) {
                logger.error('解析配置文件失败:', error);
                return false;
            }
            
            // 步骤6: 生成新的机器ID
            logger.info('正在生成新的机器ID...');
            const newIds = this.generateNewMachineIds();
            
            // 步骤7: 更新配置
            logger.info('正在更新配置...');
            Object.assign(config, newIds);
            
            // 步骤8: 写入新配置
            logger.info('正在写入新配置...');
            await fs.writeFile(storagePath, JSON.stringify(config, null, 2), 'utf8');
            
            logger.info('机器码重置成功！');
            logger.info('新的机器码:');
            for (const [key, value] of Object.entries(newIds)) {
                logger.info(`${key}: ${value}`);
            }
            
            return true;
        } catch (error) {
            logger.error('重置机器码失败:', error);
            return false;
        }
    }

    /**
     * 禁用自动更新功能
     * 根据不同平台执行不同的禁用逻辑
     * @returns {Promise<boolean>} 禁用成功返回 true，失败返回 false
     */
    async disableAutoUpdate() {
        try {
            const platform = os.platform();
            
            // 根据平台执行不同的禁用逻辑
            switch (platform) {
                case 'win32': {
                    logger.info('正在禁用自动更新...');
                    
                    // 使用 consoleHelper 执行 PowerShell 脚本
                    return await consoleHelper.executePowerShellScript(this.getScriptPath('cursor-update.ps1'), {
                        noProfile: true,
                        nonInteractive: true
                    });
                }
                
                case 'darwin': {
                    // TODO: 实现 macOS 的禁用逻辑
                    logger.warn('macOS 平台的自动更新禁用功能尚未实现');
                    return false;
                }
                
                case 'linux': {
                    // TODO: 实现 Linux 的禁用逻辑
                    logger.warn('Linux 平台的自动更新禁用功能尚未实现');
                    return false;
                }
                
                default: {
                    logger.error(`不支持的操作系统平台: ${platform}`);
                    return false;
                }
            }
            
        } catch (error) {
            logger.error('禁用自动更新失败:', error);
            return false;
        }
    }

}

module.exports = Cursor;
