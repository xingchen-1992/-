import { CodexOutput } from '../constants.js';
export declare function executeCodex(prompt: string, options?: {
    model?: string;
    sandbox?: string;
    approval?: string;
    image?: string | string[];
    config?: string | Record<string, any>;
    timeout?: number;
    workingDir?: string;
    profile?: string;
    useExec?: boolean;
}, onProgress?: (newOutput: string) => void): Promise<CodexOutput>;
export declare function executeCodexApply(options?: {
    dryRun?: boolean;
    validate?: boolean;
}, onProgress?: (newOutput: string) => void): Promise<string>;
export declare function formatCodexResponseForMCP(output: CodexOutput, includeThinking?: boolean, includeMetadata?: boolean): string;
export declare function validateSandboxMode(sandbox: string): boolean;
export declare function validateApprovalPolicy(approval: string): boolean;
export declare function validateModel(model: string): boolean;
export declare function getModelFallbacks(_model: string): string[];
export declare function getSandboxFallbacks(sandbox: string): string[];
//# sourceMappingURL=codexExecutor.d.ts.map