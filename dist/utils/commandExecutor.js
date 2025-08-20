import { spawn } from "child_process";
import { Logger } from "./logger.js";
export async function executeCommand(command, args, onProgress, timeout) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        Logger.commandExecution(command, args, startTime);
        // 🔧 Windows修复：对于.cmd文件使用cmd包装避免参数解析问题
        let finalCommand = command;
        let finalArgs = args;
        if (process.platform === 'win32' && (command.endsWith('.cmd') || command.endsWith('.bat'))) {
            Logger.info(`🐚 Windows批处理文件使用cmd包装: ${command}`);
            finalCommand = 'cmd';
            finalArgs = ['/c', command, ...args];
        }
        const childProcess = spawn(finalCommand, finalArgs, {
            env: process.env,
            shell: false, // 🔧 修复：使用cmd包装，不需要shell=true
            stdio: ["pipe", "pipe", "pipe"], // 🔧 修复：启用stdin以响应确认请求
            cwd: process.cwd(), // 确保工作目录正确
        });
        let stdout = "";
        let stderr = "";
        let isResolved = false;
        let lastReportedLength = 0;
        // Set up timeout if specified
        let timeoutHandle;
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
        childProcess.stdout.on("data", (data) => {
            const chunk = data.toString();
            stdout += chunk;
            // 🔧 修复：解析JSON消息并自动响应确认请求
            const lines = chunk.split('\n').filter((line) => line.trim());
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
                }
                catch (error) {
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
        childProcess.stderr.on("data", (data) => {
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
        childProcess.on("error", (error) => {
            if (!isResolved) {
                isResolved = true;
                if (timeoutHandle)
                    clearTimeout(timeoutHandle);
                Logger.error(`Process error:`, error);
                if (error.message.includes("ENOENT")) {
                    reject(new Error("Codex CLI not found. Please install with: npm install -g @openai/codex"));
                }
                else {
                    reject(new Error(`Failed to spawn command: ${error.message}`));
                }
            }
        });
        childProcess.on("close", (code) => {
            if (!isResolved) {
                isResolved = true;
                if (timeoutHandle)
                    clearTimeout(timeoutHandle);
                if (code === 0) {
                    Logger.commandComplete(startTime, code, stdout.length);
                    resolve(stdout.trim());
                }
                else {
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
//# sourceMappingURL=commandExecutor.js.map