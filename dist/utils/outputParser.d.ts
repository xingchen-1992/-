import { CodexOutput } from '../constants.js';
export declare function parseCodexOutput(rawOutput: string): CodexOutput;
export declare function formatCodexResponse(output: CodexOutput, includeThinking?: boolean): string;
export declare function extractCodeBlocks(text: string): string[];
export declare function extractDiffBlocks(text: string): string[];
export declare function isErrorResponse(output: CodexOutput): boolean;
//# sourceMappingURL=outputParser.d.ts.map