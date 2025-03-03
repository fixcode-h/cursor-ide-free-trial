const os = require('os');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// 获取CPU信息
async function getCPUID() {
    try {
        if (process.platform === 'win32') {
            const cpuInfo = [];
            
            // 获取处理器ID
            const { stdout: processorId } = await execAsync('wmic cpu get processorID');
            const processorIdLines = processorId.split('\n').filter(line => line.trim());
            if (processorIdLines.length >= 2) {
                cpuInfo.push(processorIdLines[1].trim());
            }

            // 获取CPU制造商
            const { stdout: manufacturer } = await execAsync('wmic cpu get manufacturer');
            const manufacturerLines = manufacturer.split('\n').filter(line => line.trim());
            if (manufacturerLines.length >= 2) {
                cpuInfo.push(manufacturerLines[1].trim());
            }

            // 获取CPU名称
            const { stdout: name } = await execAsync('wmic cpu get name');
            const nameLines = name.split('\n').filter(line => line.trim());
            if (nameLines.length >= 2) {
                cpuInfo.push(nameLines[1].trim());
            }

            return cpuInfo.join('|');
        } else {
            const { stdout } = await execAsync('cat /proc/cpuinfo');
            const cpuInfo = [];
            const lines = stdout.split('\n');
            
            // 提取关键信息
            const vendorId = lines.find(line => line.includes('vendor_id'))?.split(':')[1]?.trim() || '';
            const modelName = lines.find(line => line.includes('model name'))?.split(':')[1]?.trim() || '';
            const cpuFamily = lines.find(line => line.includes('cpu family'))?.split(':')[1]?.trim() || '';
            
            return [vendorId, modelName, cpuFamily].join('|');
        }
    } catch (error) {
        console.error('获取CPU信息失败:', error);
        return '';
    }
}

// 获取主板信息
async function getMotherboardSerial() {
    try {
        if (process.platform === 'win32') {
            const boardInfo = [];
            
            // 获取主板信息
            const commands = [
                { cmd: 'wmic baseboard get serialnumber', label: 'Serial' },
                { cmd: 'wmic baseboard get manufacturer', label: 'Manufacturer' },
                { cmd: 'wmic baseboard get product', label: 'Product' },
                { cmd: 'wmic baseboard get version', label: 'Version' }
            ];

            for (const { cmd } of commands) {
                const { stdout } = await execAsync(cmd);
                const lines = stdout.split('\n').filter(line => line.trim());
                if (lines.length >= 2) {
                    boardInfo.push(lines[1].trim());
                }
            }

            // 获取BIOS信息
            const biosCommands = [
                { cmd: 'wmic bios get serialnumber', label: 'BiosSerial' },
                { cmd: 'wmic bios get manufacturer', label: 'BiosManufacturer' },
                { cmd: 'wmic bios get version', label: 'BiosVersion' }
            ];

            for (const { cmd } of biosCommands) {
                const { stdout } = await execAsync(cmd);
                const lines = stdout.split('\n').filter(line => line.trim());
                if (lines.length >= 2) {
                    boardInfo.push(lines[1].trim());
                }
            }

            return boardInfo.join('|');
        } else {
            const boardInfo = [];
            
            // 获取主板信息
            const commands = [
                'dmidecode -s baseboard-serial-number',
                'dmidecode -s baseboard-manufacturer',
                'dmidecode -s baseboard-product-name',
                'dmidecode -s baseboard-version',
                'dmidecode -s bios-version',
                'dmidecode -s bios-vendor',
                'dmidecode -s bios-release-date'
            ];

            for (const cmd of commands) {
                try {
                    const { stdout } = await execAsync(`sudo ${cmd}`);
                    if (stdout.trim()) {
                        boardInfo.push(stdout.trim());
                    }
                } catch (e) {
                    boardInfo.push('');
                }
            }

            return boardInfo.join('|');
        }
    } catch (error) {
        console.error('获取主板信息失败:', error);
        return '';
    }
}

// 获取硬盘信息
async function getDiskSerial() {
    try {
        if (process.platform === 'win32') {
            const diskInfo = [];
            
            try {
                // 使用单个命令获取所有磁盘信息
                const { stdout } = await execAsync('wmic diskdrive get SerialNumber,Model,Manufacturer,Size,InterfaceType,MediaType');
                const lines = stdout.split('\n').filter(line => line.trim());
                
                if (lines.length >= 2) {
                    // 使用第一个磁盘的信息
                    const firstDiskInfo = lines[1].trim();
                    // 将多个空格替换为单个空格，然后按空格分割
                    const diskData = firstDiskInfo.replace(/\s+/g, ' ').split(' ');
                    diskInfo.push(...diskData);
                }
                
                if (diskInfo.length === 0) {
                    throw new Error('未找到磁盘信息');
                }
            } catch (error) {
                console.error('获取磁盘信息失败，尝试分别获取各个属性:', error);
                
                // 降级方案：分别获取各个属性
                const commands = [
                    'wmic diskdrive get SerialNumber',
                    'wmic diskdrive get Model',
                    'wmic diskdrive get Manufacturer',
                    'wmic diskdrive get Size',
                    'wmic diskdrive get InterfaceType',
                    'wmic diskdrive get MediaType'
                ];
                
                for (const cmd of commands) {
                    try {
                        const { stdout } = await execAsync(cmd);
                        const lines = stdout.split('\n').filter(line => line.trim());
                        if (lines.length >= 2) {
                            diskInfo.push(lines[1].trim());
                        } else {
                            diskInfo.push(''); // 如果没有找到值，添加空字符串
                        }
                    } catch (e) {
                        diskInfo.push(''); // 如果获取某个属性失败，添加空字符串
                    }
                }
            }

            return diskInfo.join('|');
        } else {
            const diskInfo = [];
            
            try {
                // 获取根目录所在的文件系统设备
                const { stdout: mountInfo } = await execAsync('df / | tail -n 1');
                const rootDevice = mountInfo.split(' ')[0];
                
                // 获取该设备对应的物理磁盘
                const { stdout: realDisk } = await execAsync(`lsblk -no pkname ${rootDevice}`);
                const systemDisk = realDisk.trim();

                if (systemDisk) {
                    // 获取系统磁盘的详细信息
                    const { stdout } = await execAsync(`sudo hdparm -I /dev/${systemDisk}`);
                    const lines = stdout.split('\n');
                    
                    // 提取关键信息
                    const serialNumber = lines.find(line => line.includes('Serial Number'))?.split(':')[1]?.trim() || '';
                    const model = lines.find(line => line.includes('Model Number'))?.split(':')[1]?.trim() || '';
                    const firmware = lines.find(line => line.includes('Firmware Revision'))?.split(':')[1]?.trim() || '';
                    const transport = lines.find(line => line.includes('Transport:'))?.split(':')[1]?.trim() || '';
                    const capacity = lines.find(line => line.includes('device size with M = 1000*1000:'))?.split(':')[1]?.trim() || '';
                    
                    diskInfo.push(serialNumber, model, firmware, transport, capacity);
                }
            } catch (e) {
                console.error('获取硬盘详细信息失败:', e);
            }

            return diskInfo.join('|');
        }
    } catch (error) {
        console.error('获取硬盘信息失败:', error);
        return '';
    }
}

// 获取第一个物理网卡的MAC地址
function getPrimaryMAC() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        const interface = interfaces[name];
        for (const info of interface) {
            if (!info.internal && info.mac !== '00:00:00:00:00:00') {
                return info.mac;
            }
        }
    }
    return '';
}

// 生成机器码
async function generateMachineCode() {
    try {
        // 收集硬件信息
        const [cpuId, motherboardSerial, diskSerial] = await Promise.all([
            getCPUID(),
            getMotherboardSerial(),
            getDiskSerial()
        ]);
        const macAddress = getPrimaryMAC();
        const osInfo = `${os.platform()}-${os.release()}`;

        // 组合所有硬件信息
        const hardwareInfo = [
            cpuId,
            motherboardSerial,
            diskSerial,
            macAddress,
            osInfo
        ].join('|');

        // 生成哈希
        const hash = crypto.createHash('sha256')
            .update(hardwareInfo)
            .digest('hex')
            .slice(0, 32);

        // 格式化为更易读的形式（每4个字符加一个连字符）
        return hash.match(/.{4}/g).join('-');
    } catch (error) {
        console.error('生成机器码失败:', error);
        throw error;
    }
}

module.exports = {
    generateMachineCode
}; 