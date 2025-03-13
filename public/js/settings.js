document.addEventListener('DOMContentLoaded', function() {
    const settingsForm = document.getElementById('settingsForm');
    const resetButton = document.getElementById('resetSettings');
    const emailType = document.getElementById('emailType');
    const tempmailSettings = document.getElementById('tempmailSettings');
    const publicApiSettings = document.getElementById('publicApiSettings');
    const commonEmailSettings = document.getElementById('commonEmailSettings');
    const smtpSettingsEnabled = document.getElementById('smtpSettingsEnabled');
    const smtpEnabled = document.getElementById('smtpEnabled');
    const smtpSettings = document.getElementById('smtpSettings');
    const imapSettingsEnabled = document.getElementById('imapSettingsEnabled');
    const imapEnabled = document.getElementById('imapEnabled');
    const imapSettings = document.getElementById('imapSettings');
    const emailProxySettings = document.getElementById('emailProxySettings');
    const cloudflareSettings = document.getElementById('cloudflareSettings');

    // 加载版本信息
    loadVersionInfo();

    // 加载配置
    loadConfig();

    // 表单提交处理
    settingsForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData(settingsForm);
        const config = {};

        // 处理所有 checkbox，确保未选中的也会被设置为 false
        settingsForm.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (!formData.has(checkbox.name)) {
                formData.append(checkbox.name, false);
            }
        });

        // 将表单数据转换为嵌套对象
        for (let [key, value] of formData.entries()) {
            setNestedValue(config, key, convertValue(value));
        }

        try {
            const result = await API.config.update(config);
            if (result.success) {
                appendToConsole('success', '设置已保存');
            } else {
                appendToConsole('error', '保存设置失败: ' + result.error);
            }
        } catch (error) {
            appendToConsole('error', '保存设置失败: ' + error.message);
        }
    });

    // 重置按钮处理
    resetButton.addEventListener('click', loadConfig);

    // 邮箱类型切换处理
    emailType.addEventListener('change', function() {
        // 隐藏特定的邮箱设置
        tempmailSettings.style.display = 'none';
        commonEmailSettings.style.display = 'none';
        smtpSettings.style.display = 'none';
        imapSettings.style.display = 'none';
        publicApiSettings.style.display = 'none';
        smtpSettingsEnabled.style.display = 'none';
        imapSettingsEnabled.style.display = 'none';

        // 代理设置始终显示
        emailProxySettings.style.display = 'block';
        cloudflareSettings.style.display = 'block';

        // 根据选择显示相应设置
        switch(this.value) {
            case 'tempmail':
                tempmailSettings.style.display = 'block';
                commonEmailSettings.style.display = 'block';
                smtpSettings.style.display = 'block';
                imapSettings.style.display = 'block';
                break;
            case 'imap':
                commonEmailSettings.style.display = 'block';
                smtpSettings.style.display = 'block';
                imapSettings.style.display = 'block';
                smtpSettingsEnabled.style.display = 'block';
                imapSettingsEnabled.style.display = 'block';
                break;
            case 'publicApi':
                publicApiSettings.style.display = 'block';
                cloudflareSettings.style.display = 'none';
                break;
        }
    });

    // SMTP启用/禁用处理
    smtpEnabled.addEventListener('change', function() {
        smtpSettings.style.display = this.checked ? 'block' : 'none';
    });

    // IMAP启用/禁用处理
    imapEnabled.addEventListener('change', function() {
        imapSettings.style.display = this.checked ? 'block' : 'none';
    });

    // 处理Chrome可执行文件路径选择
    document.getElementById('selectChromePathBtn').addEventListener('click', async () => {
        try {
            // 使用 IPC 通信选择文件
            const result = await window.electron.ipcRenderer.invoke('select-file', {
                title: '选择Chrome可执行文件',
                filters: [
                    { name: 'Chrome Executable', extensions: ['exe'] }
                ]
            });

            if (result.success && result.data) {
                const filePath = result.data;
                document.getElementById('browserExecutablePath').value = filePath;
                appendToConsole('success', '已选择Chrome可执行文件: ' + filePath);
            }
        } catch (error) {
            console.error('选择Chrome可执行文件路径失败:', error);
            appendToConsole('error', '选择Chrome可执行文件路径失败: ' + error.message);
        }
    });

    // 允许直接编辑输入框
    document.getElementById('browserExecutablePath').addEventListener('input', (event) => {
        // 可以在这里添加路径验证逻辑
        const path = event.target.value;
    });

    // 处理Chrome可执行文件路径重置
    document.getElementById('resetChromePathBtn').addEventListener('click', () => {
        const input = document.getElementById('browserExecutablePath');
        input.value = '';
        appendToConsole('info', 'Chrome可执行文件路径已恢复默认值');
    });

    // 加载配置函数
    async function loadConfig() {
        try {
            const result = await API.config.get();
            
            if (result.success) {
                const config = result.data;
                
                // 填充表单
                Object.keys(config).forEach(key => {
                    fillFormFields(key, config[key]);
                });

                // 更新UI状态
                emailType.dispatchEvent(new Event('change'));
                smtpEnabled.dispatchEvent(new Event('change'));
                imapEnabled.dispatchEvent(new Event('change'));

                appendToConsole('success', '配置已加载');
            } else {
                appendToConsole('error', '加载配置失败: ' + result.error);
            }
        } catch (error) {
            appendToConsole('error', '加载配置失败: ' + error.message);
        }
    }

    // 加载版本信息函数
    async function loadVersionInfo() {
        try {
            const result = await API.config.getVersion();
            if (result.success) {
                const info = result.data;
                document.getElementById('appName').textContent = info.name || '-';
                document.getElementById('appVersion').textContent = info.version || '-';
                document.getElementById('appLicense').textContent = info.license || '-';
                document.getElementById('appAuthor').textContent = info.author || '-';
                document.getElementById('appDescription').textContent = info.description || '-';
                document.getElementById('appKeywords').textContent = info.keywords ? info.keywords.join(', ') : '-';
            } else {
                appendToConsole('error', '加载版本信息失败: ' + result.error);
            }
        } catch (error) {
            appendToConsole('error', '加载版本信息失败: ' + error.message);
        }
    }

    // 辅助函数：设置嵌套对象的值
    function setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }

    // 辅助函数：转换表单值
    function convertValue(value) {
        // 处理布尔值
        if (value === 'true' || value === true) return true;
        if (value === 'false' || value === false) return false;
        if (value === 'on') return true;  // checkbox 选中时的值
        if (value === '') return null;
        // 处理数字
        if (!isNaN(value) && value.trim() !== '') return Number(value);
        return value;
    }

    // 辅助函数：填充表单字段
    function fillFormFields(prefix, data) {
        if (typeof data === 'object' && data !== null) {
            Object.keys(data).forEach(key => {
                fillFormFields(prefix + '.' + key, data[key]);
            });
        } else {
            const element = document.querySelector(`[name="${prefix}"]`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = data;
                } else {
                    element.value = data;
                }
            }
        }
    }

}); 