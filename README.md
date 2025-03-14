# AI IDE Free Trial

[中文版](README_CN.md)

AI IDE Free Trial is a utility tool designed to help users conveniently try Cursor IDE's trial version. This tool primarily focuses on resolving machine code verification issues and provides streamlined email and account management features.

## Project Overview

This is an Electron-based utility tool focused on optimizing the Cursor IDE trial experience. Main features include:
- Resolving machine code verification issues
- Providing convenient email service integration
- Simplifying account management
- Optimizing trial experience

**Important Note:** If you find Cursor IDE meets your needs during the trial period, we strongly encourage you to purchase the official version for complete service experience.

**Platform Support:**
- Windows: Fully supported
- macOS: Under development
- Linux: Under development

## Tech Stack

### Desktop App
- Electron v33.0.0: Cross-platform desktop application framework
- Node.js: Runtime environment
- JavaScript/TypeScript: Primary development languages

### Local Server
- Express.js: Web application framework
- WebSocket: Real-time communication
- EJS: Template engine
- SQLite: Local data storage
- Puppeteer: Browser automation
- Axios: HTTP client

## Features

- Email service integration
- Modern user interface
- Account management system
- Real-time communication (WebSocket)
- Local data persistence
- Browser automation features
- Streamlined trial experience

## Installation Guide

### System Requirements

- Windows 10 or higher (Currently Windows-only)

**Note:** Support for macOS and Linux platforms is under development

### Installation Steps

1. Download:
   - Download the latest version zip package from the release page (e.g., `v1.2.0-win64.zip`)

2. Installation:
   - Extract the downloaded zip package to your desired directory
   - Run `AI_IDE_Free_Trial.exe` with administrator privileges

### Usage Guide

1. Basic Configuration:
   After running the software, go to the "Settings" tab and configure the following:

   **Proxy Settings:**
   - Check "Enable Proxy"
   - Fill in your proxy host and port information

   **Email Settings:**
   - Check "Use Proxy"
   - Select "Public API Pool" as type
   - Set API endpoint to: `https://emailapi.goaiwork.online`
   - Keep other email settings as default

   **Registration Settings:**
   - Select "cursor" as registration type

   **Browser Settings:**
   - Check "Enable Proxy"
   - Recommended to enable "Check Browser Fingerprint"
   - Not recommended to enable "Headless Mode" (may cause verification code issues)
   - If you have a fingerprint browser, you can specify its executable path

2. Usage Flow:
   - Click "Save Settings" after configuration
   - You can use the "One-Click Account Switch" tab for quick account switching
   - Or perform operations step by step in other tabs:
     - **Email Binding**: Generate new email account and bind email routing
     - **Account Registration**: Register account using the bound email
     - **Account Login**: Login with registered account and switch IDE account

### Environment Setup

1. Node.js Environment Configuration:
   - Download Node.js runtime for your platform
   - Root directory configuration:
     - Windows: Name Node.js environment folder as `node_win32`
     - macOS: Name Node.js environment folder as `node_darwin`
     - Linux: Name Node.js environment folder as `node_linux`
   - Server directory configuration:
     - Copy current system's Node.js environment to `server` directory, rename as `node`
     - Example: On Windows, copy `node_win32` to `server/node`

2. Directory Structure Example:
   ```
   root/
   ├── node_win32/     # Windows Node.js environment
   ├── node_darwin/    # macOS Node.js environment
   ├── node_linux/     # Linux Node.js environment
   └── server/
       └── node/       # Current system's Node.js environment (for debugging)
   ```

### Development Setup

```bash
# Clone the repository
git clone [repository URL]

# Install main app dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..
```

Node.js Environment Configuration for Packaging:
   - Download Node.js runtime for your platform
   - Root directory configuration:
     - Windows: Name Node.js environment folder as `node_win32`
     - macOS: Name Node.js environment folder as `node_darwin`
     - Linux: Name Node.js environment folder as `node_linux`
   - Server directory configuration:
     - Copy current system's Node.js environment to `server` directory, rename as `node`
     - Example: On Windows, copy `node_win32` to `server/node`

```bash
# Start development environment
npm run dev

# Start in Windows environment
npm run dev:win

# Build the application
npm run build
```

## Project Structure

```
.
├── src/            # Desktop app source code
├── public/         # Static resources
├── views/          # View files
├── server/         # Local server
│   ├── api/        # API routes
│   ├── flows/      # Business logic
│   ├── utils/      # Utility functions
│   ├── node/       # Current system's Node.js environment (for debugging)
│   ├── app.js      # App configuration
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
- [Electron](https://www.electronjs.org/): Cross-platform desktop application framework
- [Node.js](https://nodejs.org/): JavaScript runtime
- [electron-builder](https://www.electron.build/): Electron application packaging tool

### Server
- [Express](https://expressjs.com/): Web application framework
- [ws](https://github.com/websockets/ws): WebSocket client and server
- [SQLite3](https://github.com/TryGhost/node-sqlite3): SQLite database
- [Puppeteer](https://pptr.dev/): Browser automation tool
- [Nodemailer](https://nodemailer.com/): Email sending
- [EJS](https://ejs.co/): Embedded JavaScript templating

## Configuration

### Node.js Environment
- Runtime requirement: Node.js 14.0.0 or higher
- For development debugging, ensure `server/node` contains current system's Node.js environment
- Production environment automatically selects corresponding Node.js environment (node_win32/node_darwin/node_linux)

### Server Configuration
- Default port: 3000 (modifiable via startup parameters)
- Development environment: Uses APP_ROOT environment variable
- Production environment: Uses RES_PATH environment variable

## Contributing

Issues and Pull Requests are welcome to help improve the project.

## License

This project is open-sourced under the ISC License.

## Acknowledgments

Thanks to the following open-source projects and communities:

- Electron community
- Node.js community
- Express.js community
- SQLite community
- All project contributors

## Author

Guinea Pig Special Forces (豚鼠特攻)

## Version History

- Desktop App: v1.1.6
- Server: v1.1.2 