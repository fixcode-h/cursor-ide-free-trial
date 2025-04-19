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

    // 等待并获取验证码邮件
    async waitForVerificationEmail(flow, account, timeout = 300000, pollInterval = 5000, requestStartTime = null) {
        if (!this.config.email.imap.enabled) {
            throw new Error('IMAP 服务未启用或未初始化');
        }

        // 记录开始等待的时间（用于超时控制）
        const waitStartTime = Date.now();
        
        // 设置搜索起始时间
        // 如果提供了请求开始时间，使用该时间作为搜索起点
        // 否则使用当前时间
        const searchStartDate = requestStartTime ? new Date(requestStartTime) : new Date();
        
        // 确保不会因为时间差异错过邮件
        const searchSince = new Date(searchStartDate.getTime()); 
        
        // 记录时区信息用于调试
        const timeZoneOffset = searchStartDate.getTimezoneOffset();
        const timeZoneString = `UTC${timeZoneOffset <= 0 ? '+' : '-'}${Math.abs(Math.floor(timeZoneOffset / 60))}:${Math.abs(timeZoneOffset % 60).toString().padStart(2, '0')}`;

        logger.info('开始等待验证码邮件...');
        logger.info(`系统当前时间: ${new Date().toLocaleString()} (${timeZoneString})`);
        logger.info(`搜索起始时间: ${searchSince.toLocaleString()} (${timeZoneString})`);
        logger.info(`直接在邮箱 ${this.config.email.user} 中查找来自 ${flow.getVerificationEmailSender()} 的验证码邮件`);
        logger.info(`仅查找自 ${searchSince.toLocaleString()} 之后收到的新邮件`);

        // 存储已处理的邮件UID，避免重复处理
        const processedUIDs = new Set();
        // 存储确认不包含验证码的邮件UID
        const nonVerificationEmailUIDs = new Set();

        try {
            // 确保有活跃的连接
            if (!this.imapClient || !this.imapClient.usable) {
                logger.info('IMAP 连接状态检查失败，重新初始化...');
                await this.initImap();
            }

            while (Date.now() - waitStartTime < timeout) {
                try {
                    // 使用重试机制执行IMAP操作
                    const messages = await this.executeWithRetryImap(async () => {
                        await this.imapClient.mailboxOpen('INBOX');
                        
                        // 查询最近的未读邮件，使用since条件确保只获取注册过程中新收到的邮件
                        return await this.imapClient.search({
                            unseen: true,
                            from: flow.getVerificationEmailSender(),
                            since: searchSince
                        }, {
                            sort: ['-date'] // 按日期降序排序，最新的邮件在前
                        });
                    });

                    logger.info(`搜索到的新邮件数量：${messages.length}`);
                    
                    // 如果没有找到新邮件，等待后继续检查
                    if (messages.length === 0) {
                        logger.info(`未找到新邮件，${pollInterval/1000}秒后重新检查...`);
                        await new Promise(resolve => setTimeout(resolve, pollInterval));
                        continue;
                    }
                    
                    // 优先处理最新收到的邮件
                    for (const msgUid of messages) {
                        // 跳过已处理的邮件
                        if (processedUIDs.has(msgUid)) {
                            continue;
                        }
                        
                        // 跳过已确认不包含验证码的邮件
                        if (nonVerificationEmailUIDs.has(msgUid)) {
                            continue;
                        }
                        
                        // 标记该邮件为已处理
                        processedUIDs.add(msgUid);
                        
                        // 使用重试机制获取邮件内容
                        const email = await this.executeWithRetryImap(async () => {
                            return await this.imapClient.fetchOne(msgUid, {
                                source: true,
                                bodyStructure: true,
                                uid: true,
                                flags: true,
                                envelope: true, // 获取信封信息，包括日期和主题
                                bodyParts: true // 获取邮件的所有部分
                            });
                        });
                        
                        if (!email || !email.source) {
                            logger.warn('获取到的邮件格式不正确:', email);
                            continue;
                        }
                        
                        // 检查邮件接收时间
                        if (email.envelope && email.envelope.date) {
                            const emailDate = new Date(email.envelope.date);
                            if (emailDate < searchSince) {
                                logger.info(`跳过旧邮件，接收时间: ${emailDate.toLocaleString()} (${timeZoneString})`);
                                continue;
                            }
                            logger.info(`处理新邮件，接收时间: ${emailDate.toLocaleString()} (${timeZoneString})`);
                        }
                        
                        // 检查邮件主题是否包含验证相关关键词
                        let emailSubject = '';
                        if (email.envelope && email.envelope.subject) {
                            emailSubject = email.envelope.subject;
                            const hasVerificationSubject = /verification|verify|code|authenticate|验证|确认|Cursor/i.test(emailSubject);
                            
                            if (hasVerificationSubject) {
                                logger.info(`邮件主题包含验证相关关键词: ${emailSubject}`);
                            } else {
                                logger.info(`邮件主题: ${emailSubject}`);
                            }
                        }
                        
                        // 更高级的邮件内容提取，处理多种格式
                        let emailContent = '';
                        
                        try {
                            // 1. 首先尝试直接从source获取内容
                            emailContent = email.source.toString();
                            
                            // 2. 如果是HTML邮件，尝试提取纯文本内容
                            if (emailContent.includes('<html') || emailContent.includes('<body')) {
                                // 简单的HTML转文本处理
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
                            
                            // 3. 如果是multipart邮件，尝试从各个部分中提取内容
                            if (email.bodyStructure && email.bodyStructure.type === 'multipart') {
                                if (email.bodyParts) {
                                    for (const part of Object.values(email.bodyParts)) {
                                        // 优先获取text/plain部分
                                        if (part.type === 'text' && part.subtype === 'plain') {
                                            const textContent = part.content ? part.content.toString() : '';
                                            if (textContent) {
                                                emailContent += '\n' + textContent;
                                            }
                                        }
                                        // 其次获取text/html部分并简单转换
                                        else if (part.type === 'text' && part.subtype === 'html') {
                                            const htmlContent = part.content ? part.content.toString() : '';
                                            if (htmlContent) {
                                                const textFromHtml = htmlContent
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
                                                emailContent += '\n' + textFromHtml;
                                            }
                                        }
                                    }
                                }
                            }
                        } catch (contentError) {
                            logger.error('提取邮件内容时出错:', contentError);
                            // 如果提取失败，尝试使用原始内容
                            emailContent = email.source.toString();
                        }
                        
                        // 特殊处理Cursor验证邮件
                        if (emailSubject.includes('Verify your email') || 
                            emailContent.includes('Verify your email') || 
                            emailContent.includes('code below in your open browser')) {
                            logger.info('检测到Cursor验证邮件');
                        }
                        
                        // 使用传入的解析器提取验证码
                        try {
                            logger.info('开始使用解析器提取验证码...');
                            const verificationCode = flow.extractVerificationCode(emailContent);
                            if (verificationCode) {
                                logger.info(`成功获取验证码: ${verificationCode}`);
                                
                                // 在返回前将邮件标记为已读
                                await this.executeWithRetryImap(async () => {
                                    await this.imapClient.messageFlagsAdd(msgUid, ['\\Seen']);
                                }).catch(err => logger.warn('标记邮件为已读失败:', err));
                                
                                return verificationCode;
                            } else {
                                logger.warn('邮件内容中未找到有效的验证码');
                                
                                // 针对Cursor邮件进行特殊处理，直接查找6位数字
                                if (emailSubject.includes('Verify your email') || emailContent.includes('Verify your email')) {
                                    const sixDigitMatch = emailContent.match(/\b(\d{6})\b/);
                                    if (sixDigitMatch && sixDigitMatch[1]) {
                                        const code = sixDigitMatch[1];
                                        logger.info(`直接从Cursor验证邮件中提取到6位数字验证码: ${code}`);
                                        
                                        // 标记邮件为已读
                                        await this.executeWithRetryImap(async () => {
                                            await this.imapClient.messageFlagsAdd(msgUid, ['\\Seen']);
                                        }).catch(err => logger.warn('标记邮件为已读失败:', err));
                                        
                                        return code;
                                    }
                                }
                                
                                // 将此邮件标记为非验证码邮件
                                nonVerificationEmailUIDs.add(msgUid);
                            }
                        } catch (parseError) {
                            logger.error('解析验证码失败:', parseError);
                            // 将此邮件标记为非验证码邮件
                            nonVerificationEmailUIDs.add(msgUid);
                        }
                    }
                    
                    // 等待指定时间后再次检查
                    logger.info(`未找到包含验证码的新邮件，${pollInterval/1000}秒后重新检查...`);
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                } catch (error) {
                    logger.error('检查邮件失败:', error);
                    // 尝试重新初始化连接
                    try {
                        await this.closeImapConnection();
                        await this.initImap();
                    } catch (reconnectError) {
                        logger.error('重新初始化IMAP连接失败:', reconnectError);
                    }
                    // 等待指定时间后重试
                    await new Promise(resolve => setTimeout(resolve, pollInterval));
                }
            }
            
            throw new Error(`等待验证码超时，已等待${timeout/1000}秒`);
        } catch (error) {
            logger.error('等待验证码过程中发生错误:', error);
            throw error;
        } finally {
            // 确保无论如何结束，连接都能被正确关闭
            logger.info('验证码等待过程结束，确保IMAP连接状态');
            // 注意：不要在这里完全关闭连接，因为可能还需要后续操作
            // 我们只确保连接处于正确的状态
            if (this.imapClient && !this.imapClient.usable) {
                logger.info('IMAP连接不可用，进行重置');
                await this.closeImapConnection();
            }
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