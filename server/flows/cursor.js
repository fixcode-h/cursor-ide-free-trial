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
        
        // 加载配置
        const config = require('../utils/config').getConfig();
        
        // 初始化人类行为模拟器
        this.humanBehavior = new HumanBehavior();
        
        // 人类行为模拟配置
        const enabled = config.human_behavior?.enabled;
        this.simulateHuman = enabled !== undefined ? enabled : true; // 默认启用
        
        logger.info(`人类行为模拟状态: ${this.simulateHuman ? '已启用' : '已禁用'}`);
        
        // 将配置传递给人类行为模拟器
        this.humanBehavior.updateFromConfig(config);
        
        // 代理配置
        this.proxyConfig = config.proxy;
        
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
            
            await page.goto(this.url);

            // 模拟初始浏览行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page);
                logger.info('完成初始人类行为模拟');
            }

            // 等待并点击登录按钮
            const loginButtonSelector = 'a[href^="/api/auth/login"]';
            await page.waitForSelector(loginButtonSelector);
            await page.click(loginButtonSelector);
            await page.waitForNavigation();
            logger.info('已点击登录按钮并等待页面跳转完成');

            // 模拟浏览行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page);
            }

            // 等待邮箱输入框出现，使用更精确的选择器
            const emailSelector = 'input[type="email"][name="email"]';
            await page.waitForSelector(emailSelector, {
                visible: true,
                timeout: 10000
            });

            // 模拟初始浏览行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page);
                logger.info('完成初始人类行为模拟');
            }

            // 填写邮箱
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanTyping(page, emailSelector, account.email);
            } else {
                await page.type(emailSelector, account.email);
            }
            logger.info('已填写邮箱');

            // 模拟思考行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });
            }

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
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page);
            }
            
            // 填写密码
            const passwordSelector = 'input[type="password"][name="password"]';
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanTyping(page, passwordSelector, account.password);
            } else {
                await page.type(passwordSelector, account.password);
            }
            logger.info('已填写密码');

            // 模拟思考行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });
            }

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
            if (!currentUrl.includes('settings')) {
                logger.error('页面未跳转到settings页面');
                throw new Error('登录验证失败：未能进入settings页面');
            }

            logger.info('登录验证成功：已进入settings页面');

            // 模拟浏览行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page);
            }

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
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page);
            }

            // 等待并点击登录按钮
            const loginButtonSelector = 'a[href^="/api/auth/login"]';
            await page.waitForSelector(loginButtonSelector);
            await page.click(loginButtonSelector);
            await page.waitForNavigation();
            logger.info('已点击登录按钮并等待页面跳转完成');
            
            // 模拟浏览行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page);
            }
            
            const signUpSelector = 'a[href^="/sign-up"]';
            await page.waitForSelector(signUpSelector);
            await page.click(signUpSelector);
            await page.waitForNavigation();
            logger.info('已点击注册链接并等待页面跳转完成');

            // 模拟浏览行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page);
            }

            // 填写注册表单
            logger.info('开始填写注册表单...');
            
            // 等待页面完全加载，确保表单元素已经渲染
            // await delay(2000); -- 改用智能等待方式
            
            // 获取页面上所有的输入字段，帮助调试
            const formInputs = await page.evaluate(() => {
                const inputs = Array.from(document.querySelectorAll('input'));
                return inputs.map(input => ({
                    name: input.name,
                    placeholder: input.placeholder,
                    type: input.type,
                    id: input.id,
                    isVisible: input.offsetWidth > 0 && input.offsetHeight > 0
                }));
            });
            
            logger.info(`表单页面包含 ${formInputs.length} 个输入字段: ${JSON.stringify(formInputs.filter(input => input.isVisible))}`);
            
            // 尝试不同的名字输入框选择器
            const firstNameSelectors = [
                'input[name="first_name"][placeholder="Your first name"]',
                'input[name="first_name"]',
                'input[placeholder*="first name" i]',
                'input[placeholder*="名字" i]',
                'input[id*="first" i]',
                'input[name*="first" i]'
            ];
            
            // 填写名字
            const firstNameFilled = await this.waitAndFillField(page, firstNameSelectors, userInfo.firstname.toString().trim(), {
                maxAttempts: 15,
                interval: 500,
                failMessage: '无法找到名字输入框'
            });
            
            if (!firstNameFilled) {
                throw new Error('无法找到名字输入框，请检查页面结构是否变化');
            }
            
            logger.info('已填写名字');
            
            // 尝试不同的姓氏输入框选择器
            const lastNameSelectors = [
                'input[name="last_name"][placeholder="Your last name"]',
                'input[name="last_name"]',
                'input[placeholder*="last name" i]',
                'input[placeholder*="姓氏" i]',
                'input[id*="last" i]',
                'input[name*="last" i]'
            ];
            
            // 填写姓氏
            const lastNameFilled = await this.waitAndFillField(page, lastNameSelectors, userInfo.lastname.toString().trim(), {
                maxAttempts: 10,
                interval: 500,
                failMessage: '无法找到姓氏输入框'
            });
            
            if (!lastNameFilled) {
                throw new Error('无法找到姓氏输入框，请检查页面结构是否变化');
            }
            
            logger.info('已填写姓氏');
            
            // 尝试不同的邮箱输入框选择器
            const emailSelectors = [
                'input[type="email"][name="email"][placeholder="Your email address"]',
                'input[type="email"][name="email"]',
                'input[type="email"]',
                'input[placeholder*="email" i]',
                'input[name="email"]'
            ];
            
            // 填写邮箱
            const emailFilled = await this.waitAndFillField(page, emailSelectors, userInfo.email.toString().trim(), {
                maxAttempts: 10,
                interval: 500,
                failMessage: '无法找到邮箱输入框'
            });
            
            if (!emailFilled) {
                throw new Error('无法找到邮箱输入框，请检查页面结构是否变化');
            }
            
            logger.info('已填写邮箱');
            
            // 模拟思考行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });
            }
            
            // 尝试不同的继续按钮选择器
            const continueButtonSelectors = [
                'button[type="submit"][value="sign-up"]',
                'button[type="submit"]',
                'button:contains("Continue")',
                'button:contains("Next")',
                'button:contains("Sign up")',
                'button.signup-button',
                'button.continue-button'
            ];
            
            // 点击继续按钮
            const continueClicked = await this.waitAndClick(page, continueButtonSelectors, {
                maxAttempts: 12,
                interval: 500,
                failMessage: '无法找到继续按钮'
            });
            
            if (!continueClicked) {
                // 尝试查找任何类型的按钮
                const genericButtonClicked = await this.waitAndClick(page, 'button', {
                    maxAttempts: 5,
                    interval: 500
                });
                
                if (!genericButtonClicked) {
                    throw new Error('无法找到继续按钮，请检查页面结构是否变化');
                }
                logger.warn('使用通用按钮选择器点击成功');
            }
            
            logger.info('已点击继续按钮');
            
            // 等待页面跳转、加载完成
            try {
                await page.waitForNavigation({ timeout: 10000 });
                logger.info('已跳转到密码页面');
            } catch (error) {
                // 可能没有导航事件，但页面内容已经变化
                logger.warn('未检测到页面跳转，但继续执行');
            }
            
            // 确保页面内容已更新
            // await delay(2000); -- 改用智能等待方式
            
            // 检查页面是否变化到密码输入页面
            const isPasswordPage = await page.evaluate(() => {
                // 查找密码输入框
                const passwordInput = document.querySelector('input[type="password"]');
                // 页面文本是否包含密码相关的词语
                const pageText = document.body.innerText.toLowerCase();
                const containsPasswordText = 
                    pageText.includes('password') || 
                    pageText.includes('密码') || 
                    pageText.includes('set') || 
                    pageText.includes('create');
                return passwordInput !== null || containsPasswordText;
            });
            
            if (!isPasswordPage) {
                logger.warn('可能未成功跳转到密码页面，尝试查找页面元素');
            }
            
            // 模拟浏览行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page);
            }
            
            // 尝试不同的密码输入框选择器
            const passwordSelectors = [
                'input[type="password"]',
                'input[name="password"]',
                'input[placeholder*="password" i]',
                'input[placeholder*="密码" i]',
                'input[id*="password" i]'
            ];
            
            // 填写密码
            const passwordFilled = await this.waitAndFillField(page, passwordSelectors, userInfo.password.toString().trim(), {
                maxAttempts: 15,
                interval: 500,
                failMessage: '无法找到密码输入框'
            });
            
            if (!passwordFilled) {
                // 记录页面当前状态
                const html = await page.content();
                logger.error(`无法找到密码输入框，页面HTML长度: ${html.length}`);
                throw new Error('无法找到密码输入框，请检查页面结构是否变化');
            }
            
            logger.info('已填写密码');
            
            // 模拟思考行为
            if (this.simulateHuman) {
                await this.humanBehavior.simulateHumanBehavior(page, { duration: 2000, movements: 2 });
            }
            
            // 尝试不同的注册按钮选择器
            const registerButtonSelectors = [
                'button[type="submit"]',
                'button:contains("Register")',
                'button:contains("Sign up")',
                'button:contains("Complete")',
                'button:contains("Create")',
                'button.register-button',
                'button.signup-button'
            ];
            
            // 点击注册按钮
            const registerClicked = await this.waitAndClick(page, registerButtonSelectors, {
                maxAttempts: 12,
                interval: 500,
                failMessage: '无法找到注册按钮'
            });
            
            if (!registerClicked) {
                // 尝试查找任何类型的按钮
                const genericButtonClicked = await this.waitAndClick(page, 'button', {
                    maxAttempts: 5,
                    interval: 500
                });
                
                if (!genericButtonClicked) {
                    throw new Error('无法找到注册按钮，请检查页面结构是否变化');
                }
                logger.warn('使用通用按钮选择器点击成功');
            }
            
            logger.info('已点击注册按钮');
            
            // 等待页面跳转
            try {
                await page.waitForNavigation({ timeout: 10000 });
                logger.info('已跳转到验证码页面');
            } catch (error) {
                logger.warn('未检测到页面跳转，但继续执行...');
                
                // 等待一段时间，让页面有机会更新内容
                // 我们不使用智能等待，因为我们不知道具体要等什么元素
                await delay(3000);
            }

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

    /**
     * 填写验证码
     * @param {import('puppeteer').Browser} browser Puppeteer浏览器实例
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {Object} account 账号信息对象
     * @param {string|Object} verificationCode 验证码或包含验证码的对象
     * @returns {Promise<{browser: import('puppeteer').Browser, page: import('puppeteer').Page}>} 浏览器和页面对象
     */
    async fillVerificationCode(browser, page, account, verificationCode) {
        logger.info('开始填写验证码...');
        
        try {
            // 如果verificationCode是对象，尝试从中提取验证码
            let codeValue = verificationCode;
            if (verificationCode && typeof verificationCode === 'object') {
                // 如果对象有verificationCode属性，使用该属性
                if (verificationCode.verificationCode) {
                    codeValue = verificationCode.verificationCode;
                } 
                // 如果对象有code属性，使用该属性
                else if (verificationCode.code) {
                    codeValue = verificationCode.code;
                }
                // 查找任何看起来像验证码的属性
                else {
                    for (const key in verificationCode) {
                        const value = verificationCode[key];
                        if (typeof value === 'string' && /^\d{6}$/.test(value)) {
                            codeValue = value;
                            break;
                        }
                    }
                }
            }
            
            // 验证验证码格式
            if (!codeValue) {
                logger.error('验证码为空');
                return { browser, page };
            }
            
            if (typeof codeValue !== 'string') {
                logger.info(`验证码类型: ${typeof codeValue}，尝试转换为字符串`);
                codeValue = String(codeValue);
            }
            
            // 清理并规范化验证码
            const code = codeValue.trim();
            logger.info(`正在处理验证码: '${code}'`);
            
            // 验证长度（通常是6位）
            if (code.length !== 6 || !/^\d+$/.test(code)) {
                logger.error(`验证码格式错误，应为6位数字，实际为: '${code}', 长度: ${code.length}, 是否全数字: ${/^\d+$/.test(code)}`);
                return { browser, page };
            }
            
            logger.info('验证码有效，开始查找输入字段...');
            
            // 定义可能的验证码输入字段选择器
            const verificationSelectors = [
                'input[placeholder*="code"]',
                'input[placeholder*="Code"]',
                'input[aria-label*="verification"]',
                'input[aria-label*="Verification"]',
                'input[type="text"][name*="code"]',
                'input.verification-code-input',
                'input[data-testid="verification-code-input"]',
                'input[inputmode="numeric"]',
                // 更宽泛的选择器
                'input[type="text"]'
            ];
            
            // 获取页面上所有的输入字段，帮助调试
            const inputElements = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('input')).map(el => ({
                    type: el.type,
                    name: el.name || '',
                    id: el.id || '',
                    placeholder: el.placeholder || '',
                    class: el.className || '',
                    isVisible: el.offsetWidth > 0 && el.offsetHeight > 0
                }));
            });
            
            logger.info(`页面上找到 ${inputElements.length} 个输入框元素: ${JSON.stringify(inputElements.filter(el => el.isVisible))}`);
            
            // 检查是否有多个单独的输入框（每个数字一个）
            const multipleInputs = await page.evaluate(() => {
                const inputs = document.querySelectorAll('input[inputmode="numeric"][maxlength="1"]');
                if (inputs.length >= 6) {
                    return true;
                }
                
                // 尝试其他可能的选择器
                const altInputs = document.querySelectorAll('input[maxlength="1"]');
                return altInputs.length >= 6;
            });
            
            let fillSuccess = false;
            
            if (multipleInputs) {
                logger.info('检测到多个单独的验证码输入框');
                
                // 等待验证码输入框出现
                const singleInputSelectors = [
                    'input[inputmode="numeric"][maxlength="1"]',
                    'input[maxlength="1"]'
                ];
                
                // 寻找验证码输入框
                const result = await this.waitForElement(page, singleInputSelectors, {
                    maxAttempts: 15,
                    interval: 500,
                    failMessage: '找不到验证码单个输入框'
                });
                
                if (result.success) {
                    // 找到第一个输入框后，获取所有输入框
                    let inputs;
                    try {
                        inputs = await page.$$(result.selector);
                        logger.info(`找到 ${inputs.length} 个验证码输入框`);
                        
                        if (inputs.length >= code.length) {
                            // 清除可能已有的输入
                            for (let i = 0; i < code.length && i < inputs.length; i++) {
                                await inputs[i].click();
                                await inputs[i].evaluate(input => {
                                    input.value = '';
                                });
                            }
                            
                            if (this.simulateHuman) {
                                // 模拟人类行为，逐个填写数字并增加随机延迟
                                for (let i = 0; i < code.length && i < inputs.length; i++) {
                                    // 随机延迟
                                    await delay(300 + Math.random() * 700);
                                    // 单击输入框并输入单个字符
                                    await inputs[i].click();
                                    await page.keyboard.type(code.charAt(i));
                                    logger.info(`已填写第 ${i + 1} 位验证码: ${code.charAt(i)}`);
                                    // 检查是否成功输入
                                    const value = await inputs[i].evaluate(input => input.value);
                                    if (value !== code.charAt(i)) {
                                        logger.warn(`第 ${i + 1} 位验证码填写可能不成功，期望 "${code.charAt(i)}"，实际为 "${value}"`);
                                        // 重试一次
                                        await inputs[i].click();
                                        await page.keyboard.type(code.charAt(i));
                                    }
                                }
                            } else {
                                // 逐个填写，而不是直接使用type方法
                                logger.info(`开始填写6位验证码: ${code}`);
                                for (let i = 0; i < code.length && i < inputs.length; i++) {
                                    // 单击输入框并输入单个字符
                                    await inputs[i].click();
                                    await page.keyboard.type(code.charAt(i));
                                    logger.info(`已填写第 ${i + 1} 位验证码: ${code.charAt(i)}`);
                                }
                                logger.info(`完成填写所有验证码数字`);
                            }
                            
                            // 验证是否成功填写
                            const allFilled = await page.evaluate(() => {
                                const inputs = document.querySelectorAll('input[maxlength="1"]');
                                for (const input of inputs) {
                                    if (!input.value) {
                                        return false;
                                    }
                                }
                                return true;
                            });
                            
                            if (!allFilled) {
                                logger.warn('可能未能填写所有验证码位，尝试其他方法');
                                
                                // 尝试更直接的方法填写
                                await page.evaluate((code) => {
                                    const inputs = document.querySelectorAll('input[maxlength="1"]') || 
                                                   document.querySelectorAll('input[inputmode="numeric"][maxlength="1"]');
                                    for (let i = 0; i < code.length && i < inputs.length; i++) {
                                        inputs[i].value = code.charAt(i);
                                        // 触发输入事件
                                        const event = new Event('input', { bubbles: true });
                                        inputs[i].dispatchEvent(event);
                                        const changeEvent = new Event('change', { bubbles: true });
                                        inputs[i].dispatchEvent(changeEvent);
                                    }
                                }, code);
                                
                                logger.info('使用JavaScript直接设置值并触发事件');
                                fillSuccess = true;
                            } else {
                                logger.info('所有验证码位已成功填写');
                                fillSuccess = true;
                            }
                            
                            // 验证码填写完成后，等待页面自动跳转或状态变化
                            logger.info('验证码已填写完成，等待页面自动跳转...');
                            
                            // 等待页面反应 - 等待任何导航或内容变化
                            try {
                                // 等待页面加载状态变化
                                await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
                                
                                // 等待可能的导航
                                await Promise.race([
                                    page.waitForNavigation({ timeout: 10000 }).catch(() => null),
                                    page.waitForFunction(() => {
                                        // 检查页面是否有明显变化，比如出现了新元素或消息
                                        const successElements = document.querySelectorAll('.success-message, .dashboard, .welcome');
                                        return successElements.length > 0;
                                    }, { timeout: 10000 }).catch(() => null),
                                    delay(10000) // 最长等待10秒
                                ]);
                                
                                // 检查URL是否变化
                                const currentUrl = page.url();
                                logger.info(`验证码填写后，当前页面URL: ${currentUrl}`);
                                
                                // 检查页面上是否出现了成功或错误的元素
                                const pageState = await page.evaluate(() => {
                                    // 检查成功指示器
                                    const successIndicators = document.querySelectorAll('.success-message, .dashboard, .welcome');
                                    if (successIndicators.length > 0) {
                                        return { success: true, message: 'Found success indicators' };
                                    }
                                    
                                    // 检查错误指示器
                                    const errorIndicators = document.querySelectorAll('.error, .error-message, [role="alert"]');
                                    for (const error of errorIndicators) {
                                        if (error.offsetWidth > 0 && error.offsetHeight > 0) {
                                            return { success: false, message: error.textContent.trim() };
                                        }
                                    }
                                    
                                    return { success: true, message: 'No errors detected' };
                                });
                                
                                if (pageState.success) {
                                    logger.info(`验证成功: ${pageState.message}`);
                                } else {
                                    logger.error(`验证失败: ${pageState.message}`);
                                }
                                
                            } catch (error) {
                                logger.info('等待页面反应时出现异常:', error.message);
                            }
                        } else {
                            logger.error(`找到 ${inputs.length} 个输入框，但需要 ${code.length} 个`);
                        }
                    } catch (error) {
                        logger.error('填写多个验证码输入框失败:', error.message);
                    }
                } else {
                    logger.warn('未找到多个验证码输入框，尝试单个输入框方式');
                }
            }
            
            // 如果多输入框方式失败，尝试单输入框方式
            if (!fillSuccess) {
                // 尝试找到单个验证码输入框并填写
                const inputResult = await this.waitAndFillField(page, verificationSelectors, code, {
                    maxAttempts: 15,
                    interval: 500,
                    failMessage: '找不到验证码输入框'
                });
                
                if (inputResult) {
                    fillSuccess = true;
                    logger.info('已填写验证码到单个输入框');
                    
                    // 等待页面自动跳转或状态变化
                    logger.info('验证码已填写到单个输入框，等待页面反应...');
                    await delay(5000); // 给页面一些时间来响应
                } else {
                    // 尝试通过键盘输入验证码
                    logger.warn('未找到验证码输入框，尝试通过键盘输入');
                    try {
                        await page.keyboard.type(code);
                        logger.info('通过键盘输入了验证码');
                        fillSuccess = true;
                        await delay(5000); // 给页面一些时间来响应
                    } catch (error) {
                        logger.error('键盘输入验证码失败:', error.message);
                        return { browser, page };
                    }
                }
            }
            
            logger.info('验证码填写流程完成');
            return { browser, page };
        } catch (error) {
            logger.error('填写验证码过程中出错:', error);
            return { browser, page };
        }
    }

    // 解析验证码
    extractVerificationCode(emailContent) {
        try {
            logger.info('开始从邮件内容中提取验证码...');
            
            // 打印邮件内容的一部分用于调试
            const contentPreview = emailContent.length > 200 
                ? emailContent.substring(0, 200) + '...' 
                : emailContent;
            logger.info(`邮件内容预览: ${contentPreview}`);
            
            // 首先检查邮件是否包含验证码相关的关键信息
            const isCursorVerifyEmail = /Verify your email|验证您的电子邮件|输入验证码/i.test(emailContent);
            
            if (isCursorVerifyEmail) {
                logger.info('检测到Cursor验证邮件');
                
                // 针对如图所示的Cursor验证邮件格式，直接寻找独立的6位数字
                // 这种邮件通常有明显的6位数字验证码独立显示
                const sixDigitPattern = /\b(\d{6})\b/g;
                const allSixDigitMatches = [...emailContent.matchAll(sixDigitPattern)];
                
                if (allSixDigitMatches.length > 0) {
                    // 如果找到了多个6位数字，优先使用正文中独立显示的那个
                    // 以下是几种常见的验证码提取策略
                    
                    // 1. 尝试查找包含特定上下文的验证码
                    const contextPatterns = [
                        /code\s+below[^0-9]*(\d{6})/i,         // "code below" 后跟6位数字
                        /Enter\s+the\s+code[^0-9]*(\d{6})/i,    // "Enter the code" 后跟6位数字
                        /code\s+is[^0-9]*(\d{6})/i,            // "code is" 后跟6位数字
                        /verification\s+code[^0-9]*(\d{6})/i,   // "verification code" 后跟6位数字
                        /验证码[^0-9]*(\d{6})/                  // "验证码" 后跟6位数字
                    ];
                    
                    for (const pattern of contextPatterns) {
                        const match = emailContent.match(pattern);
                        if (match && match[1]) {
                            logger.info(`通过上下文模式找到验证码: ${match[1]}`);
                            return match[1];
                        }
                    }
                    
                    // 2. 针对邮件中可能存在的HTML结构，尝试提取特定格式的验证码
                    if (emailContent.includes('<html') || emailContent.includes('<body')) {
                        // 针对一些特殊的HTML格式，比如验证码通常会放在特定的标签中
                        const htmlPatterns = [
                            /<div[^>]*>(\d{6})<\/div>/i,
                            /<p[^>]*>(\d{6})<\/p>/i,
                            /<span[^>]*>(\d{6})<\/span>/i,
                            /<strong[^>]*>(\d{6})<\/strong>/i,
                            /<b[^>]*>(\d{6})<\/b>/i,
                            /<td[^>]*>(\d{6})<\/td>/i
                        ];
                        
                        for (const pattern of htmlPatterns) {
                            const match = emailContent.match(pattern);
                            if (match && match[1]) {
                                logger.info(`通过HTML标签模式找到验证码: ${match[1]}`);
                                return match[1];
                            }
                        }
                    }
                    
                    // 3. 使用图片中示例的格式，尝试提取位于空行的6位数字
                    // 这种情况通常是验证码单独成行显示
                    const codeLinePattern = /\n\s*(\d{6})\s*\n/;
                    const codeLineMatch = emailContent.match(codeLinePattern);
                    if (codeLineMatch && codeLineMatch[1]) {
                        logger.info(`从邮件单独行中找到验证码: ${codeLineMatch[1]}`);
                        return codeLineMatch[1];
                    }
                    
                    // 4. 如果以上都未找到，则返回第一个匹配到的6位数字
                    // 因为已经确认是验证邮件，所以大概率就是验证码
                    const firstSixDigit = allSixDigitMatches[0][1];
                    logger.info(`使用第一个找到的6位数字作为验证码: ${firstSixDigit}`);
                    return firstSixDigit;
                } else {
                    logger.warn('未在Cursor验证邮件中找到任何6位数字');
                }
            } else {
                // 一般验证码邮件检测
                const verificationKeywords = [
                    /verification/i, 
                    /verify/i, 
                    /code/i, 
                    /authenticate/i, 
                    /验证/i, 
                    /确认/i
                ];
                
                // 检查邮件是否是验证码邮件
                const isVerificationEmail = verificationKeywords.some(pattern => 
                    pattern.test(emailContent)
                );
                
                if (!isVerificationEmail) {
                    logger.info('邮件内容不包含验证相关关键词，跳过');
                    return null;
                }
                
                // 验证码提取模式，按优先级排序
                const patterns = [
                    /code\s+below[^0-9]*(\d{6})/i,          // "code below" 后跟6位数字
                    /code\s+is[^0-9]*(\d{6})/i,             // "code is" 后跟6位数字
                    /verification\s+code[^0-9]*(\d{6})/i,    // "verification code" 后跟6位数字
                    /验证码[^0-9]*(\d{6})/,                  // "验证码" 后跟6位数字
                    /(\d{6})[^0-9]*verification\s+code/i,    // 6位数字后跟 "verification code"
                    /(\d{6})[^0-9]*验证码/,                  // 6位数字后跟 "验证码"
                    /your\s+code\s+is[^0-9]*(\d{6})/i,      // "your code is" 后跟6位数字
                    /code:[^0-9]*(\d{6})/i                  // "code:" 后跟6位数字
                ];
                
                for (const pattern of patterns) {
                    const matches = emailContent.match(pattern);
                    if (matches && matches[1]) {
                        const code = matches[1];
                        logger.info(`找到匹配的验证码: ${code}, 使用模式: ${pattern}`);
                        return code;
                    }
                }
                
                // 如果明确是验证码邮件，尝试匹配独立的6位数字
                if (isVerificationEmail) {
                    const match = emailContent.match(/\b(\d{6})\b/);
                    if (match && match[1]) {
                        logger.info(`使用独立的6位数字作为验证码: ${match[1]}`);
                        return match[1];
                    }
                }
            }

            // 如果上述模式都没匹配到，尝试更模糊的匹配
            const fuzzyMatch = emailContent.match(/(\d{6})/);
            if (fuzzyMatch && fuzzyMatch[1]) {
                logger.info(`使用模糊匹配找到可能的验证码: ${fuzzyMatch[1]}`);
                return fuzzyMatch[1];
            }
            
            logger.warn('无法从验证码邮件中提取验证码');
            return null;
        } catch (error) {
            logger.error('提取验证码失败:', error);
            return null;  // 出错时返回null而不是抛出异常，让调用者决定如何处理
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

    async updateAuth(email = null, accessToken = null, refreshToken = null) {
        logger.info('开始更新 Cursor 认证信息...');

        const updates = [
            ['cursorAuth/cachedSignUpType', 'Auth_0'],
            ['cursorAuth/stripeMembershipType', 'free_trial'],
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
            
            // 步骤3: 读取配置文件
            logger.info('正在读取配置文件...');
            const configContent = await fs.readFile(storagePath, 'utf8');
            let config;
            
            try {
                config = JSON.parse(configContent);
            } catch (error) {
                logger.error('解析配置文件失败:', error);
                return false;
            }
            
            // 步骤4: 生成新的机器ID
            logger.info('正在生成新的机器ID...');
            const newIds = this.generateNewMachineIds();
            
            // 步骤5: 更新配置
            logger.info('正在更新配置...');
            Object.assign(config, newIds);
            
            // 步骤6: 写入新配置
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
            
            if (platform !== 'win32') {
                logger.warn(`${platform} 平台暂不支持禁用自动更新`);
                return false;
            }

            logger.info('正在禁用自动更新...');
            
            // 获取updater路径
            const updaterPath = path.join(process.env.LOCALAPPDATA, 'cursor-updater');
            
            // 删除现有目录或文件
            try {
                await fs.rm(updaterPath, { recursive: true, force: true });
                logger.info('成功删除现有的 cursor-updater');
            } catch (error) {
                logger.warn('删除现有 cursor-updater 失败:', error);
            }

            // 创建阻止文件
            try {
                await fs.writeFile(updaterPath, '');
                logger.info('成功创建阻止文件');

                // 设置只读属性
                await fs.chmod(updaterPath, 0o444);
                logger.info('成功设置只读属性');

                // 验证权限设置
                const stats = await fs.stat(updaterPath);
                const isReadOnly = (stats.mode & 0o222) === 0; // 检查写入权限是否被禁用

                if (!isReadOnly) {
                    throw new Error('文件权限设置验证失败');
                }

                logger.info('自动更新已成功禁用');
                return true;
            } catch (error) {
                logger.error('设置更新阻止文件失败:', error);
                
                // 提供手动操作指南
                logger.warn('请尝试手动操作：');
                logger.warn('1. 以管理员身份打开命令提示符');
                logger.warn(`2. 删除文件夹: rd /s /q "${updaterPath}"`);
                logger.warn(`3. 创建空文件: type nul > "${updaterPath}"`);
                logger.warn(`4. 设置只读: attrib +r "${updaterPath}"`);
                
                return false;
            }
        } catch (error) {
            logger.error('禁用自动更新失败:', error);
            return false;
        }
    }

    /**
     * 填写表单字段 - 根据配置选择模拟人类行为或直接填写
     * @param {import('puppeteer').Page} page Puppeteer页面实例 
     * @param {string} selector 元素选择器
     * @param {string} value 要填写的值
     * @returns {Promise<boolean>} 是否成功填写
     */
    async fillField(page, selector, value) {
        try {
            // 等待元素可见
            await page.waitForSelector(selector, { visible: true, timeout: 5000 });
            
            if (this.simulateHuman) {
                // 模拟人类行为填写
                logger.info(`使用人类行为模拟填写字段: ${selector}`);
                await this.humanBehavior.simulateHumanTyping(page, selector, value);
            } else {
                // 直接填写
                logger.info(`直接填写字段: ${selector}`);
                
                // 清除现有内容
                await page.click(selector, { clickCount: 3 });
                await page.keyboard.press('Backspace');
                
                // 直接输入完整内容
                await page.type(selector, value);
            }
            
            return true;
        } catch (error) {
            logger.error(`填写字段 ${selector} 失败:`, error.message);
            return false;
        }
    }
    
    /**
     * 尝试使用多个选择器填写字段
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {string[]} selectors 选择器数组
     * @param {string} value 要填写的值
     * @returns {Promise<boolean>} 是否成功填写
     */
    async fillFieldWithMultipleSelectors(page, selectors, value) {
        for (const selector of selectors) {
            try {
                const elementExists = await page.$(selector);
                if (elementExists) {
                    const success = await this.fillField(page, selector, value);
                    if (success) {
                        logger.info(`使用选择器 "${selector}" 成功填写值`);
                        return true;
                    }
                }
            } catch (error) {
                logger.debug(`使用选择器 "${selector}" 填写失败: ${error.message}`);
            }
        }
        
        logger.error('所有选择器都无法匹配或填写失败');
        return false;
    }
    
    /**
     * 点击按钮 - 根据配置选择是否添加人类行为延迟
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {string} selector 按钮选择器
     * @returns {Promise<boolean>} 是否成功点击
     */
    async clickButton(page, selector) {
        try {
            // 等待元素可见
            await page.waitForSelector(selector, { visible: true, timeout: 5000 });
            
            if (this.simulateHuman) {
                // 模拟人类行为点击
                logger.info(`使用人类行为模拟点击按钮: ${selector}`);
                
                // 随机延迟
                const clickDelay = this.humanBehavior.minDelay + Math.random() * (this.humanBehavior.maxDelay - this.humanBehavior.minDelay);
                await delay(clickDelay);
                
                // 模拟鼠标悬停后点击
                await page.hover(selector);
                await delay(300 + Math.random() * 500);
                await page.click(selector);
            } else {
                // 直接点击
                logger.info(`直接点击按钮: ${selector}`);
                await page.click(selector);
            }
            
            return true;
        } catch (error) {
            logger.error(`点击按钮 ${selector} 失败:`, error.message);
            return false;
        }
    }
    
    /**
     * 尝试使用多个选择器点击按钮
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {string[]} selectors 选择器数组
     * @returns {Promise<boolean>} 是否成功点击
     */
    async clickButtonWithMultipleSelectors(page, selectors) {
        for (const selector of selectors) {
            try {
                const elementExists = await page.$(selector);
                if (elementExists) {
                    const success = await this.clickButton(page, selector);
                    if (success) {
                        logger.info(`使用选择器 "${selector}" 成功点击按钮`);
                        return true;
                    }
                }
            } catch (error) {
                logger.debug(`使用选择器 "${selector}" 点击失败: ${error.message}`);
            }
        }
        
        logger.error('所有按钮选择器都无法匹配或点击失败');
        return false;
    }
    
    /**
     * 初始化浏览器和页面
     * @returns {Promise<{browser: Browser, page: Page}>} 浏览器和页面对象
     */
    async initBrowser() {
        logger.info('正在初始化浏览器...');
        const puppeteer = require('puppeteer');
        
        // 创建浏览器实例
        const browser = await puppeteer.launch({
            headless: false, // 默认有头模式以便于调试
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
            ]
        });
        
        // 创建新页面
        const page = await browser.newPage();
        
        // 设置视口大小
        await page.setViewport({ width: 1920, height: 1080 });
        
        // 如果启用了人类行为模拟，设置用户代理
        if (this.simulateHuman) {
            await page.setUserAgent(this.humanBehavior.getRandomUserAgent());
        }
        
        logger.info('浏览器初始化完成');
        return { browser, page };
    }

    /**
     * 智能等待元素出现
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {string|string[]} selectors 要等待的选择器或选择器数组
     * @param {Object} options 选项
     * @param {number} options.maxAttempts 最大尝试次数，默认10次
     * @param {number} options.interval 每次尝试的间隔时间(毫秒)，默认500ms
     * @param {boolean} options.visible 是否要求元素可见，默认true
     * @param {string} options.failMessage 失败时的消息
     * @returns {Promise<{success: boolean, selector: string|null, element: ElementHandle|null}>} 成功状态和找到的元素
     */
    async waitForElement(page, selectors, options = {}) {
        const {
            maxAttempts = 10,
            interval = 500,
            visible = true,
            failMessage = '元素未找到'
        } = options;
        
        // 确保selectors是数组
        const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
        
        if (selectorArray.length === 0) {
            logger.error('没有提供任何选择器');
            return { success: false, selector: null, element: null };
        }
        
        logger.info(`开始等待元素: [${selectorArray.join(', ')}]，最多尝试${maxAttempts}次`);
        
        let attempts = 0;
        while (attempts < maxAttempts) {
            attempts++;
            
            // 尝试每个选择器
            for (const selector of selectorArray) {
                try {
                    // 检查元素是否存在
                    const element = await page.$(selector);
                    
                    if (element) {
                        // 如果要求元素可见，检查元素是否可见
                        if (visible) {
                            const isVisible = await page.evaluate(el => {
                                const style = window.getComputedStyle(el);
                                return style && 
                                       style.display !== 'none' && 
                                       style.visibility !== 'hidden' && 
                                       style.opacity !== '0' &&
                                       el.offsetWidth > 0 && 
                                       el.offsetHeight > 0;
                            }, element);
                            
                            if (isVisible) {
                                logger.info(`第${attempts}次尝试: 找到可见元素 "${selector}"`);
                                return { success: true, selector, element };
                            }
                        } else {
                            // 不要求可见，元素存在即可
                            logger.info(`第${attempts}次尝试: 找到元素 "${selector}"`);
                            return { success: true, selector, element };
                        }
                    }
                } catch (error) {
                    // 忽略错误，继续尝试下一个选择器
                }
            }
            
            // 所有选择器都尝试过一遍，但没有找到符合条件的元素
            if (attempts < maxAttempts) {
                logger.debug(`第${attempts}次尝试: 未找到元素，${interval}ms后重试...`);
                await delay(interval);
            } else {
                logger.warn(`已达到最大尝试次数(${maxAttempts})，${failMessage}`);
            }
        }
        
        return { success: false, selector: null, element: null };
    }
    
    /**
     * 智能等待并填写表单字段
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {string|string[]} selectors 选择器或选择器数组
     * @param {string} value 要填写的值
     * @param {Object} options 等待选项
     * @returns {Promise<boolean>} 是否成功填写
     */
    async waitAndFillField(page, selectors, value, options = {}) {
        // 等待元素出现
        const result = await this.waitForElement(page, selectors, {
            ...options,
            failMessage: '找不到输入字段'
        });
        
        if (!result.success) {
            return false;
        }
        
        try {
            // 获取成功的选择器
            const selector = result.selector;
            
            if (this.simulateHuman) {
                // 模拟人类行为填写
                logger.info(`使用人类行为模拟填写字段: ${selector}`);
                await this.humanBehavior.simulateHumanTyping(page, selector, value);
            } else {
                // 直接填写
                logger.info(`直接填写字段: ${selector}`);
                
                // 清除现有内容
                await page.click(selector, { clickCount: 3 });
                await page.keyboard.press('Backspace');
                
                // 直接输入完整内容
                await page.type(selector, value);
            }
            
            return true;
        } catch (error) {
            logger.error(`填写字段失败:`, error.message);
            return false;
        }
    }
    
    /**
     * 智能等待并点击元素
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {string|string[]} selectors 选择器或选择器数组
     * @param {Object} options 等待选项
     * @returns {Promise<boolean>} 是否成功点击
     */
    async waitAndClick(page, selectors, options = {}) {
        // 等待元素出现
        const result = await this.waitForElement(page, selectors, {
            ...options,
            failMessage: '找不到可点击元素'
        });
        
        if (!result.success) {
            return false;
        }
        
        try {
            // 获取成功的选择器
            const selector = result.selector;
            
            if (this.simulateHuman) {
                // 模拟人类行为点击
                logger.info(`使用人类行为模拟点击元素: ${selector}`);
                
                // 随机延迟
                const clickDelay = this.humanBehavior.minDelay + Math.random() * (this.humanBehavior.maxDelay - this.humanBehavior.minDelay);
                await delay(clickDelay);
                
                // 模拟鼠标悬停后点击
                await page.hover(selector);
                await delay(300 + Math.random() * 500);
                await page.click(selector);
            } else {
                // 直接点击
                logger.info(`直接点击元素: ${selector}`);
                await page.click(selector);
            }
            
            return true;
        } catch (error) {
            logger.error(`点击元素失败:`, error.message);
            return false;
        }
    }

}

module.exports = Cursor;
