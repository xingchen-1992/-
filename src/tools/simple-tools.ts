import { z } from 'zod';
import { UnifiedTool } from './registry.js';
import { executeCommand } from '../utils/commandExecutor.js';
import { CLI } from '../constants.js';

// Ping tool for testing MCP connection
const pingArgsSchema = z.object({
  message: z.string().default("").describe("Optional message to echo back"),
});

export const pingTool: UnifiedTool = {
  name: "ping",
  description: "Test MCP connection and server responsiveness",
  zodSchema: pingArgsSchema,
  prompt: {
    description: "Test the MCP server connection",
  },
  category: 'utility',
  execute: async (args) => {
    const { message } = args;
    const timestamp = new Date().toISOString();
    
    if (message) {
      return `🏓 Pong! "${message}" (${timestamp})`;
    }
    
    return `🏓 Pong! Codex MCP server is running (${timestamp})`;
  }
};

// Help tool
const helpArgsSchema = z.object({});

export const helpTool: UnifiedTool = {
  name: "help",
  description: "Get information about available Codex MCP tools and usage",
  zodSchema: helpArgsSchema,
  prompt: {
    description: "Show help information for Codex MCP tools",
  },
  category: 'utility',
  execute: async () => {
    return `# Codex CLI MCP Server Help

## Available Tools

### ask-codex 
🔒 安全代码分析工具 - 使用GPT-5进行纯只读代码分析
- **prompt** (required): 分析指令或问题
- **model**: 固定使用gpt-5模型
- **sandbox**: 🔒 锁定read-only安全模式
- **image** (optional): 包含图片文件路径  
- **config** (optional): 配置参数覆盖
- **timeout**: 最大15分钟超时保护（根据复杂度自动调整）

### ping
Test MCP server connection.
- **message** (optional): Message to echo

## Configuration

Set environment variables:
- \`OPENAI_API_KEY\`: Your OpenAI API key
- \`CODEX_MODEL\`: Default model (gpt-5, o3, etc.)
- \`CODEX_SANDBOX_MODE\`: Default sandbox mode

Or configure via \`~/.codex/config.toml\`

## Examples

\`\`\`
ask-codex "Explain this code: @main.py"
ask-codex "Fix the bug in login function" sandbox="workspace-write"
ask-codex "Generate unit tests" model="o3" approval="on-request"
\`\`\`

For more information, visit: https://github.com/openai/codex`;
  }
};

// Version tool
const versionArgsSchema = z.object({});

export const versionTool: UnifiedTool = {
  name: "version",
  description: "Get version information for Codex CLI and MCP server",
  zodSchema: versionArgsSchema,
  category: 'utility',
  execute: async () => {
    try {
      // Get Codex CLI version
      const codexVersion = await executeCommand(CLI.COMMANDS.CODEX, [CLI.FLAGS.VERSION]);
      
      return `# Version Information

## Codex CLI
\`\`\`
${codexVersion}
\`\`\`

## Codex MCP Server
- Version: 1.0.5
- MCP SDK: @modelcontextprotocol/sdk ^0.5.0
- Node.js: ${process.version}
- Platform: ${process.platform}`;
    } catch (error) {
      return `# Version Information

## Codex MCP Server
- Version: 1.0.5
- MCP SDK: @modelcontextprotocol/sdk ^0.5.0
- Node.js: ${process.version}
- Platform: ${process.platform}

## Codex CLI
❌ Error getting Codex CLI version: ${error instanceof Error ? error.message : 'Unknown error'}

Please ensure Codex CLI is installed:
\`\`\`bash
npm install -g @openai/codex
\`\`\``;
    }
  }
};