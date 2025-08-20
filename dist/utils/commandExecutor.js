import { spawn } from "child_process";
import { Logger } from "./logger.js";
/**
 * 🔧 智能检测是否需要使用shell来执行命令
 * Windows上的.cmd, .bat文件需要shell，直接可执行文件不需要
 */
function shouldUseShell(command) {
    // Windows平台检查
    if (process.platform === 'win32') {
        // .cmd, .bat 文件需要shell
        if (command.endsWith('.cmd') || command.endsWith('.bat')) {
            Logger.info(`🐚 Windows批处理文件 ${command} 需要shell=true`);
            return true;
        }
        // 路径包含批处理文件也需要shell
        if (command.includes('.cmd') || command.includes('.bat')) {
            Logger.info(`🐚 Windows批处理路径 ${command} 需要shell=true`);
            return true;
        }
    }
    // 其他情况不需要shell
    Logger.info(`🚫 命令 ${command} 使用shell=false`);
    return false;
}
export async function executeCommand(command, args, onProgress, timeout) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        Logger.commandExecution(command, args, startTime);
        const childProcess = spawn(command, args, {
            env: process.env,
            shell: shouldUseShell(command), // 🔧 修复：智能检测是否需要shell
            stdio: ["ignore", "pipe", "pipe"],
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
            stdout += data.toString();
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