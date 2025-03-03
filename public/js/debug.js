document.addEventListener('DOMContentLoaded', function() {
    const resetMachineCodeBtn = document.getElementById('resetMachineCodeBtn');
    const resetStatus = document.getElementById('resetStatus');
    const disableAutoUpdateBtn = document.getElementById('disableAutoUpdateBtn');
    const disableAutoUpdateStatus = document.getElementById('disableAutoUpdateStatus');
    const openDebugBrowserBtn = document.getElementById('openDebugBrowserBtn');
    const debugBrowserStatus = document.getElementById('debugBrowserStatus');
    const updateAccountStatusBtn = document.getElementById('updateAccountStatusBtn');
    const updateAccountStatusMessage = document.getElementById('updateAccountStatusMessage');
    const updateStatusEmail = document.getElementById('updateStatusEmail');
    const updateStatusValue = document.getElementById('updateStatusValue');

    if (resetMachineCodeBtn) {
        resetMachineCodeBtn.addEventListener('click', async function() {
            try {
                resetStatus.textContent = '正在重置机器码...';
                resetMachineCodeBtn.disabled = true;

                const data = await API.debug.resetMachineCode();
                
                if (data.success) {
                    resetStatus.textContent = '机器码重置成功';
                } else {
                    resetStatus.textContent = '机器码重置失败: ' + data.message;
                }
            } catch (error) {
                console.error('重置机器码时出错:', error);
                resetStatus.textContent = '重置机器码时出错: ' + error.message;
            } finally {
                resetMachineCodeBtn.disabled = false;
            }
        });
    }

    if (disableAutoUpdateBtn) {
        disableAutoUpdateBtn.addEventListener('click', async function() {
            try {
                disableAutoUpdateStatus.textContent = '正在禁用自动更新...';
                disableAutoUpdateBtn.disabled = true;

                const data = await API.debug.disableAutoUpdate();
                
                if (data.success) {
                    disableAutoUpdateStatus.textContent = '自动更新已禁用';
                } else {
                    disableAutoUpdateStatus.textContent = '禁用自动更新失败: ' + data.message;
                }
            } catch (error) {
                console.error('禁用自动更新时出错:', error);
                disableAutoUpdateStatus.textContent = '禁用自动更新时出错: ' + error.message;
            } finally {
                disableAutoUpdateBtn.disabled = false;
            }
        });
    }

    if (openDebugBrowserBtn) {
        openDebugBrowserBtn.addEventListener('click', async function() {
            try {
                debugBrowserStatus.textContent = '正在启动调试浏览器...';
                openDebugBrowserBtn.disabled = true;

                const data = await API.debug.openDebugBrowser();
                
                if (data.success) {
                    debugBrowserStatus.textContent = '调试浏览器已启动';
                } else {
                    debugBrowserStatus.textContent = '启动调试浏览器失败: ' + data.message;
                }
            } catch (error) {
                console.error('启动调试浏览器时出错:', error);
                debugBrowserStatus.textContent = '启动调试浏览器时出错: ' + error.message;
            } finally {
                openDebugBrowserBtn.disabled = false;
            }
        });
    }

    if (updateAccountStatusBtn) {
        updateAccountStatusBtn.addEventListener('click', async function() {
            try {
                // 验证输入
                const email = updateStatusEmail.value.trim();
                const status = updateStatusValue.value;

                if (!email) {
                    updateAccountStatusMessage.textContent = '请输入邮箱地址';
                    return;
                }

                if (!email.includes('@')) {
                    updateAccountStatusMessage.textContent = '请输入有效的邮箱地址';
                    return;
                }

                updateAccountStatusMessage.textContent = '正在更新账号状态...';
                updateAccountStatusBtn.disabled = true;

                const data = await API.debug.updateAccountStatus({
                    email,
                    status
                });
                
                if (data.success) {
                    updateAccountStatusMessage.textContent = '账号状态更新成功';
                    // 可以显示更新后的账号信息
                    if (data.account) {
                        updateAccountStatusMessage.textContent += `\n邮箱: ${data.account.email}\n状态: ${data.account.status}\n更新时间: ${data.account.updatedAt}`;
                    }
                } else {
                    updateAccountStatusMessage.textContent = '更新账号状态失败: ' + data.message;
                }
            } catch (error) {
                console.error('更新账号状态时出错:', error);
                updateAccountStatusMessage.textContent = '更新账号状态时出错: ' + error.message;
            } finally {
                updateAccountStatusBtn.disabled = false;
            }
        });
    }
}); 