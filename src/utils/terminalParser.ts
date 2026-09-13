export interface WsmTerminalExecAction {
  command: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'success' | 'succeeded' | 'timed_out' | 'cancelled';
  exitCode?: number;
  runId?: string;
  hash?: string;
  sha256?: string;
  size?: number;
  size_bytes?: number;
  bytes_written?: number;
}

export interface WsmTerminalFileAction {
  action: 'write' | 'read' | 'delete' | 'zip';
  path: string;
  status?: 'working' | 'done' | 'failed';
  runId?: string;
  hash?: string;
  sha256?: string;
  size?: number;
  size_bytes?: number;
  bytes_written?: number;
}

export function unescapeXmlAttr(str: string): string {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function extractWsmTerminalActions(text: string): {
  cleanText: string;
  execActions: WsmTerminalExecAction[];
  fileActions: WsmTerminalFileAction[];
} {
  if (!text) {
    return { cleanText: '', execActions: [], fileActions: [] };
  }

  const execActions: WsmTerminalExecAction[] = [];
  const fileActions: WsmTerminalFileAction[] = [];

  // Match <wsm_terminal_exec ... /> safely even if attributes contain '>' or '<' inside quotes
  const execRegex = /<wsm_terminal_exec\b((?:[^>"']|"[^"]*"|'[^']*')*?)(?:\/>|>[\s\S]*?<\/wsm_terminal_exec>|>)/gi;
  let match: RegExpExecArray | null;

  while ((match = execRegex.exec(text)) !== null) {
    const rawAttrs = match[1];
    const cmdMatch = rawAttrs.match(/command="([^"]*)"/i) || rawAttrs.match(/command='([^']*)'/i) || rawAttrs.match(/cmd="([^"]*)"/i);
    const statusMatch = rawAttrs.match(/status="([^"]*)"/i) || rawAttrs.match(/status='([^']*)'/i);
    const exitMatch = rawAttrs.match(/exitCode="([^"]*)"/i) || rawAttrs.match(/exitCode='([^']*)'/i);
    const hashMatch = rawAttrs.match(/(?:hash|sha256)="([^"]*)"/i) || rawAttrs.match(/(?:hash|sha256)='([^']*)'/i);
    const runIdMatch = rawAttrs.match(/runId="([^"]*)"/i) || rawAttrs.match(/runId='([^']*)'/i);
    const sizeMatch = rawAttrs.match(/(?:size|size_bytes|bytes_written)="([^"]*)"/i) || rawAttrs.match(/(?:size|size_bytes|bytes_written)='([^']*)'/i);

    const rawCmd = cmdMatch ? cmdMatch[1] : '';
    const command = rawCmd ? unescapeXmlAttr(rawCmd) : 'Comando';
    const status = (statusMatch ? statusMatch[1].toLowerCase() : 'done') as any;
    const exitCode = exitMatch ? parseInt(exitMatch[1], 10) : undefined;
    const hash = hashMatch ? hashMatch[1] : undefined;
    const runId = runIdMatch ? runIdMatch[1] : undefined;
    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : undefined;

    execActions.push({
      command,
      status,
      exitCode,
      hash,
      sha256: hash,
      runId,
      size,
      size_bytes: size,
      bytes_written: size
    });
  }

  // Match <wsm_terminal_file ... />
  const fileRegex = /<wsm_terminal_file\b((?:[^>"']|"[^"]*"|'[^']*')*?)(?:\/>|>[\s\S]*?<\/wsm_terminal_file>|>)/gi;
  while ((match = fileRegex.exec(text)) !== null) {
    const rawAttrs = match[1];
    const actionMatch = rawAttrs.match(/action="([^"]*)"/i) || rawAttrs.match(/action='([^']*)'/i);
    const pathMatch = rawAttrs.match(/path="([^"]*)"/i) || rawAttrs.match(/path='([^']*)'/i);
    const statusMatch = rawAttrs.match(/status="([^"]*)"/i) || rawAttrs.match(/status='([^']*)'/i);
    const hashMatch = rawAttrs.match(/(?:hash|sha256)="([^"]*)"/i) || rawAttrs.match(/(?:hash|sha256)='([^']*)'/i);
    const runIdMatch = rawAttrs.match(/runId="([^"]*)"/i) || rawAttrs.match(/runId='([^']*)'/i);
    const sizeMatch = rawAttrs.match(/(?:size|size_bytes|bytes_written)="([^"]*)"/i) || rawAttrs.match(/(?:size|size_bytes|bytes_written)='([^']*)'/i);

    const size = sizeMatch ? parseInt(sizeMatch[1], 10) : undefined;
    const hash = hashMatch ? hashMatch[1] : undefined;
    const rawPath = pathMatch ? pathMatch[1] : 'arquivo';

    fileActions.push({
      action: (actionMatch ? actionMatch[1].toLowerCase() : 'write') as any,
      path: unescapeXmlAttr(rawPath),
      status: (statusMatch ? statusMatch[1].toLowerCase() : 'done') as any,
      hash,
      sha256: hash,
      runId: runIdMatch ? runIdMatch[1] : undefined,
      size,
      size_bytes: size,
      bytes_written: size
    });
  }

  // Deduplicate fileActions by path
  const uniqueFileActions: WsmTerminalFileAction[] = [];
  const seenPaths = new Set<string>();
  for (const fa of fileActions) {
    const cleanPath = fa.path.replace('/workspace/', '').replace(/^\//, '');
    if (!seenPaths.has(cleanPath)) {
      seenPaths.add(cleanPath);
      uniqueFileActions.push({ ...fa, path: cleanPath });
    }
  }

  // Deduplicate execActions by command - preserve the LATEST status (e.g. 'failed' or 'exitCode' over 'running')
  const execMap = new Map<string, WsmTerminalExecAction>();
  for (const ea of execActions) {
    const existing = execMap.get(ea.command);
    if (!existing) {
      execMap.set(ea.command, ea);
    } else {
      // Overwrite if new status is non-running or has exit code
      if (ea.status !== 'running' || existing.status === 'running') {
        execMap.set(ea.command, ea);
      }
    }
  }
  const uniqueExecActions = Array.from(execMap.values());

  const cleanText = cleanTerminalTags(text);

  return { cleanText, execActions: uniqueExecActions, fileActions: uniqueFileActions };
}

export function cleanTerminalTags(text: string): string {
  if (!text) return '';
  let cleaned = text
    .replace(/<wsm_terminal_exec\b(?:[^>"']|"[^"]*"|'[^']*')*?(?:\/>|>[\s\S]*?<\/wsm_terminal_exec>|>)/gi, '')
    .replace(/<wsm_terminal_file\b(?:[^>"']|"[^"]*"|'[^']*')*?(?:\/>|>[\s\S]*?<\/wsm_terminal_file>|>)/gi, '')
    .replace(/<wsm_terminal_action\b(?:[^>"']|"[^"]*"|'[^']*')*?(?:\/>|>[\s\S]*?<\/wsm_terminal_action>|>)/gi, '');

  // Clean any residual/leaked terminal tags or dangling attributes that might have been partially split or malformed
  cleaned = cleaned.replace(/<?\b(?:wsm_terminal_exec|wsm_terminal_file)\b[^>]*?(?:\/>|>|$)/gi, '');
  cleaned = cleaned.replace(/[^<\n]*\b(?:status|exitCode|runId|stdout_b64|stderr_b64|stdoutb64|stderrb64)=["'][^"']*["'][^>\n]*(?:\/>|>)/gi, '');

  return cleaned.trim();
}
