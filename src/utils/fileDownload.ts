import { terminalSandbox } from '../lib/terminalSandbox';

/**
 * Robust workspace file downloader utility.
 * Attempts client-side memory retrieval first (instant, works offline/serverless),
 * then falls back to API download endpoints with proper error handling.
 */
export async function downloadWorkspaceFile(filename: string, fallbackContent?: string | Uint8Array): Promise<boolean> {
  if (!filename) return false;

  const cleanName = filename
    .replace(/^(\/workspace\/|\/workspace|workspace\/)/i, '')
    .replace(/^\/+/, '')
    .trim();
  const baseName = cleanName.split('/').pop() || cleanName;

  // 1. Check client-side terminalSandbox memory
  let content = fallbackContent ?? (terminalSandbox.readFile(cleanName) || terminalSandbox.readFile(baseName) || terminalSandbox.readFile(`/workspace/${cleanName}`));

  if (content !== null && (typeof content === 'string' || content instanceof Uint8Array)) {
    triggerBlobDownload(baseName, content);
    return true;
  }

  // 2. Try fetching from server API /api/download/:filename
  try {
    const authHeader = localStorage.getItem('omnix_auth_token') || sessionStorage.getItem('omnix_auth_token');
    const headers: Record<string, string> = {};
    if (authHeader) headers['Authorization'] = `Bearer ${authHeader}`;

    const res = await fetch(`/api/download/${encodeURIComponent(cleanName)}`, { headers });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = baseName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  } catch (err) {
    console.error('[FileDownload] Erro ao baixar via API:', err);
  }

  // 3. Fallback: query /api/terminal/files to find file location and content
  try {
    const authHeader = localStorage.getItem('omnix_auth_token') || sessionStorage.getItem('omnix_auth_token');
    const headers: Record<string, string> = {};
    if (authHeader) headers['Authorization'] = `Bearer ${authHeader}`;

    const res = await fetch('/api/terminal/files', { headers });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.files)) {
        const match = data.files.find((f: any) => f.name === baseName || f.path?.endsWith(baseName));
        if (match && match.path) {
          const cleanMatchPath = match.path.replace(/^(\/workspace\/|\/workspace|workspace\/)/i, '').replace(/^\/+/, '');
          const fileRes = await fetch(`/api/download/${encodeURIComponent(cleanMatchPath)}`, { headers });
          if (fileRes.ok) {
            const blob = await fileRes.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = baseName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return true;
          }
        }
      }
    }
  } catch {}

  return false;
}

export function triggerBlobDownload(filename: string, content: string | Uint8Array) {
  const ext = filename.split('.').pop()?.toLowerCase() || 'txt';
  let mimeType = 'text/plain;charset=utf-8';
  if (ext === 'json') mimeType = 'application/json;charset=utf-8';
  else if (ext === 'csv') mimeType = 'text/csv;charset=utf-8';
  else if (ext === 'md') mimeType = 'text/markdown;charset=utf-8';
  else if (ext === 'py') mimeType = 'text/x-python;charset=utf-8';
  else if (ext === 'js' || ext === 'ts') mimeType = 'application/javascript;charset=utf-8';
  else if (ext === 'html') mimeType = 'text/html;charset=utf-8';
  else if (ext === 'xml') mimeType = 'application/xml;charset=utf-8';
  else if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
  else if (ext === 'pdf') mimeType = 'application/pdf';
  else if (ext === 'zip') mimeType = 'application/zip';

  const blob = typeof content === 'string'
    ? new Blob([content], { type: mimeType })
    : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
