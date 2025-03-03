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
$STORAGE_FILE = "$env:APPDATA\Cursor\User\globalStorage\storage.json"
$BACKUP_DIR = "$env:APPDATA\Cursor\User\globalStorage\backups"

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

# 获取并显示 Cursor 版本
function Get-CursorVersion {
    try {
        # 主要检测路径
        $packagePath = "$env:LOCALAPPDATA\Programs\cursor\resources\app\package.json"
        
        if (Test-Path $packagePath) {
            $packageJson = Get-Content $packagePath -Raw | ConvertFrom-Json
            if ($packageJson.version) {
                Write-Host "$GREEN[信息]$NC 当前安装的 Cursor 版本: v$($packageJson.version)"
                return $packageJson.version
            }
        }

        # 备用路径检测
        $altPath = "$env:LOCALAPPDATA\cursor\resources\app\package.json"
        if (Test-Path $altPath) {
            $packageJson = Get-Content $altPath -Raw | ConvertFrom-Json
            if ($packageJson.version) {
                Write-Host "$GREEN[信息]$NC 当前安装的 Cursor 版本: v$($packageJson.version)"
                return $packageJson.version
            }
        }

        Write-Host "$YELLOW[警告]$NC 无法检测到 Cursor 版本"
        Write-Host "$YELLOW[提示]$NC 请确保 Cursor 已正确安装"
        return $null
    }
    catch {
        Write-Host "$RED[错误]$NC 获取 Cursor 版本失败: $_"
        return $null
    }
}

# 获取并显示版本信息
$cursorVersion = Get-CursorVersion
Write-Host ""

Write-Host "$YELLOW[重要提示]$NC 最新的 0.45.x (以支持)"
Write-Host ""

# 检查并关闭 Cursor 进程
Write-Host "$GREEN[信息]$NC 检查 Cursor 进程..."

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
function Close-CursorProcess {
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

# 关闭所有 Cursor 进程
Close-CursorProcess "Cursor"
Close-CursorProcess "cursor"



# 创建或更新配置文件
Write-Host "$GREEN[信息]$NC 正在更新配置..."

try {
    # 询问是否要禁用自动更新
    Write-Host ""
    Write-Host "禁用 Cursor 自动更新功能"

    Write-Host ""
    Write-Host "$GREEN[信息]$NC 正在处理自动更新..."
    $updaterPath = "$env:LOCALAPPDATA\cursor-updater"

    # 定义手动设置教程
    function Show-ManualGuide {
        Write-Host ""
        Write-Host "$YELLOW[警告]$NC 自动设置失败,请尝试手动操作："
        Write-Host "$YELLOW手动禁用更新步骤：$NC"
        Write-Host "1. 以管理员身份打开 PowerShell"
        Write-Host "2. 复制粘贴以下命令："
        Write-Host "$BLUE命令1 - 删除现有目录（如果存在）：$NC"
        Write-Host "Remove-Item -Path `"$updaterPath`" -Force -Recurse -ErrorAction SilentlyContinue"
        Write-Host ""
        Write-Host "$BLUE命令2 - 创建阻止文件：$NC"
        Write-Host "New-Item -Path `"$updaterPath`" -ItemType File -Force | Out-Null"
        Write-Host ""
        Write-Host "$BLUE命令3 - 设置只读属性：$NC"
        Write-Host "Set-ItemProperty -Path `"$updaterPath`" -Name IsReadOnly -Value `$true"
        Write-Host ""
        Write-Host "$BLUE命令4 - 设置权限（可选）：$NC"
        Write-Host "icacls `"$updaterPath`" /inheritance:r /grant:r `"`$($env:USERNAME):(R)`""
        Write-Host ""
        Write-Host "$YELLOW验证方法：$NC"
        Write-Host "1. 运行命令：Get-ItemProperty `"$updaterPath`""
        Write-Host "2. 确认 IsReadOnly 属性为 True"
        Write-Host "3. 运行命令：icacls `"$updaterPath`""
        Write-Host "4. 确认只有读取权限"
        Write-Host ""
        Write-Host "$YELLOW[提示]$NC 完成后请重启 Cursor"
    }

    try {
        # 删除现有目录
        if (Test-Path $updaterPath) {
            try {
                Remove-Item -Path $updaterPath -Force -Recurse -ErrorAction Stop
                Write-Host "$GREEN[信息]$NC 成功删除 cursor-updater 目录"
            }
            catch {
                Write-Host "$RED[错误]$NC 删除 cursor-updater 目录失败"
                Show-ManualGuide
                return
            }
        }

        # 创建阻止文件
        try {
            New-Item -Path $updaterPath -ItemType File -Force -ErrorAction Stop | Out-Null
            Write-Host "$GREEN[信息]$NC 成功创建阻止文件"
        }
        catch {
            Write-Host "$RED[错误]$NC 创建阻止文件失败"
            Show-ManualGuide
            return
        }

        # 设置文件权限
        try {
            # 设置只读属性
            Set-ItemProperty -Path $updaterPath -Name IsReadOnly -Value $true -ErrorAction Stop
            
            # 使用 icacls 设置权限
            $result = Start-Process "icacls.exe" -ArgumentList "`"$updaterPath`" /inheritance:r /grant:r `"$($env:USERNAME):(R)`"" -Wait -NoNewWindow -PassThru
            if ($result.ExitCode -ne 0) {
                throw "icacls 命令失败"
            }
            
            Write-Host "$GREEN[信息]$NC 成功设置文件权限"
        }
        catch {
            Write-Host "$RED[错误]$NC 设置文件权限失败"
            Show-ManualGuide
            return
        }

        # 验证设置
        try {
            $fileInfo = Get-ItemProperty $updaterPath
            if (-not $fileInfo.IsReadOnly) {
                Write-Host "$RED[错误]$NC 验证失败：文件权限设置可能未生效"
                Show-ManualGuide
                return
            }
        }
        catch {
            Write-Host "$RED[错误]$NC 验证设置失败"
            Show-ManualGuide
            return
        }

        Write-Host "$GREEN[信息]$NC 成功禁用自动更新"
    }
    catch {
        Write-Host "$RED[错误]$NC 发生未知错误: $_"
        Show-ManualGuide
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

# 在主流程开始时添加版本检查
Write-Host "$GREEN[信息]$NC 正在检查 Cursor 版本..."
$cursorVersion = Get-CursorVersion

if ($cursorVersion) {
    $compareResult = Compare-Version $cursorVersion "0.45.0"
    if ($compareResult -ge 0) {
        Write-Host "$RED[错误]$NC 当前版本 ($cursorVersion) 暂不支持"
        Write-Host "$YELLOW[建议]$NC 请使用 v0.44.11 及以下版本"
        Write-Host "$YELLOW[建议]$NC 可以从以下地址下载支持的版本:"
        Write-Host "Windows: https://download.todesktop.com/230313mzl4w4u92/Cursor%20Setup%200.44.11%20-%20Build%20250103fqxdt5u9z-x64.exe"
        Write-Host "Mac ARM64: https://dl.todesktop.com/230313mzl4w4u92/versions/0.44.11/mac/zip/arm64"
        Read-Host "按回车键退出"
        exit 1
    }
    else {
        Write-Host "$GREEN[信息]$NC 当前版本 ($cursorVersion) 支持重置功能"
    }
}
else {
    Write-Host "$YELLOW[警告]$NC 无法检测版本，将继续执行..."
} 