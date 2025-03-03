document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerStatus = document.getElementById('registerStatus');
    const startRegisterBtn = document.getElementById('startRegisterBtn');
    const refreshAccountsBtn = document.getElementById('refreshAccounts');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            startRegisterBtn.disabled = true;
            registerStatus.textContent = '正在执行注册流程...';
            registerStatus.className = 'text-info';

            const formData = {
                email: document.getElementById('registerEmail').value,
                firstname: document.getElementById('registerFirstName').value,
                lastname: document.getElementById('registerLastName').value,
                username: document.getElementById('registerUsername').value,
                password: document.getElementById('registerPassword').value
            };

            const result = await API.register.register(formData);

            if (result.success) {
                registerStatus.textContent = '注册成功！';
                registerStatus.className = 'text-success';
                registerForm.reset();
                
                // 添加到控制台日志
                if (window.appendToConsole) {
                    window.appendToConsole('success', '注册成功');
                    window.appendToConsole('info', `邮箱: ${formData.email}`);
                    window.appendToConsole('info', `用户名: ${formData.username}`);
                }

                // 触发账号列表刷新
                if (refreshAccountsBtn) {
                    refreshAccountsBtn.click();
                    window.appendToConsole && window.appendToConsole('info', '正在刷新账号列表...');
                }
            } else {
                throw new Error(result.message || '注册失败');
            }
        } catch (error) {
            registerStatus.textContent = `注册失败: ${error.message}`;
            registerStatus.className = 'text-danger';
            window.appendToConsole && window.appendToConsole('error', `注册失败: ${error.message}`);
        } finally {
            startRegisterBtn.disabled = false;
        }
    });
}); 