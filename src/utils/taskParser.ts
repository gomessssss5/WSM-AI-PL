import { ScheduledTask } from '../types';

export function extractWsmTasks(text: string | undefined): { cleanText: string; taskObjs: Partial<ScheduledTask>[] } {
  if (!text) return { cleanText: '', taskObjs: [] };

  const taskRegex = /<wsm_task\b([^>]*)\/?>/gi;
  const matches = [...text.matchAll(taskRegex)];

  if (matches.length === 0) {
    return { cleanText: text, taskObjs: [] };
  }

  const taskObjs: Partial<ScheduledTask>[] = [];

  for (const match of matches) {
    const attrString = match[1];

    const getAttr = (name: string) => {
      const regex = new RegExp(`${name}=["']([^"']*)["']`, 'i');
      const m = attrString.match(regex);
      return m ? m[1] : '';
    };

    const title = getAttr('title');
    const prompt = getAttr('prompt');
    const scheduleTypeRaw = getAttr('scheduleType').toLowerCase();
    const time = getAttr('time') || '09:00';
    const dateAttr = getAttr('date');
    const daysOfWeekAttr = getAttr('daysOfWeek');
    const dayOfMonthAttr = getAttr('dayOfMonth');

    let scheduleType: 'once' | 'daily' | 'weekly' | 'monthly' = 'once';
    if (['once', 'daily', 'weekly', 'monthly'].includes(scheduleTypeRaw)) {
      scheduleType = scheduleTypeRaw as any;
    }

    let daysOfWeek: number[] | undefined;
    if (daysOfWeekAttr) {
      daysOfWeek = daysOfWeekAttr.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    }

    let dayOfMonth: number | undefined;
    if (dayOfMonthAttr && !isNaN(Number(dayOfMonthAttr))) {
      dayOfMonth = Number(dayOfMonthAttr);
    }

    if (title || prompt) {
      taskObjs.push({
        title: title || 'Nova Tarefa Agendada',
        prompt: prompt || title || 'Executar tarefa agendada',
        scheduleType,
        time,
        date: dateAttr || undefined,
        daysOfWeek,
        dayOfMonth
      });
    }
  }

  const cleanText = text.replace(taskRegex, '').trim();

  return { cleanText, taskObjs };
}

export function extractWsmTask(text: string | undefined): { cleanText: string; taskObj: Partial<ScheduledTask> | null; taskObjs: Partial<ScheduledTask>[] } {
  const { cleanText, taskObjs } = extractWsmTasks(text);
  return {
    cleanText,
    taskObj: taskObjs.length > 0 ? taskObjs[0] : null,
    taskObjs
  };
}

export function cleanWsmTaskTags(text: string | undefined): string {
  if (!text) return '';
  return text.replace(/<wsm_task[\s\S]*?\/?>/gi, '').trim();
}
