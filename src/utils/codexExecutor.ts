import { executeCommand } from './commandExecutor.js';
import { parseCodexOutput, formatCodexResponse } from './outputParser.js';
import { Logger } from './logger.js';
import { 
  CLI, 
  MODELS, 
  SANDBOX_MODES, 
  APPROVAL_POLICIES,
  ERROR_MESSAGES,
  STATUS_MESSAGES,
  CodexOutput
} from '../constants.js';

export async function executeCodex(
  prompt: string,
  options: {
    model?: string;
    sandbox?: string;
    approval?: string;
    image?: string | string[];
    config?: string | Record<string, any>;
    timeout?: number;
    workingDir?: string;
    profile?: string;
    useExec?: boolean;
  } = {},
  onProgress?: (newOutput: string) => void
): Promise<CodexOutput> {
  const {
    model,
    sandbox,
    approval,
    image,
    config,
    timeout,
    workingDir,
    profile,
    useExec = true
  } = options;

  // Build command arguments
  const args: string[] = [];
  
  // Add exec subcommand for non-interactive mode
  if (useExec) {
    args.push('exec');
  }
  
  // Add model selection (always gpt-5)
  if (model) {
    args.push(CLI.FLAGS.MODEL, MODELS.GPT5);
  }
  
  // Add sandbox mode
  if (sandbox) {
    args.push(CLI.FLAGS.SANDBOX, sandbox);
  }
  
  // Add approval policy
  if (approval) {
    args.push(CLI.FLAGS.APPROVAL, approval);
  }
  
  // Add image attachments
  if (image) {
    const images = Array.isArray(image) ? image : [image];
    images.forEach(img => {
      args.push(CLI.FLAGS.IMAGE, img);
    });
  }
  
  // Add configuration overrides
  if (config) {
    if (typeof config === 'string') {
      args.push(CLI.FLAGS.CONFIG, config);
    } else {
      // Convert object to key=value pairs
      Object.entries(config).forEach(([key, value]) => {
        const configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        args.push(CLI.FLAGS.CONFIG, `${key}=${configValue}`);
      });
    }
  }
  
  // Add working directory
  if (workingDir) {
    args.push(CLI.FLAGS.WORKING_DIR, workingDir);
  }
  
  // Add configuration profile
  if (profile) {
    args.push(CLI.FLAGS.PROFILE, profile);
  }
  
  // Add the prompt as the final argument
  args.push(prompt);
  
  Logger.sandboxMode(sandbox || CLI.DEFAULTS.SANDBOX, `${CLI.COMMANDS.CODEX} ${args.join(' ')}`);
  
  try {
    const rawOutput = await executeCommand(CLI.COMMANDS.CODEX, args, onProgress, timeout);
    const parsedOutput = parseCodexOutput(rawOutput);
    
    // Check for authentication errors
    if (parsedOutput.response.includes('authentication') || 
        parsedOutput.response.includes('unauthenticated')) {
      Logger.authenticationStatus(false);
      throw new Error(ERROR_MESSAGES.AUTHENTICATION_FAILED);
    }
    
    return parsedOutput;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Handle specific error types
    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      throw new Error(ERROR_MESSAGES.CODEX_NOT_FOUND);
    }
    
    if (errorMessage.includes('UNAUTHENTICATED') || errorMessage.includes('authentication')) {
      throw new Error(ERROR_MESSAGES.AUTHENTICATION_FAILED);
    }
    
    if (errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('rate limit')) {
      throw new Error(ERROR_MESSAGES.QUOTA_EXCEEDED);
    }
    
    if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('sandbox')) {
      throw new Error(ERROR_MESSAGES.SANDBOX_VIOLATION);
    }
    
    throw error;
  }
}

export async function executeCodexApply(
  options: {
    dryRun?: boolean;
    validate?: boolean;
  } = {},
  onProgress?: (newOutput: string) => void
): Promise<string> {
  const { dryRun, validate } = options;
  
  const args: string[] = ['apply'];
  
  // Note: Codex apply doesn't have dry-run or validate flags in the current version
  // This is a placeholder for potential future functionality
  
  Logger.info(STATUS_MESSAGES.APPLYING_DIFF);
  
  try {
    const result = await executeCommand(CLI.COMMANDS.CODEX, args, onProgress);
    Logger.success('Git diff applied successfully');
    return result;
  } catch (error) {
    Logger.error('Failed to apply diff:', error);
    throw error;
  }
}

export function formatCodexResponseForMCP(
  output: CodexOutput, 
  includeThinking: boolean = true,
  includeMetadata: boolean = true
): string {
  let response = '';
  
  if (includeMetadata && Object.keys(output.metadata).length > 0) {
    response += '**Configuration:**\n';
    if (output.metadata.model) response += `- Model: ${output.metadata.model}\n`;
    if (output.metadata.sandbox) response += `- Sandbox: ${output.metadata.sandbox}\n`;
    if (output.metadata.approval) response += `- Approval: ${output.metadata.approval}\n`;
    if (output.metadata.workdir) response += `- Working Directory: ${output.metadata.workdir}\n`;
    response += '\n';
  }
  
  if (includeThinking && output.thinking) {
    response += '**Reasoning:**\n';
    response += output.thinking + '\n\n';
  }
  
  response += STATUS_MESSAGES.CODEX_RESPONSE + '\n';
  response += output.response;
  
  if (output.tokensUsed) {
    response += `\n\n*Tokens used: ${output.tokensUsed}*`;
  }
  
  return response;
}

export function validateSandboxMode(sandbox: string): boolean {
  return Object.values(SANDBOX_MODES).includes(sandbox as any);
}

export function validateApprovalPolicy(approval: string): boolean {
  return Object.values(APPROVAL_POLICIES).includes(approval as any);
}

export function validateModel(model: string): boolean {
  return Object.values(MODELS).includes(model as any) || model.startsWith('gpt-') || model.startsWith('o');
}

export function getModelFallbacks(_model: string): string[] {
  // Only GPT-5 is supported now
  return [MODELS.GPT5];
}

export function getSandboxFallbacks(sandbox: string): string[] {
  switch (sandbox) {
    case SANDBOX_MODES.DANGER_FULL_ACCESS:
      return [SANDBOX_MODES.WORKSPACE_WRITE, SANDBOX_MODES.READ_ONLY];
    case SANDBOX_MODES.WORKSPACE_WRITE:
      return [SANDBOX_MODES.READ_ONLY];
    case SANDBOX_MODES.READ_ONLY:
      return []; // No fallback - safest mode
    default:
      return [SANDBOX_MODES.READ_ONLY];
  }
}