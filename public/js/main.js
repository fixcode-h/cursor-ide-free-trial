document.addEventListener('DOMContentLoaded', function() {
    // 初始化控制台
    appendToConsole('系统初始化完成...');

    // 标签页切换事件
    if (typeof bootstrap !== 'undefined') {
        const triggerTabList = document.querySelectorAll('.nav-link');
        triggerTabList.forEach(function(triggerEl) {
            const tabTrigger = new bootstrap.Tab(triggerEl);
            triggerEl.addEventListener('click', function(event) {
                event.preventDefault();
                tabTrigger.show();
                appendToConsole(`切换到${this.textContent}标签页`);
            });
        });
    } else {
        window.console.error('Bootstrap is not loaded');
    }

    // 按钮点击事件
    document.querySelectorAll('.btn-primary').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.target.textContent;
            appendToConsole(`执行操作: ${action}`);
        });
    });
});

// 控制台功能
const consoleOutput = document.getElementById('console');

function appendToConsole(message, type = 'info') {
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
    consoleOutput.innerHTML = '';
    appendToConsole('控制台已清除');
} 