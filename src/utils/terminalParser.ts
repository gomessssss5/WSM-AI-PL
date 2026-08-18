export interface WsmTerminalExecAction {
  command: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'success' | 'timed_out' | 'cancelled';
  exitCode?: number;
}

export interface WsmTerminalFileAction {
  action: 'write' | 'read' | 'delete' | 'zip';
  path: string;
  status?: 'working' | 'done' | 'failed';
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

  // Match <wsm_terminal_exec ... />
  const execRegex = /<wsm_terminal_exec\s+([^>]*?)\s*(?:\/>|>)/gi;
  let match: RegExpExecArray | null;

  while ((match = execRegex.exec(text)) !== null) {
    const rawAttrs = match[1];
    const cmdMatch = rawAttrs.match(/command="([^"]*)"/i);
    const statusMatch = rawAttrs.match(/status="([^"]*)"/i);
    const exitMatch = rawAttrs.match(/exitCode="([^"]*)"/i);

    const command = cmdMatch ? cmdMatch[1] : 'ls';
    const status = (statusMatch ? statusMatch[1].toLowerCase() : 'done') as any;
    const exitCode = exitMatch ? parseInt(exitMatch[1], 10) : undefined;

    execActions.push({
      command,
      status,
      exitCode
    });
  }

  // Match <wsm_terminal_file ... />
  const fileRegex = /<wsm_terminal_file\s+([^>]*?)\s*(?:\/>|>)/gi;
  while ((match = fileRegex.exec(text)) !== null) {
    const rawAttrs = match[1];
    const actionMatch = rawAttrs.match(/action="([^"]*)"/i);
    const pathMatch = rawAttrs.match(/path="([^"]*)"/i);
    const statusMatch = rawAttrs.match(/status="([^"]*)"/i);

    fileActions.push({
      action: (actionMatch ? actionMatch[1].toLowerCase() : 'write') as any,
      path: pathMatch ? pathMatch[1] : 'arquivo',
      status: (statusMatch ? statusMatch[1].toLowerCase() : 'done') as any
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

  const cleanText = text
    .replace(/<wsm_terminal_exec\s+[^>]*?(?:\/>|>)/gi, '')
    .replace(/<wsm_terminal_file\s+[^>]*?(?:\/>|>)/gi, '')
    .trim();

  return { cleanText, execActions: uniqueExecActions, fileActions: uniqueFileActions };
}

export function cleanTerminalTags(text: string): string {
  if (!text) return '';
  return text
    .replace(/<wsm_terminal_exec\s+[^>]*?(?:\/>|>)/gi, '')
    .replace(/<wsm_terminal_file\s+[^>]*?(?:\/>|>)/gi, '')
    .trim();
}
