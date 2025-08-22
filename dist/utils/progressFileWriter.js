import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { Logger } from './logger.js';
/**
 * 进度文件写入器
 * 负责将实时进度数据写入JSON文件，供PowerShell监控脚本读取
 */
export class ProgressFileWriter {
    filePath;
    isActive = false;
    constructor(logDir = 'H:\\A_test\\牛马\\logs') {
        // 确保日志目录存在
        if (!existsSync(logDir)) {
            mkdirSync(logDir, { recursive: true });
        }
        this.filePath = `${logDir}\\realtime_progress.json`;
        Logger.info(`📄 进度文件写入器初始化: ${this.filePath}`);
    }
    /**
     * 启动进度跟踪
     */
    start() {
        console.log('🔍 DEBUG: ProgressFileWriter.start() 被调用');
        this.isActive = true;
        console.log(`🔍 DEBUG: 进度文件路径: ${this.filePath}`);
        console.log(`🔍 DEBUG: 开始创建初始进度文件...`);
        // 初始化进度文件
        const initialProgress = {
            timestamp: Date.now(),
            overallProgress: 0,
            currentPhase: '初始化',
            totalTasks: 0,
            completedTasks: 0,
            runningTasks: 0,
            pendingTasks: 0,
            tasks: [],
            startTime: Date.now(),
            message: '牛马Master启动中...'
        };
        try {
            this.writeProgress(initialProgress);
            console.log('🔍 DEBUG: 初始进度文件写入成功');
            Logger.info('📊 进度文件跟踪已启动');
        }
        catch (error) {
            console.error('🔍 DEBUG: 进度文件写入失败:', error);
            Logger.error('进度文件写入失败:', error);
        }
    }
    /**
     * 更新进度数据
     */
    async updateProgress(progressData) {
        if (!this.isActive) {
            return;
        }
        try {
            // 读取现有数据（如果存在）
            let currentData;
            if (existsSync(this.filePath)) {
                const { readFileSync } = await import('fs');
                const existingContent = readFileSync(this.filePath, 'utf8');
                currentData = JSON.parse(existingContent);
            }
            else {
                // 如果文件不存在，创建默认数据
                currentData = {
                    timestamp: Date.now(),
                    overallProgress: 0,
                    currentPhase: '初始化',
                    totalTasks: 0,
                    completedTasks: 0,
                    runningTasks: 0,
                    pendingTasks: 0,
                    tasks: [],
                    startTime: Date.now()
                };
            }
            // 合并新数据
            const updatedData = {
                ...currentData,
                ...progressData,
                timestamp: Date.now()
            };
            this.writeProgress(updatedData);
            // 记录关键进度变化
            if (progressData.overallProgress !== undefined) {
                Logger.info(`📈 进度更新: ${updatedData.overallProgress}% - ${updatedData.currentPhase}`);
            }
        }
        catch (error) {
            Logger.error('更新进度文件失败:', error);
        }
    }
    /**
     * 写入进度数据到文件（覆盖写入）
     */
    writeProgress(data) {
        try {
            console.log(`🔍 DEBUG: writeProgress() 被调用，文件路径: ${this.filePath}`);
            const jsonContent = JSON.stringify(data, null, 2);
            console.log(`🔍 DEBUG: JSON内容长度: ${jsonContent.length} 字符`);
            writeFileSync(this.filePath, jsonContent, 'utf8');
            console.log(`🔍 DEBUG: 文件写入成功`);
        }
        catch (error) {
            console.error(`🔍 DEBUG: writeProgress() 失败:`, error);
            Logger.error('写入进度文件失败:', error);
        }
    }
    /**
     * 停止进度跟踪并清理文件
     */
    stop() {
        if (!this.isActive) {
            return;
        }
        this.isActive = false;
        try {
            // 写入最终状态
            const finalProgress = {
                timestamp: Date.now(),
                overallProgress: 100,
                currentPhase: '完成',
                totalTasks: 0,
                completedTasks: 0,
                runningTasks: 0,
                pendingTasks: 0,
                tasks: [],
                message: '牛马Master执行完成'
            };
            this.writeProgress(finalProgress);
            // 延迟删除文件，给监控脚本时间读取最终状态
            setTimeout(() => {
                if (existsSync(this.filePath)) {
                    unlinkSync(this.filePath);
                    Logger.info('🧹 进度文件已清理');
                }
            }, 2000);
            Logger.info('📊 进度文件跟踪已停止');
        }
        catch (error) {
            Logger.error('停止进度跟踪失败:', error);
        }
    }
    /**
     * 获取进度文件路径
     */
    getFilePath() {
        return this.filePath;
    }
    /**
     * 检查是否正在跟踪
     */
    isTracking() {
        return this.isActive;
    }
    /**
     * 强制清理进度文件（用于异常情况）
     */
    forceCleanup() {
        try {
            if (existsSync(this.filePath)) {
                unlinkSync(this.filePath);
                Logger.info('🧹 进度文件已强制清理');
            }
            this.isActive = false;
        }
        catch (error) {
            Logger.error('强制清理进度文件失败:', error);
        }
    }
}
// 单例模式：全局进度文件写入器实例
let progressFileWriterInstance = null;
/**
 * 获取全局进度文件写入器实例
 */
export function getProgressFileWriter() {
    if (!progressFileWriterInstance) {
        progressFileWriterInstance = new ProgressFileWriter();
    }
    return progressFileWriterInstance;
}
/**
 * 清理全局实例（用于测试或重置）
 */
export function resetProgressFileWriter() {
    if (progressFileWriterInstance) {
        progressFileWriterInstance.forceCleanup();
        progressFileWriterInstance = null;
    }
}
//# sourceMappingURL=progressFileWriter.js.map