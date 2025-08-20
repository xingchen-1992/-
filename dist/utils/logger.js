import chalk from 'chalk';
import { LOG_PREFIX } from '../constants.js';
export class Logger {
    static isDebugMode = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';
    static debug(message, ...args) {
        if (this.isDebugMode) {
            console.error(chalk.gray(`${LOG_PREFIX} [DEBUG]`), message, ...args);
        }
    }
    static info(message, ...args) {
        console.error(chalk.blue(`${LOG_PREFIX} [INFO]`), message, ...args);
    }
    static warn(message, ...args) {
        console.error(chalk.yellow(`${LOG_PREFIX} [WARN]`), message, ...args);
    }
    static error(message, ...args) {
        console.error(chalk.red(`${LOG_PREFIX} [ERROR]`), message, ...args);
    }
    static success(message, ...args) {
        console.error(chalk.green(`${LOG_PREFIX} [SUCCESS]`), message, ...args);
    }
    static toolInvocation(toolName, args) {
        this.debug(`Tool invoked: ${chalk.cyan(toolName)} with args:`, args);
    }
    static commandExecution(command, args, startTime) {
        this.debug(`Executing command: ${chalk.magenta(command)} ${args.join(' ')} at ${new Date(startTime).toISOString()}`);
    }
    static commandComplete(startTime, exitCode, outputLength) {
        const duration = Date.now() - startTime;
        const status = exitCode === 0 ? chalk.green('SUCCESS') : chalk.red(`FAILED (${exitCode})`);
        const output = outputLength ? ` - ${outputLength} chars output` : '';
        this.debug(`Command completed: ${status} in ${duration}ms${output}`);
    }
    static codexResponse(response, tokensUsed) {
        const tokens = tokensUsed ? ` (${tokensUsed} tokens)` : '';
        this.debug(`Codex response received${tokens}: ${response.slice(0, 100)}...`);
    }
    static sandboxMode(mode, command) {
        this.info(`Sandbox mode: ${chalk.yellow(mode)} - executing: ${chalk.cyan(command)}`);
    }
    static authenticationStatus(success, method) {
        if (success) {
            this.success(`Authentication successful${method ? ` (${method})` : ''}`);
        }
        else {
            this.error(`Authentication failed${method ? ` (${method})` : ''}`);
        }
    }
    static configLoad(source, success) {
        if (success) {
            this.debug(`Configuration loaded from: ${chalk.cyan(source)}`);
        }
        else {
            this.warn(`Failed to load configuration from: ${chalk.cyan(source)}`);
        }
    }
    static mcpEvent(event, details) {
        this.debug(`MCP Event: ${chalk.magenta(event)}`, details);
    }
}
//# sourceMappingURL=logger.js.map