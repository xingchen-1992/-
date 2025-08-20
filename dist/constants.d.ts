export declare const LOG_PREFIX = "[CODEX-MCP]";
export declare const ERROR_MESSAGES: {
    readonly QUOTA_EXCEEDED: "Rate limit exceeded";
    readonly AUTHENTICATION_FAILED: "Codex CLI认证失败，请运行：codex login 重新登录您的订阅账户";
    readonly CODEX_NOT_FOUND: "请确保已登录Codex CLI订阅账户：codex login";
    readonly TOOL_NOT_FOUND: "not found in registry";
    readonly NO_PROMPT_PROVIDED: "Please provide a prompt for analysis. Use @ syntax to include files (e.g., '@largefile.js explain what this does') or ask general questions";
    readonly SANDBOX_VIOLATION: "牛马仅支持read-only安全模式";
    readonly UNSAFE_COMMAND: "Command requires approval or elevated permissions";
};
export declare const STATUS_MESSAGES: {
    readonly CODEX_RESPONSE: "Codex response:";
    readonly AUTHENTICATION_SUCCESS: "✅ Authentication successful";
    readonly SANDBOX_EXECUTING: "🔒 Executing Codex command in sandbox mode...";
    readonly APPLYING_DIFF: "📝 Applying diff to git repository...";
    readonly PROCESSING_START: "🔍 Starting analysis (may take time for complex requests)";
    readonly PROCESSING_CONTINUE: "⏳ Still processing... Codex is working on your request";
    readonly PROCESSING_COMPLETE: "✅ Analysis completed successfully";
    readonly STARTING_CODEX: "🚀 Starting Codex analysis...";
};
export declare const MODELS: {
    readonly GPT5: "gpt-5";
};
export declare const SANDBOX_MODES: {
    readonly READ_ONLY: "read-only";
};
export declare const APPROVAL_POLICIES: {
    readonly UNTRUSTED: "untrusted";
    readonly ON_FAILURE: "on-failure";
    readonly ON_REQUEST: "on-request";
    readonly NEVER: "never";
};
export declare const PROTOCOL: {
    readonly ROLES: {
        readonly USER: "user";
        readonly ASSISTANT: "assistant";
    };
    readonly CONTENT_TYPES: {
        readonly TEXT: "text";
    };
    readonly STATUS: {
        readonly SUCCESS: "success";
        readonly ERROR: "error";
        readonly FAILED: "failed";
        readonly REPORT: "report";
    };
    readonly NOTIFICATIONS: {
        readonly PROGRESS: "notifications/progress";
    };
    readonly KEEPALIVE_INTERVAL: 10000;
};
export declare const CLI: {
    readonly COMMANDS: {
        readonly CODEX: "codex";
        readonly CODEX_EXEC: "codex exec";
        readonly CODEX_APPLY: "codex apply";
    };
    readonly FLAGS: {
        readonly MODEL: "-m";
        readonly CONFIG: "-c";
        readonly SANDBOX: "-s";
        readonly APPROVAL: "-a";
        readonly IMAGE: "-i";
        readonly PROFILE: "-p";
        readonly OSS: "--oss";
        readonly HELP: "--help";
        readonly VERSION: "--version";
        readonly WORKING_DIR: "-C";
        readonly FULL_AUTO: "--full-auto";
        readonly DANGEROUSLY_BYPASS: "--dangerously-bypass-approvals-and-sandbox";
    };
    readonly DEFAULTS: {
        readonly MODEL: "gpt-5";
        readonly SANDBOX: "read-only";
        readonly APPROVAL: "untrusted";
        readonly BOOLEAN_TRUE: "true";
        readonly BOOLEAN_FALSE: "false";
    };
};
export interface ToolArguments {
    prompt?: string;
    model?: string;
    sandbox?: string | boolean;
    approval?: string;
    image?: string | string[];
    config?: string | Record<string, any>;
    timeout?: number;
    workingDir?: string;
    profile?: string;
    dryRun?: boolean;
    validate?: boolean;
    autoConfirm?: boolean;
    message?: string;
    action?: string;
    key?: string;
    value?: string;
    [key: string]: string | boolean | number | string[] | Record<string, any> | undefined;
}
export interface CodexOutput {
    metadata: {
        version: string;
        workdir: string;
        model: string;
        provider: string;
        approval: string;
        sandbox: string;
        reasoning_effort?: string;
        reasoning_summaries?: string;
    };
    userInstructions: string;
    thinking?: string;
    response: string;
    tokensUsed?: number;
    timestamps: string[];
    rawOutput: string;
}
export interface CodexConfig {
    model?: {
        provider?: string;
        default?: string;
        reasoning_effort?: string;
    };
    sandbox?: {
        default_mode?: string;
        permissions?: string[];
    };
    approval?: {
        policy?: string;
        trusted_commands?: string[];
    };
    shell_environment?: {
        policy?: string;
    };
}
//# sourceMappingURL=constants.d.ts.map