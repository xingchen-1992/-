import { z } from 'zod';
import { executeCodex, formatCodexResponseForMCP } from '../utils/codexExecutor.js';
import { ERROR_MESSAGES, STATUS_MESSAGES, MODELS, SANDBOX_MODES } from '../constants.js';
const execCodexArgsSchema = z.object({
    prompt: z.string().min(1).describe("Command or instruction for non-interactive Codex execution"),
    model: z.string().optional().describe(`Model to use: ${Object.values(MODELS).join(', ')}`),
    sandbox: z.string().optional().describe(`Sandbox mode: ${Object.values(SANDBOX_MODES).join(', ')}`),
    timeout: z.number().optional().describe("Maximum execution time in milliseconds (optional)"),
    workingDir: z.string().optional().describe("Working directory for execution"),
});
export const execCodexTool = {
    name: "exec-codex",
    description: "Non-interactive Codex execution for automation and scripting",
    zodSchema: execCodexArgsSchema,
    prompt: {
        description: "Execute Codex commands non-interactively for automation workflows",
    },
    category: 'codex',
    execute: async (args, onProgress) => {
        const { prompt, model, sandbox, timeout, workingDir } = args;
        if (!prompt?.trim()) {
            throw new Error(ERROR_MESSAGES.NO_PROMPT_PROVIDED);
        }
        // 🔧 修复：确保沙盒模式得到正确处理，默认为workspace-write以支持文件操作
        const effectiveSandbox = sandbox || SANDBOX_MODES.WORKSPACE_WRITE;
        // 验证沙盒模式
        if (!Object.values(SANDBOX_MODES).includes(effectiveSandbox)) {
            throw new Error(`Invalid sandbox mode: ${effectiveSandbox}. Valid options: ${Object.values(SANDBOX_MODES).join(', ')}`);
        }
        try {
            if (onProgress) {
                onProgress(`${STATUS_MESSAGES.PROCESSING_START} (non-interactive mode, sandbox: ${effectiveSandbox})`);
            }
            const result = await executeCodex(prompt, {
                model: model,
                sandbox: effectiveSandbox,
                timeout: timeout,
                workingDir: workingDir,
                useExec: true
            }, onProgress);
            // Format for non-interactive use (more concise)
            return formatCodexResponseForMCP(result, false, false);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Exec-Codex failed: ${errorMessage}`);
        }
    }
};
//# sourceMappingURL=exec-codex.tool.js.map