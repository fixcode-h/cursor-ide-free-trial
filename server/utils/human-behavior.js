const logger = require('./logger');
const delay = require('./delay');

class HumanBehavior {
    #userAgents;
    #gpuVendors;
    #timezones;
    #languages;
    #fonts;
    #plugins;
    #browserBehaviors;
    #browserVersions;

    constructor() {
        this.minDelay = 500;
        this.maxDelay = 2000;
        this.typeMinDelay = 50;
        this.typeMaxDelay = 200;

        // 初始化浏览器信息
        this.#userAgents = [
            // Chrome Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            
            // Chrome macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            
            // Chrome Linux
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
            
            // Firefox Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
            
            // Firefox macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:119.0) Gecko/20100101 Firefox/119.0',
            
            // Firefox Linux
            'Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (X11; Linux x86_64; rv:122.0) Gecko/20100101 Firefox/122.0',
            'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64; rv:120.0) Gecko/20100101 Firefox/120.0',
            'Mozilla/5.0 (X11; Linux x86_64; rv:119.0) Gecko/20100101 Firefox/119.0',
            
            // Safari macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
            
            // Edge Windows
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
            
            // Edge macOS
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0'
        ];

        this.#browserVersions = [
            // Chrome versions
            { brand: 'Not A(Brand', version: '8' },
            { brand: 'Chromium', version: '132' },
            { brand: 'Google Chrome', version: '132' },
            { brand: 'Chromium', version: '131' },
            { brand: 'Google Chrome', version: '131' },
            { brand: 'Chromium', version: '130' },
            { brand: 'Google Chrome', version: '130' },
            { brand: 'Chromium', version: '129' },
            { brand: 'Google Chrome', version: '129' },
            { brand: 'Chromium', version: '128' },
            { brand: 'Google Chrome', version: '128' },
            
            // Firefox versions
            { brand: 'Firefox', version: '123' },
            { brand: 'Firefox', version: '122' },
            { brand: 'Firefox', version: '121' },
            { brand: 'Firefox', version: '120' },
            { brand: 'Firefox', version: '119' },
            
            // Safari versions
            { brand: 'Safari', version: '17.3' },
            { brand: 'Safari', version: '17.2' },
            { brand: 'Safari', version: '17.1' },
            { brand: 'Safari', version: '17.0' },
            { brand: 'Safari', version: '16.6' },
            
            // Edge versions
            { brand: 'Microsoft Edge', version: '132' },
            { brand: 'Microsoft Edge', version: '131' },
            { brand: 'Microsoft Edge', version: '130' },
            { brand: 'Microsoft Edge', version: '129' },
            { brand: 'Microsoft Edge', version: '128' }
        ];
    }


    // Private helper methods
    #getRandomItem(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    #getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    #getRandomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }


    #getRandomPoint(maxX, maxY) {
        return {
            x: this.#getRandomInt(0, maxX),
            y: this.#getRandomInt(0, maxY)
        };
    }

    /**
     * 模拟人类行为
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {Object} options 配置选项
     * @param {number} options.duration 模拟行为持续时间（毫秒），默认5000ms
     * @param {number} options.movements 鼠标移动次数，默认3-7次
     */
    async simulateHumanBehavior(page, options = {}) {
        const duration = options.duration || 5000;
        const movements = this.#getRandomInt(3, options.movements || 7);

        try {
            // 获取页面尺寸
            const dimensions = await page.evaluate(() => {
                return {
                    width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
                    height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
                };
            });

            logger.info(`开始模拟人类行为，计划移动 ${movements} 次`);

            // 执行随机鼠标移动
            for (let i = 0; i < movements; i++) {
                const point = this.#getRandomPoint(dimensions.width, dimensions.height);
                
                // 移动鼠标到随机位置
                await page.mouse.move(point.x, point.y);
                logger.debug(`鼠标移动到位置: (${point.x}, ${point.y})`);

                // 随机停留一段时间
                const waitTime = this.#getRandomInt(this.minDelay, this.maxDelay);
                await delay(waitTime);

                // 有25%的概率执行滚动
                if (Math.random() < 0.25) {
                    const scrollY = this.#getRandomInt(-300, 300);
                    await page.evaluate((y) => {
                        window.scrollBy(0, y);
                    }, scrollY);
                    logger.debug(`页面滚动: ${scrollY}px`);
                }
            }

            // 最后的随机停留
            const finalDelay = this.#getRandomInt(this.minDelay, this.maxDelay);
            await delay(finalDelay);

            logger.info('人类行为模拟完成');
        } catch (error) {
            logger.error('模拟人类行为时出错:', error);
            throw error;
        }
    }

    /**
     * 模拟人类输入文本
     * @param {import('puppeteer').Page} page Puppeteer页面实例
     * @param {string} selector 输入框选择器
     * @param {string} text 要输入的文本
     */
    async simulateHumanTyping(page, selector, text) {
        try {
            // 等待元素可见
            await page.waitForSelector(selector);
            
            // 先点击输入框，模拟用户行为
            await page.click(selector);
            await delay(this.#getRandomInt(300, 800));

            // 逐个字符输入
            for (const char of text.split('')) {
                await page.type(selector, char, {
                    delay: this.#getRandomInt(this.typeMinDelay, this.typeMaxDelay)
                });

                // 偶尔停顿一下，模拟思考
                if (Math.random() < 0.1) {
                    await delay(this.#getRandomInt(400, 1000));
                }
            }

            // 输入完成后的短暂停顿
            await delay(this.#getRandomInt(200, 500));
            logger.debug(`已模拟人工输入文本到 ${selector}`);
        } catch (error) {
            logger.error('模拟人类输入文本时出错:', error);
            throw error;
        }
    }

    /**
     * 生成随机的 User-Agent
     * @returns {string} 随机生成的 User-Agent 字符串
     */
    getRandomUserAgent() {
        return this.#getRandomItem(this.#userAgents);
    }

    /**
     * 生成随机的 sec-ch-ua 字符串
     * @returns {string} 随机生成的 sec-ch-ua 字符串
     */
    getRandomSecChUa() {
        const selectedVersions = [];
        const numVersions = this.#getRandomInt(2, 4); // 随机选择2-4个浏览器版本

        // 随机选择不重复的浏览器版本
        while (selectedVersions.length < numVersions) {
            const version = this.#getRandomItem(this.#browserVersions);
            if (!selectedVersions.some(v => v.brand === version.brand)) {
                selectedVersions.push(version);
            }
        }

        // 构建 sec-ch-ua 字符串
        return selectedVersions
            .map(v => `"${v.brand}";v="${v.version}"`)
            .join(', ');
    }
}

module.exports = HumanBehavior; 