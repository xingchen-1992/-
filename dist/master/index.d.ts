export interface SubTask {
    id: string;
    prompt: string;
    index: number;
}
export interface ExecutionPlan {
    summary: string;
    steps: string[];
    analysis: string;
    estimatedTime: string;
}
/**
 * 牛马Master调度器 - 智能并行分析引擎
 *
 * 核心功能：
 * 1. 分析Claude的prompt并分解任务
 * 2. 8路并行执行Codex分析
 * 3. 整合所有结果
 * 4. 生成可执行计划返回给Claude
 */
export declare class 牛马Master {
    private readonly MAX_PARALLEL;
    private readonly TIMEOUT;
    private progressWriter;
    /**
     * 主入口：执行完整的Master调度流程
     */
    execute(claudePrompt: string): Promise<ExecutionPlan>;
    /**
     * 更新进度状态
     */
    private updateProgress;
    /**
     * 基于任务状态更新进度
     */
    private updateProgressFromTasks;
    /**
     * 步骤1: 智能分析并分解任务（不使用Codex，直接基于规则）
     */
    private analyzeAndDecompose;
    /**
     * 智能分析任务复杂度（基于关键词和长度）
     */
    private analyzeTaskComplexity;
    /**
     * 基于任务类型智能生成子任务
     */
    private generateSmartSubtasks;
    /**
     * 步骤2: 8路并行执行子任务
     */
    private executeParallel;
    /**
     * 步骤3: 整合所有分析结果
     */
    private mergeResults;
    /**
     * 步骤4: 基于整合结果生成执行计划
     */
    private generateExecutionPlan;
    /**
     * 解析执行计划格式
     */
    private parseExecutionPlan;
}
//# sourceMappingURL=index.d.ts.map