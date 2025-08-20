import { spawn } from "child_process";
import { Logger } from "./logger.js";


export async function executeCommand(
  command: string,
  args: string[],
  onProgress?: (newOutput: string) => void,
  timeout?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    Logger.commandExecution(command, args, startTime);

    // 🔧 Windows修复：智能参数处理避免CMD包装导致的参数拆分问题
    let finalCommand = command;
    let finalArgs = args;
    
    if (process.platform === 'win32' && (command.endsWith('.cmd') || command.endsWith('.bat'))) {
      Logger.info(`🐚 Windows批处理文件检测到: ${command}`);
      
      // 🚀 重要修复：Windows下所有.cmd文件都必须使用CMD包装执行
      // 即使是完整路径的.cmd文件也需要通过cmd /c执行，否则会出现spawn EINVAL
      {
        // 🔧 关键修复：对包含空格的参数进行Windows CMD兼容转义
        Logger.info('🔧 应用Windows CMD参数转义修复');
        finalCommand = 'cmd';
        
        // 🔧 优化的智能参数转义：精确处理Windows CMD参数
        const escapedArgs = args.map(arg => {
          // 如果参数已经被正确引用，直接返回
          if (arg.startsWith('"') && arg.endsWith('"') && arg.length > 2) {
            return arg;
          }
          
          // 检查是否需要转义的条件
          const needsEscaping = arg.includes(' ') || 
                               arg.includes('\t') || 
                               arg.includes('\n') || 
                               /[\u4e00-\u9fff]/.test(arg) || // 中文字符
                               /[&|<>^%]/.test(arg) ||         // CMD特殊字符（移除双引号检查避免双重转义）
                               arg.length === 0;               // 空字符串
          
          if (needsEscaping) {
            // 检查是否已经正确引用，避免双重转义
            if (arg.startsWith('"') && arg.endsWith('"') && arg.length > 2) {
              return arg; // 已经正确引用，直接返回
            }
            // 转义内部的双引号，避免嵌套引用问题
            const escaped = arg.replace(/"/g, '\\"');
            return `"${escaped}"`;
          }
          
          return arg;
        });
        
                // 🔧 修复CMD参数拆分问题：避免command的引号包围
        finalArgs = ['/c', command, ...escapedArgs];
        
        Logger.info(`🔧 参数转义结果: ${finalArgs.join(' ')}`);
        Logger.info(`🔧 详细参数分析:`);
        finalArgs.forEach((arg, index) => {
          Logger.info(`  [${index}]: "${arg}" (长度: ${arg.length})`);
        });
      }
    }
    
    // 🔧 增强调试信息
    Logger.info(`📋 最终执行命令: ${finalCommand}`);
    Logger.info(`📋 最终参数数组: ${JSON.stringify(finalArgs)}`);
    Logger.info(`📋 参数总数: ${finalArgs.length}`);
    
    // 🔧 智能spawn配置：根据是否使用CMD包装调整参数
    const spawnOptions: any = {
      env: process.env,
      shell: false, // 始终禁用shell模式，使用精确的参数传递
      stdio: ["pipe", "pipe", "pipe"] as const, // 启用stdin以响应确认请求
      cwd: process.cwd(),
      // 🚀 关键修复：在CMD包装模式下禁用windowsVerbatimArguments
      windowsVerbatimArguments: !(finalCommand === 'cmd' && process.platform === 'win32')
    };
    
    Logger.info(`🔧 Spawn配置: shell=${spawnOptions.shell}, verbatim=${spawnOptions.windowsVerbatimArguments}`);
    
    const childProcess: any = spawn(finalCommand, finalArgs, spawnOptions);

    let stdout = "";
    let stderr = "";
    let isResolved = false;
    let lastReportedLength = 0;
    
    // Set up timeout if specified
    let timeoutHandle: NodeJS.Timeout | undefined;
    if (timeout) {
      timeoutHandle = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          childProcess.kill('SIGTERM');
          Logger.error(`Command timed out after ${timeout}ms`);
          reject(new Error(`Command timed out after ${timeout}ms`));
        }
      }, timeout);
    }

    childProcess.stdout.on("data", (data: any) => {
      const chunk = data.toString();
      stdout += chunk;
      
      // 🔧 修复：解析JSON消息并自动响应确认请求
      const lines = chunk.split('\n').filter((line: string) => line.trim());
      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.msg?.type === 'apply_patch_approval_request') {
            // 自动发送批准响应
            const approval = JSON.stringify({
              type: "patch_approval",
              id: event.id,
              decision: "approved"
            }) + '\n';
            
            if (childProcess.stdin && !childProcess.stdin.destroyed) {
              childProcess.stdin.write(approval);
              Logger.info(`🤖 自动批准补丁申请: ${event.id}`);
            }
          }
        } catch (error) {
          // 忽略非JSON行
        }
      }
      
      // Report new content if callback provided
      if (onProgress && stdout.length > lastReportedLength) {
        const newContent = stdout.substring(lastReportedLength);
        lastReportedLength = stdout.length;
        onProgress(newContent);
      }
    });

    childProcess.stderr.on("data", (data: any) => {
      stderr += data.toString();
      
      // Check for common Codex/OpenAI errors
      if (stderr.includes("UNAUTHENTICATED") || stderr.includes("authentication failed")) {
        Logger.authenticationStatus(false, "API key or login");
      }
      
      if (stderr.includes("RESOURCE_EXHAUSTED") || stderr.includes("rate limit")) {
        Logger.error("Rate limit or quota exceeded");
      }
      
      if (stderr.includes("PERMISSION_DENIED") || stderr.includes("sandbox")) {
        Logger.error("Sandbox permission denied");
      }
    });

    childProcess.on("error", (error: any) => {
      if (!isResolved) {
        isResolved = true;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        Logger.error(`Process error:`, error);
        
        if (error.message.includes("ENOENT")) {
          reject(new Error("Codex CLI not found. Please install with: npm install -g @openai/codex"));
        } else {
          reject(new Error(`Failed to spawn command: ${error.message}`));
        }
      }
    });

    childProcess.on("close", (code: any) => {
      if (!isResolved) {
        isResolved = true;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        
        if (code === 0) {
          Logger.commandComplete(startTime, code, stdout.length);
          resolve(stdout.trim());
        } else {
          Logger.commandComplete(startTime, code ?? undefined);
          Logger.error(`Failed with exit code ${code}`);
          const errorMessage = stderr.trim() || "Unknown error";
          reject(new Error(`Command failed with exit code ${code}: ${errorMessage}`));
        }
      }
    });

    // Handle process termination
    process.on('SIGINT', () => {
      if (!isResolved) {
        childProcess.kill('SIGTERM');
      }
    });

    process.on('SIGTERM', () => {
      if (!isResolved) {
        childProcess.kill('SIGTERM');
      }
    });
  });
}