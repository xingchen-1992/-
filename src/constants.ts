// Logging
export const LOG_PREFIX = "[CODEX-MCP]";

// Error messages
export const ERROR_MESSAGES = {
  QUOTA_EXCEEDED: "Rate limit exceeded",
  AUTHENTICATION_FAILED: "Authentication failed - please check your OpenAI API key or login status",
  CODEX_NOT_FOUND: "Codex CLI not found - please install with 'npm install -g @openai/codex'",
  TOOL_NOT_FOUND: "not found in registry",
  NO_PROMPT_PROVIDED: "Please provide a prompt for analysis. Use @ syntax to include files (e.g., '@largefile.js explain what this does') or ask general questions",
  SANDBOX_VIOLATION: "Operation blocked by sandbox policy",
  UNSAFE_COMMAND: "Command requires approval or elevated permissions",
} as const;

// Status messages
export const STATUS_MESSAGES = {
  CODEX_RESPONSE: "Codex response:",
  AUTHENTICATION_SUCCESS: "✅ Authentication successful",
  SANDBOX_EXECUTING: "🔒 Executing Codex command in sandbox mode...",
  APPLYING_DIFF: "📝 Applying diff to git repository...",
  PROCESSING_START: "🔍 Starting analysis (may take time for complex requests)",
  PROCESSING_CONTINUE: "⏳ Still processing... Codex is working on your request",
  PROCESSING_COMPLETE: "✅ Analysis completed successfully",
} as const;

// Models
export const MODELS = {
  GPT5: "gpt-5",
} as const;

// Sandbox modes
export const SANDBOX_MODES = {
  READ_ONLY: "read-only",
  WORKSPACE_WRITE: "workspace-write",
  DANGER_FULL_ACCESS: "danger-full-access",
} as const;

// Approval policies
export const APPROVAL_POLICIES = {
  UNTRUSTED: "untrusted",
  ON_FAILURE: "on-failure",
  ON_REQUEST: "on-request",
  NEVER: "never",
} as const;

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
  // Timeout prevention
  KEEPALIVE_INTERVAL: 25000, // 25 seconds
} as const;

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
    SANDBOX: "-s",  // 修复：使用正确的短参数
    APPROVAL: "-a",  // 注意：exec命令不支持此参数，需要在代码中处理
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
} as const;

// Tool Arguments Interface
export interface ToolArguments {
  // Core parameters
  prompt?: string;
  model?: string;
  sandbox?: string | boolean;
  approval?: string;
  image?: string | string[];
  config?: string | Record<string, any>;
  
  // Execution options
  timeout?: number;
  workingDir?: string;
  profile?: string;
  
  // Safety options
  dryRun?: boolean;
  validate?: boolean;
  autoConfirm?: boolean;
  
  // Utility options
  message?: string; // For ping tool
  action?: string; // For config tool
  key?: string; // For config tool
  value?: string; // For config tool
  
  [key: string]: string | boolean | number | string[] | Record<string, any> | undefined;
}

// Codex Output Interface
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

// Configuration Interface
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