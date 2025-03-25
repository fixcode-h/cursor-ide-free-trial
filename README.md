# 🚀 Cursor IDE Free Trial

[中文版本](README_CN.md)

![Cursor IDE Free Trial Screenshot](doc/images/screenshot.png)

🎯 AI IDE Free Trial is a utility tool designed to help users better experience the trial version of Cursor IDE. This tool primarily addresses machine code verification issues during the trial period and provides convenient email and account management features.

## ✨ Project Introduction

This project is an Electron-based utility tool focused on optimizing the Cursor IDE trial experience. Unlike other tools that only provide partial implementation or rely on commercial/restricted backend APIs, this tool offers a complete open-source implementation of the entire process from email handling to registration, login, and account switching. After configuration, users can achieve truly unrestricted trial usage.

Main features include:
- 🔑 Resolving machine code verification issues
- 📧 Providing convenient email sending and receiving functionality
- 👤 Simplifying account management process
- ⚡ Optimizing trial experience

⚠️ **Important Note:** If you find Cursor IDE meets your needs during the trial, we strongly recommend purchasing the official version for a complete service experience.

🖥️ **Platform Support:**
- ✅ Windows: Full support
- 🚧 macOS: In development
- 🚧 Linux: In development

## 🛠️ Technology Stack

### 🖥️ Desktop App
- ⚛️ Electron v33.0.0: Cross-platform desktop application framework
- 🟢 Node.js: Runtime environment
- 📝 JavaScript/TypeScript: Primary development languages

### 🔧 Local Server
- 🌐 Express.js: Web application framework
- 🔄 WebSocket: Real-time communication
- 📄 EJS: Template engine
- 💾 SQLite: Local data storage
- 🤖 Puppeteer: Browser automation
- 🌍 Axios: HTTP client

## 💫 Features

- 📨 Email service integration
- 🎨 Modern user interface
- 👥 Account management system
- 🔄 Real-time communication support
- 💾 Local data persistence
- 🤖 Browser automation functionality

## 📦 Installation Guide

### 💻 System Requirements

- Windows 10 or higher (Currently only Windows platform is supported)

⚠️ **Note:** Support for macOS and Linux platforms is under development

### 🔧 Installation Steps

1. 📥 Download the software:
   - Download the latest version from the releases page https://github.com/chawuciren/cursor-ide-free-trial/releases

2. ⚙️ Install the program:
   - Extract the downloaded archive to a specified directory
   - Run `Cursor_IDE_Free_Trial.exe` with administrator privileges from the extracted directory

### 📝 Usage Instructions

#### ⚙️ Configuration Guide

1. **🌐 Network Proxy Configuration**
   - Go to the "Settings" tab
   - Check "Enable Proxy"
   - Fill in proxy host and port information
   - Click "Save Settings" to confirm changes

2. **📧 Email Service Configuration**
   - Check "Use Proxy" to ensure email service stability
   - Choose one of the following email configuration methods:

   A. IMAP Method (Recommended):
      - Prerequisites: Configure Cloudflare domain email forwarding ([Detailed instructions](doc/cloudflare-email-setup-cn.md))
      - Configuration steps:
        * Choose Gmail as receiving mailbox (recommended)
        * Enter complete receiving email address
        * Enter email application password (Gmail requires app-specific password)
        * Enable "Enable IMAP"
        * Set IMAP host to: imap.gmail.com
        * Set IMAP port to: 993

   B. TempMail Method:
      - Prerequisites: Understand TempMail service usage ([Detailed instructions](doc/tempmail-setup-cn.md))
      - Configuration steps:
        * Set preferred email domain (must match TempMail definition)
        * Check "Custom Username" option
        * Enter username set in TempMail
        * Enter corresponding PIN code

3. **🌍 Browser Configuration**
   - Basic settings:
     * Check "Enable Proxy" for network access
     * Recommended to enable "Check Browser Fingerprint"
     * Recommended to disable "Headless Mode" (to avoid CAPTCHA issues)
   
   - Fingerprint browser configuration (recommended):
     * Download and install [fingerprint-chromium](https://github.com/adryfish/fingerprint-chromium)
     * Locate chrome.exe installation path
     * Fill in "Chrome Executable Path"
     * Enable fingerprint features as needed

4. **📝 Registration Configuration**
   - Set registration type to "cursor"
   - Ensure all configuration items are completed
   - Click "Save Settings" to save all configurations

#### 🔄 Usage Process

1. **Quick Usage Method**
   - After completing all configurations, you can use the "One-Click Account Switch" feature
   - Click start in the "One-Click Switch" tab to automatically complete the entire process

2. **Step-by-Step Operation**
   A. Open Account List:
      - Go to "Account List" tab
      - Manage all account-related operations on this page

   B. Email Binding:
      - Click "Generate/Bind Account" button in the account list page
      - Wait for email generation and route binding to complete
      - Check binding status for confirmation

   C. Account Registration:
      - Find the account to register in the account list
      - Click the "Actions" dropdown menu for that account
      - Select "Account Registration" option
      - Wait for automatic registration process to complete
      - System will automatically save the registered account information

   D. Account Login:
      - Find the account to log in from the account list
      - Click the "Actions" dropdown menu for that account
      - Select "Account Login" option
      - System will automatically perform:
        * Account login
        * Machine code reset
        * IDE account switching
      - Wait for operations to complete

3. **Important Notes**
   - Ensure network proxy is stable and available
   - Keep software running in background until operations complete
   - Regularly check configuration status
   - Check logs for troubleshooting

### Development Environment Setup

```bash
# Clone project
git clone [project URL]

# Install main app dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

Node.js environment configuration for packaging:
   - Download Node.js runtime for your platform
   - Root directory configuration:
     - Windows: Name Node.js environment folder as `node_win32`
     - macOS: Name Node.js environment folder as `node_darwin`
     - Linux: Name Node.js environment folder as `node_linux`
   - Server directory configuration:
     - Copy Node.js environment corresponding to current system to `server` directory, named uniformly as `node`
     - Example: On Windows, copy `node_win32` to `server/node`

```bash
# Start development environment
npm run dev

# Start on Windows
npm run dev:win

# Build application
npm run build
```

Directory structure example:
   ```
   Project Root/
   ├── node_win32/     # Windows Node.js environment
   ├── node_darwin/    # macOS Node.js environment
   ├── node_linux/     # Linux Node.js environment
   └── server/
       └── node/       # Current system Node.js environment (for debugging)
   ```

## Project Structure

```
.
├── src/            # Desktop application source code
├── public/         # Static resources
├── views/          # View files
├── server/         # Local server
│   ├── api/        # API routes
│   ├── flows/      # Business flows
│   ├── utils/      # Utility functions
│   ├── node/       # Current system Node.js environment (for debugging)
│   ├── app.js      # Application configuration
│   └── server.js   # Server entry point
├── scripts/        # Build and utility scripts
├── extensions/     # Plugin system
├── release/        # Build output directory
├── node_win32/     # Windows Node.js environment
├── node_darwin/    # macOS Node.js environment
└── node_linux/     # Linux Node.js environment
```

## Dependencies

### Desktop Application
- [Electron](https://www.electronjs.org/): For building cross-platform desktop applications
- [Node.js](https://nodejs.org/): JavaScript runtime
- [electron-builder](https://www.electron.build/): Electron application packaging tool

### Server
- [Express](https://expressjs.com/): Web application framework
- [ws](https://github.com/websockets/ws): WebSocket client and server
- [SQLite3](https://github.com/TryGhost/node-sqlite3): SQLite database
- [Puppeteer](https://pptr.dev/): Browser automation tool
- [Nodemailer](https://nodemailer.com/): Email sending
- [EJS](https://ejs.co/): Embedded JavaScript templating

## Configuration Details

### Node.js Environment Configuration
- Runtime requirements: Node.js 14.0.0 or higher
- For development debugging, ensure `server/node` directory contains Node.js environment for current system
- Production environment automatically selects corresponding Node.js environment (node_win32/node_darwin/node_linux)

### Server Configuration
- Default port: 3000 (can be modified via startup parameters)
- Development environment: Uses APP_ROOT environment variable
- Production environment: Uses RES_PATH environment variable

## Contributing

Issues and Pull Requests are welcome to help improve the project.

## License

This project is open-source under the ISC license.

## Acknowledgments

Thanks to the following open-source projects and communities:

- Electron community
- Node.js community
- Express.js community
- SQLite community
- All project contributors

## Author

Guinea Pig Special Forces

## Version History

- Desktop App: v1.1.6
- Server: v1.1.2