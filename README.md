# 🐂 牛马代码分析器

🔒 专注于安全代码分析的MCP工具。基于OpenAI Codex CLI深度定制，仅保留只读分析功能，移除所有文件修改能力。让你安全地使用GPT-5进行代码审查和架构分析。

## 🛡️ 安全特性

- **🔒 纯代码分析** - 专注代码理解和架构分析，绝无文件修改风险
- **🔐 强制只读模式** - 锁定read-only沙箱，确保100%安全
- **⏱️ 20分钟超时** - 支持大型项目的深度代码分析
- **🎯 GPT-5驱动** - 基于最强大的AI模型进行代码分析
- **💡 智能解析** - 自动理解项目结构、组件关系和架构设计
- **💎 订阅专用** - 专为Codex CLI订阅用户（$200 ChatGPT Plus）定制

## 安装配置

### ⚠️ 重要前提：需要Codex CLI订阅
本工具专为**已付费订阅用户**设计，需要以下条件：
- ✅ ChatGPT Plus订阅（$20/月）+ Codex CLI订阅（$200/月）
- ✅ 已安装Codex CLI：`npm install -g @openai/codex`
- ✅ 已登录订阅账户：`codex login`

### 安装步骤

1. **验证订阅状态**:
   ```bash
   # 确认已登录订阅账户
   codex login
   
   # 测试订阅状态
   codex --help
   ```

2. **添加到Claude Code**:
   ```bash
   # 方法1：使用npx (推荐)
   claude mcp add 牛马 -- npx -y 牛马
   
   # 方法2：全局安装后添加
   npm install -g 牛马
   claude mcp add 牛马 -- 牛马
   ```

## 可用工具 (仅安全分析功能)

### ask-codex (主要功能)
**安全的代码分析工具** - 使用GPT-5深度理解和分析代码，纯只读模式确保零风险。

**参数说明:**
- `prompt` (必需): 分析指令或问题
- `model` (可选): gpt-5 (默认且唯一支持的模型)
- `sandbox` (固定): read-only (强制只读，无法修改)
- `timeout` (可选): 超时时间 (默认20分钟)
- `image` (可选): 包含图片文件路径
- `config` (可选): 配置参数覆盖

**使用示例:**
```bash
# 分析单个文件
ask-codex "分析这个文件的功能: @main.py"

# 项目架构分析
ask-codex "分析整个项目的架构设计和依赖关系"

# 代码质量检查
ask-codex "检查这个函数是否有安全漏洞: @auth.js"

# 性能优化建议
ask-codx "建议如何优化这段代码的性能: @algorithm.py"
```

### 实用工具
- `ping`: 测试MCP连接状态
- `help`: 显示详细帮助信息
- `version`: 显示版本信息

**✅ 安全保证**: 物理删除所有危险代码，仅保留安全的只读分析功能。

## 配置说明

### 环境变量
```bash
OPENAI_API_KEY=sk-...           # OpenAI API密钥
CODEX_MODEL=gpt-5               # 默认模型 (固定)
CODEX_SANDBOX_MODE=read-only    # 沙箱模式 (固定只读)
```

### 配置文件 (~/.codex/config.toml)
```toml
[model]
provider = "openai"
default = "gpt-5"
reasoning_effort = "medium"

[sandbox]
default_mode = "read-only"      # 强制只读模式
permissions = ["disk-read-access"]

[security]
# 牛马代码分析器安全配置
allow_file_write = false        # 禁用文件写入
allow_command_exec = false      # 禁用命令执行
analysis_only = true            # 仅分析模式
```

## 安全模式说明

- **🔒 read-only**: 唯一支持的安全模式，可安全浏览和分析代码，无任何修改风险
- **❌ workspace-write**: 已禁用 - 防止意外文件修改
- **❌ danger-full-access**: 已禁用 - 防止系统访问风险

## 使用示例

### 代码安全审查
```bash
ask-codex "检查这个认证函数是否有安全漏洞: @auth.py"
```

### 架构分析
```bash
ask-codex "分析这个项目的整体架构和模块依赖关系"
```

### 性能分析
```bash
ask-codex "分析这个算法的时间复杂度: @sort_algorithm.js"
```

### 代码理解
```bash
ask-codex "解释这个复杂函数的工作原理: @complex_function.py"
```

### 重构建议
```bash
ask-codex "这段代码如何重构能提高可读性: @legacy_code.java"
```

## 故障排除

### 常见问题

1. **找不到Codex CLI**:
   ```bash
   npm install -g @openai/codex
   ```

2. **身份验证失败**:
   ```bash
   # 设置API密钥
   export OPENAI_API_KEY=your-key
   
   # 或使用账户登录
   codex login
   ```

3. **权限被拒绝**:
   - 牛马代码分析器已锁定为只读模式，无权限问题
   - 如果仍有问题，检查文件读取权限

4. **速率限制**:
   - 等待后重试
   - 检查OpenAI账户配额 (需要ChatGPT Plus订阅)

### 调试模式
启用详细日志：
```bash
DEBUG=true 牛马
```

## 开发信息

### 项目设置
```bash
git clone https://github.com/重生2025/牛马.git
cd 牛马
npm install
npm run build
npm run dev
```

### 测试
```bash
npm test
npm run lint
```

## 致谢

本项目基于[Gemini MCP Tool](https://github.com/jamubc/gemini-mcp-tool)优秀架构改造。感谢原作者jamubc的贡献，我们采用了其架构模式并专门针对Codex CLI进行了安全化改造。

## 许可证

MIT许可证 - 详见LICENSE文件。

## 贡献代码

1. Fork本仓库
2. 创建功能分支
3. 进行修改
4. 添加测试
5. 提交Pull Request

## 支持

- GitHub Issues: [报告bug和功能请求](https://github.com/重生2025/牛马/issues)
- OpenAI Codex: https://github.com/openai/codex
- 作者: 重生2025
