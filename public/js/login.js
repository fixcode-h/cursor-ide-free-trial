// 登录状态管理
const LoginState = {
    IDLE: 'idle',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    ERROR: 'error'
};

document.addEventListener('DOMContentLoaded', () => {
    // 状态变量
    let currentState = LoginState.IDLE;

    // DOM 元素
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const startButton = document.getElementById('startLoginBtn');
    const statusText = document.getElementById('loginStatus');

    // 状态更新函数
    function updateState(state) {
        currentState = state;
        startButton.disabled = state === LoginState.PROCESSING;
        
        switch (state) {
            case LoginState.PROCESSING:
                statusText.className = 'text-info';
                break;
            case LoginState.COMPLETED:
                statusText.className = 'text-success';
                break;
            case LoginState.ERROR:
                statusText.className = 'text-danger';
                break;
            default:
                statusText.className = 'text-muted';
        }
    }

    // 显示错误信息
    function showError(message) {
        if (window.appendToConsole) {
            window.appendToConsole('error', message);
        }
        statusText.textContent = message;
        statusText.className = 'text-danger';
        setTimeout(() => {
            statusText.className = 'text-muted';
        }, 3000);
    }

    // 重置状态
    function resetStatus() {
        if (currentState !== LoginState.PROCESSING) {
            updateState(LoginState.IDLE);
            statusText.textContent = '等待开始...';
        }
    }

    // 验证输入
    function validateInputs() {
        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !email.includes('@')) {
            showError('请输入有效的邮箱地址');
            return null;
        }

        if (!password) {
            showError('请输入密码');
            return null;
        }

        return { email, password };
    }

    // 登录处理函数
    async function startLogin() {
        try {
            const credentials = validateInputs();
            if (!credentials) return;

            updateState(LoginState.PROCESSING);
            statusText.textContent = '正在执行登录...';

            const result = await API.register.login(credentials);
            
            if (!result.success) {
                throw new Error(result.error || '登录失败');
            }

            updateState(LoginState.COMPLETED);
            statusText.textContent = result.message || '登录成功';

        } catch (error) {
            showError(error.message);
            updateState(LoginState.ERROR);
        }
    }

    // 事件监听器
    startButton.addEventListener('click', startLogin);
    emailInput.addEventListener('input', resetStatus);
    passwordInput.addEventListener('input', resetStatus);

    // WebSocket 消息处理
    if (window.ws) {
        window.ws.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'log') {
                    const { level, message } = data;
                    statusText.textContent = message;
                    
                    if (message.includes('流程已完成')) {
                        updateState(LoginState.COMPLETED);
                    }
                }
            } catch (error) {
                console.error('处理WebSocket消息失败:', error);
            }
        });
    }
}); 