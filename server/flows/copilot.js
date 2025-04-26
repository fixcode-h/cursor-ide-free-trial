const logger = require('../utils/logger');
const delay = require('../utils/delay');

class Copilot {
    constructor() {
        this.url = 'https://github.com/signup';
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
            logger.info('开始 Copilot 手动注册流程...');
            
            // 创建新的页面
            page = await browser.newPage();
            logger.info('创建新页面');
            
            // 打开 GitHub 注册页面
            await page.goto(this.url);
            logger.info('已打开 GitHub 注册页面');

            return { browser, page };
        } catch (error) {
            // 如果出错，关闭页面并抛出错误
            if (page) {
                await page.close();
                logger.info('出错关闭页面');
            }
            logger.error('Copilot 手动注册流程出错:', error);
            throw error;
        }
    }

    async register(browser, initPage, userInfo) {
        let page;
        try {
            // 验证用户信息
            this.validateUserInfo(userInfo);
            logger.info('开始 Copilot 注册流程...');
            logger.info('用户信息:', JSON.stringify({
                email: userInfo.email,
                firstname: userInfo.firstname,
                lastname: userInfo.lastname,
                // 不记录密码
            }));
            
            // 创建新的页面
            page = await browser.newPage();
            logger.info('创建新页面');
            
            // 打开 GitHub 注册页面
            await page.goto(this.url);
            logger.info('已打开 GitHub 注册页面');

            // 填写邮箱
            const emailSelector = '#email';
            await page.waitForSelector(emailSelector);
            await page.type(emailSelector, userInfo.email.toString().trim());
            logger.info('已填写邮箱');

            // 点击继续按钮
            const continueButtonSelector = 'button[data-continue-to="password-container"]';
            await page.waitForSelector(continueButtonSelector);
            await page.click(continueButtonSelector);
            await delay(2000);
            logger.info('已点击继续按钮');

            // 等待密码输入框出现
            const passwordSelector = '#password';
            await page.waitForSelector(passwordSelector);
            await page.type(passwordSelector, userInfo.password.toString().trim());
            await delay(2000);
            logger.info('已填写密码');

            // 点击继续按钮
            const passwordContinueSelector = 'button[data-continue-to="username-container"]';
            await page.waitForSelector(passwordContinueSelector);
            await page.click(passwordContinueSelector);
            await delay(2000);
            logger.info('已点击继续按钮');

            // 填写用户名
            const usernameSelector = '#login';
            await page.waitForSelector(usernameSelector);
            await page.type(usernameSelector, userInfo.username.toString().trim());
            logger.info('已填写用户名');

            // 点击继续按钮
            const usernameContinueSelector = 'button[data-continue-to="opt-in-container"]';
            await page.waitForSelector(usernameContinueSelector);
            await page.click(usernameContinueSelector);
            logger.info('已点击继续按钮');

            // 选择是否接收产品更新邮件
            const optInSelector = 'button[data-continue-to="captcha-and-submit-container"]';
            await page.waitForSelector(optInSelector);
            await page.click(optInSelector);
            logger.info('已选择邮件订阅选项');

            // 等待验证码页面加载
            await delay(5000);
            logger.info('等待验证码页面加载');

            // 返回浏览器和页面对象，以便后续填写验证码
            return { browser, page };
        } catch (error) {
            // 如果出错，关闭页面并抛出错误
            if (page) {
                await page.close();
                logger.info('出错关闭页面');
            }
            logger.error('Copilot 注册流程出错:', error);
            throw error;
        }
    }

    async fillVerificationCode(page, code) {
        try {
            if (!code) {
                throw new Error('验证码不能为空');
            }

            logger.info('开始填写验证码...');
            
            // 等待验证码输入框出现
            const codeInputSelector = '#code';
            await page.waitForSelector(codeInputSelector);
            await page.type(codeInputSelector, code.toString().trim());
            logger.info('已填写验证码');

            // 点击验证按钮
            const verifyButtonSelector = 'button[type="submit"]';
            await page.waitForSelector(verifyButtonSelector);
            await page.click(verifyButtonSelector);
            logger.info('已点击验证按钮');

            return page;
        } catch (error) {
            logger.error('验证码填写出错:', error);
            throw error;
        }
    }
}

module.exports = Copilot; 