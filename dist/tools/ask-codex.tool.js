import { z } from 'zod';
import { executeCodex, formatCodexResponseForMCP } from '../utils/codexExecutor.js';
import { ERROR_MESSAGES, STATUS_MESSAGES, MODELS, APPROVAL_POLICIES } from '../constants.js';
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
function buildCodexPrompt(userPrompt, config) {
    const { includeThinking = true, includeMetadata = true } = config;
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
    sandbox: z.literal("read-only").optional().describe("🔒 Security: Locked to read-only mode for safe code analysis only"),
    approval: z.string().optional().describe(`Approval policy: ${Object.values(APPROVAL_POLICIES).join(', ')}. Defaults to untrusted for safety.`),
    image: z.union([z.string(), z.array(z.string())]).optional().describe("Optional image file path(s) to include with the prompt"),
    config: z.union([z.string(), z.record(z.any())]).optional().describe("Configuration overrides as 'key=value' string or object"),
    // timeout: 固定15分钟，不允许用户自定义
    // timeout: z.number().optional().describe("Fixed 15-minute timeout for analysis"),
    workingDir: z.string().optional().describe("Working directory for command execution"),
    profile: z.string().optional().describe("Configuration profile to use"),
    includeThinking: z.boolean().optional().describe("Include reasoning in response"),
    includeMetadata: z.boolean().optional().describe("Include metadata in response")
});
export const askCodexTool = {
    name: 'ask-codex',
    description: '🔒 Safe Code Analysis: Read-only Codex CLI access for secure code analysis and review (no file modifications)',
    zodSchema: askCodexArgsSchema,
    category: 'codex',
    prompt: {
        description: 'Ask Codex to analyze code, answer questions, or process files with intelligent responses',
        arguments: [
            { name: 'prompt', description: 'Your question or request for Codex', required: true },
            { name: 'model', description: 'Model to use (defaults to gpt-5)', required: false },
            { name: 'sandbox', description: 'Sandbox mode for safety', required: false },
            { name: 'approval', description: 'Approval policy', required: false }
        ]
    },
    async execute(args, onProgress) {
        const { prompt, model, sandbox, approval, image, config, 
        // 固定15分钟超时，不允许用户自定义
        workingDir, profile, includeThinking = true, includeMetadata = true } = args;
        try {
            onProgress?.(STATUS_MESSAGES.STARTING_CODEX);
            // Validate prompt is available
            if (!prompt) {
                throw new Error('Prompt is required');
            }
            // Build enhanced prompt with formatting instructions
            const enhancedPrompt = buildCodexPrompt(prompt, {
                includeThinking: Boolean(includeThinking),
                includeMetadata: Boolean(includeMetadata),
                model: typeof model === 'string' ? model : undefined,
                sandbox: typeof sandbox === 'string' ? sandbox : undefined
            });
            const effectiveTimeout = 900000; // 最大15分钟超时限制，实际根据复杂度自动调整
            const result = await executeCodex(enhancedPrompt, {
                model: typeof model === 'string' ? model : undefined,
                sandbox: "read-only", // 🔒 强制只读模式，禁用文件修改
                approval: typeof approval === 'string' ? approval : undefined,
                image,
                config,
                timeout: effectiveTimeout,
                workingDir: typeof workingDir === 'string' ? workingDir : undefined,
                profile: typeof profile === 'string' ? profile : undefined,
                useExec: true
            }, onProgress);
            // Format response for MCP
            const formattedResponse = formatCodexResponseForMCP(result, Boolean(includeThinking), Boolean(includeMetadata));
            return formattedResponse;
        }
        catch (error) {
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
1. **分析超时:** 最大15分钟超时保护，复杂分析可能需要更多时间
2. **Simplify request:** Break complex queries into smaller parts  
3. **Retry request:** GPT-5 is the only supported model
4. **Check connectivity:** Ensure stable internet connection`;
            }
            if (errorMessage.includes('sandbox') || errorMessage.includes('permission') || errorMessage.includes('access denied')) {
                return `❌ **Permission Error**: ${ERROR_MESSAGES.SANDBOX_VIOLATION}

**Permission Solutions:**
1. **Only read-only mode available:** This tool is configured for safe code analysis only
2. **No file modifications:** File write operations have been disabled for security
3. **Analysis only:** Use this tool for reading and understanding code structure
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
- **Model:** ${typeof model === 'string' ? model : 'gpt-5 (default)'}
- **Sandbox:** ${typeof sandbox === 'string' ? sandbox : 'read-only (default)'}  
- **Approval:** ${typeof approval === 'string' ? approval : 'untrusted (default)'}
- **Working Directory:** ${typeof workingDir === 'string' ? workingDir : 'current directory'}

**Debug Steps:**
1. Verify Codex CLI installation: \`codex --version\`
2. Check authentication: \`codex login\` or API key
3. Test with simpler query: \`codex "Hello world"\`
4. Try different model or sandbox mode`;
        }
    }
};
//# sourceMappingURL=ask-codex.tool.js.map