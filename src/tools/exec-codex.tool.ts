import { z } from 'zod';
import { UnifiedTool } from './registry.js';
import { executeCodex, formatCodexResponseForMCP } from '../utils/codexExecutor.js';
import { 
  ERROR_MESSAGES, 
  STATUS_MESSAGES,
  MODELS,
  SANDBOX_MODES
} from '../constants.js';

const execCodexArgsSchema = z.object({
  prompt: z.string().min(1).describe("Command or instruction for non-interactive Codex execution"),
  model: z.string().optional().describe(`Model to use: ${Object.values(MODELS).join(', ')}`),
  sandbox: z.string().optional().describe(`Sandbox mode: ${Object.values(SANDBOX_MODES).join(', ')}`),
  timeout: z.number().default(60000).describe("Maximum execution time in milliseconds (default: 60000)"),
  workingDir: z.string().optional().describe("Working directory for execution"),
});

export const execCodexTool: UnifiedTool = {
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

    try {
      if (onProgress) {
        onProgress(`${STATUS_MESSAGES.PROCESSING_START} (non-interactive mode)`);
      }

      const result = await executeCodex(
        prompt as string,
        {
          model: model as string,
          sandbox: sandbox as string,
          timeout: timeout as number,
          workingDir: workingDir as string,
          useExec: true
        },
        onProgress
      );

      // Format for non-interactive use (more concise)
      return formatCodexResponseForMCP(result, false, false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Exec-Codex failed: ${errorMessage}`);
    }
  }
};