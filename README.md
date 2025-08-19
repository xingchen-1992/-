# Codex CLI MCP Server

An MCP server that allows Claude Code to interact with the OpenAI Codex CLI. If you have a ChatGPT subscription and a claude code subscription, you can use this tool to get the benefits of both, as a $20 ChatGPT subscription gives you access to GPT-5 for free in Codex CLI.

## Features

- **Complete Codex Integration**: Access all Codex CLI capabilities through MCP
- **GPT-5 Model**: Powered by OpenAI's most capable model
- **Sandbox Safety**: Configurable execution modes (read-only, workspace-write, full-access)
- **Progress Tracking**: Real-time updates for long-running operations
- **Git Integration**: Apply Codex-generated diffs directly to repositories
- **Flexible Configuration**: Environment variables and config file support

## Installation

1. **Install Codex CLI** (required):
   ```bash
   npm install -g @openai/codex
   ```

2. **Add to Claude Code using npx**:
   ```bash
   claude mcp add codex-cli-mcp-tool -- npx -y codex-cli-mcp-tool
   ```
   
   Or install globally first:
   ```bash
   npm install -g codex-cli-mcp-tool
   ```

3. **Configure Authentication**:
   ```bash
   # Option 1: Use API key
   export OPENAI_API_KEY=your-api-key

   # Option 2: Login with ChatGPT account
   codex login
   ```

## Available Tools

### ask-codex
Execute Codex with comprehensive parameter support for code analysis, generation, and assistance.

**Parameters:**
- `prompt` (required): Your query or instruction
- `model` (optional): gpt-5 (default and only supported model)
- `sandbox` (optional): read-only, workspace-write, danger-full-access
- `approval` (optional): untrusted, on-failure, on-request, never
- `image` (optional): Image file path(s) to include
- `config` (optional): Configuration overrides
- `timeout` (optional): Maximum execution time

**Example:**
```
ask-codex "Explain this code: @main.py" sandbox="read-only"
```

### exec-codex
Non-interactive Codex execution for automation workflows.

**Parameters:**
- `prompt` (required): Command or instruction
- `model` (optional): Always gpt-5
- `sandbox` (optional): Sandbox mode
- `timeout` (optional): Execution timeout

### apply-diff
Apply the latest Codex-generated diff to your git repository.

**Parameters:**
- `dryRun` (optional): Preview changes without applying
- `validate` (optional): Validate before applying

### Utility Tools
- `ping`: Test MCP connection
- `help`: Show detailed help information
- `version`: Display version information

## Configuration

### Environment Variables
```bash
OPENAI_API_KEY=sk-...           # OpenAI API key
CODEX_MODEL=gpt-5               # Default model
CODEX_SANDBOX_MODE=read-only    # Default sandbox mode
```

### Config File (~/.codex/config.toml)
```toml
[model]
provider = "openai"
default = "gpt-5"
reasoning_effort = "medium"

[sandbox]
default_mode = "read-only"
permissions = ["disk-read-access"]

[approval]
policy = "untrusted"
trusted_commands = ["ls", "cat", "grep"]
```

## Sandbox Modes

- **read-only**: Safe exploration, no file modifications
- **workspace-write**: Limited modifications within project
- **danger-full-access**: Full system access (requires confirmation)

## Examples

### Code Analysis
```
ask-codex "Review this function for security issues: @auth.py"
```

### Code Generation
```
ask-codex "Generate unit tests for the User class" sandbox="workspace-write"
```

### Debugging
```
ask-codex "Fix the bug in login function" approval="on-request"
```

### File Operations
```
ask-codex "Create a new React component for user profile" sandbox="workspace-write"
```

### Apply Changes
```
ask-codex "Refactor this code to use async/await"
apply-diff validate=true
```

## Troubleshooting

### Common Issues

1. **Codex CLI not found**:
   ```bash
   npm install -g @openai/codex
   ```

2. **Authentication failed**:
   ```bash
   # Set API key
   export OPENAI_API_KEY=your-key
   
   # Or login
   codex login
   ```

3. **Permission denied**:
   - Use appropriate sandbox mode
   - Check approval policy settings
   - Verify file permissions

4. **Rate limits**:
   - Wait before retrying
   - Check OpenAI account quota

### Debug Mode
Enable debug logging:
```bash
DEBUG=true codex-cli-mcp-tool
```

## Development

### Setup
```bash
git clone <repository>
cd codex-cli-tool
npm install
npm run build
npm run dev
```

### Testing
```bash
npm test
npm run lint
```

## Acknowledgments

This project is based on the excellent [Gemini MCP Tool](https://github.com/jamubc/gemini-mcp-tool) by jamubc. We adapted their architecture and patterns to create this Codex CLI integration.

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

- GitHub Issues: [Report bugs and feature requests](https://github.com/Mr-Tomahawk/codex-cli-mcp-tool/issues)
- OpenAI Codex: https://github.com/openai/codex
