# AI IDE Free Trial

AI IDE Free Trial is an intelligent integrated development environment (IDE) tool based on Electron, designed to provide AI-assisted programming experience for developers.

## Project Introduction

This project is a free trial version of the AI IDE tool, integrating various intelligent programming assistance features to help developers improve their programming efficiency. It supports multiple platforms including Windows, macOS, and Linux. The project consists of an Electron desktop application and a local server, providing complete IDE functionality and AI assistance services.

## Technology Stack

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

- Cross-platform support (Windows, macOS, Linux)
- AI-powered programming assistance
- Modern user interface
- Extensible plugin system
- Real-time communication support (WebSocket)
- Local data persistence
- Email service integration
- Browser automation capabilities

## Installation Guide

### System Requirements

- Windows 10 or higher
- macOS 10.13 or higher
- Linux (major distributions supported)
- Node.js 14.0.0 or higher

### Environment Setup

1. Node.js Environment Configuration:
   - Download Node.js runtime for your platform
   - Root directory configuration:
     - Windows: Name the Node.js environment folder as `node_win32`
     - macOS: Name the Node.js environment folder as `node_darwin`
     - Linux: Name the Node.js environment folder as `node_linux`
   - Server directory configuration:
     - Copy your current system's Node.js environment to the `server` directory, renamed as `node`
     - Example: On Windows, copy `node_win32` to `server/node`

2. Directory Structure Example:
   ```
   project_root/
   ├── node_win32/     # Windows Node.js environment
   ├── node_darwin/    # macOS Node.js environment
   ├── node_linux/     # Linux Node.js environment
   └── server/
       └── node/       # Current system's Node.js environment (for debugging)
   ```

### Installation Steps

1. Download the installation package for your platform:
   - Windows: AIIDEFreeTrial.exe
   - macOS: AI_IDE_Free_Trial.dmg
   - Linux: AI_IDE_Free_Trial.AppImage

2. Run the installer:
   - Windows: Run the executable file directly
   - macOS: Open the DMG file and drag to Applications folder
   - Linux: Grant execute permission to the AppImage file and run

### Development Environment Setup

```bash
# Clone the repository
git clone [repository_url]

# Install main application dependencies
npm install

# Install server dependencies
cd server
npm install
cd ..

# Start development environment
npm run dev

# Start on Windows
npm run dev:win

# Build application
npm run build
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
│   ├── node/       # Current system's Node.js environment (for debugging)
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

### Node.js Environment Configuration
- Runtime requirement: Node.js 14.0.0 or higher
- Ensure `server/node` directory contains the Node.js environment for your current system during development
- Production environment automatically selects the appropriate Node.js environment (node_win32/node_darwin/node_linux)

### Server Configuration
- Default port: 3000 (can be modified via startup parameters)
- Development environment: Uses APP_ROOT environment variable
- Production environment: Uses RES_PATH environment variable

## Contributing

Issues and Pull Requests are welcome to help improve the project.

## License

This project is licensed under the ISC License.

## Acknowledgments

Thanks to the following open source projects and communities:

- Electron Community
- Node.js Community
- Express.js Community
- SQLite Community
- All project contributors

## Author

豚鼠特攻 (Guinea Pig Special Forces)

## Version History

- Desktop App: v1.1.6
- Server: v1.1.2 