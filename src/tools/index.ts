// Tool Registry Index - Registers all tools
import { toolRegistry } from './registry.js';
import { askCodexTool } from './ask-codex.tool.js';
import { askCodexMasterTool } from './ask-codex-master.tool.js';
import { pingTool, helpTool, versionTool } from './simple-tools.js';

// 🔒 安全配置：仅注册安全代码分析工具
toolRegistry.push(
  askCodexTool,        // ✅ 单路代码分析功能
  askCodexMasterTool,  // 🎯 Master智能并行分析
  pingTool,            // ✅ 连接测试
  helpTool,            // ✅ 帮助信息
  versionTool          // ✅ 版本信息
);

// Export everything from registry
export * from './registry.js';