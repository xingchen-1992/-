export declare class Logger {
    private static isDebugMode;
    static debug(message: string, ...args: any[]): void;
    static info(message: string, ...args: any[]): void;
    static warn(message: string, ...args: any[]): void;
    static error(message: string, ...args: any[]): void;
    static success(message: string, ...args: any[]): void;
    static toolInvocation(toolName: string, args: any): void;
    static commandExecution(command: string, args: string[], startTime: number): void;
    static commandComplete(startTime: number, exitCode?: number, outputLength?: number): void;
    static codexResponse(response: string, tokensUsed?: number): void;
    static sandboxMode(mode: string, command: string): void;
    static authenticationStatus(success: boolean, method?: string): void;
    static configLoad(source: string, success: boolean): void;
    static mcpEvent(event: string, details?: any): void;
}
//# sourceMappingURL=logger.d.ts.map