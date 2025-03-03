# 设置输出编码为 UTF-8
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 颜色定义
$RED = "`e[31m"
$GREEN = "`e[32m"
$YELLOW = "`e[33m"
$BLUE = "`e[34m"
$NC = "`e[0m"

# 配置文件路径
$GLOBAL_MACHINE_ID_FILE = "$env:APPDATA\Code\machineid"
$STORAGE_FILE = "$env:APPDATA\Code\User\globalStorage\storage.json"
$STORAGE_DB_FILE = "$env:APPDATA\Code\User\globalStorage\state.vscdb"
$STORAGE_DB_BACKUP_FILE = "$env:APPDATA\Code\User\globalStorage\state.vscdb.backup"
$BACKUP_DIR = "$env:APPDATA\Code\User\globalStorage\backups"

# 检查管理员权限
function Test-Administrator {
    $user = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($user)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Host "$RED[错误]$NC 请以管理员身份运行此脚本"
    Write-Host "请右键点击脚本，选择'以管理员身份运行'"
    Read-Host "按回车键退出"
    exit 1
}

# 显示 Logo
Clear-Host
Write-Host @"

  ___ ___ _______ _______ _______ ______   _______ 
 |   Y   |   _   |   _   |   _   |   _  \ |   _   |
 |.  |   |   1___|.  1___|.  |   |.  |   \|.  1___|
 |.  |   |____   |.  |___|.  |   |.  |    |.  __)_ 
 |:  1   |:  1   |:  1   |:  1   |:  1    |:  1   |
  \:.. ./|::.. . |::.. . |::.. . |::.. . /|::.. . |
   `---' `-------`-------`-------`------' `-------'
                                                   

"@
Write-Host "$BLUE================================$NC"
Write-Host "$GREEN   Copilot 设备ID 修改工具          $NC"
Write-Host "$YELLOW  关注公众号【xxx】 $NC"
Write-Host "$YELLOW  一起交流更多VSCode技巧和AI知识(脚本免费、关注公众号加群有更多技巧和大佬)  $NC"
Write-Host "$YELLOW  [重要提示] 本工具免费，如果对您有帮助，请关注公众号【煎饼果子卷AI】  $NC"
Write-Host "$BLUE================================$NC"
Write-Host ""

# 查找 VSCode 的安装路径
function Get-VSCodeInstallPath {
    # 方法一：通过 Get-Command 查找 code.exe 的路径
    $vscodePath = Get-Command code.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source
    if ($vscodePath) {
        # 提取安装目录
        $vscodeInstallDir = Split-Path -Parent $vscodePath
        Write-Host "$GREEN[信息]$NC 已通过 'Get-Command' 找到 Visual Studio Code 的安装路径: $vscodeInstallDir"
        return $vscodeInstallDir
    }

    # 方法二：从注册表中查找
    $registryPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\Wow6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    foreach ($regPath in $registryPaths) {
        $vscodeKey = Get-ItemProperty -Path $regPath | Where-Object { $_.DisplayName -like "*Visual Studio Code*" }
        if ($vscodeKey) {
            $installPath = $vscodeKey.InstallLocation
            Write-Host "$GREEN[信息]$NC 已通过注册表（$regPath）找到 Visual Studio Code 的安装路径: $installPath"
            return $installPath
        }
    }

    # 方法三：检查常见的安装目录
    $commonPaths = @(
        "C:\Program Files\Microsoft VS Code",
        "C:\Program Files (x86)\Microsoft VS Code"
    )
    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            Write-Host "$GREEN[信息]$NC 已在常见目录中找到 Visual Studio Code 的安装路径: $path"
            return $path
        }
    }

    # 方法四：使用 Get-AppxPackage（适用于从 Microsoft Store 安装的情况）
    $vscodePackage = Get-AppxPackage -Name "Microsoft.VisualStudioCode" -ErrorAction SilentlyContinue
    if ($vscodePackage) {
        $installPath = $vscodePackage.InstallLocation
        Write-Host "$GREEN[信息]$NC 已通过 'Get-AppxPackage' 找到 Visual Studio Code 的安装路径: $installPath"
        return $installPath
    }

    Write-Host "$YELLOW[警告]$NC 未找到 Visual Studio Code 的安装路径。"
    return $null
}

# 获取并显示 VSCode 版本
function Get-VSCodeVersion {
    try {
        # 获取 VSCode 安装路径
        $vscodeInstallDir = Get-VSCodeInstallPath

        if ($vscodeInstallDir) {
            $packagePath = Join-Path -Path $vscodeInstallDir -ChildPath "resources\app\package.json"
            if (Test-Path $packagePath) {
                $packageJson = Get-Content $packagePath -Raw | ConvertFrom-Json
                if ($packageJson.version) {
                    Write-Host "$GREEN[信息]$NC 当前安装的 Visual Studio Code 版本: v$($packageJson.version)"
                    return $packageJson.version
                }
            }
        }

        Write-Host "$YELLOW[警告]$NC 无法检测到 Visual Studio Code 版本"
        Write-Host "$YELLOW[提示]$NC 请确保 Visual Studio Code 已正确安装"
        return $null
    }
    catch {
        Write-Host "$RED[错误]$NC 获取 Visual Studio Code 版本失败: $_"
        return $null
    }
}

# 获取并显示版本信息
$vscodeVersion = Get-VSCodeVersion

Write-Host ""
Write-Host "$YELLOW[当前版本]$NC 最新的 $vscodeVersion"
Write-Host ""

# 检查并关闭 VSCode 进程
Write-Host "$GREEN[信息]$NC 检查 VSCode 进程..."

function Get-ProcessDetails {
    param($processName)
    Write-Host "$BLUE[调试]$NC 正在获取 $processName 进程详细信息："
    Get-WmiObject Win32_Process -Filter "name='$processName'" | 
        Select-Object ProcessId, ExecutablePath, CommandLine | 
        Format-List
}

# 定义最大重试次数和等待时间
$MAX_RETRIES = 5
$WAIT_TIME = 1

# 处理进程关闭
function Close-VscodeProcess {
    param($processName)
    
    $process = Get-Process -Name $processName -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "$YELLOW[警告]$NC 发现 $processName 正在运行"
        Get-ProcessDetails $processName
        
        Write-Host "$YELLOW[警告]$NC 尝试关闭 $processName..."
        Stop-Process -Name $processName -Force
        
        $retryCount = 0
        while ($retryCount -lt $MAX_RETRIES) {
            $process = Get-Process -Name $processName -ErrorAction SilentlyContinue
            if (-not $process) { break }
            
            $retryCount++
            if ($retryCount -ge $MAX_RETRIES) {
                Write-Host "$RED[错误]$NC 在 $MAX_RETRIES 次尝试后仍无法关闭 $processName"
                Get-ProcessDetails $processName
                Write-Host "$RED[错误]$NC 请手动关闭进程后重试"
                Read-Host "按回车键退出"
                exit 1
            }
            Write-Host "$YELLOW[警告]$NC 等待进程关闭，尝试 $retryCount/$MAX_RETRIES..."
            Start-Sleep -Seconds $WAIT_TIME
        }
        Write-Host "$GREEN[信息]$NC $processName 已成功关闭"
    }
}

# 关闭所有 VSCode 进程
Close-VscodeProcess "Code"
Close-VscodeProcess "code"

# 创建备份目录
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

# 备份现有配置
if (Test-Path $STORAGE_FILE) {
    Write-Host "$GREEN[信息]$NC 正在备份配置文件..."
    $backupName = "storage.json.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Copy-Item $STORAGE_FILE "$BACKUP_DIR\$backupName"
}

# 生成新的 ID
Write-Host "$GREEN[信息]$NC 正在生成新的 ID..."


# 在颜色定义后添加此函数
function Get-RandomHex {
    param (
        [int]$length
    )
    
    $bytes = New-Object byte[] ($length)
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    $hexString = [System.BitConverter]::ToString($bytes) -replace '-',''
    $rng.Dispose()
    return $hexString
}

$GLOBAL_MACHINE_ID = [System.Guid]::NewGuid().ToString().ToLower()
$UUID = [System.Guid]::NewGuid().ToString().ToLower()
# 生成32字节(64个十六进制字符)的随机数作为 machineId 的随机部分
$randomPart = Get-RandomHex -length 32
$MACHINE_ID = "$randomPart".ToLower()
$SQM_ID = "{$([System.Guid]::NewGuid().ToString().ToUpper())}"

# 在Update-MachineGuid函数前添加权限检查
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "$RED[错误]$NC 请使用管理员权限运行此脚本"
    Start-Process powershell "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

function Update-MachineGuid {
    try {
        # 先检查注册表路径是否存在
        $registryPath = "HKLM:\SOFTWARE\Microsoft\Cryptography"
        if (-not (Test-Path $registryPath)) {
            throw "注册表路径不存在: $registryPath"
        }

        # 获取当前的 MachineGuid
        $currentGuid = Get-ItemProperty -Path $registryPath -Name MachineGuid -ErrorAction Stop
        if (-not $currentGuid) {
            throw "无法获取当前的 MachineGuid"
        }

        $originalGuid = $currentGuid.MachineGuid
        Write-Host "$GREEN[信息]$NC 当前注册表值："
        Write-Host "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography" 
        Write-Host "    MachineGuid    REG_SZ    $originalGuid"

        # 创建备份目录（如果不存在）
        if (-not (Test-Path $BACKUP_DIR)) {
            New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
        }

        # 创建备份文件
        $backupFile = "$BACKUP_DIR\MachineGuid_$(Get-Date -Format 'yyyyMMdd_HHmmss').reg"
        $backupResult = Start-Process "reg.exe" -ArgumentList "export", "`"HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography`"", "`"$backupFile`"" -NoNewWindow -Wait -PassThru
        
        if ($backupResult.ExitCode -eq 0) {
            Write-Host "$GREEN[信息]$NC 注册表项已备份到：$backupFile"
        } else {
            Write-Host "$YELLOW[警告]$NC 备份创建失败，继续执行..."
        }

        # 生成新GUID
        $newGuid = [System.Guid]::NewGuid().ToString()

        # 更新注册表
        Set-ItemProperty -Path $registryPath -Name MachineGuid -Value $newGuid -Force -ErrorAction Stop
        
        # 验证更新
        $verifyGuid = (Get-ItemProperty -Path $registryPath -Name MachineGuid -ErrorAction Stop).MachineGuid
        if ($verifyGuid -ne $newGuid) {
            throw "注册表验证失败：更新后的值 ($verifyGuid) 与预期值 ($newGuid) 不匹配"
        }

        Write-Host "$GREEN[信息]$NC 注册表更新成功："
        Write-Host "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography"
        Write-Host "    MachineGuid    REG_SZ    $newGuid"
        return $true
    }
    catch {
        Write-Host "$RED[错误]$NC 注册表操作失败：$($_.Exception.Message)"
        
        # 尝试恢复备份
        if ($backupFile -and (Test-Path $backupFile)) {
            Write-Host "$YELLOW[恢复]$NC 正在从备份恢复..."
            $restoreResult = Start-Process "reg.exe" -ArgumentList "import", "`"$backupFile`"" -NoNewWindow -Wait -PassThru
            
            if ($restoreResult.ExitCode -eq 0) {
                Write-Host "$GREEN[恢复成功]$NC 已还原原始注册表值"
            } else {
                Write-Host "$RED[错误]$NC 恢复失败，请手动导入备份文件：$backupFile"
            }
        } else {
            Write-Host "$YELLOW[警告]$NC 未找到备份文件或备份创建失败，无法自动恢复"
        }
        return $false
    }
}

# 更新dev device id
function Update-DevDeviceID {
    try {
        # 查询当前用户的账户信息
        $userAccount = Get-WmiObject -Class Win32_UserAccount -Filter "LocalAccount = TRUE AND Name = '$env:USERNAME'"
        # 从账户信息中提取 SID
        $sid = $userAccount.SID
        Write-Host "更新注册表 DevDeviceId 账户SID：$sid"

        # 定义要检查和更新的注册表路径
        $registryPath = "HKCU:\SOFTWARE\Microsoft\DeveloperTools"

        # 先检查注册表路径是否存在
        if (-not (Test-Path $registryPath)) {
            Write-Host "$YELLOW[警告]$NC 注册表路径不存在: $registryPath，操作终止"
            return $false
        }

        # 检查 deviceid 键是否存在
        $deviceIdExists = Get-ItemProperty -Path $registryPath -Name deviceid -ErrorAction SilentlyContinue
        if ($deviceIdExists) {
            $originalDeviceId = $deviceIdExists.deviceid
            Write-Host "$GREEN[信息]$NC 当前注册表值："
            Write-Host "HKEY_CURRENT_USER\SOFTWARE\Microsoft\DeveloperTools"
            Write-Host "    deviceid    REG_SZ    $originalDeviceId"

            # 创建备份目录（如果不存在）
            if (-not (Test-Path $BACKUP_DIR)) {
                New-Item -ItemType Directory -Path $BACKUP_DIR -Force | Out-Null
            }

            # 创建备份文件
            $backupFile = "$BACKUP_DIR\deviceid_$(Get-Date -Format 'yyyyMMdd_HHmmss').reg"
            $backupResult = Start-Process "reg.exe" -ArgumentList "export", "`"HKEY_CURRENT_USER\SOFTWARE\Microsoft\DeveloperTools`"", "`"$backupFile`"" -NoNewWindow -Wait -PassThru

            if ($backupResult.ExitCode -eq 0) {
                Write-Host "$GREEN[信息]$NC 注册表项已备份到：$backupFile"
            } else {
                Write-Host "$YELLOW[警告]$NC 备份创建失败，继续执行..."
            }

            # 更新注册表
            Set-ItemProperty -Path $registryPath -Name deviceid -Value $UUID -Force -ErrorAction Stop

            # 验证更新
            $verifyDeviceId = (Get-ItemProperty -Path $registryPath -Name deviceid -ErrorAction Stop).deviceid
            if ($verifyDeviceId -ne $UUID) {
                throw "注册表验证失败：更新后的值 ($verifyDeviceId) 与预期值 ($UUID) 不匹配"
            }

            Write-Host "$GREEN[信息]$NC 注册表更新成功："
            Write-Host "$registryPath"
            Write-Host "    deviceid    REG_SZ    $UUID"
            return $true
        } else {
            Write-Host "$YELLOW[警告]$NC 在 $registryPath 下未找到 deviceid 键，操作终止"
            return $false
        }
    }
    catch {
        Write-Host "$RED[错误]$NC 注册表操作失败：$($_.Exception.Message)"

        # 尝试恢复备份
        if ($backupFile -and (Test-Path $backupFile)) {
            Write-Host "$YELLOW[恢复]$NC 正在从备份恢复..."
            $restoreResult = Start-Process "reg.exe" -ArgumentList "import", "`"$backupFile`"" -NoNewWindow -Wait -PassThru

            if ($restoreResult.ExitCode -eq 0) {
                Write-Host "$GREEN[恢复成功]$NC 已还原原始注册表值"
            } else {
                Write-Host "$RED[错误]$NC 恢复失败，请手动导入备份文件：$backupFile"
            }
        } else {
            Write-Host "$YELLOW[警告]$NC 未找到备份文件或备份创建失败，无法自动恢复"
        }
        return $false
    }
}

# 清理VSDB
Write-Host "$GREEN[信息]$NC 正在清理VSDB..."
try {
    # 清理主文件
    if (Test-Path -Path $STORAGE_DB_FILE) {
        Remove-Item -Path $STORAGE_DB_FILE -Force
        Write-Host "$GREEN[信息]$NC 已成功删除文件: $STORAGE_DB_FILE"
    } else {
        Write-Host "$YELLOW[警告]$NC 指定的文件 $STORAGE_DB_FILE 不存在，无需删除。"
    }

    # 清理备份文件
    if (Test-Path -Path $STORAGE_DB_BACKUP_FILE) {
        Remove-Item -Path $STORAGE_DB_BACKUP_FILE -Force
        Write-Host "$GREEN[信息]$NC 已成功删除备份文件: $STORAGE_DB_BACKUP_FILE"
    } else {
        Write-Host "$YELLOW[警告]$NC 指定的备份文件 $STORAGE_DB_BACKUP_FILE 不存在，无需删除。"
    }
} catch {
    Write-Host "$RED[错误]$NC 删除文件时出现错误: $_"
}

# 创建或更新配置文件
Write-Host "$GREEN[信息]$NC 正在更新配置..."

try {
    # 检查文件是否存在
    if (Test-Path -Path $GLOBAL_MACHINE_ID_FILE) {
        # 创建 UTF-8 无 BOM 编码对象
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)

        # 将新的 machineid 写入文件
        [System.IO.File]::WriteAllText($GLOBAL_MACHINE_ID_FILE, $GLOBAL_MACHINE_ID, $utf8NoBom)

        Write-Host "$GREEN[信息]$NC 文件 $GLOBAL_MACHINE_ID_FILE 已成功更新，新的 machineid 为：$GLOBAL_MACHINE_ID"
    } else {
        Write-Host "$YELLOW[警告]$NC 文件 $GLOBAL_MACHINE_ID_FILE 不存在，无法更新。"
    }
}
catch {
    Write-Host "$RED[错误]$NC 更新文件时出现错误：$($_.Exception.Message)"
}

try {
    # 检查配置文件是否存在
    if (-not (Test-Path $STORAGE_FILE)) {
        Write-Host "$RED[错误]$NC 未找到配置文件: $STORAGE_FILE"
        Write-Host "$YELLOW[提示]$NC 请先安装并运行一次 VSCode 后再使用此脚本"
        Read-Host "按回车键退出"
        exit 1
    }

	try {
		# 读取现有配置文件
		$originalContent = Get-Content $STORAGE_FILE -Raw -Encoding UTF8

		# 解析出几个键的旧值
		$oldMachineId = ($originalContent | ConvertFrom-Json).'telemetry.machineId'
		$oldDevDeviceId = ($originalContent | ConvertFrom-Json).'telemetry.devDeviceId'
		$oldSqmId = ($originalContent | ConvertFrom-Json).'telemetry.sqmId'

		# 直接在原字符串中搜索旧值并替换为新值
		$updatedContent = $originalContent -replace [regex]::Escape($oldMachineId), $MACHINE_ID
		$updatedContent = $updatedContent -replace [regex]::Escape($oldDevDeviceId), $UUID
		$updatedContent = $updatedContent -replace [regex]::Escape($oldSqmId), $SQM_ID

		# 创建不包含 BOM 的 UTF-8 编码对象
		$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

		# 保存更新后的内容，使用不包含 BOM 的 UTF-8 编码
		[System.IO.File]::WriteAllText(
			[System.IO.Path]::GetFullPath($STORAGE_FILE), 
			$updatedContent, 
			$utf8NoBom
		)
		Write-Host "$GREEN[信息]$NC 成功更新配置文件"
	} catch {
		# 如果出错，尝试恢复原始内容
		if ($originalContent) {
			# 创建不包含 BOM 的 UTF-8 编码对象
			$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
			[System.IO.File]::WriteAllText(
				[System.IO.Path]::GetFullPath($STORAGE_FILE), 
				$originalContent, 
				$utf8NoBom
			)
		}
		throw "处理 JSON 失败: $_"
	}

    # 直接执行更新 DevDeviceId，不再询问
    Update-DevDeviceID

    # 直接执行更新 MachineGuid，不再询问
    Update-MachineGuid


    # 显示结果
    Write-Host ""
    Write-Host "$GREEN[信息]$NC 已更新配置:"
    Write-Host "$BLUE[调试]$NC machineId: $MACHINE_ID"
    Write-Host "$BLUE[调试]$NC devDeviceId: $UUID"
    Write-Host "$BLUE[调试]$NC sqmId: $SQM_ID"

    # 显示文件树结构
    Write-Host ""
    Write-Host "$GREEN[信息]$NC 文件结构:"
    Write-Host "$BLUE$env:APPDATA\Code\User$NC"
    Write-Host "├── globalStorage"
    Write-Host "│   ├── storage.json (已修改)"
    Write-Host "│   └── backups"

    # 列出备份文件
    $backupFiles = Get-ChildItem "$BACKUP_DIR\*" -ErrorAction SilentlyContinue
    if ($backupFiles) {
        foreach ($file in $backupFiles) {
            Write-Host "│       └── $($file.Name)"
        }
    } else {
        Write-Host "│       └── (空)"
    }

    # 保留有效的注册表更新
    Update-MachineGuid

} catch {
    Write-Host "$RED[错误]$NC 主要操作失败: $_"
    Write-Host "$YELLOW[尝试]$NC 使用备选方法..."
    
    try {
        # 备选方法：使用 Add-Content
        $tempFile = [System.IO.Path]::GetTempFileName()
        $config | ConvertTo-Json | Set-Content -Path $tempFile -Encoding UTF8
        Copy-Item -Path $tempFile -Destination $STORAGE_FILE -Force
        Remove-Item -Path $tempFile
        Write-Host "$GREEN[信息]$NC 使用备选方法成功写入配置"
    } catch {
        Write-Host "$RED[错误]$NC 所有尝试都失败了"
        Write-Host "错误详情: $_"
        Write-Host "目标文件: $STORAGE_FILE"
        Write-Host "请确保您有足够的权限访问该文件"
        Read-Host "按回车键退出"
        exit 1
    }
}

Write-Host ""
Read-Host "按回车键退出"
exit 0

# 在文件写入部分修改
function Write-ConfigFile {
    param($config, $filePath)
    
    try {
        # 使用 UTF8 无 BOM 编码
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        $jsonContent = $config | ConvertTo-Json -Depth 10
        
        # 统一使用 LF 换行符
        $jsonContent = $jsonContent.Replace("`r`n", "`n")
        
        [System.IO.File]::WriteAllText(
            [System.IO.Path]::GetFullPath($filePath),
            $jsonContent,
            $utf8NoBom
        )
        
        Write-Host "$GREEN[信息]$NC 成功写入配置文件(UTF8 无 BOM)"
    }
    catch {
        throw "写入配置文件失败: $_"
    }
}

function Compare-Version {
    param (
        [string]$version1,
        [string]$version2
    )
    
    try {
        $v1 = [version]($version1 -replace '[^\d\.].*$')
        $v2 = [version]($version2 -replace '[^\d\.].*$')
        return $v1.CompareTo($v2)
    }
    catch {
        Write-Host "$RED[错误]$NC 版本比较失败: $_"
        return 0
    }
}