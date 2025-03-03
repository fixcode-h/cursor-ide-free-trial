const logger = require('./logger');
const delay = require('./delay');

class TempMail {
    constructor(config) {
        this.config = config.email.tempmail;
        this.url = 'https://tempmail.plus';
        this.email = null;
    }

    async handlePinCodeInput(page) {
        try {            
            // 检查验证模态框是否存在且可见
            const modalSelector = '#modal-verify';
            try {
                // 使用 waitForSelector 检查模态框是否可见，设置较短的超时时间
                await page.waitForSelector(modalSelector, { visible: true, timeout: 1000 });
                
                // 在模态框中查找并输入 PIN 码
                const pinInputSelector = '#pin';
                await page.waitForSelector(pinInputSelector, { visible: true });
                await page.type(pinInputSelector, this.config.pin);
                
                // 点击确认按钮
                const verifyButtonSelector = '#verify';
                await page.waitForSelector(verifyButtonSelector, { visible: true });
                await page.click(verifyButtonSelector);
                
                logger.info('已输入 PIN 码并确认');
                await delay(500);
            } catch (error) {
                // 如果超时，说明模态框不可见或不存在，直接返回
                if (error.name === 'TimeoutError') {
                    return;
                }
                throw error;
            }
        } catch (error) {
            logger.warn('处理 PIN 码输入时出错:', error.message);
        }
    }

    async initialize(browser, initPage) {
        let page;
        try {
            page = await browser.newPage();
            logger.info('创建临时邮箱页面');

            await page.goto(this.url);
            logger.info('已打开临时邮箱网站');

            // 如果配置了自定义用户名
            if (this.config.customizeUsername && this.config.username) {
                // 等待用户名输入框出现
                const usernameInputSelector = '#pre_button';
                await page.waitForSelector(usernameInputSelector);
                
                // 清空输入框
                await page.$eval(usernameInputSelector, el => el.value = '');
                await delay(100);
                
                // 输入新的用户名
                await page.type(usernameInputSelector, this.config.username);
                // 检查是否需要输入 PIN 码
                await this.handlePinCodeInput(page);
                
                // 选择域名（如果配置了首选域名）
                if (this.config.preferredDomain) {
                    // 点击下拉菜单按钮
                    const dropdownButtonSelector = '#domain';
                    await page.waitForSelector(dropdownButtonSelector);
                    await page.click(dropdownButtonSelector);
                    
                    // 等待下拉菜单项出现
                    await delay(500);
                    
                    // 构建域名选项的选择器并点击
                    const domainItemSelector = `.dropdown-item`;
                    await page.waitForSelector(domainItemSelector);
                    
                    // 查找并点击匹配的域名选项
                    const matchingDomain = await page.evaluate(
                        (preferredDomain, selector) => {
                            const items = Array.from(document.querySelectorAll(selector));
                            const targetItem = items.find(item => item.textContent.trim() === preferredDomain);
                            if (targetItem) {
                                targetItem.click();
                                return true;
                            }
                            return false;
                        },
                        this.config.preferredDomain,
                        domainItemSelector
                    );

                    if (!matchingDomain) {
                        logger.warn(`未找到首选域名: ${this.config.preferredDomain}`);
                    }
                    
                    await delay(500);
                    // 检查是否需要输入 PIN 码
                    await this.handlePinCodeInput(page);
                }
                
                // 点击复制按钮
                const copyButtonSelector = '#pre_copy';
                await page.waitForSelector(copyButtonSelector);
                await page.click(copyButtonSelector);
                await delay(500);
                // 检查是否需要输入 PIN 码
                await this.handlePinCodeInput(page);
            }

            return { browser, page };
        } catch (error) {
            if (page) {
                await page.close();
                logger.info('出错关闭页面');
            }
            logger.error('临时邮箱初始化失败:', error);
            throw error;
        }
    }

    async waitForEmail(browser, page, flow, account, timeout = 300000, interval = 5000) {
        try {
            logger.info('等待接收邮件...');
            
            // 从 flow 获取发件人邮箱
            const expectedSender = flow.getVerificationEmailSender();
            logger.info('预期发件人:', expectedSender);
            
            const startTime = Date.now();
            
            while (Date.now() - startTime < timeout) {
                try {
                    // 确保在首页
                    await page.goto(this.url);

                    // 检查是否需要输入 PIN 码
                    await this.handlePinCodeInput(page);

                    await delay(1000);

                    // 等待收件箱元素出现
                    const inboxSelector = '.inbox';
                    const inboxElement = await page.$(inboxSelector);
                    if (!inboxElement) {
                        logger.info('收件箱未加载，等待下次检查...');
                        await delay(interval);
                        continue;
                    }
                    await delay(1000);

                    // 检查是否有邮件，并获取发件人信息
                    const emailSelector = '.mail';
                    const emails = await page.$$(emailSelector);
                    if (!emails || emails.length === 0) {
                        logger.info('未找到邮件，等待下次检查...');
                        await delay(interval);
                        continue;
                    }
                    await delay(1000);

                    // 点击第一封邮件
                    await page.evaluate(() => {
                        const firstMail = document.querySelector('.mail');
                        if (firstMail) {
                            const clickEvent = firstMail.getAttribute('onclick');
                            if (clickEvent) {
                                eval(clickEvent);
                            }
                        }
                    });
                    
                    // 获取验证码
                    const codeSelector = '#info';
                    // 等待内容元素出现并且可见
                    await page.waitForSelector(codeSelector, { visible: true, timeout: 5000 });
                    const contentElement = await page.$(codeSelector);
                    if (!contentElement) {
                        logger.info('未找到邮件内容，等待下次检查...');
                        await delay(interval);
                        continue;
                    }

                    // 确保内容已经加载
                    await delay(1000);
                    const emailContent = await page.evaluate(el => el.textContent, contentElement);
                    
                    // 确保内容不为空
                    if (!emailContent || emailContent.trim() === '') {
                        logger.info('邮件内容为空，等待下次检查...');
                        await delay(interval);
                        continue;
                    }

                    const code = flow.extractVerificationCode(emailContent);
                    
                    if (!code) {
                        logger.info('未找到验证码，等待下次检查...');
                        await delay(interval);
                        continue;
                    }
                    
                    logger.info('成功获取验证码:', code);
                    return code;
                } catch (error) {
                    logger.warn('检查邮件时出错:', error.message);
                    await delay(interval);
                    continue;
                }
            }
            
            throw new Error(`等待邮件超时（${timeout}ms）`);
        } catch (error) {
            logger.error('等待邮件最终失败:', error);
            throw error;
        }
    }
}

module.exports = TempMail; 