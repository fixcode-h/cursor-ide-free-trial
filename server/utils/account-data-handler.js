const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');
const { getConfig } = require('./config');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

class AccountDataHandler {
    // 账号状态常量
    static AccountStatus = {
        CREATED: 'CREATED',                 // 账号已创建
        CODE_RECEIVED: 'CODE_RECEIVED',     // 已收到验证码
        VERIFIED: 'VERIFIED',               // 已验证
        FAILED: 'FAILED',                   // 注册失败
        DISABLED: 'DISABLED'                // 账号已禁用
    };

    static CSV_HEADERS = [
        { id: 'username', title: 'USERNAME' },
        { id: 'email', title: 'EMAIL' },
        { id: 'password', title: 'PASSWORD' },
        { id: 'firstname', title: 'FIRSTNAME' },
        { id: 'lastname', title: 'LASTNAME' },
        { id: 'status', title: 'STATUS' },
        { id: 'cookie', title: 'COOKIE' },
        { id: 'verificationCode', title: 'VERIFICATION_CODE' },
        { id: 'registrationType', title: 'REGISTRATION_TYPE' },
        { id: 'createdAt', title: 'CREATED_AT' },
        { id: 'updatedAt', title: 'UPDATED_AT' }
    ];

    static getFilePath() {
        return path.join(process.env.APP_ROOT, 'data', 'accounts.db');
    }

    constructor() {
        this.config = getConfig();
        this.registrationType = this.config.registration.type;
        this.db = null;
    }

    async initialize() {
        try {
            const filePath = AccountDataHandler.getFilePath();
            const dataDir = path.dirname(filePath);

            // 检查并创建 data 目录
            try {
                await fs.access(dataDir);
            } catch (error) {
                await fs.mkdir(dataDir, { recursive: true });
                logger.info('创建 data 目录');
            }

            // 打开数据库连接
            this.db = await open({
                filename: filePath,
                driver: sqlite3.Database
            });

            // 创建表
            await this.createTable();
            logger.info('数据库初始化完成');
        } catch (error) {
            logger.error('初始化数据处理器失败:', error);
            throw error;
        }
    }

    async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                email TEXT UNIQUE,
                password TEXT,
                firstname TEXT,
                lastname TEXT,
                status TEXT,
                cookie TEXT,
                verificationCode TEXT,
                registrationType TEXT,
                createdAt TEXT,
                updatedAt TEXT,
                maxRequestUsage INTEGER DEFAULT 0,
                numRequests INTEGER DEFAULT 0
            )
        `;
        await this.db.exec(sql);
        
        // 检查并更新表结构
        await this.updateTableStructure();
    }
    
    async updateTableStructure() {
        try {
            // 获取表的所有列信息
            const tableInfo = await this.db.all(`PRAGMA table_info(accounts)`);
            
            // 检查字段是否存在
            const hasMaxRequestUsage = tableInfo.some(column => column.name === 'maxRequestUsage');
            const hasNumRequests = tableInfo.some(column => column.name === 'numRequests');
            
            // 如果字段不存在，添加这些字段
            if (!hasMaxRequestUsage) {
                await this.db.exec(`ALTER TABLE accounts ADD COLUMN maxRequestUsage INTEGER DEFAULT 0`);
                logger.info('添加字段: maxRequestUsage');
            }
            
            if (!hasNumRequests) {
                await this.db.exec(`ALTER TABLE accounts ADD COLUMN numRequests INTEGER DEFAULT 0`);
                logger.info('添加字段: numRequests');
            }
        } catch (error) {
            logger.error('更新表结构失败:', error);
            // 不抛出错误，让初始化继续
        }
    }

    async readRecords() {
        try {
            const sql = `
                SELECT * FROM accounts 
                WHERE registrationType = ?
                ORDER BY createdAt DESC
            `;
            const records = await this.db.all(sql, [this.registrationType]);
            return records;
        } catch (error) {
            logger.error('读取记录失败:', error);
            throw error;
        }
    }

    async appendRecord(record) {
        try {
            const columns = AccountDataHandler.CSV_HEADERS.map(h => h.id);
            const placeholders = columns.map(() => '?').join(',');
            const sql = `
                INSERT INTO accounts (${columns.join(',')})
                VALUES (${placeholders})
            `;

            const values = columns.map(column => {
                if (column === 'registrationType' && !record[column]) {
                    return this.registrationType;
                }
                return record[column] || '';
            });

            await this.db.run(sql, values);
            logger.info('添加新记录到数据库');
        } catch (error) {
            logger.error('添加记录失败:', error);
            throw error;
        }
    }

    async updateRecord(identifier, updates) {
        try {
            // 构建 SET 子句
            const setClause = Object.keys(updates)
                .map(key => `${key} = ?`)
                .join(',');
            
            // 处理数字类型字段，确保是数字而不是字符串
            if (updates.maxRequestUsage !== undefined) {
                updates.maxRequestUsage = Number(updates.maxRequestUsage) || 0;
            }
            if (updates.numRequests !== undefined) {
                updates.numRequests = Number(updates.numRequests) || 0;
            }
            
            // 准备参数值
            const values = [
                ...Object.values(updates),  // 更新字段的值
                this.registrationType,      // WHERE条件：注册类型
                identifier,                 // WHERE条件：email
                identifier                  // WHERE条件：username（使用同一标识符）
            ];
            
            logger.debug(`更新记录 ${identifier}，字段: ${Object.keys(updates).join(', ')}`);

            const sql = `
                UPDATE accounts 
                SET ${setClause}
                WHERE registrationType = ? 
                AND (email = ? OR username = ?)
            `;

            const result = await this.db.run(sql, values);

            if (result.changes === 0) {
                logger.warn(`未找到要更新的记录: ${identifier}`);
            } else {
                logger.info(`更新记录成功: ${identifier}, 影响行数: ${result.changes}`);
            }

            // 返回更新后的所有记录
            return await this.readRecords();
        } catch (error) {
            logger.error('更新记录失败:', error);
            throw error;
        }
    }

    async deleteRecord(email) {
        try {
            const sql = `
                DELETE FROM accounts 
                WHERE email = ? 
                AND registrationType = ?
            `;
            
            const result = await this.db.run(sql, [email, this.registrationType]);
            
            if (result.changes === 0) {
                throw new Error('找不到要删除的记录');
            }

            logger.info('删除记录成功:', email);
            return true;
        } catch (error) {
            logger.error('删除记录失败:', error);
            throw error;
        }
    }
}

module.exports = AccountDataHandler; 