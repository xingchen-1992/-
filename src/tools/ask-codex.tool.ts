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

/*
 * CRITICAL INSTRUCTIONS FOR CLAUDE:
 * 
 * When using this tool, NEVER:
 * 1. Include your own answers or summaries in the prompt
 * 2. Pre-answer questions before sending to Codex
 * 3. Add interpretations that bias Codex's response
 * 
 * ✅ CORRECT: "Summarize @file.md" or "Analyze this code for security issues"  
 * ❌ WRONG: "Summarize this document. I think it means X: [content]"
 * 
 * QUERY BEST PRACTICES:
 * - Be direct and specific in requests
 * - Use @ syntax for file references  
 * - Let Codex find and read files independently
 * - Report progress to user during long operations
 * 
 * OUTPUT HANDLING:
 * - Present Codex's raw response to user
 * - Don't summarize unless explicitly asked
 * - Don't add commentary before/after responses
 * - Trust Codex's technical analysis
 * 
 * ERROR HANDLING:  
 * - Report errors clearly with helpful context
 * - Don't fallback to your own answers
 * - Suggest alternatives (different model, sandbox mode)
 * - Include troubleshooting hints
 */

/**
 * Builds structured prompts with output formatting instructions for Codex
 */
function buildCodexPrompt(userPrompt: string, config: {
  includeThinking?: boolean;
  includeMetadata?: boolean;
  model?: string;
  sandbox?: string;
}): string {
  const { includeThinking = true, includeMetadata = true, model, sandbox } = config;
  
  // Add output formatting instructions to ensure consistent responses
  let enhancedPrompt = userPrompt;
  
  // Only add formatting if this looks like a complex analysis request
  if (userPrompt.length > 50 || userPrompt.includes('@') || userPrompt.includes('analyze') || userPrompt.includes('review')) {
    enhancedPrompt += `\n\n## Response Format Guidelines:
- Provide clear, structured analysis
- Use markdown formatting for readability
- Include code examples when relevant
- Explain technical concepts clearly
- Focus on actionable insights`;

    if (includeThinking) {
      enhancedPrompt += `\n- Include your reasoning process`;
    }
    
    if (includeMetadata) {
      enhancedPrompt += `\n- Note any assumptions or limitations`;
    }
  }
  
  return enhancedPrompt;
}

const askCodexArgsSchema = z.object({
  prompt: z.string().min(1).describe("User query or instruction for Codex. Can include file references and complex requests."),
  model: z.string().optional().describe(`Optional model to use. Options: ${Object.values(MODELS).join(', ')}. Defaults to gpt-5.`),
  sandbox: z.string().optional().describe(`Sandbox mode: ${Object.values(SANDBOX_MODES).join(', ')}. Defaults to read-only for safety.`),
  approval: z.string().optional().describe(`Approval policy: ${Object.values(APPROVAL_POLICIES).join(', ')}. Defaults to untrusted for safety.`),
  image: z.union([z.string(), z.array(z.string())]).optional().describe("Optional image file path(s) to include with the prompt"),
  config: z.union([z.string(), z.record(z.any())]).optional().describe("Configuration overrides as 'key=value' string or object"),
  timeout: z.number().optional().describe("Maximum execution time in milliseconds (optional)"),
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
      throw new Error("You must provide a valid query or instruction for Codex analysis");
    }

    try {
      // Build enhanced prompt with formatting instructions
      // 临时简化：直接使用原始prompt进行调试
      const enhancedPrompt = prompt.trim() as string;

      // Detailed progress reporting
      const modelName = (model as string) || 'gpt-5';
      const sandboxMode = (sandbox as string) || 'read-only';
      
      if (onProgress) {
        onProgress(`Executing Codex with ${modelName} in ${sandboxMode} mode...`);
      }

      const result = await executeCodex(
        enhancedPrompt,
        {
          model: model as string, // 只有用户明确指定时才传递
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
      
      // Comprehensive error handling with helpful context
      if (errorMessage.includes('not found') || errorMessage.includes('command not found')) {
        return `❌ **Codex CLI Not Found**: ${ERROR_MESSAGES.CODEX_NOT_FOUND}

**Quick Fix:**
\`\`\`bash
npm install -g @openai/codex
\`\`\`

**Verification:** Run \`codex --version\` to confirm installation.`;
      }
      
      if (errorMessage.includes('authentication') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid api key')) {
        return `❌ **Authentication Failed**: ${ERROR_MESSAGES.AUTHENTICATION_FAILED}

**Setup Options:**
1. **API Key:** \`export OPENAI_API_KEY=your-key\`
2. **Login:** \`codex login\` (requires ChatGPT subscription)
3. **Config:** Add key to \`~/.codex/config.toml\`

**Troubleshooting:** Verify key has Codex access in OpenAI dashboard.`;
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('usage limit')) {
        return `❌ **Usage Limit Reached**: ${ERROR_MESSAGES.QUOTA_EXCEEDED}

**Immediate Solutions:**
1. **Wait and retry:** Rate limits reset periodically
2. **Check quota:** Visit OpenAI dashboard for usage details

**Note:** Only GPT-5 model is supported`;
      }
      
      if (errorMessage.includes('timeout')) {
        return `❌ **Request Timeout**: Operation took longer than expected

**Solutions:**
1. **Increase timeout:** Add \`timeout: 300000\` (5 minutes)
2. **Simplify request:** Break complex queries into smaller parts  
3. **Retry request:** GPT-5 is the only supported model
4. **Check connectivity:** Ensure stable internet connection`;
      }
      
      if (errorMessage.includes('sandbox') || errorMessage.includes('permission') || errorMessage.includes('access denied')) {
        return `❌ **Permission Error**: ${ERROR_MESSAGES.SANDBOX_VIOLATION}

**Permission Solutions:**
1. **Relax sandbox:** Use \`sandbox: "${SANDBOX_MODES.WORKSPACE_WRITE}"\`
2. **Approval policy:** Try \`approval: "${APPROVAL_POLICIES.ON_REQUEST}"\`  
3. **Full access:** Use \`sandbox: "${SANDBOX_MODES.DANGER_FULL_ACCESS}"\` (caution!)
4. **Check file permissions:** Ensure Codex can access target files`;
      }

      if (errorMessage.includes('model') || errorMessage.includes('unsupported')) {
        return `❌ **Model Error**: Requested model may not be available

**Model Alternatives:**
- **GPT-5:** \`model: "${MODELS.GPT5}"\` (only supported model)

**Check:** Verify model availability in your OpenAI account.`;
      }
      
      // Generic error with comprehensive context
      return `❌ **Codex Execution Error**: ${errorMessage}

**Request Configuration:**
- **Model:** ${model || 'gpt-5 (default)'}
- **Sandbox:** ${sandbox || 'read-only (default)'}  
- **Approval:** ${approval || 'untrusted (default)'}
- **Working Directory:** ${workingDir || 'current directory'}

**Debug Steps:**
1. Verify Codex CLI installation: \`codex --version\`
2. Check authentication: \`codex login\` or API key
3. Test with simpler query: \`codex "Hello world"\`
4. Try different model or sandbox mode`;
    }
  }
};