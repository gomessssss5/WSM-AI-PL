import { ScheduledTask } from '../types';

export function extractWsmTask(text: string | undefined): { cleanText: string, taskObj: Partial<ScheduledTask> | null } {
  if (!text) return { cleanText: '', taskObj: null };

  const regex = /<wsm_task\s+title="([^"]+)"\s+prompt="([^"]+)"\s+scheduleType="([^"]+)"\s+time="([^"]+)"\s*\/>/i;
  const match = text.match(regex);

  if (!match) return { cleanText: text, taskObj: null };

  const cleanText = text.replace(regex, '').trim();
  const scheduleTypeRaw = match[3].toLowerCase();
  let scheduleType: 'once' | 'daily' | 'weekly' | 'monthly' = 'once';
  
  if (['once', 'daily', 'weekly', 'monthly'].includes(scheduleTypeRaw)) {
    scheduleType = scheduleTypeRaw as any;
  }

  const taskObj: Partial<ScheduledTask> = {
    title: match[1],
    prompt: match[2],
    scheduleType,
    time: match[4]
  };

  return { cleanText, taskObj };
}

export function cleanWsmTaskTags(text: string | undefined): string {
  if (!text) return '';
  return text.replace(/<wsm_task[\s\S]*?\/>/gi, '').trim();
}
