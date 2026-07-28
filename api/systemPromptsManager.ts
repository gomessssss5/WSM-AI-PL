import fs from 'fs';
import path from 'path';

export interface SystemPromptItem {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
}

function getConfigFilePath(): string {
  const possiblePaths = [
    path.resolve(process.cwd(), 'api/promptsConfig.json'),
    path.resolve(process.cwd(), 'promptsConfig.json'),
    path.resolve(process.cwd(), 'dist/promptsConfig.json'),
    path.resolve(process.cwd(), 'dist/api/promptsConfig.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Default path if none exists
  return path.resolve(process.cwd(), 'api/promptsConfig.json');
}

/**
 * Reads all system prompts from disk.
 */
export function getAllSystemPrompts(): SystemPromptItem[] {
  try {
    const configPath = getConfigFilePath();
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[SystemPromptsManager] Error reading promptsConfig.json:', err);
  }
  return [];
}

/**
 * Gets a specific system prompt content by ID.
 * Returns defaultFallback if not found.
 */
export function getSystemPrompt(id: string, defaultFallback: string = ''): string {
  const prompts = getAllSystemPrompts();
  const found = prompts.find(p => p.id === id);
  return found && found.content ? found.content : defaultFallback;
}

/**
 * Updates a system prompt in the code file on disk (api/promptsConfig.json).
 */
export function updateSystemPrompt(id: string, newContent: string): { success: boolean; message: string; updatedPrompt?: SystemPromptItem } {
  try {
    const configPath = getConfigFilePath();
    const prompts = getAllSystemPrompts();
    const index = prompts.findIndex(p => p.id === id);

    if (index === -1) {
      return { success: false, message: `System prompt com ID '${id}' não foi encontrado.` };
    }

    prompts[index].content = newContent;

    fs.writeFileSync(configPath, JSON.stringify(prompts, null, 2), 'utf-8');
    console.log(`[SystemPromptsManager] Successfully saved system prompt '${id}' to ${configPath}.`);

    return { 
      success: true, 
      message: `System prompt '${prompts[index].name}' atualizado no código com sucesso!`,
      updatedPrompt: prompts[index]
    };
  } catch (err: any) {
    console.error(`[SystemPromptsManager] Failed to save system prompt '${id}':`, err);
    return { success: false, message: `Erro ao salvar no arquivo de código: ${err?.message || String(err)}` };
  }
}

