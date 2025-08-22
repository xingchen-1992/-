import { z } from 'zod';
import { UnifiedTool } from './registry.js';
import { 牛马Master, ExecutionPlan } from '../master/index.js';
import { Logger } from '../utils/logger.js';
import { getProgressFileWriter } from '../utils/progressFileWriter.js';
import { 
  ERROR_MESSAGES, 
  STATUS_MESSAGES,
  MODELS
} from '../constants.js';

const askCodexMasterArgsSchema = z.object({
  prompt: z.string().min(1).describe("复杂任务需求，将被智能分解并8路并行分析"),
  includeAnalysis: z.boolean().optional().default(true).describe("是否包含详细的分析过程"),
  maxTasks: z.number().optional().default(8).describe("最大并行任务数（固定为8）")
});

/**
 * 牛马Master智能并行分析工具
 * 
 * 核心功能：
 * 1. 接收Claude发来的复杂需求
 * 2. 智能分解为多个子任务
 * 3. 8路并行执行Codex分析
 * 4. 整合结果并生成执行计划
 * 5. 返回给Claude可直接执行的方案
 */
export const askCodexMasterTool: UnifiedTool = {
  name: 'ask-codex-master',
  description: '🎯 牛马Master智能并行分析 - 复杂任务自动分解为8路并行执行，生成完整执行计划',
  zodSchema: askCodexMasterArgsSchema,
  category: 'codex',
  
  prompt: {
    description: 'Master级智能分析，处理复杂的代码分析、问题诊断、优化建议等需求',
    arguments: [
      { name: 'prompt', description: '复杂的分析需求（如：全面分析项目架构、找出所有性能问题等）', required: true },
      { name: 'includeAnalysis', description: '是否包含详细分析过程（默认true）', required: false },
      { name: 'maxTasks', description: '并行任务数（固定8）', required: false }
    ]
  },

  async execute(args, onProgress) {
    const { 
      prompt, 
      includeAnalysis = true 
    } = args;

    // 验证必要参数
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Master工具需要有效的prompt参数');
    }

    try {
      // 开始Master调度流程
      onProgress?.('🎯 牛马Master启动：智能分解任务中...');
      
      // 获取进度文件写入器并显示监控命令
      const progressWriter = getProgressFileWriter();
      const progressFile = progressWriter.getFilePath();
      const monitorScript = "H:\A_test\牛马\scripts\monitor_progress.ps1";
      
      // 在Claude Code中显示实时监控指令
      onProgress?.(`🎯 牛马Master启动：8路智能并行分析

📊 **实时进度监控**: 
   powershell -ExecutionPolicy Bypass -File "${monitorScript}"

🔗 在新的PowerShell窗口中运行上方命令可查看实时进度
📁 进度文件: ${progressFile}

🚀 开始任务分解和并行执行...`);
      
      Logger.info(`🎯 Master工具被调用: ${prompt.substring(0, 100)}...`);
      
      // 创建Master实例
      const master = new 牛马Master();
      
      // 更新进度
      onProgress?.('🔍 任务分析和分解中...');
      
      // 执行完整的Master流程
      const executionPlan: ExecutionPlan = await master.execute(prompt);
      
      onProgress?.('✅ Master分析完成，生成执行计划');
      
      // 格式化输出给Claude
      const response = formatMasterResponse(executionPlan, Boolean(includeAnalysis), progressFile, monitorScript);
      
      Logger.info('🎯 Master工具执行完成');
      
      return response;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error('Master工具执行失败:', error);
      
      // Master级别的错误处理
      if (errorMessage.includes('not found') || errorMessage.includes('command not found')) {
        return `❌ **牛马Master执行失败**: Codex CLI未找到

**解决方案:**
1. 安装Codex CLI: \`npm install -g @openai/codex\`
2. 验证安装: \`codex --version\`
3. 登录订阅账户: \`codex login\`

**注意**: 牛马Master需要Codex CLI支持才能运行`;
      }
      
      if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
        return `❌ **牛马Master认证失败**: ${ERROR_MESSAGES.AUTHENTICATION_FAILED}

**Master级认证要求:**
- 需要有效的Codex CLI Pro订阅（$200/月）
- 确保已登录: \`codex login\`
- Master模式需要稳定的API访问权限`;
      }
      
      if (errorMessage.includes('timeout')) {
        return `❌ **牛马Master超时**: 分析任务复杂度超出预期

**Master超时处理:**
1. **任务过于复杂**: 请尝试简化需求或分批处理
2. **网络问题**: 检查网络连接稳定性
3. **降级使用**: 可以使用单路 \`ask-codex\` 工具
4. **重试**: Master包含错误恢复机制，可以重试

**建议**: 复杂的全项目分析可能需要分批执行`;
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        return `❌ **牛马Master资源限制**: API配额或速率限制

**Master资源管理:**
- Master模式会并发调用8个Codex实例
- 可能快速消耗API配额
- 建议在非高峰时段使用Master模式
- 或使用单路 \`ask-codex\` 节省配额`;
      }
      
      // 通用Master错误
      return `❌ **牛马Master执行错误**: ${errorMessage}

**Master诊断信息:**
- **原始需求**: ${prompt ? prompt.substring(0, 200) + (prompt.length > 200 ? '...' : '') : '未知'}
- **错误类型**: ${errorMessage.includes('Master') ? '内部调度错误' : '外部依赖错误'}
- **建议**: 可以尝试使用简化版 \`ask-codex\` 工具

**调试步骤:**
1. 确认Codex CLI正常: \`codex "hello world"\`
2. 检查订阅状态
3. 尝试简单的Master任务测试
4. 如持续失败，请使用单路分析工具`;
    }
  }
};

/**
 * 格式化Master响应给Claude
 */
function formatMasterResponse(plan: ExecutionPlan, includeAnalysis: boolean, progressFile?: string, monitorScript?: string): string {
    let response = `# 🎯 牛马Master执行计划

`;
    
    // 实时进度监控信息（如果提供）
    if (progressFile && monitorScript) {
      response += `## 📊 实时进度监控

`;
      response += `🔗 **PowerShell监控命令**:
`;
      response += `\`\`\`powershell
`;
      response += `powershell -ExecutionPolicy Bypass -File "${monitorScript}"
`;
      response += `\`\`\`

`;
      response += `📁 **进度文件**: \`${progressFile}\`
`;
      response += `📈 运行上方命令可在独立窗口中查看8路并行分析的详细实时进度

`;
    }
    
    // 执行摘要
    response += `## 📋 方案摘要

`;
    response += `${plan.summary}

`;
    
    // 执行步骤
    response += `## 🚀 执行步骤\n\n`;
    if (plan.steps.length > 0) {
      plan.steps.forEach(step => {
        response += `${step}\n`;
      });
    } else {
      response += `请根据下方详细分析执行相应操作\n`;
    }
    
    response += `\n`;
    
    // 时间估算
    response += `## ⏰ 预计耗时\n\n`;
    response += `${plan.estimatedTime}\n\n`;
    
    // 详细分析（可选）
    if (includeAnalysis && plan.analysis) {
      response += `## 🔍 详细分析过程\n\n`;
      response += `${plan.analysis}\n\n`;
    }
    
    // Master标识
    response += `---\n`;
    response += `*🤖 由牛马Master并行分析引擎生成 | 8路并行分析 | ${new Date().toLocaleString()}*\n`;
    
    return response;
}