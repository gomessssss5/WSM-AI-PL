import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { exec } from 'child_process';

/**
 * Derives a clean, isolated sandbox directory for a given user or session ID.
 * Prevents cross-session leaks, multi-user overwrites, and state collision on container restart.
 */
export function getSandboxDir(userIdOrSession?: string): string {
  const safeId = String(userIdOrSession || 'default')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64) || 'default';
  return path.join(os.tmpdir(), 'omnix_sandboxes', safeId);
}

export const SANDBOX_DIR = getSandboxDir('default');

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  filesModified: string[];
  fileContents?: Record<string, string>;
}

export function ensureSandboxDir(userIdOrSession?: string): string {
  const targetDir = getSandboxDir(userIdOrSession);
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const pkgPath = path.join(targetDir, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      fs.writeFileSync(
        pkgPath,
        JSON.stringify(
          {
            name: 'omnix-sandbox-project',
            version: '1.0.0',
            description: 'Ambiente isolado de execução Linux/Node.js/Python Omnix Sandbox',
            main: 'index.js',
            scripts: {
              start: 'node index.js',
              test: 'node test.js'
            }
          },
          null,
          2
        ),
        'utf8'
      );
    }
  } catch (err) {
    console.error('[TerminalService] Error initializing sandbox directory:', err);
  }
  return targetDir;
}

export function sanitizePath(relPath: string, userIdOrSession?: string): string {
  const sandboxDir = ensureSandboxDir(userIdOrSession);
  const normalized = path.normalize(relPath || '')
    .replace(/^(\/workspace\/|\/workspace|workspace\/)/i, '')
    .replace(/^\/+/, '');
  
  const resolvedPath = path.resolve(sandboxDir, normalized || 'arquivo.txt');
  
  const realSandbox = fs.existsSync(sandboxDir) ? fs.realpathSync(sandboxDir) : sandboxDir;
  if (!resolvedPath.startsWith(realSandbox) && !resolvedPath.startsWith(sandboxDir)) {
    throw new Error(`Acesso de caminho negado: O caminho '${relPath}' viola a fronteira do diretório sandbox.`);
  }

  if (fs.existsSync(resolvedPath)) {
    try {
      const realPath = fs.realpathSync(resolvedPath);
      if (!realPath.startsWith(realSandbox)) {
        throw new Error(`Acesso negado: O link simbólico para '${relPath}' aponta fora do diretório do sandbox.`);
      }
    } catch (err: any) {
      if (err.message?.includes('Acesso negado')) throw err;
    }
  }

  return resolvedPath;
}

export function writeSandboxFile(relPath: string, content: string, userIdOrSession?: string): string {
  ensureSandboxDir(userIdOrSession);
  const fullPath = sanitizePath(relPath, userIdOrSession);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}

export function writeSandboxBinaryFile(relPath: string, buffer: Buffer, userIdOrSession?: string): string {
  ensureSandboxDir(userIdOrSession);
  const fullPath = sanitizePath(relPath, userIdOrSession);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, buffer);
  return fullPath;
}

export function readSandboxFile(relPath: string, userIdOrSession?: string): string | null {
  ensureSandboxDir(userIdOrSession);
  try {
    const fullPath = sanitizePath(relPath, userIdOrSession);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf8');
  } catch {
    return null;
  }
}

export function readSandboxBinaryFile(relPath: string, userIdOrSession?: string): Buffer | null {
  ensureSandboxDir(userIdOrSession);
  try {
    const fullPath = sanitizePath(relPath, userIdOrSession);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  } catch {
    return null;
  }
}

export function deleteSandboxFile(relPath: string, userIdOrSession?: string): boolean {
  ensureSandboxDir(userIdOrSession);
  try {
    const fullPath = sanitizePath(relPath, userIdOrSession);
    if (!fs.existsSync(fullPath)) return false;
    fs.unlinkSync(fullPath);
    return true;
  } catch {
    return false;
  }
}

export function getMimeTypeForFile(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.md':
      return 'text/markdown; charset=utf-8';
    case '.csv':
      return 'text/csv; charset=utf-8';
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case '.xls':
      return 'application/vnd.ms-excel';
    case '.pdf':
      return 'application/pdf';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.txt':
    case '.log':
      return 'text/plain; charset=utf-8';
    case '.py':
      return 'text/x-python; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.ts':
      return 'text/typescript; charset=utf-8';
    case '.html':
    case '.htm':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.zip':
      return 'application/zip';
    default:
      return 'application/octet-stream';
  }
}

export function getSandboxFileDetails(relPath: string, userIdOrSession?: string): { fullPath: string; exists: boolean; size: number; sha256: string; mimeType: string; filename: string } | null {
  const sandboxDir = ensureSandboxDir(userIdOrSession);
  try {
    const rawRel = String(relPath || '').trim();
    const cleanRel = rawRel
      .replace(/^(\/workspace\/|\/workspace|workspace\/)/i, '')
      .replace(/^\/+/, '');
    
    let fullPath = sanitizePath(cleanRel, userIdOrSession);
    let filename = path.basename(fullPath);

    // 1. Direct check in user sandboxDir
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const stat = fs.statSync(fullPath);
      const buf = fs.readFileSync(fullPath);
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      return {
        fullPath,
        exists: true,
        size: stat.size,
        sha256,
        mimeType: getMimeTypeForFile(filename),
        filename
      };
    }

    // Candidate paths to search for temporary / system probe files
    const candidatePaths: string[] = [];

    if (cleanRel.startsWith('tmp/')) {
      const strippedTmp = cleanRel.replace(/^tmp\//, '');
      candidatePaths.push(path.resolve(sandboxDir, strippedTmp));
    }
    candidatePaths.push(path.resolve(sandboxDir, 'tmp', filename));

    for (const candPath of candidatePaths) {
      try {
        if (fs.existsSync(candPath) && fs.statSync(candPath).isFile()) {
          const stat = fs.statSync(candPath);
          const buf = fs.readFileSync(candPath);
          const candSha = crypto.createHash('sha256').update(buf).digest('hex');
          return {
            fullPath: candPath,
            exists: true,
            size: stat.size,
            sha256: candSha,
            mimeType: getMimeTypeForFile(filename),
            filename
          };
        }
      } catch {}
    }

    return {
      fullPath,
      exists: false,
      size: 0,
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      mimeType: getMimeTypeForFile(filename),
      filename
    };
  } catch {
    return null;
  }
}

export interface PreFlightCheckResult {
  writablePath: string;
  isWritable: boolean;
  runtimes: {
    node: { available: boolean; version?: string; path?: string };
    python3: { available: boolean; version?: string; path?: string };
    bash: { available: boolean; version?: string; path?: string };
    npm: { available: boolean; version?: string; path?: string };
  };
  dependencies: string[];
  os: string;
  platform: string;
}

let cachedPreFlight: PreFlightCheckResult | null = null;
let lastCheckTime = 0;

export async function preFlightCheck(forceRefresh = false, userIdOrSession?: string): Promise<PreFlightCheckResult> {
  const now = Date.now();
  if (!forceRefresh && cachedPreFlight && (now - lastCheckTime < 60000)) {
    return cachedPreFlight;
  }

  const sandboxDir = ensureSandboxDir(userIdOrSession);

  let isWritable = false;
  try {
    const testFile = path.join(sandboxDir, '.write_test');
    fs.writeFileSync(testFile, 'ok', 'utf8');
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
      isWritable = true;
    }
  } catch {
    isWritable = false;
  }

  const checkBinary = (binName: string, versionFlag = '--version'): Promise<{ available: boolean; version?: string; path?: string }> => {
    return new Promise(resolve => {
      exec(`${binName} ${versionFlag}`, { timeout: 3000 }, (error, stdout, stderr) => {
        if (!error && (stdout || stderr)) {
          const ver = (stdout || stderr).trim().split('\n')[0];
          resolve({ available: true, version: ver, path: binName });
        } else {
          resolve({ available: false });
        }
      });
    });
  };

  const [nodeRes, pyRes, bashRes, npmRes] = await Promise.all([
    checkBinary('node', '-v'),
    checkBinary('python3', '--version'),
    checkBinary('bash', '--version'),
    checkBinary('npm', '-v')
  ]);

  let deps: string[] = [];
  try {
    const pkgPath = path.join(sandboxDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      deps = Object.keys(pkg.dependencies || {});
    }
  } catch {}

  cachedPreFlight = {
    writablePath: sandboxDir,
    isWritable,
    runtimes: {
      node: nodeRes,
      python3: pyRes,
      bash: bashRes,
      npm: npmRes
    },
    dependencies: deps,
    os: `${os.type()} ${os.release()}`,
    platform: process.platform
  };
  lastCheckTime = now;

  return cachedPreFlight;
}

export function listSandboxFiles(userIdOrSession?: string): Array<{ name: string; path: string; size: number; updatedAt: number }> {
  const sandboxDir = ensureSandboxDir(userIdOrSession);
  const results: Array<{ name: string; path: string; size: number; updatedAt: number }> = [];

  function walk(dir: string, prefix = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = path.join(prefix, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git' && !entry.name.startsWith('.')) {
            walk(full, rel);
          }
        } else {
          // Ignore hidden files and temporary execution artifacts
          if (
            entry.name.startsWith('.') ||
            entry.name.startsWith('_tmp_') ||
            entry.name.endsWith('.tmp') ||
            entry.name.includes('.tmp.')
          ) {
            continue;
          }
          const stats = fs.statSync(full);
          results.push({
            name: entry.name,
            path: `/workspace/${rel.replace(/\\/g, '/')}`,
            size: stats.size,
            updatedAt: stats.mtimeMs
          });
        }
      }
    } catch {}
  }

  walk(sandboxDir);
  return results;
}

export async function executeSandboxCommand(
  command: string, 
  timeoutSec = 15, 
  userIdOrSession?: string,
  syncFiles?: Record<string, string>
): Promise<ExecutionResult> {
  const sandboxDir = ensureSandboxDir(userIdOrSession);

  // Pre-sync client files to ensure target container instance has exact user session workspace
  if (syncFiles && typeof syncFiles === 'object') {
    for (const [filePath, content] of Object.entries(syncFiles)) {
      try {
        writeSandboxFile(filePath, String(content || ''), userIdOrSession);
      } catch (e) {
        console.warn(`[TerminalService] Failed pre-syncing file ${filePath}:`, e);
      }
    }
  }

  const startTime = Date.now();
  const filesBefore = new Set(listSandboxFiles(userIdOrSession).map(f => f.path));

  let adjustedCommand = command.trim();

  // Rewrite /workspace paths to the isolated sandboxDir
  adjustedCommand = adjustedCommand
    .replace(/\/workspace\//g, `${sandboxDir}/`)
    .replace(/\b\/workspace\b/g, sandboxDir);

  // Basic command safety check against destructive system commands
  const lowerCmd = adjustedCommand.toLowerCase();
  const prohibitedPatterns = [
    /rm\s+-rf\s+\//,
    /shutdown/,
    /reboot/,
    /init\s+0/,
    /mkfs/,
    /dd\s+if=/
  ];

  for (const pattern of prohibitedPatterns) {
    if (pattern.test(lowerCmd)) {
      return {
        stdout: '',
        stderr: 'Erro de segurança: Execução do comando bloqueada por política de segurança da plataforma.',
        exitCode: 126,
        durationMs: Date.now() - startTime,
        filesModified: []
      };
    }
  }

  if (adjustedCommand.startsWith('python ') || adjustedCommand === 'python' || adjustedCommand.includes(' python ')) {
    adjustedCommand = adjustedCommand.replace(/\bpython(\s|$)/g, 'python3$1');
  }

  // Minimal clean environment with complete Linux binary PATH
  const fullPath = `${process.env.PATH || ''}:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin`;
  const safeEnv: Record<string, string> = {
    PATH: fullPath,
    HOME: sandboxDir,
    TMPDIR: sandboxDir,
    PYTHONUNBUFFERED: '1',
    NODE_ENV: 'development',
    TERM: 'xterm-256color',
    LANG: 'C.UTF-8'
  };

  return new Promise<ExecutionResult>((resolve) => {
    const timeoutMs = Math.min(Math.max(timeoutSec, 1), 60) * 1000;

    exec(
      adjustedCommand,
      {
        cwd: sandboxDir,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        env: safeEnv,
        shell: '/bin/bash'
      },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        let exitCode = 0;
        let finalStdout = stdout ? String(stdout) : '';
        let finalStderr = stderr ? String(stderr) : '';

        if (error) {
          if (error.killed || (error as any).signal === 'SIGTERM') {
            finalStderr += `\n[Erro: Comando cancelado por tempo limite (${timeoutSec}s excedido)]`;
            exitCode = 124;
          } else if (typeof (error as any).code === 'number') {
            exitCode = (error as any).code;
          } else {
            exitCode = 1;
          }

          if (!finalStderr && error.message) {
            finalStderr = error.message;
          }
        }

        // Anti-masking rule & Runtime Guidance for Python execution
        if (
          (adjustedCommand.includes('python3') || adjustedCommand.includes('python ') || adjustedCommand === 'python3' || adjustedCommand === 'python') &&
          (finalStderr.includes('command not found') || finalStderr.includes('not found') || finalStdout.includes('command not found') || exitCode === 127)
        ) {
          exitCode = 127;
          if (!finalStderr.includes('Informação de Runtime do Sandbox')) {
            finalStderr = (finalStderr ? finalStderr.trim() + '\n' : '/bin/sh: line 1: python3: command not found\n') +
              '💡 [Informação de Runtime do Sandbox]: O executável \'python3\' não está instalado no container Linux do Sandbox. ' +
              'Runtimes de execução ativos no Sandbox: Node.js (v20+ / JavaScript / TypeScript) e Bash/Shell. ' +
              'Os arquivos .py são armazenados no Workspace como código-fonte.';
          }
        }

        const filesAfter = listSandboxFiles(userIdOrSession);
        const filesModified: string[] = [];
        const fileContents: Record<string, string> = {};

        for (const file of filesAfter) {
          if (!filesBefore.has(file.path) || file.updatedAt >= startTime) {
            filesModified.push(file.path);
            const content = readSandboxFile(file.path, userIdOrSession);
            if (content !== null) {
              fileContents[file.path] = content;
            }
          }
        }

        // Sanitize outputs replacing internal temp sandboxDir with /workspace
        if (sandboxDir) {
          const escapedDir = sandboxDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const dirRegex = new RegExp(escapedDir, 'g');
          finalStdout = finalStdout.replace(dirRegex, '/workspace');
          finalStderr = finalStderr.replace(dirRegex, '/workspace');
        }

        resolve({
          stdout: finalStdout,
          stderr: finalStderr,
          exitCode,
          durationMs,
          filesModified,
          fileContents
        });
      }
    );
  });
}

