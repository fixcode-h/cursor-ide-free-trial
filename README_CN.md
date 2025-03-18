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
   - 从发布页面下载最新版本的压缩包 https://github.com/chawuciren/cursor-ide-free-trial/releases

2. ⚙️ 安装程序：
   - 将下载的压缩包解压到指定目录
   - 以管理员权限运行解压目录下的 `Cursor_IDE_Free_Trial.exe`

### 📝 使用说明

#### ⚙️ 配置说明

1. **🌐 网络代理配置**
   - 进入"设置"标签页
   - 勾选"启用代理"
   - 填写代理主机和端口信息
   - 点击"保存设置"确认更改

2. **📧 邮箱服务配置**
   - 勾选"使用代理"以确保邮件服务稳定性
   - 选择以下任一邮箱配置方式：

   A. IMAP 形式（推荐）：
      - 前置准备：配置 Cloudflare 域名邮箱转发（参考：`doc/cloudflare-email-setup-cn.md`）
      - 配置步骤：
        * 选择 Gmail 作为收件邮箱（推荐）
        * 填写完整收件邮箱地址
        * 填写邮箱应用密码（Gmail 需要使用应用专用密码）
        * 勾选"启用 IMAP"
        * IMAP 主机设置为：imap.gmail.com
        * IMAP 端口设置为：993

   B. TempMail 形式：
      - 前置准备：了解 TempMail 服务使用方法（参考：`doc/tempmail-setup-cn.md`）
      - 配置步骤：
        * 设置邮箱首选域名（需与 TempMail 中定义一致）
        * 勾选"自定义用户名"选项
        * 填写在 TempMail 中设置的用户名
        * 填写对应的 PIN 码

3. **🌍 浏览器配置**
   - 基础设置：
     * 勾选"启用代理"确保网络访问
     * 建议启用"检查浏览器指纹"
     * 建议关闭"无头模式"（避免验证码接收问题）
   
   - 指纹浏览器配置（推荐）：
     * 下载安装 [fingerprint-chromium](https://github.com/adryfish/fingerprint-chromium)
     * 定位 chrome.exe 安装路径
     * 填写"Chrome可执行文件路径"
     * 根据需要开启指纹功能

4. **📝 注册相关配置**
   - 将注册类型设置为"cursor"
   - 确保所有配置项填写完整
   - 点击"保存设置"保存所有配置

#### 🔄 使用流程

1. **快速使用方式**
   - 完成所有配置后，可直接使用"一键换号"功能
   - 在"一键换号"标签页中点击开始即可自动完成全流程

2. **单步操作方式**
   A. 邮箱绑定：
      - 进入"邮箱绑定"标签页
      - 点击"生成邮箱"获取新邮箱
      - 等待邮箱路由绑定完成
      - 查看绑定状态确认成功

   B. 账号注册：
      - 进入"账号注册"标签页
      - 确认使用已绑定的邮箱
      - 点击"开始注册"
      - 等待注册流程完成
      - 保存生成的账号信息

   C. 账号登录：
      - 进入"账号登录"标签页
      - 选择要使用的已注册账号
      - 点击"开始登录"
      - 等待自动登录完成
      - 确认 IDE 账号切换成功

3. **注意事项**
   - 确保网络代理稳定可用
   - 保持软件后台运行直到操作完成
   - 定期检查配置是否正常
   - 遇到问题可查看日志信息

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