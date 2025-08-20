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
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface CodexPathInfo {
  command: string;
  args: string[];
  isProjectLocal: boolean;
  availableMethods: string[];
}

/**
 * 智能检测项目内Codex和全局Codex的可用性
 * 优先使用用户已付费的全局CLI（200美元订阅）
 */
function detectCodexPaths(): CodexPathInfo {
  Logger.info(`🔍 智能检测Codex CLI路径 (Windows环境优化v2)`);
  
  const availableMethods: string[] = [];
  
  // 🎯 方案1: 优先检测用户的付费全局CLI (最重要)
  Logger.info(`📡 检测全局付费Codex CLI...`);
  
  // Windows环境下正确的命令名称 - 修复关键bug
  const isWindows = process.platform === 'win32';
  const globalCommand = isWindows ? 'codex.cmd' : 'codex';
  const globalCommandAlt = 'codex'; // Windows备用命令
  
  Logger.info(`检测的命令: 主要=${globalCommand}, 备用=${globalCommandAlt}, 平台=${process.platform}`);
  
  // 🔧 方法1: 直接使用完整路径优先策略 (Windows spawn修复)
  Logger.info('优先使用完整路径策略，避免Windows spawn ENOENT问题');
  
  // Windows上优先尝试完整路径
  if (isWindows) {
    const fullPaths = [
      'C:\\Users\\Administrator\\AppData\\Roaming\\npm\\codex.cmd',
      (process.env.APPDATA ? process.env.APPDATA + '\\npm\\codex.cmd' : '')
    ].filter(p => p);
    
    for (const fullPath of fullPaths) {
      if (fs.existsSync(fullPath)) {
        try {
          // 验证完整路径的可用性
          const result = execSync(`"${fullPath}" --version`, { 
            encoding: 'utf8', 
            timeout: 5000,
            stdio: 'pipe'
          });
          
          if (result && (result.includes('codex-cli') || result.includes('codex'))) {
            const version = result.trim();
            Logger.info(`✅ Windows完整路径验证成功: ${version} (路径: ${fullPath})`);
            availableMethods.push(`Windows完整路径 (${fullPath})`);
            return {
              command: fullPath,
              args: [],
              isProjectLocal: false,
              availableMethods
            };
          }
        } catch (error) {
          Logger.info(`完整路径 ${fullPath} 验证失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }
  
  // 备用方法: 传统命令检测 (主要用于非Windows或找不到完整路径时)
  for (const cmd of [globalCommand, globalCommandAlt]) {
    try {
      const result = execSync(`${cmd} --version`, { 
        encoding: 'utf8', 
        timeout: 5000,
        stdio: 'pipe'
      });
      
      if (result && (result.includes('codex-cli') || result.includes('codex'))) {
        const version = result.trim();
        Logger.info(`✅ 备用方法找到Codex CLI: ${version} (命令: ${cmd})`);
        Logger.info(`⚠️  注意: 使用命令名称 ${cmd}，可能在Windows spawn中失败`);
        
        availableMethods.push(`备用命令 (${cmd})`);
        return {
          command: cmd,
          args: [],
          isProjectLocal: false,
          availableMethods
        };
      }
    } catch (error) {
      Logger.info(`命令${cmd}版本检测失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // 方法2: 跳过which检测，直接进入路径检测
  Logger.info('跳过which检测，直接使用路径验证');
  
  // 方法3: 检查常见的npm全局安装路径 - 增强版
  const commonPaths = [
    'C:\Users\Administrator\AppData\Roaming\npm\codex.cmd',
    'C:\Users\Administrator\AppData\Roaming\npm\codex.exe',
    'C:\Users\Administrator\AppData\Roaming\npm\codex',
    (process.env.APPDATA ? process.env.APPDATA + '\npm\codex.cmd' : ''),
    (process.env.APPDATA ? process.env.APPDATA + '\npm\codex.exe' : ''),
    (process.env.APPDATA ? process.env.APPDATA + '\npm\codex' : ''),
    // 添加其他常见路径
    'C:\Program Files\nodejs\codex.cmd',
    'C:\Program Files\nodejs\codex.exe'
  ].filter(p => p && !p.includes('undefined'));
  
  for (const cmdPath of commonPaths) {
    if (fs.existsSync(cmdPath)) {
      Logger.info(`✅ 在常见路径找到Codex CLI: ${cmdPath}`);
      availableMethods.push('npm全局路径');
      return {
        command: cmdPath,
        args: [],
        isProjectLocal: false,
        availableMethods
      };
    }
  }
  
  // 🔄 方案2: 项目内Codex检测 (备用方案)
  Logger.info(`🔄 检测项目内Codex...`);
  
  // ES模块中获取__dirname等效路径 - Windows兼容版本
  const currentModuleUrl = import.meta.url;
  let currentModulePath = new URL(currentModuleUrl).pathname;
  
  // Windows路径修正：移除开头的斜杠并处理盘符
  if (process.platform === 'win32' && currentModulePath.startsWith('/')) {
    currentModulePath = currentModulePath.substring(1);
  }
  
  const currentDir = path.dirname(currentModulePath);
  
  const projectCodexPath = path.resolve(currentDir, '../../../codex/codex-cli/bin/codex.js');
  const projectBinaryPath = path.resolve(currentDir, '../../../codex/codex-cli/bin/codex-x86_64-pc-windows-msvc.exe');
  
  // 检查项目内Codex的可用性
  const hasProjectCodexJS = fs.existsSync(projectCodexPath);
  const hasProjectBinary = fs.existsSync(projectBinaryPath);
  
  Logger.info(`- 项目内codex.js: ${hasProjectCodexJS ? '✓' : '✗'} (${projectCodexPath})`);
  Logger.info(`- 项目内二进制: ${hasProjectBinary ? '✓' : '✗'} (${projectBinaryPath})`);
  
  // 项目内完整方案
  if (hasProjectCodexJS && hasProjectBinary) {
    Logger.info(`🎯 使用项目内完整Codex`);
    availableMethods.push('项目内完整Codex');
    return {
      command: 'node',
      args: [projectCodexPath],
      isProjectLocal: true,
      availableMethods
    };
  }
  
  // 项目内混合方案
  if (hasProjectCodexJS) {
    Logger.info(`🔄 使用项目内Node.js + 全局二进制（混合方案）`);
    availableMethods.push('项目内Node.js混合方案');
    return {
      command: 'node',
      args: [projectCodexPath],
      isProjectLocal: true,
      availableMethods
    };
  }
  
  // ❌ 所有方案都失败
  Logger.info(`❌ 无法找到任何可用的Codex CLI！`);
  Logger.info(`请确认：`);
  Logger.info(`1. 全局Codex CLI已安装: npm install -g @openai/codex`);
  Logger.info(`2. 用户已登录: codex login`);
  Logger.info(`3. PATH环境变量包含npm全局路径`);
  Logger.info(`4. Windows用户: 检查是否有codex.cmd文件`);
  
  // 返回默认命令，让executeCommand阶段处理错误
  availableMethods.push('默认命令(可能失败)');
  return {
    command: globalCommand,
    args: [],
    isProjectLocal: false,
    availableMethods
  };
}

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

  // 🎯 智能路径检测 - 获取最佳Codex执行路径
  const pathInfo = detectCodexPaths();
  Logger.info(`使用执行方案: ${pathInfo.availableMethods.join(', ')}`);
  
  // Build command arguments - 根据路径信息构造参数
  const args: string[] = [...pathInfo.args];
  
  // Add exec subcommand for non-interactive mode
  if (useExec) {
    args.push('exec');
  }
  
  // Add model selection - 只在明确指定时添加
  if (model && model.trim()) {
    // 使用用户指定的模型，而不是硬编码gpt-5
    args.push(CLI.FLAGS.MODEL, model.trim());
  }
  
  // Add sandbox mode and auto-approval handling
  if (sandbox) {
    if (sandbox === 'workspace-write') {
      // 🔧 修复：workspace-write模式自动添加full-auto标志避免卡在确认提示
      Logger.info('🚀 workspace-write模式：启用full-auto自动确认');
      args.push(CLI.FLAGS.FULL_AUTO);
    } else if (sandbox === 'danger-full-access') {
      // danger-full-access模式使用bypass标志
      Logger.info('⚠️  danger-full-access模式：使用dangerously-bypass');
      args.push(CLI.FLAGS.DANGEROUSLY_BYPASS);
    } else {
      // read-only模式正常添加sandbox参数
      args.push(CLI.FLAGS.SANDBOX, sandbox);
    }
  }
  
  // Add approval policy (仅在交互式模式下支持，exec模式忽略)
  if (approval && !useExec) {
    args.push(CLI.FLAGS.APPROVAL, approval);
    Logger.info(`添加approval策略: ${approval}`);
  } else if (approval && useExec) {
    Logger.info(`注意: exec模式不支持approval参数，已忽略: ${approval}`);
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
  
  // Add the prompt as the final argument - 修复多行prompt处理
  // 确保多行和复杂prompt作为单个参数传递
  if (prompt && prompt.trim()) {
    args.push(prompt.trim());
  }
  
  // 添加详细的调试信息 - 使用console.log确保输出
  console.log(`🔧 调试信息:`);
  console.log(`- 命令: ${pathInfo.command}`);
  console.log(`- 参数数组: ${JSON.stringify(args)}`);
  console.log(`- 参数总数: ${args.length}`);
  console.log(`- 最后一个参数(prompt): "${args[args.length - 1]}"`);
  console.log(`- 参数字符串: ${args.join(' ')}`);
  
  // 也通过Logger输出（如果可用）
  Logger.info(`🔧 调试信息:`);
  Logger.info(`- 命令: ${pathInfo.command}`);
  Logger.info(`- 参数数组: ${JSON.stringify(args)}`);
  Logger.info(`- 参数总数: ${args.length}`);
  Logger.info(`- 最后一个参数(prompt): "${args[args.length - 1]}"`);
  Logger.info(`- 参数字符串: ${args.join(' ')}`);
  
  Logger.sandboxMode(sandbox || CLI.DEFAULTS.SANDBOX, `${CLI.COMMANDS.CODEX} ${args.join(' ')}`);
  
  try {
    // 🚀 使用智能检测的命令路径执行
    const rawOutput = await executeCommand(pathInfo.command, args, onProgress, timeout);
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
    
    // Handle specific error types - 智能错误处理
    if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
      if (pathInfo.isProjectLocal) {
        throw new Error(`项目内Codex二进制文件未找到。请尝试: npm run build-codex 或联系支持团队`);
      } else {
        throw new Error(ERROR_MESSAGES.CODEX_NOT_FOUND);
      }
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
  
  // 🎯 智能路径检测 - 获取最佳Codex执行路径
  const pathInfo = detectCodexPaths();
  Logger.info(`Apply操作使用执行方案: ${pathInfo.availableMethods.join(', ')}`);
  
  const args: string[] = [...pathInfo.args, 'apply'];
  
  // Note: Codex apply doesn't have dry-run or validate flags in the current version
  // This is a placeholder for potential future functionality
  
  Logger.info(STATUS_MESSAGES.APPLYING_DIFF);
  
  try {
    const result = await executeCommand(pathInfo.command, args, onProgress);
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