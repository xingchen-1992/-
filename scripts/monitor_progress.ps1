# 牛马Master实时进度监控脚本
# 监控 realtime_progress.json 文件并实时显示美化的进度信息

param(
    [string]$ProgressFile = "H:\A_test\牛马\logs\realtime_progress.json",
    [int]$RefreshInterval = 500,  # 刷新间隔（毫秒）
    [switch]$NoColor             # 禁用彩色输出
)

# 检查PowerShell版本
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Host "❌ 需要PowerShell 5.0或更高版本" -ForegroundColor Red
    exit 1
}

# 控制台设置
$Host.UI.RawUI.WindowTitle = "🐂 牛马Master进度监控"
# 尝试隐藏光标（如果支持）
$originalCursorVisible = $true
try {
    $originalCursorVisible = $Host.UI.RawUI.CursorVisible
    $Host.UI.RawUI.CursorVisible = $false
} catch {
    # 在不支持CursorVisible的环境中忽略错误
}

# 清理函数
function Cleanup {
    try {
        $Host.UI.RawUI.CursorVisible = $originalCursorVisible
    } catch {
        # 忽略CursorVisible设置错误
    }
    Write-Host "`n🔚 监控已停止" -ForegroundColor Yellow
}

# 注册清理事件
$null = Register-EngineEvent PowerShell.Exiting -Action { 
    try {
        $Host.UI.RawUI.CursorVisible = $true
    } catch { }
    Write-Host "`n🔚 监控已停止" -ForegroundColor Yellow
}
trap { 
    try {
        $Host.UI.RawUI.CursorVisible = $true
    } catch { }
    Write-Host "`n🔚 监控已停止" -ForegroundColor Yellow
    break 
}

# 颜色定义
if (-not $NoColor) {
    $Colors = @{
        Title = "Cyan"
        Success = "Green"
        Warning = "Yellow"
        Error = "Red"
        Info = "White"
        Progress = "Blue"
        Highlight = "Magenta"
    }
} else {
    $Colors = @{
        Title = "White"
        Success = "White"
        Warning = "White"
        Error = "White"
        Info = "White"
        Progress = "White"
        Highlight = "White"
    }
}

# 绘制进度条
function Draw-ProgressBar {
    param(
        [int]$Progress,
        [int]$Width = 40,
        [string]$Label = ""
    )
    
    $filled = [math]::Floor($Progress * $Width / 100)
    $empty = $Width - $filled
    
    $bar = "█" * $filled + "░" * $empty
    $progressText = "{0:000}%" -f $Progress
    
    if ($Label) {
        return "$Label [$bar] $progressText"
    } else {
        return "[$bar] $progressText"
    }
}

# 格式化时间
function Format-Duration {
    param([double]$Milliseconds)
    
    if ($Milliseconds -lt 1000) {
        return "{0:F0}ms" -f $Milliseconds
    } elseif ($Milliseconds -lt 60000) {
        return "{0:F1}s" -f ($Milliseconds / 1000)
    } else {
        return "{0:F1}min" -f ($Milliseconds / 60000)
    }
}

# 获取状态图标
function Get-StatusIcon {
    param([string]$Status)
    
    switch ($Status) {
        "pending" { return "⏳" }
        "running" { return "🔄" }
        "completed" { return "✅" }
        "failed" { return "❌" }
        default { return "❓" }
    }
}

# 显示进度信息
function Show-ProgressInfo {
    param($ProgressData)
    
    Clear-Host
    
    # 标题
    Write-Host "🐂 牛马Master实时进度监控" -ForegroundColor $Colors.Title
    Write-Host ("=" * 60) -ForegroundColor $Colors.Title
    Write-Host ""
    
    # 基本信息
    try {
        $timestamp = [DateTimeOffset]::FromUnixTimeMilliseconds($ProgressData.timestamp).ToString("yyyy-MM-dd HH:mm:ss")
    } catch {
        $timestamp = [DateTime]::Now.ToString("yyyy-MM-dd HH:mm:ss")
    }
    Write-Host "📅 更新时间: $timestamp" -ForegroundColor $Colors.Info
    Write-Host "📊 当前阶段: $($ProgressData.currentPhase)" -ForegroundColor $Colors.Highlight
    Write-Host ""
    
    # 整体进度
    $progressBar = Draw-ProgressBar -Progress $ProgressData.overallProgress -Width 50 -Label "整体进度"
    Write-Host $progressBar -ForegroundColor $Colors.Progress
    Write-Host ""
    
    # 任务统计
    if ($ProgressData.totalTasks -gt 0) {
        Write-Host "📋 任务统计:" -ForegroundColor $Colors.Title
        Write-Host "   总任务数: $($ProgressData.totalTasks)" -ForegroundColor $Colors.Info
        Write-Host "   已完成:   $($ProgressData.completedTasks) ✅" -ForegroundColor $Colors.Success
        Write-Host "   进行中:   $($ProgressData.runningTasks) 🔄" -ForegroundColor $Colors.Warning
        Write-Host "   等待中:   $($ProgressData.pendingTasks) ⏳" -ForegroundColor $Colors.Info
        
        if ($ProgressData.completedTasks -gt 0 -and $ProgressData.tasks) {
            $completedTasks = $ProgressData.tasks | Where-Object { $_.status -eq "completed" -and $_.duration }
            if ($completedTasks.Count -gt 0) {
                $avgDuration = ($completedTasks | Measure-Object -Property duration -Average).Average
                Write-Host "   平均耗时: $(Format-Duration $avgDuration)" -ForegroundColor $Colors.Info
            }
        }
        Write-Host ""
    }
    
    # 详细任务列表
    if ($ProgressData.tasks -and $ProgressData.tasks.Count -gt 0) {
        Write-Host "🎯 任务详情:" -ForegroundColor $Colors.Title
        Write-Host ("-" * 60) -ForegroundColor $Colors.Title
        
        for ($i = 0; $i -lt $ProgressData.tasks.Count; $i++) {
            $task = $ProgressData.tasks[$i]
            $icon = Get-StatusIcon -Status $task.status
            $taskName = $task.name
            
            # 截断长任务名
            if ($taskName.Length -gt 45) {
                $taskName = $taskName.Substring(0, 42) + "..."
            }
            
            $line = "$icon $($i+1). $taskName"
            
            # 根据状态设置颜色
            $color = switch ($task.status) {
                "completed" { $Colors.Success }
                "failed" { $Colors.Error }
                "running" { $Colors.Warning }
                default { $Colors.Info }
            }
            
            Write-Host $line -ForegroundColor $color
            
            # 显示任务进度条
            if ($task.status -eq "running" -and $task.progress -gt 0) {
                $taskProgressBar = Draw-ProgressBar -Progress $task.progress -Width 30
                Write-Host "      $taskProgressBar" -ForegroundColor $color
            }
            
            # 显示执行时间
            if ($task.duration) {
                Write-Host "      耗时: $(Format-Duration $task.duration)" -ForegroundColor $Colors.Info
            } elseif ($task.startTime) {
                $elapsed = $ProgressData.timestamp - $task.startTime
                Write-Host "      运行中: $(Format-Duration $elapsed)" -ForegroundColor $Colors.Info
            }
            
            # 显示错误信息
            if ($task.error) {
                Write-Host "      错误: $($task.error)" -ForegroundColor $Colors.Error
            }
        }
        Write-Host ""
    }
    
    # 消息和错误
    if ($ProgressData.message) {
        Write-Host "💬 状态: $($ProgressData.message)" -ForegroundColor $Colors.Info
    }
    
    if ($ProgressData.error) {
        Write-Host "❌ 错误: $($ProgressData.error)" -ForegroundColor $Colors.Error
    }
    
    # 底部信息
    Write-Host ("-" * 60) -ForegroundColor $Colors.Title
    Write-Host "🔄 自动刷新中... (Ctrl+C 停止监控)" -ForegroundColor $Colors.Info
    Write-Host "📁 监控文件: $ProgressFile" -ForegroundColor $Colors.Info
}

# 主监控循环
function Start-Monitoring {
    Write-Host "🚀 启动牛马Master进度监控..." -ForegroundColor $Colors.Success
    Write-Host "📁 监控文件: $ProgressFile" -ForegroundColor $Colors.Info
    Write-Host "⏱️  刷新间隔: ${RefreshInterval}ms" -ForegroundColor $Colors.Info
    Write-Host ""
    
    $lastModified = $null
    $noFileWarningShown = $false
    
    while ($true) {
        try {
            if (Test-Path $ProgressFile) {
                $fileInfo = Get-Item $ProgressFile
                
                # 只在文件修改时更新显示
                if ($lastModified -ne $fileInfo.LastWriteTime) {
                    $lastModified = $fileInfo.LastWriteTime
                    $noFileWarningShown = $false
                    
                    try {
                        $content = Get-Content $ProgressFile -Raw -Encoding UTF8
                        if ($content) {
                            $progressData = $content | ConvertFrom-Json
                            Show-ProgressInfo -ProgressData $progressData
                            
                            # 检查是否已完成
                            if ($progressData.overallProgress -eq 100 -or $progressData.currentPhase -eq "执行完成") {
                                Write-Host ""
                                Write-Host "🎉 牛马Master执行完成！" -ForegroundColor $Colors.Success
                                Write-Host "⏳ 监控将在3秒后自动停止..." -ForegroundColor $Colors.Info
                                Start-Sleep -Seconds 3
                                break
                            }
                        }
                    } catch {
                        Write-Host "⚠️ 解析进度文件失败: $($_.Exception.Message)" -ForegroundColor $Colors.Warning
                    }
                }
            } else {
                if (-not $noFileWarningShown) {
                    Clear-Host
                    Write-Host "🐂 牛马Master进度监控" -ForegroundColor $Colors.Title
                    Write-Host ("=" * 60) -ForegroundColor $Colors.Title
                    Write-Host ""
                    Write-Host "⏳ 等待牛马Master启动..." -ForegroundColor $Colors.Warning
                    Write-Host "📁 监控文件: $ProgressFile" -ForegroundColor $Colors.Info
                    Write-Host ""
                    Write-Host "💡 提示: 请在另一个窗口中运行牛马Master" -ForegroundColor $Colors.Info
                    Write-Host "🔄 监控中... (Ctrl+C 停止)" -ForegroundColor $Colors.Info
                    $noFileWarningShown = $true
                }
            }
            
            Start-Sleep -Milliseconds $RefreshInterval
            
        } catch {
            Write-Host "❌ 监控过程中发生错误: $($_.Exception.Message)" -ForegroundColor $Colors.Error
            Start-Sleep -Seconds 2
        }
    }
}

# 主程序入口
try {
    Write-Host "🐂 牛马Master进度监控器" -ForegroundColor $Colors.Title
    Write-Host "版本: 1.0.0" -ForegroundColor $Colors.Info
    Write-Host ""
    
    # 验证参数
    if (-not (Test-Path (Split-Path $ProgressFile))) {
        Write-Host "❌ 进度文件目录不存在: $(Split-Path $ProgressFile)" -ForegroundColor $Colors.Error
        Write-Host "💡 将自动创建目录..." -ForegroundColor $Colors.Info
        New-Item -ItemType Directory -Path (Split-Path $ProgressFile) -Force | Out-Null
    }
    
    # 开始监控
    Start-Monitoring
    
} catch {
    Write-Host "❌ 启动监控失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Cleanup
}