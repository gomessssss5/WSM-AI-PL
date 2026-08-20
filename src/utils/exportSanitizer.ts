import { formatTimeSafely, formatDateTimeSafely } from './dateUtils';

/**
 * Omnix Export Sanitizer
 * Guarantees that exported Markdown conversations contain ONLY visible user and assistant messages,
 * converting visual artifacts (charts, maps, mindmaps, forms, tables) into clean, standard Markdown/Mermaid representations
 * while stripping out any internal system prompts, developer instructions, tool calls, raw internal execution tags, tokens, or credentials.
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
  tableData?: {
    headers: string[];
    rows: string[][];
  };
  translationData?: {
    original: string;
    translated: string;
    sourceLang: string;
    targetLang: string;
  };
  isHidden?: boolean;
}

/**
 * Whitelisted roles that are allowed in exported Markdown files.
 */
const ALLOWED_EXPORT_ROLES = new Set(['user', 'ai', 'assistant']);

/**
 * Banned patterns and internal tags that must be stripped from exported content.
 * Note: Visual UI artifacts (wsm_chart, wsm_map, wsm_mindmap, wsm_task, wsm_form) are now converted to Markdown before this stage.
 */
const BANNED_PATTERNS: RegExp[] = [
  /<developer[\s\S]*?<\/developer>/gi,
  /<system_instructions[\s\S]*?<\/system_instructions>/gi,
  /<system[\s\S]*?<\/system>/gi,
  /<tool[\s\S]*?<\/tool>/gi,
  /<wsm_writer_update[\s\S]*?<\/wsm_writer_update>/gi,
  /<wsm_terminal_action[\s\S]*?<\/wsm_terminal_action>/gi,
  /<wsm_workspace_action[\s\S]*?<\/wsm_workspace_action>/gi,
  /<wsm_workspace_action[\s\S]*?\/?>/gi,
  /<wsm_task_execution[\s\S]*?<\/wsm_task_execution>/gi,
  /<wsm_doc[\s\S]*?<\/wsm_doc>/gi,
  /<wsm_raciocinio[\s\S]*?<\/wsm_raciocinio>/gi,
  /<wsmworkspaceaction[\s\S]*?\/?>/gi,
  /<wsmterminalexec[\s\S]*?\/?>/gi,
  /<wsmaction[\s\S]*?\/?>/gi,
  /<call:[\s\S]*?\/?>/gi,
  /<wsm_terminal_exec[\s\S]*?\/?>/gi,
  /<\/wsm_terminal_exec>/gi,
  /<wsm_terminal_file[\s\S]*?\/?>/gi,
  /<\/wsm_terminal_file>/gi,
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
 * Helper to parse an attribute value from a tag string.
 */
function parseAttribute(tagString: string, attr: string): string {
  const single = new RegExp(`${attr}\\s*=\\s*'([^']*)'`, 'i').exec(tagString);
  if (single) return single[1];
  const double = new RegExp(`${attr}\\s*=\\s*"([^"]*)"`, 'i').exec(tagString);
  if (double) return double[1];
  const backtick = new RegExp(`${attr}\\s*=\\s*\`([^\`]*)\``, 'i').exec(tagString);
  if (backtick) return backtick[1];
  return '';
}

/**
 * Converts visual artifact tags (<wsm_chart>, <wsm_map>, <wsm_mindmap>, <wsm_form>, <wsm_task>)
 * into clean, standard Markdown representations (tables, codeblocks, coordinates, list summaries).
 */
export function convertVisualArtifactsToMarkdown(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';
  let result = rawText;

  // 1. Convert <wsm_chart ... /> or <wsm_chart>...</wsm_chart>
  result = result.replace(/<wsm_chart([\s\S]*?)(?:\/>|>[\s\S]*?<\/wsm_chart>)/gi, (match, attrs) => {
    const title = parseAttribute(attrs, 'title') || 'Gráfico Interativo';
    const type = parseAttribute(attrs, 'type') || 'bar';
    const xAxis = parseAttribute(attrs, 'xAxis') || parseAttribute(attrs, 'x') || 'Eixo X';
    const yAxis = parseAttribute(attrs, 'yAxis') || parseAttribute(attrs, 'y') || 'Eixo Y';
    
    let rawData = parseAttribute(attrs, 'data');
    if (!rawData) {
      const matchData = attrs.match(/data\s*=\s*(['"`])([\s\S]*?)\1/i);
      if (matchData) rawData = matchData[2];
    }

    let markdownOutput = `\n\n#### 📊 ${title} *(Tipo: ${type})*\n`;

    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if array of objects
          if (typeof parsed[0] === 'object' && parsed[0] !== null) {
            const keys = Object.keys(parsed[0]);
            markdownOutput += `| ${keys.join(' | ')} |\n`;
            markdownOutput += `| ${keys.map(() => '---').join(' | ')} |\n`;
            parsed.forEach(item => {
              markdownOutput += `| ${keys.map(k => String(item[k] ?? '')).join(' | ')} |\n`;
            });
          } else {
            markdownOutput += `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\`\n`;
          }
        } else if (parsed && typeof parsed === 'object') {
          // Chart.js object format: { labels: [...], datasets: [...] }
          if (Array.isArray(parsed.labels) && Array.isArray(parsed.datasets)) {
            const headers = [xAxis, ...parsed.datasets.map((d: any) => d.label || yAxis)];
            markdownOutput += `| ${headers.join(' | ')} |\n`;
            markdownOutput += `| ${headers.map(() => '---').join(' | ')} |\n`;
            parsed.labels.forEach((label: string, idx: number) => {
              const rowValues = [label, ...parsed.datasets.map((d: any) => String(d.data?.[idx] ?? ''))];
              markdownOutput += `| ${rowValues.join(' | ')} |\n`;
            });
          } else {
            markdownOutput += `\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\`\n`;
          }
        }
      } catch {
        markdownOutput += `\`\`\`json\n${rawData.trim()}\n\`\`\`\n`;
      }
    }
    return markdownOutput + '\n';
  });

  // 2. Convert <wsm_map ... /> or <wsm_map>...</wsm_map>
  result = result.replace(/<wsm_map([\s\S]*?)(?:\/>|>[\s\S]*?<\/wsm_map>)/gi, (match, attrs) => {
    const place = parseAttribute(attrs, 'place') || parseAttribute(attrs, 'title') || 'Localização Geográfica';
    const lat = parseAttribute(attrs, 'lat');
    const lon = parseAttribute(attrs, 'lon') || parseAttribute(attrs, 'lng');
    const zoom = parseAttribute(attrs, 'zoom') || '12';
    const text = parseAttribute(attrs, 'text') || parseAttribute(attrs, 'wiki');
    let markersStr = parseAttribute(attrs, 'markers');

    let markdownOutput = `\n\n#### 📍 Mapa: ${place}\n`;
    if (lat && lon) {
      markdownOutput += `- **Coordenadas Centrais:** Latitude \`${lat}\`, Longitude \`${lon}\` (Zoom: ${zoom})\n`;
    }
    if (text) {
      markdownOutput += `- **Descrição:** ${text}\n`;
    }

    if (markersStr) {
      try {
        const markers = JSON.parse(markersStr);
        if (Array.isArray(markers) && markers.length > 0) {
          markdownOutput += `\n**Pontos Marcados no Mapa:**\n`;
          markdownOutput += `| Local / Título | Latitude | Longitude |\n`;
          markdownOutput += `| --- | --- | --- |\n`;
          markers.forEach((m: any) => {
            markdownOutput += `| ${m.title || m.name || place} | ${m.lat ?? lat} | ${m.lon ?? m.lng ?? lon} |\n`;
          });
        }
      } catch {
        // Ignore JSON parse fail
      }
    }
    return markdownOutput + '\n';
  });

  // 3. Convert <wsm_mindmap ...> ... </wsm_mindmap>
  result = result.replace(/<wsm_mindmap([\s\S]*?)>([\s\S]*?)<\/wsm_mindmap>/gi, (match, attrs, content) => {
    const title = parseAttribute(attrs, 'title') || 'Mapa Mental';
    return `\n\n#### 🧠 ${title}\n\`\`\`markmap\n${content.trim()}\n\`\`\`\n\n`;
  });
  result = result.replace(/<wsm_mindmap([\s\S]*?)\/>/gi, (match, attrs) => {
    const title = parseAttribute(attrs, 'title') || 'Mapa Mental';
    const data = parseAttribute(attrs, 'data') || '';
    return `\n\n#### 🧠 ${title}\n\`\`\`markmap\n${data.trim()}\n\`\`\`\n\n`;
  });

  // 4. Convert <wsm_form ... />
  result = result.replace(/<wsm_form([\s\S]*?)(?:\/>|>[\s\S]*?<\/wsm_form>)/gi, (match, attrs) => {
    const title = parseAttribute(attrs, 'title') || 'Formulário Interativo';
    const desc = parseAttribute(attrs, 'description');
    return `\n\n#### 📋 ${title}\n${desc ? `*${desc}*\n` : ''}\n`;
  });

  // 5. Convert <wsm_task ... />
  result = result.replace(/<wsm_task([\s\S]*?)(?:\/>|>[\s\S]*?<\/wsm_task>)/gi, (match, attrs) => {
    const title = parseAttribute(attrs, 'title') || 'Tarefa Agendada';
    const cron = parseAttribute(attrs, 'cron') || parseAttribute(attrs, 'schedule');
    return `\n\n- [ ] ⏰ **${title}** ${cron ? `*(Agendamento: ${cron})*` : ''}\n`;
  });

  return result;
}

/**
 * Sanitizes an individual message text by converting visual artifacts to Markdown,
 * then stripping internal tags, system prompts, and credentials.
 */
export function sanitizeMessageText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  // Step A: Convert visual tags to clean markdown representations first
  let cleaned = convertVisualArtifactsToMarkdown(rawText);

  // Step B: Remove all banned internal tags and system wrappers
  for (const pattern of BANNED_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Step C: Remove sensitive tokens / keys
  for (const pattern of SENSITIVE_TOKEN_PATTERNS) {
    cleaned = cleaned.replace(pattern, '[REDACTED]');
  }

  // Step D: Remove standalone developer instructions lines
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
    { name: '<wsm_workspace_action', pattern: /<wsm_workspace_action/i },
    { name: '<wsmworkspaceaction', pattern: /<wsmworkspaceaction/i },
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

    // Skip if message has no clean text, image, code block, translation, or table
    if (!cleanText && !msg.imageUrl && !msg.codeBlock && !msg.tableData && !msg.translationData) return;

    const senderName = senderRole === 'user' ? 'Usuário' : 'Omnix 1.6';
    const senderEmoji = senderRole === 'user' ? '👤' : '🤖';
    const timestampStr = formatTimeSafely(msg.timestamp, undefined, 'Data indisponível');

    md += `### ${senderEmoji} **${senderName}** (${timestampStr})\n\n`;

    if (cleanText) {
      md += `${cleanText}\n\n`;
    }

    // Export Structured Table if present on the message object
    if (msg.tableData && Array.isArray(msg.tableData.headers) && Array.isArray(msg.tableData.rows)) {
      md += `| ${msg.tableData.headers.join(' | ')} |\n`;
      md += `| ${msg.tableData.headers.map(() => '---').join(' | ')} |\n`;
      msg.tableData.rows.forEach(row => {
        md += `| ${row.join(' | ')} |\n`;
      });
      md += `\n`;
    }

    // Export Translation data if present
    if (msg.translationData) {
      md += `> **Original (${msg.translationData.sourceLang}):** ${msg.translationData.original}\n`;
      md += `> **Tradução (${msg.translationData.targetLang}):** ${msg.translationData.translated}\n\n`;
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
