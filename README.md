# 🐂 牛马代码分析器

🔒 专注于安全代码分析的MCP工具。基于OpenAI Codex CLI深度定制，仅保留只读分析功能，移除所有文件修改能力。让你安全地使用GPT-5进行代码审查和架构分析。

## 🛡️ 安全特性

- **🔒 纯代码分析** - 专注代码理解和架构分析，绝无文件修改风险
- **🔐 强制只读模式** - 锁定read-only沙箱，确保100%安全
- **⏱️ 20分钟超时** - 支持大型项目的深度代码分析
- **🎯 GPT-5驱动** - 基于最强大的AI模型进行代码分析
- **💡 智能解析** - 自动理解项目结构、组件关系和架构设计
- **🔥 本地编译优先** - 智能检测并优先使用用户本地编译的无审批版本
- **🚀 Master并行分析** - 支持复杂任务的8路智能并行分解分析
- **💎 双重支持** - 支持订阅版本和本地编译版本

## 安装配置

### 🎯 支持多种Codex CLI部署方式

**方式一：本地编译版本（推荐，无审批限制）**
- ✅ 用户自行编译的codex.exe（支持无审批方案）
- ✅ 牛马MCP自动检测本地编译版本并优先使用
- ✅ 支持路径：`H:\A_test\_tmp\codex-src\codex-rs\target\release\codex.exe`
- ✅ 完全自主控制，无需订阅和网络依赖

**方式二：订阅版本（传统方案）**
- ✅ ChatGPT Plus订阅（$20/月）+ Codex CLI订阅（$200/月）
- ✅ 已安装Codex CLI：`npm install -g @openai/codex`
- ✅ 已登录订阅账户：`codex login`

### 安装步骤

**本地编译版本用户：**
1. **确保本地编译版本可用**:
   ```bash
   # 检查编译版本
   "H:\A_test\_tmp\codex-src\codex-rs\target\release\codex.exe" --version
   # 应输出：codex-cli 0.0.0
   ```

2. **添加牛马MCP到Claude Code**:
   ```bash
   claude mcp add 牛马 -- npx -y 牛马
   ```

**订阅版本用户：**
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

### ask-codex (基础功能)
**安全的代码分析工具** - 使用GPT-5深度理解和分析代码，纯只读模式确保零风险。

**参数说明:**
- `prompt` (必需): 分析指令或问题
- `model` (可选): gpt-5 (默认且唯一支持的模型)
- `sandbox` (固定): read-only (强制只读，无法修改)
- `timeout` (可选): 超时时间 (默认20分钟)
- `image` (可选): 包含图片文件路径
- `config` (可选): 配置参数覆盖

### ask-codex-master (🚀 强力功能)
**牛马Master智能并行分析** - 复杂任务自动分解为8路并行执行，生成完整执行计划。

**核心特性:**
- 🧠 **智能任务分解** - 复杂需求自动拆分为子任务
- ⚡ **8路并行执行** - 最大并行任务数，显著提升分析速度
- 📊 **统一结果汇总** - 自动整合所有并行分析结果
- 🎯 **本地编译优先** - 自动使用用户本地编译的无审批版本
- 📋 **完整执行计划** - 生成详细的任务分解和执行报告

**参数说明:**
- `prompt` (必需): 复杂任务需求，将被智能分解为8路并行分析
- `maxTasks` (固定): 8 (最大并行任务数)
- `includeAnalysis` (可选): 是否包含详细的分析过程 (默认: true)

**使用示例:**

**基础分析 (ask-codex):**
```bash
# 分析单个文件
ask-codex "分析这个文件的功能: @main.py"

# 项目架构分析
ask-codex "分析整个项目的架构设计和依赖关系"

# 代码质量检查
ask-codex "检查这个函数是否有安全漏洞: @auth.js"

# 性能优化建议
ask-codex "建议如何优化这段代码的性能: @algorithm.py"
```

**复杂任务并行分析 (ask-codex-master):**
```bash
# 全面项目分析
ask-codex-master "深度分析整个TTS直播项目的架构、性能瓶颈、安全风险和优化建议"

# 多维度代码审查
ask-codex-master "全面审查这个电商系统的代码质量、安全性、性能和可维护性"

# 技术方案评估
ask-codex-master "评估当前微服务架构的优缺点，并提供完整的改进方案"

# 故障排查分析
ask-codex-master "分析系统性能问题的根本原因，提供完整的排查和解决方案"
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

1. **牛马MCP检测不到本地编译版本**:
   ```bash
   # 检查编译版本是否存在
   "H:\A_test\_tmp\codex-src\codex-rs\target\release\codex.exe" --version
   
   # 确保路径正确，牛马MCP会自动检测以下路径：
   # - H:/A_test/_tmp/codex-src/codex-rs/target/release/codex.exe (主编译版本)
   # - H:/A_test/_tmp/codex-bin/codex.exe (二进制副本)
   # - H:/A_test/codex/codex-rs/target/release/codex.exe (备用路径)
   ```

2. **找不到Codex CLI (订阅用户)**:
   ```bash
   npm install -g @openai/codex
   ```

3. **身份验证失败 (订阅用户)**:
   ```bash
   # 设置API密钥
   export OPENAI_API_KEY=your-key
   
   # 或使用账户登录
   codex login
   ```

4. **权限被拒绝**:
   - 牛马代码分析器已锁定为只读模式，无权限问题
   - 如果仍有问题，检查文件读取权限

5. **速率限制 (订阅用户)**:
   - 等待后重试
   - 检查OpenAI账户配额 (需要ChatGPT Plus订阅)

6. **Master并行分析失败**:
   - 检查本地编译版本可用性
   - 确认系统资源充足（8路并行需要较多内存）
   - 查看详细错误日志进行排查

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
