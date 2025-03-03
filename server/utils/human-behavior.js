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

    constructor() {
        this.minDelay = 500;
        this.maxDelay = 2000;
        this.typeMinDelay = 50;
        this.typeMaxDelay = 200;
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
}

module.exports = HumanBehavior; 