import { CodexOutput } from '../constants.js';
import { Logger } from './logger.js';

export function parseCodexOutput(rawOutput: string): CodexOutput {
  const lines = rawOutput.split('\n');
  const timestamps: string[] = [];
  let metadata: any = {};
  let userInstructions = '';
  let thinking = '';
  let response = '';
  let tokensUsed: number | undefined;
  
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
  
  const output: CodexOutput = {
    metadata,
    userInstructions,
    thinking: thinking || undefined,
    response,
    tokensUsed,
    timestamps,
    rawOutput
  };
  
  Logger.codexResponse(response, tokensUsed);
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