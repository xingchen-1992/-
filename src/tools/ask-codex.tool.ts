import { z } from 'zod';
import { UnifiedTool } from './registry.js';
import { executeCodex, formatCodexResponseForMCP } from '../utils/codexExecutor.js';
import { 
  ERROR_MESSAGES, 
  STATUS_MESSAGES,
  MODELS,
  SANDBOX_MODES,
  APPROVAL_POLICIES
} from '../constants.js';

const askCodexArgsSchema = z.object({
  prompt: z.string().min(1).describe("User query or instruction for Codex. Can include file references and complex requests."),
  model: z.string().optional().describe(`Optional model to use. Options: ${Object.values(MODELS).join(', ')}. Defaults to gpt-5.`),
  sandbox: z.string().optional().describe(`Sandbox mode: ${Object.values(SANDBOX_MODES).join(', ')}. Defaults to read-only for safety.`),
  approval: z.string().optional().describe(`Approval policy: ${Object.values(APPROVAL_POLICIES).join(', ')}. Defaults to untrusted for safety.`),
  image: z.union([z.string(), z.array(z.string())]).optional().describe("Optional image file path(s) to include with the prompt"),
  config: z.union([z.string(), z.record(z.any())]).optional().describe("Configuration overrides as 'key=value' string or object"),
  timeout: z.number().default(120000).describe("Maximum execution time in milliseconds (default: 120000)"),
  workingDir: z.string().optional().describe("Working directory for Codex execution"),
  profile: z.string().optional().describe("Configuration profile to use from ~/.codex/config.toml"),
  includeThinking: z.boolean().default(true).describe("Include reasoning/thinking section in response"),
  includeMetadata: z.boolean().default(true).describe("Include configuration metadata in response"),
});

export const askCodexTool: UnifiedTool = {
  name: "ask-codex",
  description: "Execute OpenAI Codex with comprehensive parameter support for code analysis, generation, and assistance",
  zodSchema: askCodexArgsSchema,
  prompt: {
    description: "Execute Codex AI agent for code analysis, generation, debugging, and assistance with full parameter control",
  },
  category: 'codex',
  execute: async (args, onProgress) => {
    const { 
      prompt, 
      model, 
      sandbox, 
      approval, 
      image, 
      config, 
      timeout, 
      workingDir, 
      profile,
      includeThinking,
      includeMetadata
    } = args;

    if (!prompt?.trim()) {
      throw new Error(ERROR_MESSAGES.NO_PROMPT_PROVIDED);
    }

    try {
      // Provide progress update
      if (onProgress) {
        onProgress(STATUS_MESSAGES.PROCESSING_START);
      }

      const result = await executeCodex(
        prompt as string,
        {
          model: model as string,
          sandbox: sandbox as string,
          approval: approval as string,
          image,
          config,
          timeout: timeout as number,
          workingDir: workingDir as string,
          profile: profile as string,
          useExec: true
        },
        onProgress
      );

      // Format response for MCP
      const formattedResponse = formatCodexResponseForMCP(
        result, 
        includeThinking as boolean, 
        includeMetadata as boolean
      );

      return formattedResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide helpful error context
      if (errorMessage.includes('not found')) {
        return `❌ **Error**: ${ERROR_MESSAGES.CODEX_NOT_FOUND}\n\nPlease install the Codex CLI:\n\`\`\`bash\nnpm install -g @openai/codex\n\`\`\``;
      }
      
      if (errorMessage.includes('authentication')) {
        return `❌ **Authentication Error**: ${ERROR_MESSAGES.AUTHENTICATION_FAILED}\n\nPlease ensure you have:\n1. Valid OpenAI API key set: \`export OPENAI_API_KEY=your-key\`\n2. Or logged in with: \`codex login\``;
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        return `❌ **Rate Limit**: ${ERROR_MESSAGES.QUOTA_EXCEEDED}\n\nPlease try:\n1. Using a different model with \`model: "${MODELS.O3_MINI}"\`\n2. Waiting a few minutes before retrying\n3. Checking your OpenAI account quota`;
      }
      
      if (errorMessage.includes('sandbox') || errorMessage.includes('permission')) {
        return `❌ **Sandbox Error**: ${ERROR_MESSAGES.SANDBOX_VIOLATION}\n\nConsider:\n1. Using a less restrictive sandbox mode\n2. Adding appropriate approval policy\n3. Running with \`sandbox: "${SANDBOX_MODES.WORKSPACE_WRITE}"\` or \`approval: "${APPROVAL_POLICIES.ON_REQUEST}"\``;
      }
      
      // Generic error with context
      return `❌ **Error executing Codex**: ${errorMessage}\n\n**Request Details:**\n- Model: ${model || 'default (gpt-5)'}\n- Sandbox: ${sandbox || 'default (read-only)'}\n- Approval: ${approval || 'default (untrusted)'}`;
    }
  }
};