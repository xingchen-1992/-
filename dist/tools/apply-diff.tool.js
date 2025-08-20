import { z } from 'zod';
import { executeCodexApply } from '../utils/codexExecutor.js';
import { STATUS_MESSAGES } from '../constants.js';
const applyDiffArgsSchema = z.object({
    dryRun: z.boolean().default(false).describe("Preview changes without applying them"),
    validate: z.boolean().default(true).describe("Validate changes before applying"),
});
export const applyDiffTool = {
    name: "apply-diff",
    description: "Apply the latest diff produced by Codex agent to the local git repository",
    zodSchema: applyDiffArgsSchema,
    prompt: {
        description: "Apply Codex-generated code changes to your git repository",
    },
    category: 'codex',
    execute: async (args, onProgress) => {
        const { dryRun, validate } = args;
        try {
            if (onProgress) {
                onProgress(STATUS_MESSAGES.APPLYING_DIFF);
            }
            const result = await executeCodexApply({
                dryRun: dryRun,
                validate: validate,
            }, onProgress);
            let response = STATUS_MESSAGES.APPLYING_DIFF + '\n\n';
            if (dryRun) {
                response += '**Dry Run Mode - No changes applied:**\n';
            }
            else {
                response += '**Changes Applied:**\n';
            }
            response += '```\n' + result + '\n```';
            if (!dryRun) {
                response += '\n\n✅ Git diff has been successfully applied to your working tree.';
                response += '\n\n*Note: Review the changes and commit them when ready.*';
            }
            return response;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('No diff found') || errorMessage.includes('no changes')) {
                return '⚠️ **No Diff Available**: No recent Codex-generated diff found to apply.\n\nTo generate a diff:\n1. Use `ask-codex` with a code modification request\n2. Then use `apply-diff` to apply the changes';
            }
            if (errorMessage.includes('not a git repository')) {
                return '❌ **Git Repository Required**: This command must be run within a git repository.\n\n```bash\ngit init  # Initialize a new repository\n```';
            }
            return `❌ **Apply Diff Failed**: ${errorMessage}\n\n**Troubleshooting:**\n- Ensure you're in a git repository\n- Check that Codex has generated a recent diff\n- Verify working tree is clean or conflicts are resolved`;
        }
    }
};
//# sourceMappingURL=apply-diff.tool.js.map