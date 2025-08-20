// Logging
export const LOG_PREFIX = "[CODEX-MCP]";
// Error messages
export const ERROR_MESSAGES = {
    QUOTA_EXCEEDED: "Rate limit exceeded",
    AUTHENTICATION_FAILED: "Codex CLI认证失败，请运行：codex login 重新登录您的订阅账户",
    CODEX_NOT_FOUND: "请确保已登录Codex CLI订阅账户：codex login",
    TOOL_NOT_FOUND: "not found in registry",
    NO_PROMPT_PROVIDED: "Please provide a prompt for analysis. Use @ syntax to include files (e.g., '@largefile.js explain what this does') or ask general questions",
    SANDBOX_VIOLATION: "牛马仅支持read-only安全模式",
    UNSAFE_COMMAND: "Command requires approval or elevated permissions",
};
// Status messages
export const STATUS_MESSAGES = {
    CODEX_RESPONSE: "Codex response:",
    AUTHENTICATION_SUCCESS: "✅ Authentication successful",
    SANDBOX_EXECUTING: "🔒 Executing Codex command in sandbox mode...",
    APPLYING_DIFF: "📝 Applying diff to git repository...",
    PROCESSING_START: "🔍 Starting analysis (may take time for complex requests)",
    PROCESSING_CONTINUE: "⏳ Still processing... Codex is working on your request",
    PROCESSING_COMPLETE: "✅ Analysis completed successfully",
    STARTING_CODEX: "🚀 Starting Codex analysis...",
};
// Models
export const MODELS = {
    GPT5: "gpt-5",
};
// Sandbox modes
// 🔒 安全限制：仅允许只读模式
export const SANDBOX_MODES = {
    READ_ONLY: "read-only"
};
// Approval policies
export const APPROVAL_POLICIES = {
    UNTRUSTED: "untrusted",
    ON_FAILURE: "on-failure",
    ON_REQUEST: "on-request",
    NEVER: "never",
};
// MCP Protocol Constants
export const PROTOCOL = {
    // Message roles
    ROLES: {
        USER: "user",
        ASSISTANT: "assistant",
    },
    // Content types
    CONTENT_TYPES: {
        TEXT: "text",
    },
    // Status codes
    STATUS: {
        SUCCESS: "success",
        ERROR: "error",
        FAILED: "failed",
        REPORT: "report",
    },
    // Notification methods
    NOTIFICATIONS: {
        PROGRESS: "notifications/progress",
    },
    // Timeout prevention - 更频繁的keep-alive以防止MCP客户端超时
    KEEPALIVE_INTERVAL: 10000, // 10 seconds
};
// CLI Constants
export const CLI = {
    // Command names
    COMMANDS: {
        CODEX: "codex",
        CODEX_EXEC: "codex exec",
        CODEX_APPLY: "codex apply",
    },
    // Command flags
    FLAGS: {
        MODEL: "-m",
        CONFIG: "-c",
        SANDBOX: "-s", // 修复：使用正确的短参数
        APPROVAL: "-a", // 注意：exec命令不支持此参数，需要在代码中处理
        IMAGE: "-i",
        PROFILE: "-p",
        OSS: "--oss",
        HELP: "--help",
        VERSION: "--version",
        WORKING_DIR: "-C",
        FULL_AUTO: "--full-auto",
        DANGEROUSLY_BYPASS: "--dangerously-bypass-approvals-and-sandbox",
    },
    // Default values
    DEFAULTS: {
        MODEL: "gpt-5",
        SANDBOX: "read-only",
        APPROVAL: "untrusted",
        BOOLEAN_TRUE: "true",
        BOOLEAN_FALSE: "false",
    },
};
//# sourceMappingURL=constants.js.map