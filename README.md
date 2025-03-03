# AI IDE Free Trial

[English Version](README_EN.md)

AI IDE Free Trial 是一个基于 Electron 的智能集成开发环境（IDE）工具，旨在为开发者提供 AI 辅助编程体验。

## 项目介绍

本项目是一个免费试用版的 AI IDE 工具，集成了多种智能编程辅助功能，帮助开发者提高编程效率。支持 Windows、macOS 和 Linux 多个平台。该项目包含一个 Electron 桌面应用和一个本地服务器，提供完整的 IDE 功能和 AI 辅助服务。

## 技术栈

### 桌面应用（Desktop App）
- Electron v33.0.0：跨平台桌面应用开发框架
- Node.js：运行时环境
- JavaScript/TypeScript：主要开发语言

### 本地服务器（Local Server）
- Express.js：Web 应用框架
- WebSocket：实时通信
- EJS：模板引擎
- SQLite：本地数据存储
- Puppeteer：浏览器自动化
- Axios：HTTP 客户端

## 功能特点

- 跨平台支持（Windows、macOS、Linux）
- AI 智能编程辅助
- 现代化的用户界面
- 可扩展的插件系统
- 实时通信支持（WebSocket）
- 本地数据持久化
- 邮件服务集成
- 浏览器自动化功能

## 安装说明

### 系统要求

- Windows 10 或更高版本
- macOS 10.13 或更高版本
- Linux（支持主流发行版）
- Node.js 14.0.0 或更高版本

### 环境配置

1. Node.js 环境配置：
   - 下载对应平台的 Node.js 运行环境
   - 项目根目录配置：
     - Windows: 将 Node.js 环境文件夹命名为 `node_win32`
     - macOS: 将 Node.js 环境文件夹命名为 `node_darwin`
     - Linux: 将 Node.js 环境文件夹命名为 `node_linux`
   - 服务器目录配置：
     - 将当前运行系统对应的 Node.js 环境复制到 `server` 目录下，统一命名为 `node`
     - 例如：Windows 系统下，复制 `node_win32` 到 `server/node`

2. 目录结构示例：
   ```
   项目根目录/
   ├── node_win32/     # Windows Node.js 环境
   ├── node_darwin/    # macOS Node.js 环境
   ├── node_linux/     # Linux Node.js 环境
   └── server/
       └── node/       # 当前系统的 Node.js 环境（用于调试）
   ```

### 安装步骤

1. 下载对应平台的安装包：
   - Windows: AIIDEFreeTrial.exe
   - macOS: AI_IDE_Free_Trial.dmg
   - Linux: AI_IDE_Free_Trial.AppImage

2. 运行安装程序：
   - Windows：直接运行可执行文件
   - macOS：打开 DMG 文件并拖动到应用程序文件夹
   - Linux：赋予 AppImage 执行权限后运行

### 开发环境搭建

```bash
# 克隆项目
git clone [项目地址]

# 安装主应用依赖
npm install

# 安装服务器依赖
cd server
npm install
cd ..

# 启动开发环境
npm run dev

# Windows 环境下启动
npm run dev:win

# 构建应用
npm run build
```

## 项目结构

```
.
├── src/            # 桌面应用源代码目录
├── public/         # 静态资源
├── views/          # 视图文件
├── server/         # 本地服务器
│   ├── api/        # API 路由
│   ├── flows/      # 业务流程
│   ├── utils/      # 工具函数
│   ├── node/       # 当前系统的 Node.js 环境（调试用）
│   ├── app.js      # 应用配置
│   └── server.js   # 服务器入口
├── scripts/        # 构建和工具脚本
├── extensions/     # 插件系统
├── release/        # 构建输出目录
├── node_win32/     # Windows Node.js 环境
├── node_darwin/    # macOS Node.js 环境
└── node_linux/     # Linux Node.js 环境
```

## 依赖的开源项目

### 桌面应用
- [Electron](https://www.electronjs.org/)：用于构建跨平台桌面应用
- [Node.js](https://nodejs.org/)：JavaScript 运行时
- [electron-builder](https://www.electron.build/)：Electron 应用打包工具

### 服务器
- [Express](https://expressjs.com/)：Web 应用框架
- [ws](https://github.com/websockets/ws)：WebSocket 客户端和服务器
- [SQLite3](https://github.com/TryGhost/node-sqlite3)：SQLite 数据库
- [Puppeteer](https://pptr.dev/)：浏览器自动化工具
- [Nodemailer](https://nodemailer.com/)：邮件发送
- [EJS](https://ejs.co/)：嵌入式 JavaScript 模板引擎

## 配置说明

### Node.js 环境配置
- 运行环境要求：Node.js 14.0.0 或更高版本
- 开发调试时需确保 `server/node` 目录包含当前系统对应的 Node.js 环境
- 生产环境会根据用户系统自动选择对应的 Node.js 环境（node_win32/node_darwin/node_linux）

### 服务器配置
- 默认端口：3000（可通过启动参数修改）
- 开发环境：使用 APP_ROOT 环境变量
- 生产环境：使用 RES_PATH 环境变量

## 贡献指南

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 许可证

本项目基于 ISC 许可证开源。

## 感谢

感谢以下开源项目和社区的贡献：

- Electron 社区
- Node.js 社区
- Express.js 社区
- SQLite 社区
- 所有项目贡献者

## 作者

豚鼠特攻

## 版本历史

- 桌面应用：v1.1.6
- 服务器：v1.1.2 