const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');
const { getConfig } = require('./config');
const { generateMachineCode } = require('./hardware');

class PublicMailApi {
    constructor() {
        this.config = getConfig();
        this.baseURL = this.config.email.publicApi.apiEndpoint;
        this.proxyConfig = this.config.proxy;
        this.emailProxyConfig = this.config.email.proxy;
    }

    // 获取请求配置
    async getRequestConfig() {
        const machineCode = await generateMachineCode();
        const config = {
            headers: {
                'Authorization': 'Bearer ' + machineCode
            }
        };

        // 如果启用了代理，添加代理配置
        if (this.proxyConfig.enabled && this.emailProxyConfig) {
            const { protocol, host, port } = this.proxyConfig;
            const proxyUrl = `${protocol}://${host}:${port}`;

            switch (protocol) {
                case 'socks5':
                    config.httpsAgent = new SocksProxyAgent(proxyUrl);
                    break;
                case 'http':
                    config.httpAgent = new HttpProxyAgent(proxyUrl);
                    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
                    break;
                case 'https':
                    config.httpsAgent = new HttpsProxyAgent(proxyUrl);
                    break;
            }
        }

        return config;
    }

    // 添加邮件路由绑定
    async addEmailRoute() {
        try {
            const config = await this.getRequestConfig();
            const response = await axios.post(
                `${this.baseURL}/api/accounts`,
                {},  // 空参数
                config
            );
            return response.data;
        } catch (error) {
            console.error('添加邮件路由失败:', error.message);
            throw error;
        }
    }

    // 删除邮件路由
    async deleteEmailRoute(email) {
        try {
            const config = await this.getRequestConfig();
            const response = await axios.delete(
                `${this.baseURL}/api/accounts/email/${encodeURIComponent(email)}`,
                config
            );
            return response.data;
        } catch (error) {
            console.error('删除邮件路由失败:', error.message);
            throw error;
        }
    }

    // 获取邮件
    async getEmails(type, email) {
        try {
            const config = await this.getRequestConfig();
            const response = await axios.get(
                `${this.baseURL}/api/emails/${encodeURIComponent(type)}/${encodeURIComponent(email)}`,
                config
            );
            return response.data;
        } catch (error) {
            console.error('获取邮件失败:', error.message);
            throw error;
        }
    }

    // 获取用户信息
    async getUserInfo() {
        try {
            const config = await this.getRequestConfig();
            const response = await axios.get(
                `${this.baseURL}/api/users/info`,
                config
            );
            return response.data;
        } catch (error) {
            console.error('获取用户信息失败:', error.message);
            throw error;
        }
    }

    // 刷新配置
    refreshConfig() {
        this.config = getConfig();
        this.baseURL = this.config.email.publicApi.apiEndpoint;
        this.proxyConfig = this.config.proxy;
    }
}

// 导出类而不是单例实例
module.exports = PublicMailApi; 