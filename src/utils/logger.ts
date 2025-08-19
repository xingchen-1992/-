import chalk from 'chalk';
import { LOG_PREFIX } from '../constants.js';

export class Logger {
  private static isDebugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

  static debug(message: string, ...args: any[]): void {
    if (this.isDebugMode) {
      console.error(chalk.gray(`${LOG_PREFIX} [DEBUG]`), message, ...args);
    }
  }

  static info(message: string, ...args: any[]): void {
    console.error(chalk.blue(`${LOG_PREFIX} [INFO]`), message, ...args);
  }

  static warn(message: string, ...args: any[]): void {
    console.error(chalk.yellow(`${LOG_PREFIX} [WARN]`), message, ...args);
  }

  static error(message: string, ...args: any[]): void {
    console.error(chalk.red(`${LOG_PREFIX} [ERROR]`), message, ...args);
  }

  static success(message: string, ...args: any[]): void {
    console.error(chalk.green(`${LOG_PREFIX} [SUCCESS]`), message, ...args);
  }

  static toolInvocation(toolName: string, args: any): void {
    this.debug(`Tool invoked: ${chalk.cyan(toolName)} with args:`, args);
  }

  static commandExecution(command: string, args: string[], startTime: number): void {
    this.debug(`Executing command: ${chalk.magenta(command)} ${args.join(' ')} at ${new Date(startTime).toISOString()}`);
  }

  static commandComplete(startTime: number, exitCode?: number, outputLength?: number): void {
    const duration = Date.now() - startTime;
    const status = exitCode === 0 ? chalk.green('SUCCESS') : chalk.red(`FAILED (${exitCode})`);
    const output = outputLength ? ` - ${outputLength} chars output` : '';
    this.debug(`Command completed: ${status} in ${duration}ms${output}`);
  }

  static codexResponse(response: string, tokensUsed?: number): void {
    const tokens = tokensUsed ? ` (${tokensUsed} tokens)` : '';
    this.debug(`Codex response received${tokens}: ${response.slice(0, 100)}...`);
  }

  static sandboxMode(mode: string, command: string): void {
    this.info(`Sandbox mode: ${chalk.yellow(mode)} - executing: ${chalk.cyan(command)}`);
  }

  static authenticationStatus(success: boolean, method?: string): void {
    if (success) {
      this.success(`Authentication successful${method ? ` (${method})` : ''}`);
    } else {
      this.error(`Authentication failed${method ? ` (${method})` : ''}`);
    }
  }

  static configLoad(source: string, success: boolean): void {
    if (success) {
      this.debug(`Configuration loaded from: ${chalk.cyan(source)}`);
    } else {
      this.warn(`Failed to load configuration from: ${chalk.cyan(source)}`);
    }
  }

  static mcpEvent(event: string, details?: any): void {
    this.debug(`MCP Event: ${chalk.magenta(event)}`, details);
  }
}