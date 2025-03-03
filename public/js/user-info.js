// 全局变量存储授权状态
let isLicensed = false;

// 更新标签页可见性
function updateTabsVisibility(licensed) {
    const tabs = document.querySelectorAll('#mainTabs .nav-item');
    tabs.forEach((tab, index) => {
        if (index === 0 || index === tabs.length - 1) { // 用户信息（第一个）和设置（最后一个）标签
            tab.style.display = ''; // 始终显示
        } else if (licensed) {
            tab.style.display = ''; // 显示
        } else {
            tab.style.display = 'none'; // 隐藏
        }
    });
}

// 生成授权码输入页面的HTML
function generateLicenseInputHtml(machineCode, errorMessage = null) {
    return `
        <div class="form-container">
            <h3>用户信息</h3>
            ${errorMessage ? `
                <div class="alert alert-danger" role="alert">
                    <i class="bi bi-x-circle me-2"></i>
                    ${errorMessage}
                </div>
            ` : `
                <div class="alert alert-warning" role="alert">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    未授权，请输入授权码
                </div>
            `}
            <div class="card mb-3">
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label">机器码</label>
                        <div class="input-group">
                            <input type="text" class="form-control bg-dark text-light border-secondary" id="machineCodeDisplay" value="${machineCode}" readonly>
                            <button class="btn btn-outline-secondary" type="button" onclick="copyMachineCode()">
                                <i class="bi bi-clipboard"></i> 复制
                            </button>
                        </div>
                        <small class="form-text text-muted">请将此机器码发送给客服获取授权码</small>
                    </div>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <form id="licenseForm" onsubmit="submitLicense(event)">
                        <div class="mb-3">
                            <label for="licenseKey" class="form-label">授权码</label>
                            <textarea class="form-control" id="licenseKey" rows="3" required></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">提交授权码</button>
                    </form>
                </div>
            </div>
        </div>`;
}

// 更新授权信息显示
async function updateLicenseInfo() {
    try {
        const [licenseResponse, machineCodeResponse, userInfoResponse] = await Promise.all([
            API.license.status(),
            API.license.getMachineCode(),
            API.users.info()
        ]);
        
        const status = licenseResponse.status;
        const machineCode = machineCodeResponse.machineCode;
        const userInfo = userInfoResponse.success ? userInfoResponse.data : null;
        isLicensed = status.isValid;

        // 更新标签页可见性
        updateTabsVisibility(isLicensed);

        const userInfoContent = document.getElementById('user-info');

        if (isLicensed) {
            // 已授权状态：显示完整的授权信息
            const info = status.licenseInfo;
            userInfoContent.innerHTML = `
                <div class="form-container">
                    <h3>用户信息</h3>
                    <div class="alert alert-success" role="alert">
                        <i class="bi bi-check-circle me-2"></i>
                        授权有效
                    </div>
                    <div class="card">
                        <div class="card-body">
                            <div class="list-group">
                                <div class="list-group-item bg-dark-subtle border-dark text-light d-flex justify-content-between align-items-center" style="background-color: #1a1a1a !important; border-color: #404040;">
                                    <span class="label" style="color: #8a8a8a;">用户名</span>
                                    <span class="value" style="color: #ffffff;">${info.username || '未设置'}</span>
                                </div>
                                <div class="list-group-item bg-dark-subtle border-dark text-light d-flex justify-content-between align-items-center" style="background-color: #1a1a1a !important; border-color: #404040;">
                                    <span class="label" style="color: #8a8a8a;">授权类型</span>
                                    <span class="value" style="color: #ffffff;">${info.type || '未知'}</span>
                                </div>
                                <div class="list-group-item bg-dark-subtle border-dark text-light d-flex justify-content-between align-items-center" style="background-color: #1a1a1a !important; border-color: #404040;">
                                    <span class="label" style="color: #8a8a8a;">过期时间</span>
                                    <span class="value" style="color: #ffffff;">${new Date(info.expiryDate).toLocaleString()}</span>
                                </div>
                                <div class="list-group-item bg-dark-subtle border-dark text-light d-flex justify-content-between align-items-center" style="background-color: #1a1a1a !important; border-color: #404040;">
                                    <span class="label" style="color: #8a8a8a;">剩余天数</span>
                                    <span class="value" style="color: #ffffff;">${status.remainingDays} 天</span>
                                </div>
                                <div class="list-group-item bg-dark-subtle border-dark text-light d-flex justify-content-between align-items-center" style="background-color: #1a1a1a !important; border-color: #404040;">
                                    <span class="label" style="color: #8a8a8a;">机器码</span>
                                    <span class="value" style="color: #ffffff;">${info.machineCode || machineCode}</span>
                                </div>
                                <div class="list-group-item bg-dark-subtle border-dark text-light d-flex justify-content-between align-items-center" style="background-color: #1a1a1a !important; border-color: #404040;">
                                    <span class="label" style="color: #8a8a8a;">功能特性</span>
                                    <span class="value" style="color: #ffffff;">${info.features ? info.features.join(', ') : (info.type === 'cursor' ? 'Cursor' : 'Copilot')}</span>
                                </div>
                                ${userInfo ? `
                                <div class="list-group-item bg-dark-subtle border-dark text-light d-flex justify-content-between align-items-center" style="background-color: #1a1a1a !important; border-color: #404040;">
                                    <span class="label" style="color: #8a8a8a;">剩余可创建账号</span>
                                    <span class="value" style="color: #ffffff;">${userInfo.remainingAccounts}</span>
                                </div>
                                ${userInfo.latestAccount ? `
                                <div class="list-group-item bg-dark-subtle border-dark text-light" style="background-color: #1a1a1a !important; border-color: #404040;">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <span class="label" style="color: #8a8a8a;">最近创建的账号</span>
                                    </div>
                                    <div class="mt-2">
                                        <div class="d-flex justify-content-between align-items-center">
                                            <span class="label" style="color: #8a8a8a;">邮箱</span>
                                            <span class="value" style="color: #ffffff;">${userInfo.latestAccount.email}</span>
                                        </div>
                                        <div class="d-flex justify-content-between align-items-center mt-1">
                                            <span class="label" style="color: #8a8a8a;">创建时间</span>
                                            <span class="value" style="color: #ffffff;">${new Date(userInfo.latestAccount.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div class="d-flex justify-content-between align-items-center mt-1">
                                            <span class="label" style="color: #8a8a8a;">过期时间</span>
                                            <span class="value" style="color: #ffffff;">${new Date(userInfo.latestAccount.expireTime).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                ` : ''}` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
        } else {
            // 未授权状态：显示机器码和授权码
            updateTabsVisibility(false);
            document.getElementById('user-info').innerHTML = generateLicenseInputHtml(machineCode);
        }
    } catch (error) {
        console.error('获取授权信息失败:', error);
        // 显示错误状态并允许输入授权码
        updateTabsVisibility(false);
        const machineCode = await API.license.getMachineCode().then(res => res.machineCode).catch(() => '获取失败');
        document.getElementById('user-info').innerHTML = generateLicenseInputHtml(machineCode, `获取授权信息失败: ${error.message}`);
    }
}

// 复制机器码到剪贴板
async function copyMachineCode() {
    const machineCode = document.getElementById('machineCodeDisplay').value;
    try {
        await navigator.clipboard.writeText(machineCode);
        appendToConsole('success', '机器码已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
        appendToConsole('error', '复制失败，请手动复制');
    }
}

// 提交授权码
async function submitLicense(event) {
    event.preventDefault();
    const licenseKey = document.getElementById('licenseKey').value.trim();
    if (!licenseKey) {
        appendToConsole('warning', '请输入授权码');
        return;
    }

    try {
        // 验证授权码
        const response = await API.license.validate(licenseKey);
        if (response.success) {
            // 获取当前配置
            const configResponse = await API.config.get();
            const config = configResponse.data;
            
            // 更新配置中的授权信息
            config.auth = config.auth || {};
            config.auth.token = licenseKey;
            
            // 保存更新后的配置
            await API.config.update({
                auth: {
                    token: licenseKey
                }
            });
            
            appendToConsole('success', '授权成功');
            // 重新加载授权信息
            await updateLicenseInfo();
        } else {
            appendToConsole('error', '授权失败: ' + response.message);
        }
    } catch (error) {
        console.error('提交授权码失败:', error);
        appendToConsole('error', '授权失败: ' + (error.response?.data?.message || error.message));
    }
}

// 页面加载完成后更新授权信息
document.addEventListener('DOMContentLoaded', () => {
    updateLicenseInfo();
});

// 每分钟更新一次授权信息
setInterval(updateLicenseInfo, 60000); 