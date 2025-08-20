import { CodexOutput } from '../constants.js';
import { Logger } from './logger.js';

export function parseCodexOutput(rawOutput: string): CodexOutput {
  const lines = rawOutput.split('\n').filter(line => line.trim());
  const timestamps: string[] = [];
  let metadata: any = {};
  let userInstructions = '';
  let thinking = '';
  let response = '';
  let tokensUsed: number | undefined;
  
  // 新版JSON格式解析
  let isJsonFormat = false;
  let sessionStarted = false;
  
  // 检测输出格式类型
  for (const line of lines) {
    if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
      try {
        JSON.parse(line.trim());
        isJsonFormat = true;
        break;
      } catch (e) {
        // 不是JSON格式，继续检查
      }
    }
  }
  
  if (isJsonFormat) {
    // 解析新版JSON格式输出
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const jsonData = JSON.parse(line.trim());
        
        // 处理会话开始信息（包含配置元数据）
        if (jsonData.reasoning_summaries || jsonData.model || jsonData.workdir) {
          if (!sessionStarted) {
            metadata = {
              version: jsonData.version || 'v0.22.0+',
              workdir: jsonData.workdir || process.cwd(),
              model: jsonData.model || 'gpt-5',
              provider: jsonData.provider || 'openai',
              approval: jsonData.approval || 'untrusted',
              sandbox: jsonData.sandbox || 'read-only',
              reasoning_effort: jsonData.reasoning_effort,
              reasoning_summaries: jsonData.reasoning_summaries
            };
            sessionStarted = true;
          }
          continue;
        }
        
        // 处理用户指令
        if (jsonData.prompt && typeof jsonData.prompt === 'string') {
          userInstructions += jsonData.prompt + '\n';
          continue;
        }
        
        // 处理消息事件
        if (jsonData.id !== undefined && jsonData.msg) {
          const msgType = jsonData.msg.type;
          const timestamp = new Date().toISOString();
          timestamps.push(timestamp);
          
          switch (msgType) {
            case 'task_started':
              // 任务开始事件
              if (jsonData.msg.message) {
                thinking += '任务开始: ' + jsonData.msg.message + '\n';
              }
              break;
              
            case 'agent_message':
              // AI代理的主要响应内容
              if (jsonData.msg.message) {
                response += jsonData.msg.message + '\n';
              }
              break;
              
            case 'thinking':
            case 'reasoning':
              // AI推理过程
              if (jsonData.msg.message) {
                thinking += jsonData.msg.message + '\n';
              }
              break;
              
            case 'token_count':
              // Token使用统计
              if (jsonData.msg.input_tokens && jsonData.msg.output_tokens) {
                tokensUsed = jsonData.msg.input_tokens + jsonData.msg.output_tokens;
              } else if (jsonData.msg.total_tokens) {
                tokensUsed = jsonData.msg.total_tokens;
              }
              break;
              
            case 'error':
              // 错误信息
              if (jsonData.msg.message) {
                response += '错误: ' + jsonData.msg.message + '\n';
              }
              break;
              
            case 'completion':
            case 'task_completed':
              // 任务完成
              if (jsonData.msg.message) {
                thinking += '任务完成: ' + jsonData.msg.message + '\n';
              }
              break;
              
            default:
              // 其他类型的消息
              if (jsonData.msg.message) {
                thinking += '[' + msgType + '] ' + jsonData.msg.message + '\n';
              }
          }
        }
        
        // 处理简单的消息格式
        if (jsonData.message && !jsonData.msg) {
          response += jsonData.message + '\n';
        }
        
      } catch (error) {
        // 如果不是JSON格式，可能是纯文本行，添加到响应中
        if (line.trim()) {
          response += line + '\n';
        }
      }
    }
  } else {
    // 兼容旧版文本格式解析（向后兼容）
    let currentSection = 'header';
    let metadataLines: string[] = [];
    let thinkingLines: string[] = [];
    let responseLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Extract timestamps
      const timestampMatch = line.match(/^\[([^\]]+)\]/);
      if (timestampMatch) {
        timestamps.push(timestampMatch[1]);
      }
      
      // Extract tokens used
      const tokensMatch = line.match(/tokens used:\s*(\d+)/);
      if (tokensMatch) {
        tokensUsed = parseInt(tokensMatch[1], 10);
        continue;
      }
      
      // Identify sections
      if (line.includes('OpenAI Codex')) {
        currentSection = 'header';
        continue;
      } else if (line.startsWith('--------')) {
        if (currentSection === 'header') {
          currentSection = 'metadata';
        } else if (currentSection === 'metadata') {
          currentSection = 'content';
        }
        continue;
      } else if (line.includes('User instructions:')) {
        currentSection = 'userInstructions';
        continue;
      } else if (line.includes('thinking')) {
        currentSection = 'thinking';
        continue;
      } else if (line.includes('codex')) {
        currentSection = 'response';
        continue;
      }
      
      // Parse based on current section
      switch (currentSection) {
        case 'metadata':
          if (line.trim()) {
            metadataLines.push(line.trim());
          }
          break;
        case 'userInstructions':
          if (line.trim() && !line.includes('User instructions:')) {
            userInstructions += line + '\n';
          }
          break;
        case 'thinking':
          if (line.trim() && !line.includes('thinking')) {
            thinkingLines.push(line);
          }
          break;
        case 'response':
          if (line.trim() && !line.includes('codex') && !line.includes('tokens used:')) {
            responseLines.push(line);
          }
          break;
      }
    }
    
    // Parse metadata
    metadata = parseMetadata(metadataLines);
    thinking = thinkingLines.join('\n').trim();
    response = responseLines.join('\n').trim();
    userInstructions = userInstructions.trim();
  }
  
  // 清理输出内容
  response = response.trim();
  thinking = thinking.trim();
  userInstructions = userInstructions.trim();
  
  // 如果没有获取到响应内容，但有thinking内容，可能需要调整
  if (!response && thinking) {
    // 在某些情况下，主要内容可能被错误地归类为thinking
    const thinkingLines = thinking.split('\n');
    const substantiveLines = thinkingLines.filter(line => 
      line.trim().length > 10 && 
      !line.includes('任务开始') && 
      !line.includes('任务完成') &&
      !line.startsWith('[')
    );
    
    if (substantiveLines.length > 0) {
      response = substantiveLines.join('\n');
      // 保留非实质性的thinking内容
      thinking = thinkingLines.filter(line => 
        line.includes('任务开始') || 
        line.includes('任务完成') ||
        line.startsWith('[')
      ).join('\n');
    }
  }
  
  const output: CodexOutput = {
    metadata,
    userInstructions,
    thinking: thinking || undefined,
    response: response || '解析输出时未找到有效响应内容',
    tokensUsed,
    timestamps,
    rawOutput
  };
  
  Logger.codexResponse(response || '空响应', tokensUsed);
  return output;
}

function parseMetadata(metadataLines: string[]): any {
  const metadata: any = {};
  
  for (const line of metadataLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      metadata[key] = value;
    }
  }
  
  return metadata;
}

export function formatCodexResponse(output: CodexOutput, includeThinking: boolean = true): string {
  let formatted = '';
  
  // Add metadata summary
  if (output.metadata.model || output.metadata.sandbox) {
    formatted += `**Codex Configuration:**\n`;
    if (output.metadata.model) formatted += `- Model: ${output.metadata.model}\n`;
    if (output.metadata.sandbox) formatted += `- Sandbox: ${output.metadata.sandbox}\n`;
    if (output.metadata.approval) formatted += `- Approval: ${output.metadata.approval}\n`;
    formatted += '\n';
  }
  
  // Add thinking section if requested and available
  if (includeThinking && output.thinking) {
    formatted += `**Reasoning:**\n`;
    formatted += output.thinking + '\n\n';
  }
  
  // Add main response
  formatted += `**Response:**\n`;
  formatted += output.response;
  
  // Add token usage if available
  if (output.tokensUsed) {
    formatted += `\n\n*Tokens used: ${output.tokensUsed}*`;
  }
  
  return formatted;
}

export function extractCodeBlocks(text: string): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const matches = text.match(codeBlockRegex);
  return matches || [];
}

export function extractDiffBlocks(text: string): string[] {
  const diffRegex = /```diff[\s\S]*?```/g;
  const matches = text.match(diffRegex);
  return matches || [];
}

export function isErrorResponse(output: CodexOutput): boolean {
  const errorKeywords = [
    'error',
    'failed',
    'unable',
    'cannot',
    'authentication',
    'permission denied',
    'rate limit',
    'quota exceeded'
  ];
  
  const responseText = output.response.toLowerCase();
  return errorKeywords.some(keyword => responseText.includes(keyword));
}