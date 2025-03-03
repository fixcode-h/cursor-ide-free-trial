// 辅助函数：添加消息到控制台
function appendToConsole(type = 'info', ...messages) {
    const consoleElement = document.getElementById('console');
    if (consoleElement) {
        messages.forEach(message => {
            consoleElement.innerHTML += `<div class="console-line ${type}">${message}</div>`;
        });
        consoleElement.scrollTop = consoleElement.scrollHeight;
    }
}

// 为了保持向后兼容，添加一个简单的包装函数
function appendToConsoleSimple(message) {
    appendToConsole('info', message);
}

document.addEventListener('DOMContentLoaded', function() {
    const startCompleteFlowBtn = document.getElementById('startCompleteFlowBtn');
    const completeFlowStatus = document.getElementById('completeFlowStatus');

    if (startCompleteFlowBtn) {
        startCompleteFlowBtn.addEventListener('click', async function() {
            try {
                // 禁用按钮
                startCompleteFlowBtn.disabled = true;
                completeFlowStatus.textContent = '正在执行完整注册流程...';
                completeFlowStatus.className = 'text-info';

                // 调用注册接口
                const result = await API.register.complete();

                if (result.success) {
                    completeFlowStatus.textContent = '注册流程执行成功！';
                    completeFlowStatus.className = 'text-success';
                    
                    // 如果需要手动操作，显示相关信息
                    if (result.message.includes('手动')) {
                        completeFlowStatus.textContent = result.message;
                        if (result.account) {
                            // 添加账号信息到控制台
                            appendToConsole('生成的账号信息：');
                            appendToConsole(`邮箱: ${result.account.email}`);
                            appendToConsole(`密码: ${result.account.password}`);
                        }
                        if (result.verificationCode) {
                            appendToConsole(`验证码: ${result.verificationCode}`);
                        }
                    }
                } else {
                    throw new Error(result.message || '注册流程执行失败');
                }
            } catch (error) {
                completeFlowStatus.textContent = `错误: ${error.message}`;
                completeFlowStatus.className = 'text-danger';
                console.error('注册流程执行失败:', error);
            } finally {
                // 启用按钮
                startCompleteFlowBtn.disabled = false;
            }
        });
    }
}); 