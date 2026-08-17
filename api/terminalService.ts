import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

export const SANDBOX_DIR = path.join(os.tmpdir(), 'omnix_terminal_sandbox');

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  filesModified: string[];
  fileContents?: Record<string, string>;
}

export function ensureSandboxDir(): void {
  try {
    if (!fs.existsSync(SANDBOX_DIR)) {
      fs.mkdirSync(SANDBOX_DIR, { recursive: true });
    }

    const pkgPath = path.join(SANDBOX_DIR, 'package.json');
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

    const indexJsPath = path.join(SANDBOX_DIR, 'index.js');
    if (!fs.existsSync(indexJsPath)) {
      fs.writeFileSync(
        indexJsPath,
        `// Sandbox Node.js Execution Script\nconsole.log("🚀 Omnix Sandbox Runtime iniciado com sucesso!");\n`,
        'utf8'
      );
    }

    const testJsPath = path.join(SANDBOX_DIR, 'test.js');
    if (!fs.existsSync(testJsPath)) {
      fs.writeFileSync(
        testJsPath,
        `// Test Runner do Sandbox\nconsole.log("🧪 Executando bateria de testes...");\nconsole.log("  ✓ PASS: Teste inicial do sandbox");\nconsole.log("🎉 Todos os testes passaram!");\n`,
        'utf8'
      );
    }
  } catch (err) {
    console.error('[TerminalService] Error initializing sandbox directory:', err);
  }
}

export function sanitizePath(relPath: string): string {
  ensureSandboxDir();
  const normalized = path.normalize(relPath || '')
    .replace(/^(\/workspace\/|\/workspace|workspace\/)/i, '')
    .replace(/^\/+/, '');
  
  const resolvedPath = path.resolve(SANDBOX_DIR, normalized || 'arquivo.txt');
  
  const realSandbox = fs.existsSync(SANDBOX_DIR) ? fs.realpathSync(SANDBOX_DIR) : SANDBOX_DIR;
  if (!resolvedPath.startsWith(realSandbox) && !resolvedPath.startsWith(SANDBOX_DIR)) {
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

export function writeSandboxFile(relPath: string, content: string): string {
  ensureSandboxDir();
  const fullPath = sanitizePath(relPath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}

export function readSandboxFile(relPath: string): string | null {
  ensureSandboxDir();
  try {
    const fullPath = sanitizePath(relPath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf8');
  } catch {
    return null;
  }
}

export function deleteSandboxFile(relPath: string): boolean {
  ensureSandboxDir();
  try {
    const fullPath = sanitizePath(relPath);
    if (!fs.existsSync(fullPath)) return false;
    fs.unlinkSync(fullPath);
    return true;
  } catch {
    return false;
  }
}

export function listSandboxFiles(): Array<{ name: string; path: string; size: number; updatedAt: number }> {
  ensureSandboxDir();
  const results: Array<{ name: string; path: string; size: number; updatedAt: number }> = [];

  function walk(dir: string, prefix = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const rel = path.join(prefix, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            walk(full, rel);
          }
        } else {
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

  walk(SANDBOX_DIR);
  return results;
}

export async function executeSandboxCommand(command: string, timeoutSec = 15): Promise<ExecutionResult> {
  ensureSandboxDir();
  const startTime = Date.now();
  const filesBefore = new Set(listSandboxFiles().map(f => f.path));

  let adjustedCommand = command.trim();

  // Rewrite /workspace paths to SANDBOX_DIR so commands like
  // mkdir /workspace/dir, cat /workspace/file.txt, printf ... > /workspace/file.txt
  // execute against the sandbox directory instead of root /workspace on Cloud Run.
  adjustedCommand = adjustedCommand
    .replace(/\/workspace\//g, `${SANDBOX_DIR}/`)
    .replace(/\b\/workspace\b/g, SANDBOX_DIR);

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

  if (adjustedCommand.startsWith('python ') || adjustedCommand === 'python') {
    adjustedCommand = adjustedCommand.replace(/^python(\s|$)/, 'python3$1');
  }

  // Minimal clean environment stripped of process.env secrets
  const safeEnv: Record<string, string> = {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: SANDBOX_DIR,
    TMPDIR: SANDBOX_DIR,
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
        cwd: SANDBOX_DIR,
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
        env: safeEnv
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

        const filesAfter = listSandboxFiles();
        const filesModified: string[] = [];
        const fileContents: Record<string, string> = {};

        for (const file of filesAfter) {
          if (!filesBefore.has(file.path) || file.updatedAt >= startTime) {
            filesModified.push(file.path);
            const content = readSandboxFile(file.path);
            if (content !== null) {
              fileContents[file.path] = content;
            }
          }
        }

        // Sanitize outputs replacing internal temp SANDBOX_DIR with /workspace
        if (SANDBOX_DIR) {
          const escapedDir = SANDBOX_DIR.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
