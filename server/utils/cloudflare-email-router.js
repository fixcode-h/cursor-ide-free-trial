const axios = require('axios');
const logger = require('./logger');
const StringHelper = require('./string-helper');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

class CloudflareEmailManager {
    constructor(config) {
        this.config = config;
        this.apiToken = config.cloudflare.apiToken;
        this.zoneId = config.cloudflare.zoneId;
        this.destinationAddress = config.cloudflare.emailForward;
        this.proxyConfig = config.proxy;
        this.cloudflareProxyConfig = config.cloudflare.proxy;
        
        // 创建基础请求配置
        const axiosConfig = {
            baseURL: 'https://api.cloudflare.com/client/v4',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            }
        };

        // 如果启用了代理，添加代理配置
        if (this.proxyConfig.enabled && this.cloudflareProxyConfig) {
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

        this.axiosInstance = axios.create(axiosConfig);
    }

    // 刷新配置和代理设置
    refreshConfig(config) {
        this.config = config;
        this.apiToken = config.cloudflare.apiToken;
        this.zoneId = config.cloudflare.zoneId;
        this.destinationAddress = config.cloudflare.emailForward;
        this.proxyConfig = config.proxy;

        // 更新 axios 实例配置
        const axiosConfig = {
            baseURL: 'https://api.cloudflare.com/client/v4',
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            }
        };

        // 如果启用了代理，更新代理配置
        if (this.proxyConfig.enabled) {
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
            logger.info('已更新代理配置:', { protocol, host, port });
        }

        this.axiosInstance = axios.create(axiosConfig);
    }

    async addEmailRoute(virtualEmail) {
        try {
            logger.info('开始添加 Cloudflare 邮件路由规则：', virtualEmail);
            
            const response = await this.axiosInstance.post(`/zones/${this.zoneId}/email/routing/rules`, {
                name: `Forward ${virtualEmail}`,
                enabled: true,
                actions: [{
                    type: "forward",
                    value: [this.destinationAddress]
                }],
                matchers: [{
                    type: "literal",
                    field: "to",
                    value: virtualEmail
                }]
            });

            if (response.data.success) {
                logger.info('Cloudflare 邮件路由规则添加成功');
                return true;
            } else {
                throw new Error(response.data.errors?.[0]?.message || 'Failed to add email routing rule');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.errors?.[0]?.message || error.message;
            logger.error('添加 Cloudflare 邮件路由规则失败:', {
                error: errorMessage,
                virtualEmail,
                status: error.response?.status
            });
            throw new Error(errorMessage);
        }
    }

    // 可选：添加删除路由规则的方法
    async removeEmailRoute(ruleId) {
        try {
            logger.info('开始删除 Cloudflare 邮件路由规则...', { ruleId });
            
            const response = await this.axiosInstance.delete(`/zones/${this.zoneId}/email/routing/rules/${ruleId}`);
            
            if (response.data.success) {
                logger.info('Cloudflare 邮件路由规则删除成功', { ruleId });
                return true;
            } else {
                throw new Error(response.data.errors?.[0]?.message || 'Failed to delete email routing rule');
            }
        } catch (error) {
            logger.error('删除 Cloudflare 邮件路由规则失败:', {
                error: error.message,
                ruleId
            });
            throw error;
        }
    }

    // 可选：添加列出所有路由规则的方法
    async listEmailRoutes() {
        try {
            logger.info('获取 Cloudflare 邮件路由规则列表...');
            
            const response = await this.axiosInstance.get(`/zones/${this.zoneId}/email/routing/rules`);
            
            if (response.data.success) {
                logger.info('成功获取邮件路由规则列表');
                return response.data.result;
            } else {
                throw new Error(response.data.errors?.[0]?.message || 'Failed to list email routing rules');
            }
        } catch (error) {
            logger.error('获取邮件路由规则列表失败:', {
                error: error.message
            });
            throw error;
        }
    }

    // 注册新的邮件账号
    async registerEmailAccount(account) {
        try {
            logger.info('开始注册邮件账号...');
            
            // 添加 Cloudflare 邮件路由
            logger.info('开始设置 Cloudflare 邮件路由...');
            await this.addEmailRoute(account.email);
            logger.info('Cloudflare 邮件路由设置完成');

            return account;
        } catch (error) {
            logger.error('注册邮件账号失败:', error);
            throw error;
        }
    }
}

module.exports = CloudflareEmailManager; 