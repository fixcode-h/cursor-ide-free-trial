// 获取账号列表
async function fetchAccounts() {
    try {
        const data = await API.accounts.list();
        
        // 验证返回的数据格式
        let accounts = [];
        if (Array.isArray(data)) {
            accounts = data;
        } else if (data && typeof data === 'object') {
            // 如果返回的是对象，尝试获取可能的数组字段
            if (Array.isArray(data.accounts)) {
                accounts = data.accounts;
            } else if (Array.isArray(data.data)) {
                accounts = data.data;
            } else if (Array.isArray(data.items)) {
                accounts = data.items;
            } else {
                throw new Error('Invalid data format: expected an array of accounts');
            }
        } else {
            throw new Error('Invalid data format: expected an array or object containing accounts');
        }

        if (accounts.length === 0) {
            const tableBody = document.getElementById('accountsTableBody');
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center">暂无账号数据</td></tr>';
            return;
        }

        displayAccounts(accounts);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        // 显示错误信息到控制台
        const consoleElement = document.getElementById('console');
        consoleElement.innerHTML += `<div class="console-line error">获取账号列表失败: ${error.message}</div>`;
        
        // 显示错误信息在表格中
        const tableBody = document.getElementById('accountsTableBody');
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">加载失败，请点击刷新按钮重试</td></tr>';
    }
}

// 显示账号列表
function displayAccounts(accounts) {
    console.log('显示账号列表:', accounts);
    const tableBody = document.getElementById('accountsTableBody');
    tableBody.innerHTML = '';

    // 状态映射
    const statusMap = {
        'CREATED': '已创建',
        'CODE_RECEIVED': '已收到验证码',
        'VERIFIED': '已验证',
        'FAILED': '注册失败',
        'DISABLED': '已禁用',
        'unknown': '未知状态'
    };

    // 状态样式映射
    const statusClassMap = {
        'CREATED': 'bg-primary',
        'CODE_RECEIVED': 'bg-info',
        'VERIFIED': 'bg-success',
        'FAILED': 'bg-danger',
        'DISABLED': 'bg-secondary',
        'unknown': 'bg-warning'
    };

    accounts.forEach(account => {
        // 确保account对象包含所需的字段，使用默认值作为后备
        const email = account.email || account.username || '未知邮箱';
        const password = account.password || '未知密码';
        const status = account.status || 'unknown';
        const createdAt = account.createdAt || account.createdAt || new Date().toISOString();
        const firstName = account.firstName || account.firstname || '';
        const lastName = account.lastName || account.lastname || '';
        const username = account.username || '';

        // 根据状态决定是否显示注册按钮
        const showRegisterButton = status !== 'VERIFIED';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="text-light">${email}</td>
            <td class="text-light">${'•'.repeat(8)}</td>
            <td><span class="badge ${statusClassMap[status] || 'bg-warning'}">${statusMap[status] || '未知状态'}</span></td>
            <td class="text-light">${new Date(createdAt).toLocaleString()}</td>
            <td>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
                        操作
                    </button>
                    <ul class="dropdown-menu dropdown-menu-dark">
                        <li><a class="dropdown-item copy-email-btn" href="#" data-email="${email}">
                            <i class="bi bi-envelope"></i> 复制邮箱
                        </a></li>
                        <li><a class="dropdown-item copy-password-btn" href="#" data-password="${password}">
                            <i class="bi bi-key"></i> 复制密码
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item edit-account-btn" href="#" data-account='${JSON.stringify(account)}'>
                            <i class="bi bi-pencil"></i> 编辑账号
                        </a></li>
                        ${showRegisterButton ? `
                        <li><a class="dropdown-item account-register-btn" href="#" 
                            data-email="${email}" 
                            data-password="${password}"
                            data-firstName="${firstName}"
                            data-lastName="${lastName}"
                            data-username="${username}">
                            <i class="bi bi-person-plus"></i> 账号注册
                        </a></li>` : ''}
                        <li><a class="dropdown-item account-login-btn" href="#" data-email="${email}" data-password="${password}">
                            <i class="bi bi-box-arrow-in-right"></i> 账号登录
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger delete-account-btn" href="#" data-email="${email}">
                            <i class="bi bi-trash"></i> 删除账号
                        </a></li>
                    </ul>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });

    // 添加复制邮箱按钮事件监听
    document.querySelectorAll('.copy-email-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const target = e.target.closest('.copy-email-btn');
            const email = target.dataset.email;
            
            try {
                const success = await copyToClipboard(email);
                if (success) {
                    appendToConsole('success', `邮箱 ${email} 已复制到剪贴板`);
                    
                    // 临时改变按钮样式表示成功
                    target.classList.add('text-success');
                    target.innerHTML = '<i class="bi bi-check"></i> 已复制';
                    setTimeout(() => {
                        target.classList.remove('text-success');
                        target.innerHTML = '<i class="bi bi-envelope"></i> 复制邮箱';
                    }, 2000);
                } else {
                    throw new Error('复制操作失败');
                }
            } catch (error) {
                appendToConsole('error', `复制邮箱失败: ${error.message}`);
                
                // 显示错误状态
                target.classList.add('text-danger');
                target.innerHTML = '<i class="bi bi-x"></i> 复制失败';
                setTimeout(() => {
                    target.classList.remove('text-danger');
                    target.innerHTML = '<i class="bi bi-envelope"></i> 复制邮箱';
                }, 2000);
            }
        });
    });

    // 添加复制密码按钮事件监听
    document.querySelectorAll('.copy-password-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const target = e.target.closest('.copy-password-btn');
            const password = target.dataset.password;
            
            try {
                const success = await copyToClipboard(password);
                if (success) {
                    appendToConsole('success', '密码已复制到剪贴板');
                    
                    // 临时改变按钮样式表示成功
                    target.classList.add('text-success');
                    target.innerHTML = '<i class="bi bi-check"></i> 已复制';
                    setTimeout(() => {
                        target.classList.remove('text-success');
                        target.innerHTML = '<i class="bi bi-key"></i> 复制密码';
                    }, 2000);
                } else {
                    throw new Error('复制操作失败');
                }
            } catch (error) {
                appendToConsole('error', `复制密码失败: ${error.message}`);
                
                // 显示错误状态
                target.classList.add('text-danger');
                target.innerHTML = '<i class="bi bi-x"></i> 复制失败';
                setTimeout(() => {
                    target.classList.remove('text-danger');
                    target.innerHTML = '<i class="bi bi-key"></i> 复制密码';
                }, 2000);
            }
        });
    });

    // 添加账号注册按钮事件监听
    document.querySelectorAll('.account-register-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const target = e.target.closest('.account-register-btn');
            
            const formData = {
                email: target.dataset.email,
                firstname: target.dataset.firstname,
                lastname: target.dataset.lastname,
                username: target.dataset.username,
                password: target.dataset.password
            };

            try {
                appendToConsole('info', `开始注册账号: ${formData.email}`);

                const result = await API.register.register(formData);

                if (result.success) {
                    appendToConsole('success', '注册成功！');
                    // 触发账号列表刷新
                    document.getElementById('refreshAccounts').click();
                } else {
                    throw new Error(result.message || '注册失败');
                }
            } catch (error) {
                appendToConsole('error', `注册失败: ${error.message}`);
            }
        });
    });

    // 添加账号登录按钮事件监听
    document.querySelectorAll('.account-login-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const target = e.target.closest('.account-login-btn');
            const credentials = {
                email: target.dataset.email,
                password: target.dataset.password
            };
            
            try {
                appendToConsole('info', `开始登录账号: ${credentials.email}`);

                const result = await API.register.login(credentials);
                
                if (result.success) {
                    appendToConsole('success', '登录成功！');
                } else {
                    throw new Error(result.error || '登录失败');
                }
            } catch (error) {
                appendToConsole('error', `登录失败: ${error.message}`);
            }
        });
    });

    // 添加删除账号按钮事件监听
    document.querySelectorAll('.delete-account-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = e.target.closest('.delete-account-btn').dataset.email;
            
            if (confirm(`确定要删除账号 ${email} 吗？此操作不可恢复。`)) {
                try {
                    await API.accounts.delete(email);
                    appendToConsole('success', `账号 ${email} 已成功删除`);
                    // 重新加载账号列表
                    await fetchAccounts();
                } catch (error) {
                    appendToConsole('error', `删除账号失败: ${error.message}`);
                }
            }
        });
    });

    // 添加编辑账号按钮事件监听
    document.querySelectorAll('.edit-account-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.closest('.edit-account-btn');
            try {
                const accountData = JSON.parse(target.dataset.account);
                editAccount(accountData);
            } catch (error) {
                console.error('Error parsing account data:', error);
                appendToConsole('error', '编辑账号失败：数据解析错误');
            }
        });
    });
}

// 添加通用复制函数
async function copyToClipboard(text) {
    try {
        // 首先尝试使用现代 Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }

        // 后备方案：创建临时文本区域
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
        // 将文本区域移出可视区域
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        
        // 选择文本并复制
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            textArea.remove();
            return true;
        } catch (err) {
            console.error('Failed to copy using execCommand:', err);
            textArea.remove();
            return false;
        }
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

// 创建新账号
async function createAccounts(count) {
    // 禁用创建按钮，避免重复提交
    const createButton = document.getElementById('createAccounts');
    if (createButton) {
        createButton.disabled = true;
    }
    
    try {
        appendToConsole('info', `开始创建 ${count} 个账号...`);
        
        const result = await API.accounts.create({ count });
        
        if (!result.success) {
            throw new Error(result.error || '创建账号失败');
        }

        // 显示创建成功信息
        appendToConsole('success', 
            `成功创建 ${result.data.created}/${result.data.total} 个账号`,
            '正在刷新账号列表...'
        );
        
        // 更新账号列表
        await fetchAccounts();

        // 切换到账号列表标签页
        const accountsTab = document.getElementById('accounts-tab');
        if (accountsTab) {
            accountsTab.click();
            appendToConsole('info', '已切换到账号列表页面');
        }

    } catch (error) {
        appendToConsole('error', `创建账号失败: ${error.message}`);
    } finally {
        // 重新启用创建按钮
        if (createButton) {
            createButton.disabled = false;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始加载账号列表
    fetchAccounts();

    // 刷新按钮点击事件
    document.getElementById('refreshAccounts').addEventListener('click', fetchAccounts);
    
    // 创建账号按钮点击事件
    const createButton = document.getElementById('createAccounts');
    if (createButton) {
        createButton.addEventListener('click', () => {
            const countInput = document.getElementById('generateCount');
            const count = parseInt(countInput?.value) || 1;
            createAccounts(count);
        });
    }

    // 添加快速生成账号按钮事件监听
    document.getElementById('quickGenerateAccount').addEventListener('click', async () => {
        try {
            appendToConsole('info', '开始生成/绑定账号...');
            // 调用注册接口替代原有的createAccounts方法
            const result = await API.register.quickGenerate();
            
            if (result.success) {
                appendToConsole('success', '账号生成/绑定完成');
                // 自动刷新账号列表
                document.getElementById('refreshAccounts').click();
                
                // 如果需要手动操作，显示相关信息
                if (result.message && result.message.includes('手动')) {
                    if (result.account) {
                        // 添加账号信息到控制台
                        appendToConsole('info', '生成的账号信息：');
                        appendToConsole('info', `邮箱: ${result.account.email}`);
                        appendToConsole('info', `密码: ${result.account.password}`);
                    }
                    if (result.verificationCode) {
                        appendToConsole('info', `验证码: ${result.verificationCode}`);
                    }
                }
            } else {
                throw new Error(result.message || '账号生成/绑定失败');
            }
        } catch (error) {
            appendToConsole('error', `账号生成/绑定失败: ${error.message}`);
        }
    });

    // 导入按钮点击事件
    document.getElementById('importAccounts').addEventListener('click', function() {
        const importModal = new bootstrap.Modal(document.getElementById('importAccountsModal'));
        importModal.show();
    });

    // 导出按钮点击事件
    document.getElementById('exportAccounts').addEventListener('click', function() {
        const exportModal = new bootstrap.Modal(document.getElementById('exportAccountsModal'));
        exportModal.show();
    });

    // 选择导入文件按钮点击事件
    document.getElementById('selectImportFileBtn').addEventListener('click', async function() {
        try {
            const result = await window.electron.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: 'CSV Files', extensions: ['csv'] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                document.getElementById('importFile').value = result.filePaths[0];
            }
        } catch (error) {
            appendToConsole('error', `选择文件失败: ${error.message}`);
        }
    });

    // 选择导出文件按钮点击事件
    document.getElementById('selectExportFileBtn').addEventListener('click', async function() {
        try {
            const result = await window.electron.showSaveDialog({
                filters: [
                    { name: 'CSV Files', extensions: ['csv'] }
                ],
                defaultPath: 'accounts.csv'
            });

            if (!result.canceled && result.filePath) {
                document.getElementById('exportFile').value = result.filePath;
            }
        } catch (error) {
            appendToConsole('error', `选择保存位置失败: ${error.message}`);
        }
    });

    // 确认导入按钮点击事件
    document.getElementById('confirmImportBtn').addEventListener('click', async function() {
        const filePath = document.getElementById('importFile').value;
        if (!filePath) {
            appendToConsole('error', '请先选择要导入的CSV文件');
            return;
        }

        try {
            appendToConsole('info', '开始导入账号数据...');
            
            // 读取CSV文件内容
            const csvData = await window.electron.readFile(filePath);
            
            // 发送导入请求
            const response = await fetch('/api/accounts/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ csvData })
            });

            const result = await response.json();
            
            if (result.success) {
                appendToConsole('success', `导入完成: 成功 ${result.data.imported} 个, 失败 ${result.data.failed} 个`);
                
                // 如果有失败的记录，显示错误信息
                if (result.data.errors.length > 0) {
                    appendToConsole('error', '导入失败的账号:');
                    result.data.errors.forEach(error => {
                        appendToConsole('error', `${error.email}: ${error.error}`);
                    });
                }
                
                // 刷新账号列表
                fetchAccounts();
                
                // 关闭模态框
                const importModal = bootstrap.Modal.getInstance(document.getElementById('importAccountsModal'));
                importModal.hide();
            } else {
                throw new Error(result.error || '导入失败');
            }
        } catch (error) {
            appendToConsole('error', `导入失败: ${error.message}`);
        }
    });

    // 确认导出按钮点击事件
    document.getElementById('confirmExportBtn').addEventListener('click', async function() {
        const filePath = document.getElementById('exportFile').value;
        if (!filePath) {
            appendToConsole('error', '请先选择保存位置');
            return;
        }

        try {
            appendToConsole('info', '开始导出账号数据...');
            
            // 获取账号数据
            const response = await fetch('/api/accounts/export');
            const csvData = await response.text();
            
            // 保存到文件
            await window.electron.writeFile(filePath, csvData);
            
            appendToConsole('success', '账号数据导出成功');
            
            // 关闭模态框
            const exportModal = bootstrap.Modal.getInstance(document.getElementById('exportAccountsModal'));
            exportModal.hide();
        } catch (error) {
            appendToConsole('error', `导出失败: ${error.message}`);
        }
    });
});

// 初始化模态框
const editAccountModal = new bootstrap.Modal(document.getElementById('editAccountModal'));
const addManualAccountModal = new bootstrap.Modal(document.getElementById('addManualAccountModal'));

// 编辑账号
function editAccount(account) {
    document.getElementById('editAccountOriginalEmail').value = account.email;
    document.getElementById('editAccountUsername').value = account.username || '';
    document.getElementById('editAccountEmail').value = account.email;
    document.getElementById('editAccountPassword').value = '';
    document.getElementById('editAccountFirstName').value = account.firstname || '';
    document.getElementById('editAccountLastName').value = account.lastname || '';
    document.getElementById('editAccountStatus').value = account.status || 'CREATED';
    document.getElementById('editAccountVerificationCode').value = account.verificationCode || '';
    document.getElementById('editAccountCookie').value = account.cookie || '';
    document.getElementById('editAccountRegistrationType').value = account.registrationType || 'cursor';
    editAccountModal.show();
}

// 保存编辑的账号
document.getElementById('saveEditAccount').addEventListener('click', async () => {
    const originalEmail = document.getElementById('editAccountOriginalEmail').value;
    const updateData = {
        username: document.getElementById('editAccountUsername').value,
        email: document.getElementById('editAccountEmail').value,
        firstname: document.getElementById('editAccountFirstName').value,
        lastname: document.getElementById('editAccountLastName').value,
        status: document.getElementById('editAccountStatus').value,
        verificationCode: document.getElementById('editAccountVerificationCode').value,
        cookie: document.getElementById('editAccountCookie').value,
        registrationType: document.getElementById('editAccountRegistrationType').value
    };

    // 只有当密码字段不为空时才更新密码
    const password = document.getElementById('editAccountPassword').value;
    if (password) {
        updateData.password = password;
    }

    try {
        const response = await http.put(`/api/accounts/${originalEmail}`, updateData);

        if (response.success) {
            appendToConsole('success', '账号信息已更新');
            editAccountModal.hide();
            fetchAccounts(); // 刷新账号列表
        } else {
            appendToConsole('error', response.error || '更新失败');
        }
    } catch (error) {
        appendToConsole('error', error.message || '更新失败');
    }
});

// 手动添加账号
document.getElementById('addManualAccount').addEventListener('click', () => {
    document.getElementById('manualAccountUsername').value = '';
    document.getElementById('manualAccountEmail').value = '';
    document.getElementById('manualAccountPassword').value = '';
    document.getElementById('manualAccountFirstName').value = '';
    document.getElementById('manualAccountLastName').value = '';
    document.getElementById('manualAccountStatus').value = 'CREATED';
    document.getElementById('manualAccountVerificationCode').value = '';
    document.getElementById('manualAccountCookie').value = '';
    document.getElementById('manualAccountRegistrationType').value = 'cursor';
    addManualAccountModal.show();
});

// 保存手动添加的账号
document.getElementById('saveManualAccount').addEventListener('click', async () => {
    const accountData = {
        username: document.getElementById('manualAccountUsername').value,
        email: document.getElementById('manualAccountEmail').value,
        password: document.getElementById('manualAccountPassword').value,
        firstname: document.getElementById('manualAccountFirstName').value,
        lastname: document.getElementById('manualAccountLastName').value,
        status: document.getElementById('manualAccountStatus').value,
        verificationCode: document.getElementById('manualAccountVerificationCode').value,
        cookie: document.getElementById('manualAccountCookie').value,
        registrationType: document.getElementById('manualAccountRegistrationType').value
    };

    try {
        const response = await http.post('/api/accounts/manual', accountData);

        if (response.success) {
            appendToConsole('success', '账号添加成功');
            addManualAccountModal.hide();
            fetchAccounts(); // 刷新账号列表
        } else {
            appendToConsole('error', response.error || '添加失败');
        }
    } catch (error) {
        appendToConsole('error', error.message || '添加失败');
    }
});

// 修改渲染账号列表的函数
function renderAccounts(accounts) {
    const tbody = document.getElementById('accountsTableBody');
    tbody.innerHTML = accounts.map(account => `
        <tr>
            <td>${account.email}</td>
            <td>${account.password}</td>
            <td>${getStatusBadge(account.status)}</td>
            <td>${formatDate(account.createdAt)}</td>
            <td>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                        操作
                    </button>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="#" onclick="editAccount(${JSON.stringify(account)})">编辑账号</a></li>
                        <li><a class="dropdown-item" href="#" onclick="deleteAccount('${account.email}')">删除账号</a></li>
                    </ul>
                </div>
            </td>
        </tr>
    `).join('');
}