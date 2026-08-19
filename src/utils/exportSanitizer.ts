/**
 * Omnix Export Sanitizer
 * Guarantees that exported Markdown conversations contain ONLY visible user and assistant messages,
 * stripping out any internal system prompts, developer instructions, tool calls, internal tags, tokens, or credentials.
 */

export interface ExportableMessage {
  id?: string;
  sender?: string;
  role?: string;
  text?: string;
  content?: string;
  timestamp?: number | string | Date;
  imageUrl?: string;
  codeBlock?: { language?: string; code?: string };
  isHidden?: boolean;
}

/**
 * Whitelisted roles that are allowed in exported Markdown files.
 */
const ALLOWED_EXPORT_ROLES = new Set(['user', 'ai', 'assistant']);

/**
 * Banned patterns and internal tags that must be stripped from exported content.
 */
const BANNED_PATTERNS: RegExp[] = [
  /<developer[\s\S]*?<\/developer>/gi,
  /<system_instructions[\s\S]*?<\/system_instructions>/gi,
  /<system[\s\S]*?<\/system>/gi,
  /<tool[\s\S]*?<\/tool>/gi,
  /<wsm_writer_update[\s\S]*?<\/wsm_writer_update>/gi,
  /<wsm_terminal_action[\s\S]*?<\/wsm_terminal_action>/gi,
  /<wsm_workspace_action[\s\S]*?<\/wsm_workspace_action>/gi,
  /<wsm_task_execution[\s\S]*?<\/wsm_task_execution>/gi,
  /<wsm_doc[\s\S]*?<\/wsm_doc>/gi,
  /<wsm_raciocinio[\s\S]*?<\/wsm_raciocinio>/gi,
  /<call:[\s\S]*?\/?>/gi,
  /call:default_api:[^\s>]*/gi,
  /:::[A-Z0-9_-]+:::/gi,
  /\[SISTEMA:[\s\S]*?\]/gi,
  /SISTEMA \([\s\S]*?\):/gi,
  /\[Lendo Skill:[\s\S]*?\]/gi,
  /\[PACOTE_SKILL[\s\S]*?\]/gi,
  /\[PIPELINE_DE_SKILLS[\s\S]*?\]/gi,
  /\[REGRAS DE EXECUÇÃO[\s\S]*?\]/gi,
  /\[INSTRUÇÕES INTERNAS[\s\S]*?\]/gi,
  /\[SOLICITAÇÃO DO USUÁRIO\]:/gi,
  /\[ALERTA DE RUNTIME[\s\S]*?\]/gi,
  /\[ALERTA CRÍTICO DO SISTEMA[\s\S]*?\]/gi,
  /\[Texto Anexado do Editor:\n"[\s\S]*?"\]\n\n?/gi,
  /\[Utilize as seguintes skills:[\s\S]*?\]/gi,
];

/**
 * Forbidden tokens and credentials that must NEVER appear in exported text.
 */
const SENSITIVE_TOKEN_PATTERNS: RegExp[] = [
  /OmnixInternalSchedulerBypassToken[^\s]*/gi,
  /Bearer\s+[A-Za-z0-9_\-\.=]{15,}/gi,
  /GEMINI_API_KEY[^\s]*/gi,
  /IA_API_KEY[^\s]*/gi,
  /RESEND_API_KEY[^\s]*/gi,
  /TAVILY_API_KEY[^\s]*/gi,
  /Set-Cookie:[^\n]*/gi,
];

/**
 * Sanitizes an individual message text by stripping internal tags, system prompts, and credentials.
 */
export function sanitizeMessageText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText;

  // 1. Remove all banned internal tags and system wrappers
  for (const pattern of BANNED_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // 2. Remove sensitive tokens / keys
  for (const pattern of SENSITIVE_TOKEN_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[REDACTED]');
  }

  // 3. Remove standalone developer instructions lines
  cleaned = cleaned
    .split('\n')
    .filter(line => {
      const lower = line.trim().toLowerCase();
      if (lower.startsWith('developer:') || lower.startsWith('system:')) return false;
      if (lower.includes('you are an ai studio applet') || lower.includes('you are an ai assistant')) return false;
      if (lower.includes('do not mention this content') || lower.includes('não mencione este conteúdo')) return false;
      return true;
    })
    .join('\n');

  return cleaned.trim();
}

/**
 * Validates the generated Markdown string to ensure no leaked internal markers remain.
 */
export function validateExportedMarkdown(markdown: string): { isValid: boolean; sanitizedMarkdown: string; leaksDetected: string[] } {
  const leaksDetected: string[] = [];
  let sanitizedMarkdown = markdown;

  const forbiddenChecks: { name: string; pattern: RegExp }[] = [
    { name: '<developer>', pattern: /<developer/i },
    { name: '<system>', pattern: /<system/i },
    { name: '<tool>', pattern: /<tool/i },
    { name: '[SISTEMA:', pattern: /\[SISTEMA:/i },
    { name: 'OmnixInternalSchedulerBypassToken', pattern: /OmnixInternalSchedulerBypassToken/i },
    { name: 'GEMINI_API_KEY', pattern: /GEMINI_API_KEY/i },
    { name: 'Bearer token', pattern: /Bearer\s+[A-Za-z0-9_\-\.=]{20,}/i }
  ];

  for (const check of forbiddenChecks) {
    if (check.pattern.test(sanitizedMarkdown)) {
      leaksDetected.push(check.name);
      sanitizedMarkdown = sanitizedMarkdown.replace(new RegExp(check.pattern.source, 'gi'), '');
    }
  }

  return {
    isValid: leaksDetected.length === 0,
    sanitizedMarkdown: sanitizedMarkdown.trim(),
    leaksDetected
  };
}

/**
 * Builds a sanitized Markdown export from an array of messages and session metadata.
 */
export function generateSanitizedExportMarkdown(
  messages: ExportableMessage[],
  title: string = 'Chat',
  selectedModel: string = 'Omnix 1.6'
): string {
  let md = `# Conversa do Omnix AI - ${title || 'Chat'}\n\n`;
  md += `**Modelo selecionado:** ${selectedModel}\n`;
  md += `**Exportado em:** ${new Date().toLocaleString()}\n\n`;
  md += `---\n\n`;

  let exportedMessageCount = 0;

  messages.forEach((msg) => {
    if (msg.isHidden) return;

    // Strict Role Whitelist: Reject developer, system, tool, etc.
    const senderRole = (msg.sender || msg.role || '').toLowerCase();
    if (!ALLOWED_EXPORT_ROLES.has(senderRole)) {
      return;
    }

    const rawContent = msg.text || msg.content || '';
    const cleanText = sanitizeMessageText(rawContent);

    // Skip if message has no clean text, image, or code block
    if (!cleanText && !msg.imageUrl && !msg.codeBlock) return;

    const senderName = senderRole === 'user' ? 'Usuário' : 'Omnix 1.6';
    const senderEmoji = senderRole === 'user' ? '👤' : '🤖';
    const timestampStr = msg.timestamp
      ? new Date(msg.timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString();

    md += `### ${senderEmoji} **${senderName}** (${timestampStr})\n\n`;

    if (cleanText) {
      md += `${cleanText}\n\n`;
    }

    if (msg.imageUrl) {
      md += `![Imagem Gerada](${msg.imageUrl})\n\n`;
    }

    if (msg.codeBlock) {
      md += `\`\`\`${msg.codeBlock.language || 'code'}\n${msg.codeBlock.code}\n\`\`\`\n\n`;
    }

    md += `---\n\n`;
    exportedMessageCount++;
  });

  if (exportedMessageCount === 0) {
    md += `*Nenhuma mensagem conversacional visível para exportar.*\n`;
  }

  // Final verification & sanitization pass
  const validation = validateExportedMarkdown(md);
  return validation.sanitizedMarkdown;
}
