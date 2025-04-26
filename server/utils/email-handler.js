const nodemailer = require('nodemailer');
const { ImapFlow } = require('imapflow');
const logger = require('./logger');
const socks = require('socks');
const fs = require('fs');
const path = require('path');

class EmailHandler {
    constructor(config) {
        this.config = config;
        this.smtpTransporter = null;
        this.imapClient = null;
        this.maxReconnectAttempts = 3;
        this.reconnectDelay = 5000; // 5 seconds
    }

    // 初始化所有邮件连接
    async initialize() {
        logger.info('开始初始化邮件处理器...');
        
        // 根据配置决定是否初始化 SMTP
        if (this.config.email.smtp.enabled) {
            await this.initSmtp();
        } else {
            logger.info('SMTP 连接已禁用，跳过初始化');
        }

        // 根据配置决定是否初始化 IMAP
        if (this.config.email.imap.enabled) {
            await this.initImap();
        } else {
            logger.info('IMAP 连接已禁用，跳过初始化');
        }

        logger.info('邮件处理器初始化完成');
    }

    // 初始化 SMTP 客户端
    async initSmtp() {
        if (!this.config.email.smtp.enabled) {
            throw new Error('SMTP 连接已禁用');
        }

        try {
            logger.info('初始化 SMTP 客户端...');
            
            const smtpConfig = {
                ...this.config.email.smtp,  // 展开 SMTP 配置
                auth: {
                    user: this.config.email.user,
                    pass: this.config.email.pass,
                },
                connectionTimeout: 30000,
                socketTimeout: 30000,
                tls: {
                    rejectUnauthorized: false,
                    ciphers: 'SSLv3'
                },
                requireTLS: true
            };

            // 如果启用了代理，添加代理配置
            if (this.config.proxy.enabled) {
                smtpConfig.proxy = `socks5://${this.config.proxy.host}:${this.config.proxy.port}`;
                logger.info(`使用代理: ${smtpConfig.proxy}`);
            }

            this.smtpTransporter = nodemailer.createTransport(smtpConfig);
            this.smtpTransporter.set('proxy_socks_module', socks);

            // 验证连接配置
            await this.smtpTransporter.verify();
            logger.info('SMTP 客户端初始化成功');
        } catch (error) {
            logger.error('SMTP 连接失败:', error);
            throw error;
        }
    }

    // 发送邮件
    async sendMail(to, subject, text) {
        if (!this.config.email.smtp.enabled || !this.smtpTransporter) {
            throw new Error('SMTP 服务未启用或未初始化');
        }

        try {
            const result = await this.smtpTransporter.sendMail({
                from: this.config.email.user,
                to,
                subject,
                text
            });
            logger.info('邮件发送成功');
            return result;
        } catch (error) {
            logger.error('发送邮件失败:', error);
            throw error;
        }
    }

    // 初始化 IMAP 连接
    async initImap() {
        if (!this.config.email.imap.enabled) {
            throw new Error('IMAP 连接已禁用');
        }

        logger.info('初始化 IMAP 连接...');
        try {
            // 如果已存在连接，先关闭
            await this.closeImapConnection();

            const imapConfig = {
                ...this.config.email.imap,  // 展开 IMAP 配置
                auth: {
                    user: this.config.email.user,
                    pass: this.config.email.pass,
                },
                logger: logger,
                tls: {
                    rejectUnauthorized: false
                },
                // 添加连接超时和套接字超时配置
                connectionTimeout: 30000, // 30 秒连接超时
                socketTimeout: 30000,     // 30 秒套接字超时
                emitLogs: false           // 关闭内部日志，避免过多的日志输出
            };

            // 如果启用了代理，添加代理配置
            if (this.config.proxy.enabled) {
                const proxyUrl = `socks5://${this.config.proxy.host}:${this.config.proxy.port}`;
                const logMessage = `\nIMAP使用代理: ${proxyUrl}`;
                logger.info(logMessage);
                imapConfig.proxy = proxyUrl;
            }

            this.imapClient = new ImapFlow(imapConfig);
            await this.imapClient.connect();
            logger.info('IMAP 连接成功');
        } catch (error) {
            logger.error('IMAP 连接错误:', error);
            // 关闭任何可能存在的连接
            await this.closeImapConnection();
            throw error;
        }
    }

    // 安全关闭 IMAP 连接的辅助方法
    async closeImapConnection() {
        if (this.imapClient) {
            try {
                // 检查连接状态
                if (this.imapClient.usable) {
                    await this.imapClient.logout();
                    logger.info('已关闭现有 IMAP 连接');
                } else {
                    logger.info('IMAP 连接已不可用，无需关闭');
                }
            } catch (e) {
                logger.warn('关闭 IMAP 连接时出错，忽略:', e);
            } finally {
                // 确保重置客户端引用
                this.imapClient = null;
            }
        }
    }

    // 带重试的IMAP操作执行器
    async executeWithRetryImap(operation, maxAttempts = this.maxReconnectAttempts) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // 确保连接有效
                if (!this.imapClient || !this.imapClient.usable) {
                    logger.info('IMAP 连接无效，重新初始化...');
                    await this.initImap();
                }
                return await operation();
            } catch (error) {
                logger.error(`IMAP操作失败(第${attempt}次尝试):`, error);
                
                // 如果不是最后一次尝试，则重新初始化连接并重试
                if (attempt < maxAttempts) {
                    logger.info(`尝试重新初始化IMAP连接(第${attempt}次)...`);
                    try {
                        // 先关闭连接
                        await this.closeImapConnection();
                        // 重新初始化
                        await this.initImap();
                        logger.info('IMAP重新连接成功，准备重试操作');
                        await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));
                        continue;
                    } catch (reconnectError) {
                        logger.error(`重新连接失败(第${attempt}次):`, reconnectError);
                        // 确保连接已关闭
                        await this.closeImapConnection();
                    }
                } else {
                    // 最后一次尝试也失败，确保连接已关闭
                    await this.closeImapConnection();
                }
                throw error;
            }
        }
    }

    // 等待并获取验证码邮件 - 全新简化版
    async waitForVerificationEmail(flow, account, timeout = 300000, pollInterval = 5000, requestStartTime = null) {
        if (!this.config.email.imap.enabled) {
            throw new Error('IMAP 服务未启用或未初始化');
        }

        // 记录开始等待的时间（用于超时控制）
        const waitStartTime = Date.now();
        
        // 搜索起始时间（默认当前时间，或者请求开始时间）
        const searchSince = requestStartTime ? new Date(requestStartTime) : new Date();
        
        logger.info('开始等待验证码邮件（简化版）...');
        logger.info(`设置搜索起始时间: ${searchSince.toLocaleString()}`);

        // 已处理的邮件UID集合
        const processedUIDs = new Set();

        try {
            // 确保IMAP连接有效
            if (!this.imapClient || !this.imapClient.usable) {
                logger.info('初始化IMAP连接...');
                await this.initImap();
            }

            // 开始循环检查邮件，直到找到验证码或超时
            while (Date.now() - waitStartTime < timeout) {
                try {
                    // 1. 获取所有未读邮件，按日期降序排序（最新的在前）
                    logger.info('正在搜索未读邮件...');
                    const messages = await this.executeWithRetryImap(async () => {
                        await this.imapClient.mailboxOpen('INBOX');
                        return await this.imapClient.search({
                            unseen: true,
                            since: searchSince
                        }, {
                            sort: ['-date'] // 最新的在前
                        });
                    });

                    logger.info(`找到 ${messages.length} 封未读邮件`);
                    
                    if (messages.length === 0) {
                        logger.info(`未找到新邮件，${pollInterval/1000}秒后重试...`);
                        await new Promise(resolve => setTimeout(resolve, pollInterval));
                        continue;
                    }
                    
                    // 2. 逐个处理邮件，直到找到验证码
                    for (const msgUid of messages) {
                        // 跳过已处理的邮件
                        if (processedUIDs.has(msgUid)) continue;
                        
                        // 标记为已处理
                        processedUIDs.add(msgUid);
                        
                        // 3. 获取邮件内容
                        logger.info(`处理邮件 UID: ${msgUid}`);
                        const email = await this.executeWithRetryImap(async () => {
                            return await this.imapClient.fetchOne(msgUid, {
                                source: true,
                                envelope: true,
                                bodyParts: true
                            });
                        });
                        
                        if (!email || !email.source) {
                            logger.warn('邮件格式无效，跳过');
                            continue;
                        }
                        
                        // 检查邮件接收时间是否晚于搜索起始时间
                        const emailDate = email.envelope?.date ? new Date(email.envelope.date) : null;
                        if (emailDate && emailDate < searchSince) {
                            logger.info(`邮件时间 (${emailDate.toLocaleString()}) 早于搜索起始时间 (${searchSince.toLocaleString()})，跳过`);
                            continue;
                        }
                        
                        // 4. 提取关键信息
                        const sender = email.envelope?.from?.[0]?.address || '';
                        const subject = email.envelope?.subject || '';
                        logger.info(`邮件信息 - 发件人: ${sender}, 主题: ${subject}`);
                        
                        // 5. 提取邮件内容（处理多种格式）
                        let emailContent = '';
                        
                        // 提取纯文本内容
                        if (email.bodyParts) {
                            for (const part of Object.values(email.bodyParts)) {
                                if (part.type === 'text') {
                                    const content = part.content ? part.content.toString() : '';
                                    if (content) {
                                        emailContent += '\n' + content;
                                    }
                                }
                            }
                        }
                        
                        // 如果没有提取到内容，使用源内容
                        if (!emailContent.trim() && email.source) {
                            emailContent = email.source.toString();
                            
                            // 简单处理HTML格式
                            if (emailContent.includes('<html') || emailContent.includes('<body')) {
                                emailContent = emailContent
                                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                    .replace(/<[^>]*>/g, ' ')
                                    .replace(/&nbsp;/g, ' ')
                                    .replace(/&lt;/g, '<')
                                    .replace(/&gt;/g, '>')
                                    .replace(/&amp;/g, '&')
                                    .replace(/&quot;/g, '"')
                                    .replace(/&#39;/g, "'")
                                    .replace(/\s+/g, ' ');
                            }
                        }
                        
                        // 6. 高效验证码提取 - 使用多种方法
                        
                        // 方法1: 使用传入的解析器
                        const verificationCode = flow.extractVerificationCode(emailContent);
                        if (verificationCode) {
                            logger.info(`成功使用解析器提取验证码: ${verificationCode}`);
                            await this.markEmailAsRead(msgUid);
                            return verificationCode;
                        }
                        
                        // 方法2: 直接寻找数字验证码 - 带上下文检查
                        // 先找出所有6位数字
                        const sixDigitCodes = emailContent.match(/\b(\d{6})\b/g) || [];
                        if (sixDigitCodes.length > 0) {
                            // 检查每个6位数字的上下文
                            for (const code of sixDigitCodes) {
                                const index = emailContent.indexOf(code);
                                const context = emailContent.substring(Math.max(0, index - 30), Math.min(index + code.length + 30, emailContent.length));
                                
                                // 检查上下文是否包含验证码相关词汇
                                if (/验证码|验证|code|verify|password|登录|注册|confirm/i.test(context)) {
                                    logger.info(`从上下文中找到验证码: ${code}`);
                                    await this.markEmailAsRead(msgUid);
                                    return code;
                                }
                            }
                            
                            // 邮件主题或发件人包含关键词时，直接返回第一个6位数字
                            if (/cursor|验证|code|verify/i.test(subject) || /cursor|no-reply/i.test(sender)) {
                                logger.info(`根据主题/发件人判断，返回首个找到的验证码: ${sixDigitCodes[0]}`);
                                await this.markEmailAsRead(msgUid);
                                return sixDigitCodes[0];
                            }
                        }
                        
                        // 方法3: 使用常见的验证码格式模式
                        const codePatterns = [
                            /(?:验证码|码).{0,10}?(\d{6})/i,
                            /(?:code|verification).{0,10}?(\d{6})/i,
                            /(\d{6}).{0,10}?(?:为您的验证码|is your code)/i
                        ];
                        
                        for (const pattern of codePatterns) {
                            const match = emailContent.match(pattern);
                            if (match && match[1]) {
                                logger.info(`使用模式匹配找到验证码: ${match[1]}`);
                                await this.markEmailAsRead(msgUid);
                                return match[1];
                            }
                        }
                    }
                    
                    // 没有找到验证码，等待后继续检查
                    logger.info(`本轮检查未找到验证码，${pollInterval/1000}秒后重试...`);
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                    
                } catch (error) {
                    logger.error('检查邮件过程中出错:', error);
                    // 尝试重新连接
                    await this.closeImapConnection();
                    await this.initImap();
                    // 等待后重试
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                }
            }
            
            throw new Error(`等待验证码超时，已等待${timeout/1000}秒`);
        } catch (error) {
            logger.error('等待验证码过程中发生错误:', error);
            throw error;
        }
    }
    
    // 辅助方法：标记邮件为已读
    async markEmailAsRead(msgUid) {
        try {
            await this.executeWithRetryImap(async () => {
                await this.imapClient.messageFlagsAdd(msgUid, ['\\Seen']);
            });
            logger.info(`已标记邮件 ${msgUid} 为已读`);
            return true;
        } catch (error) {
            logger.warn(`标记邮件 ${msgUid} 为已读失败:`, error);
            return false;
        }
    }

    // 关闭连接
    async close() {
        // 关闭IMAP连接
        await this.closeImapConnection();
        
        // 关闭SMTP连接
        if (this.smtpTransporter) {
            this.smtpTransporter.close();
            this.smtpTransporter = null;
            logger.info('SMTP连接已关闭');
        }
        
        logger.info('所有邮件连接已关闭');
    }
}

module.exports = EmailHandler;