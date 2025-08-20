import { spawn } from 'child_process';
import { Logger } from '../utils/logger.js';
import { executeCodex } from '../utils/codexExecutor.js';
import { CodexOutput } from '../constants.js';

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
export class 牛马Master {
  private readonly MAX_PARALLEL = 8;
  private readonly TIMEOUT = 900000; // 15分钟

  /**
   * 主入口：执行完整的Master调度流程
   */
  async execute(claudePrompt: string): Promise<ExecutionPlan> {
    Logger.info(`🎯 牛马Master启动: ${claudePrompt.substring(0, 100)}...`);
    
    try {
      // 1. 分析并分解任务
      const subtasks = await this.analyzeAndDecompose(claudePrompt);
      Logger.info(`📋 任务分解完成，共${subtasks.length}个子任务`);
      
      // 2. 8路并行执行
      const results = await this.executeParallel(subtasks);
      Logger.info(`⚡ 并行执行完成，收到${results.length}个结果`);
      
      // 3. 整合结果
      const mergedResults = this.mergeResults(results);
      Logger.info(`🔗 结果整合完成，总长度: ${mergedResults.length}字符`);
      
      // 4. 生成执行计划
      const plan = await this.generateExecutionPlan(claudePrompt, mergedResults);
      Logger.info(`📝 执行计划生成完成`);
      
      return plan;
      
    } catch (error) {
      Logger.error('Master执行失败:', error);
      throw new Error(`牛马Master执行失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 步骤1: 智能分析并分解任务（不使用Codex，直接基于规则）
   */
  private async analyzeAndDecompose(claudePrompt: string): Promise<SubTask[]> {
    Logger.info('🔍 开始智能任务分解...');
    
    // 智能分析prompt的复杂度和类型
    const taskAnalysis = this.analyzeTaskComplexity(claudePrompt);
    
    Logger.info(`📊 任务分析结果: 复杂度=${taskAnalysis.complexity}, 建议并行数=${taskAnalysis.suggestedTasks}`);
    
    // 根据分析结果决定分解策略
    if (taskAnalysis.suggestedTasks === 1) {
      // 简单任务，不分解
      Logger.info('✅ 简单任务，使用单路分析');
      return [{
        id: 'task_1',
        prompt: claudePrompt,
        index: 1
      }];
    }
    
    // 复杂任务，智能分解
    const subtasks = this.generateSmartSubtasks(claudePrompt, taskAnalysis);
    
    Logger.info(`🎯 智能分解完成: ${subtasks.length}个子任务`);
    subtasks.forEach((task, i) => {
      Logger.info(`  ${i+1}. ${task.prompt.substring(0, 60)}...`);
    });
    
    return subtasks;
  }

  /**
   * 智能分析任务复杂度（基于关键词和长度）
   */
  private analyzeTaskComplexity(prompt: string): {complexity: string, suggestedTasks: number, taskType: string} {
    const lowerPrompt = prompt.toLowerCase();
    
    // 复杂任务关键词
    const complexKeywords = [
      '全面分析', '整体架构', '所有', '全部', '完整', '深度分析',
      '项目', '系统', '架构', '性能', '安全', '优化',
      '问题排查', '错误分析', '代码审查'
    ];
    
    // 中等任务关键词
    const mediumKeywords = [
      '分析', '检查', '优化', '修复', '改进', '找出',
      '实现', '功能', '模块', '组件'
    ];
    
    // 判断任务类型和复杂度
    let complexity = 'simple';
    let suggestedTasks = 1;
    let taskType = 'general';
    
    // 基于长度判断
    if (prompt.length > 200) {
      complexity = 'complex';
      suggestedTasks = Math.min(6, Math.ceil(prompt.length / 100));
    } else if (prompt.length > 100) {
      complexity = 'medium';
      suggestedTasks = 3;
    }
    
    // 基于关键词精确判断
    const complexMatches = complexKeywords.filter(keyword => lowerPrompt.includes(keyword)).length;
    const mediumMatches = mediumKeywords.filter(keyword => lowerPrompt.includes(keyword)).length;
    
    if (complexMatches >= 2) {
      complexity = 'complex';
      suggestedTasks = Math.min(8, complexMatches + 2);
    } else if (complexMatches >= 1 || mediumMatches >= 2) {
      complexity = 'medium';
      suggestedTasks = Math.min(4, mediumMatches + 1);
    }
    
    // 特殊任务类型识别
    if (lowerPrompt.includes('按钮') && lowerPrompt.includes('状态')) {
      taskType = 'ui_state';
      suggestedTasks = Math.min(4, suggestedTasks);
    } else if (lowerPrompt.includes('音频') && lowerPrompt.includes('播放')) {
      taskType = 'audio_playback';
      suggestedTasks = Math.min(5, suggestedTasks);
    } else if (lowerPrompt.includes('架构') || lowerPrompt.includes('设计')) {
      taskType = 'architecture';
      suggestedTasks = Math.min(6, suggestedTasks);
    }
    
    return { complexity, suggestedTasks, taskType };
  }

  /**
   * 基于任务类型智能生成子任务
   */
  private generateSmartSubtasks(prompt: string, analysis: {complexity: string, suggestedTasks: number, taskType: string}): SubTask[] {
    const { suggestedTasks, taskType } = analysis;
    const subtasks: SubTask[] = [];
    
    if (taskType === 'ui_state' && prompt.includes('按钮') && prompt.includes('状态')) {
      // UI状态管理问题的专门分解
      subtasks.push(
        { id: 'task_1', prompt: `分析UI按钮组件的实现和状态管理机制：${prompt}`, index: 1 },
        { id: 'task_2', prompt: `分析按钮状态更新的事件处理和回调机制：${prompt}`, index: 2 },
        { id: 'task_3', prompt: `分析音频播放完成后的状态同步逻辑：${prompt}`, index: 3 }
      );
      if (suggestedTasks >= 4) {
        subtasks.push({ id: 'task_4', prompt: `分析相关的日志记录和调试信息：${prompt}`, index: 4 });
      }
    } else if (taskType === 'audio_playback') {
      // 音频播放相关问题分解
      subtasks.push(
        { id: 'task_1', prompt: `分析音频播放管理器的实现：${prompt}`, index: 1 },
        { id: 'task_2', prompt: `分析音频播放完成事件的处理：${prompt}`, index: 2 },
        { id: 'task_3', prompt: `分析UI与音频状态的同步机制：${prompt}`, index: 3 }
      );
    } else {
      // 通用任务分解
      for (let i = 1; i <= suggestedTasks; i++) {
        subtasks.push({
          id: `task_${i}`,
          prompt: `从第${i}个角度深度分析：${prompt}`,
          index: i
        });
      }
    }
    
    return subtasks.slice(0, Math.min(8, suggestedTasks));
  }


  /**
   * 步骤2: 8路并行执行子任务
   */
  private async executeParallel(subtasks: SubTask[]): Promise<CodexOutput[]> {
    Logger.info(`🚀 开始${subtasks.length}路并行执行`);
    
    const promises = subtasks.map(async (task, index) => {
      try {
        Logger.info(`📤 启动任务${index + 1}/${subtasks.length}: ${task.prompt.substring(0, 50)}...`);
        
        const result = await executeCodex(task.prompt, {
          model: 'gpt-5',
          sandbox: 'read-only',
          timeout: this.TIMEOUT,
          useExec: true
        });
        
        Logger.info(`✅ 任务${index + 1}完成: ${result.response.length}字符`);
        return result;
        
      } catch (error) {
        Logger.error(`❌ 任务${index + 1}失败:`, error);
        
        // 返回错误结果而不是抛出异常，保证其他任务能继续
        return {
          metadata: {
            version: '1.0.0',
            workdir: '',
            model: 'gpt-5',
            provider: 'openai',
            approval: 'untrusted',
            sandbox: 'read-only'
          },
          userInstructions: task.prompt,
          response: `⚠️ 子任务执行失败: ${error instanceof Error ? error.message : String(error)}`,
          tokensUsed: 0,
          timestamps: [new Date().toISOString()],
          rawOutput: ''
        } as CodexOutput;
      }
    });

    // 等待所有并行任务完成
    const results = await Promise.all(promises);
    
    Logger.info(`🎯 并行执行完成，成功: ${results.filter(r => !r.response.includes('执行失败')).length}/${results.length}`);
    
    return results;
  }

  /**
   * 步骤3: 整合所有分析结果
   */
  private mergeResults(results: CodexOutput[]): string {
    Logger.info('🔗 开始整合分析结果');
    
    let merged = '# 🎯 牛马Master并行分析结果\n\n';
    
    results.forEach((result, index) => {
      merged += `## 📋 分析${index + 1}\n\n`;
      merged += `**任务**: ${result.userInstructions}\n\n`;
      merged += `**结果**:\n${result.response}\n\n`;
      merged += `---\n\n`;
    });
    
    // 添加统计信息
    const successCount = results.filter((r: CodexOutput) => !r.response.includes('执行失败')).length;
    const totalTokens = results.reduce((sum: number, r: CodexOutput) => sum + (r.tokensUsed || 0), 0);
    
    merged += `## 📊 执行统计\n\n`;
    merged += `- 总任务数: ${results.length}\n`;
    merged += `- 成功任务: ${successCount}\n`;
    merged += `- 失败任务: ${results.length - successCount}\n`;
    merged += `- 消耗Token: ${totalTokens}\n`;
    merged += `- 执行时间: ${new Date().toLocaleString()}\n\n`;
    
    Logger.info(`✅ 结果整合完成: ${merged.length}字符`);
    
    return merged;
  }

  /**
   * 步骤4: 基于整合结果生成执行计划
   */
  private async generateExecutionPlan(originalPrompt: string, mergedResults: string): Promise<ExecutionPlan> {
    Logger.info('📝 开始生成执行计划');
    
    const planPrompt = `
基于以下并行分析结果，为用户生成具体的执行计划：

原始需求：${originalPrompt}

分析结果：
${mergedResults}

请生成一个清晰的执行计划，包含：

SUMMARY: [一句话总结整体方案]

STEPS:
1. [具体的第一步操作]
2. [具体的第二步操作]
...

ANALYSIS: [深入的技术分析和建议]

要求：
1. 步骤要具体可执行，包含命令、文件路径等细节
2. 按照重要性和依赖关系排序
3. 考虑风险和最佳实践
4. 如果发现问题，要给出具体的解决方案
5. 保持专业和准确
`;

    try {
      const result = await executeCodex(planPrompt, {
        model: 'gpt-5',
        sandbox: 'read-only',
        timeout: this.TIMEOUT
      });

      // 解析计划格式
      const plan = this.parseExecutionPlan(result.response);
      Logger.info('✅ 执行计划生成完成');
      
      return plan;
      
    } catch (error) {
      Logger.error('执行计划生成失败:', error);
      
      // 降级处理：返回基础计划
      return {
        summary: '基于多路并行分析生成的执行方案',
        steps: [
          '1. 请查看上述详细分析结果',
          '2. 根据分析建议逐步执行相应操作',
          '3. 如有问题可进一步咨询牛马Master'
        ],
        analysis: mergedResults,
        estimatedTime: '根据任务复杂度而定'
      };
    }
  }

  /**
   * 解析执行计划格式
   */
  private parseExecutionPlan(response: string): ExecutionPlan {
    const lines = response.split('\n');
    
    let summary = '';
    const steps: string[] = [];
    let analysis = '';
    let currentSection = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('SUMMARY:')) {
        summary = trimmedLine.replace('SUMMARY:', '').trim();
        currentSection = 'summary';
      } else if (trimmedLine.startsWith('STEPS:')) {
        currentSection = 'steps';
      } else if (trimmedLine.startsWith('ANALYSIS:')) {
        currentSection = 'analysis';
      } else if (currentSection === 'steps' && trimmedLine.match(/^\d+\./)) {
        steps.push(trimmedLine);
      } else if (currentSection === 'analysis') {
        analysis += line + '\n';
      }
    }
    
    // 如果没有正确解析到格式化内容，使用原始响应
    if (!summary && steps.length === 0) {
      return {
        summary: '基于牛马Master并行分析生成的方案',
        steps: ['请参考下方详细分析结果进行操作'],
        analysis: response,
        estimatedTime: '预计15-30分钟'
      };
    }
    
    return {
      summary: summary || '执行方案已生成',
      steps: steps.length > 0 ? steps : ['请根据分析结果执行相应操作'],
      analysis: analysis.trim() || response,
      estimatedTime: '预计15-30分钟'
    };
  }
}