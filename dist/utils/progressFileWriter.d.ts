/**
 * 进度数据接口
 */
export interface ProgressData {
    timestamp: number;
    overallProgress: number;
    currentPhase: string;
    totalTasks: number;
    completedTasks: number;
    runningTasks: number;
    pendingTasks: number;
    tasks: TaskProgress[];
    estimatedTimeRemaining?: string;
    message?: string;
    startTime?: number;
    error?: string;
}
/**
 * 任务进度接口
 */
export interface TaskProgress {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    startTime?: number;
    endTime?: number;
    duration?: number;
    error?: string;
}
/**
 * 进度文件写入器
 * 负责将实时进度数据写入JSON文件，供PowerShell监控脚本读取
 */
export declare class ProgressFileWriter {
    private filePath;
    private isActive;
    constructor(logDir?: string);
    /**
     * 启动进度跟踪
     */
    start(): void;
    /**
     * 更新进度数据
     */
    updateProgress(progressData: Partial<ProgressData>): Promise<void>;
    /**
     * 写入进度数据到文件（覆盖写入）
     */
    private writeProgress;
    /**
     * 停止进度跟踪并清理文件
     */
    stop(): void;
    /**
     * 获取进度文件路径
     */
    getFilePath(): string;
    /**
     * 检查是否正在跟踪
     */
    isTracking(): boolean;
    /**
     * 强制清理进度文件（用于异常情况）
     */
    forceCleanup(): void;
}
/**
 * 获取全局进度文件写入器实例
 */
export declare function getProgressFileWriter(): ProgressFileWriter;
/**
 * 清理全局实例（用于测试或重置）
 */
export declare function resetProgressFileWriter(): void;
//# sourceMappingURL=progressFileWriter.d.ts.map