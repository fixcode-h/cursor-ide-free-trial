# 🚀 Cursor IDE Free Trial

[English Version](README.md)

🎯 AI IDE Free Trial 是一个辅助工具，旨在帮助用户更方便地体验 Cursor IDE 的试用版本。本工具主要解决试用过程中的机器码报错问题，并提供便捷的邮箱收发及账号管理功能。

## ✨ 项目介绍

本项目是一个基于 Electron 的辅助工具，专注于优化 Cursor IDE 的试用体验。主要功能包括：
- 🔑 解决机器码验证问题
- 📧 提供便捷的邮箱收发功能
- 👤 简化账号管理流程
- ⚡ 优化试用体验

⚠️ **重要提示：** 如果您在试用过程中发现 Cursor IDE 符合您的需求，我们强烈建议您购买官方版本以获得完整的服务体验。

🖥️ **平台支持：**
- ✅ Windows：完整支持
- 🚧 macOS：开发中
- 🚧 Linux：开发中

## 🛠️ 技术栈

### 🖥️ 桌面应用（Desktop App）
- ⚛️ Electron v33.0.0：跨平台桌面应用开发框架
- 🟢 Node.js：运行时环境
- 📝 JavaScript/TypeScript：主要开发语言

### 🔧 本地服务器（Local Server）
- 🌐 Express.js：Web 应用框架
- 🔄 WebSocket：实时通信
- 📄 EJS：模板引擎
- 💾 SQLite：本地数据存储
- 🤖 Puppeteer：浏览器自动化
- 🌍 Axios：HTTP 客户端

## 💫 功能特点

- 📨 邮件服务集成
- 🎨 现代化的用户界面
- 👥 账号管理系统
- 🔄 实时通信支持
- 💾 本地数据持久化
- 🤖 浏览器自动化功能

## 📦 安装说明

### 💻 系统要求

- Windows 10 或更高版本（当前仅支持Windows平台）

⚠️ **注意：** macOS 和 Linux 平台的支持正在开发中

### 🔧 安装步骤

1. 📥 下载软件：
   - 从发布页面下载最新版本的压缩包（例如：`v1.2.0-win64.zip`）

2. ⚙️ 安装程序：
   - 将下载的压缩包解压到指定目录
   - 以管理员权限运行解压目录下的 `AI_IDE_Free_Trial.exe`

### 📝 使用说明

1. ⚙️ 基础设置配置：
   运行软件后，进入"设置"标签页，需要配置以下内容：

   **🌐 代理设置：**
   - 勾选"启用代理"
   - 填写代理主机和端口信息

   **📧 邮箱设置：**
   - 勾选"使用代理"
   - 类型选择"公共API池"
   - API端点填写：`https://emailapi.goaiwork.online`
   - 其他邮箱信息保持默认

   **📝 注册设置：**
   - 注册类型选择"cursor"

   **🌍 浏览器设置：**
   - 勾选"启用代理"
   - 建议启用"检查浏览器指纹"
   - 不建议启用"无头模式"（可能导致收不到验证码）
   - 如有指纹浏览器，可选择指定浏览器执行文件地址

2. 🔐 获取授权：
   如果您想使用便捷的公共API池来进行邮件收发，需要先获取授权：
   - 获取您的机器码
   - 通过以下方式之一申请授权：
     - Discord: [加入我们的Discord社区](https://discord.gg/wTjdGqNP)
     - WeChat: 扫描加群二维码 (`doc/wechat.png`)
   - 提供机器码给管理员，等待授权

3. 🔄 使用流程：
   - 完成设置后点击"保存设置"
   - 可以使用"一键换号"标签页进行快速切换
   - 也可以在其他功能标签页进行单步操作：
     - **📧 邮箱绑定**：生成新邮箱账号并进行邮箱路由绑定
     - **👤 账号注册**：使用绑定的邮箱进行账号注册
     - **🔑 账号登录**：使用注册完成的账号进行登录，并切换IDE账号

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
```

用于打包的Node.js 环境配置：
   - 下载对应平台的 Node.js 运行环境
   - 项目根目录配置：
     - Windows: 将 Node.js 环境文件夹命名为 `node_win32`
     - macOS: 将 Node.js 环境文件夹命名为 `node_darwin`
     - Linux: 将 Node.js 环境文件夹命名为 `node_linux`
   - 服务器目录配置：
     - 将当前运行系统对应的 Node.js 环境复制到 `server` 目录下，统一命名为 `node`
     - 例如：Windows 系统下，复制 `node_win32` 到 `server/node`

```bash
# 启动开发环境
npm run dev

# Windows 环境下启动
npm run dev:win

# 构建应用
npm run build
```

目录结构示例：
   ```
   项目根目录/
   ├── node_win32/     # Windows Node.js 环境
   ├── node_darwin/    # macOS Node.js 环境
   ├── node_linux/     # Linux Node.js 环境
   └── server/
       └── node/       # 当前系统的 Node.js 环境（调试用）
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