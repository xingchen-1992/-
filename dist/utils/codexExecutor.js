import { executeCommand } from './commandExecutor.js';
import { parseCodexOutput } from './outputParser.js';
import { Logger } from './logger.js';
import { CLI, MODELS, SANDBOX_MODES, APPROVAL_POLICIES, ERROR_MESSAGES, STATUS_MESSAGES } from '../constants.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
/**
 * 智能检测项目内Codex和全局Codex的可用性
 * 优先使用用户已付费的全局CLI（200美元订阅）
 */
function detectCodexPaths() {
    console.log('🔍 detectCodexPaths 函数开始执行');
    Logger.info(`🔍 智能检测Codex CLI路径 (Windows环境优化v2)`);
    const availableMethods = [];
    // 🎯 方案1: 优先使用用户本地编译的codex.exe (最重要)
    Logger.info(`📡 检测用户本地编译的Codex CLI...`);
    // 用户的本地编译版本路径 - 基于无审批方案
    // 支持多个可能的本地编译路径
    const possiblePaths = [
        'H:/A_test/_tmp/codex-src/codex-rs/target/release/codex.exe', // 实际发现的路径
        'H:/A_test/_tmp/codex-bin/codex.exe', // bin目录路径
        'H:/A_test/codex/codex-rs/target/release/codex.exe' // 预期路径
    ];
    let userCompiledPath = null;
    for (const path of possiblePaths) {
        if (fs.existsSync(path)) {
            userCompiledPath = path;
            Logger.info(`✅ 找到用户编译版本: ${path}`);
            break;
        }
    }
    console.log(`检查用户编译路径: ${userCompiledPath}`);
    if (userCompiledPath && fs.existsSync(userCompiledPath)) {
        console.log(`开始验证用户编译版本...`);
        try {
            // 验证用户编译版本的可用性
            const result = execSync(`"${userCompiledPath}" --version`, {
                encoding: 'utf8',
                timeout: 5000,
                stdio: 'pipe'
            });
            if (result && result.includes('codex-cli')) {
                const version = result.trim();
                Logger.info(`✅ 用户本地编译版本验证成功: ${version} (路径: ${userCompiledPath})`);
                availableMethods.push(`用户本地编译版 (${userCompiledPath})`);
                return {
                    command: userCompiledPath,
                    args: [],
                    isProjectLocal: false,
                    availableMethods
                };
            }
        }
        catch (error) {
            console.error(`用户编译版本 ${userCompiledPath} 验证失败:`, error);
            Logger.info(`用户编译版本 ${userCompiledPath} 验证失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    else {
        Logger.info(`用户编译版本未找到，检查的路径: ${possiblePaths.join(', ')}`);
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
    // 所有方案都失败，返回错误提示
    throw new Error('❌ 无法找到任何可用的Codex CLI！请确认用户本地编译版本可用：H:\A_test\codex\codex-rs\target\release\codex.exe');
}
export async function executeCodex(prompt, options = {}, onProgress) {
    const { model, sandbox, approval, image, config, timeout, workingDir, profile, useExec = true } = options;
    // 🎯 智能路径检测 - 获取最佳Codex执行路径
    const pathInfo = detectCodexPaths();
    Logger.info(`使用执行方案: ${pathInfo.availableMethods.join(', ')}`);
    // Build command arguments - 根据路径信息构造参数
    const args = [...pathInfo.args];
    // Add exec subcommand for non-interactive mode
    if (useExec) {
        args.push('exec');
        // 🔧 修复：exec模式必须添加--json标志确保结构化输出
        args.push('--json');
    }
    // Add model selection - 只在明确指定时添加
    if (model && model.trim()) {
        // 使用用户指定的模型，而不是硬编码gpt-5
        args.push(CLI.FLAGS.MODEL, model.trim());
    }
    // 🔒 安全沙箱：仅支持read-only模式
    if (sandbox) {
        if (sandbox !== 'read-only') {
            throw new Error(ERROR_MESSAGES.SANDBOX_VIOLATION);
        }
        args.push(CLI.FLAGS.SANDBOX, 'read-only');
    }
    // Add approval policy (仅在交互式模式下支持，exec模式忽略)
    if (approval && !useExec) {
        args.push(CLI.FLAGS.APPROVAL, approval);
        Logger.info(`添加approval策略: ${approval}`);
    }
    else if (approval && useExec) {
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
        }
        else {
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
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Handle specific error types - 智能错误处理
        if (errorMessage.includes('ENOENT') || errorMessage.includes('not found')) {
            if (pathInfo.isProjectLocal) {
                throw new Error(`项目内Codex二进制文件未找到。请尝试: npm run build-codex 或联系支持团队`);
            }
            else {
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
export async function executeCodexApply(options = {}, onProgress) {
    const { dryRun, validate } = options;
    // 🎯 智能路径检测 - 获取最佳Codex执行路径
    const pathInfo = detectCodexPaths();
    Logger.info(`Apply操作使用执行方案: ${pathInfo.availableMethods.join(', ')}`);
    const args = [...pathInfo.args, 'apply'];
    // Note: Codex apply doesn't have dry-run or validate flags in the current version
    // This is a placeholder for potential future functionality
    Logger.info(STATUS_MESSAGES.APPLYING_DIFF);
    try {
        const result = await executeCommand(pathInfo.command, args, onProgress);
        Logger.success('Git diff applied successfully');
        return result;
    }
    catch (error) {
        Logger.error('Failed to apply diff:', error);
        throw error;
    }
}
export function formatCodexResponseForMCP(output, includeThinking = true, includeMetadata = true) {
    let response = '';
    if (includeMetadata && Object.keys(output.metadata).length > 0) {
        response += '**Configuration:**\n';
        if (output.metadata.model)
            response += `- Model: ${output.metadata.model}\n`;
        if (output.metadata.sandbox)
            response += `- Sandbox: ${output.metadata.sandbox}\n`;
        if (output.metadata.approval)
            response += `- Approval: ${output.metadata.approval}\n`;
        if (output.metadata.workdir)
            response += `- Working Directory: ${output.metadata.workdir}\n`;
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
export function validateSandboxMode(sandbox) {
    return Object.values(SANDBOX_MODES).includes(sandbox);
}
export function validateApprovalPolicy(approval) {
    return Object.values(APPROVAL_POLICIES).includes(approval);
}
export function validateModel(model) {
    return Object.values(MODELS).includes(model) || model.startsWith('gpt-') || model.startsWith('o');
}
export function getModelFallbacks(_model) {
    // Only GPT-5 is supported now
    return [MODELS.GPT5];
}
export function getSandboxFallbacks(sandbox) {
    // 🔒 安全限制：仅支持只读模式
    return [SANDBOX_MODES.READ_ONLY]; // 始终返回只读模式
}
//# sourceMappingURL=codexExecutor.js.map