import { ChatSession } from '../types';

export function getCleanSessionTitle(session: ChatSession): string {
  if (!session) return 'Nova conversa';

  // 1. Try to find the first visible user message to get the exact prompt
  if (session.messages && session.messages.length > 0) {
    const firstUserMsg = session.messages.find((m) => m.sender === 'user' && !m.isHidden);
    if (firstUserMsg) {
      let text = (firstUserMsg.text || '').trim();
      
      // Remove system tags and prefixes
      text = text.replace(/^\[Utilize as seguintes skills:[\s\S]*?\]\n\n/i, '');
      text = text.replace(/^\[SISTEMA:[\s\S]*?\]\n\n/i, '');
      text = text.replace(/^\[Texto Anexado do Editor:\n"[\s\S]*?"\]\n\n/i, '');
      if (text.includes('\\n')) {
        text = text.replace(/\\n/g, ' ');
      }
      text = text.trim();

      if (text) {
        return text.length > 28 ? `${text.substring(0, 28)}...` : text;
      }

      if (firstUserMsg.attachments && firstUserMsg.attachments.length > 0) {
        return `Anexo: ${firstUserMsg.attachments[0].name}`;
      }
    }
  }

  // 2. Check current title if valid and not an AI response or system placeholder
  const rawTitle = (session.title || '').trim();
  if (
    rawTitle &&
    !['nova conversa', 'chat temporário', 'conversa', 'chat', 'undefined'].includes(rawTitle.toLowerCase()) &&
    !rawTitle.startsWith('[SISTEMA') &&
    !rawTitle.startsWith('[Utilize') &&
    !rawTitle.startsWith('Olá!') &&
    !rawTitle.startsWith('Com certeza!') &&
    !rawTitle.startsWith('Entendi!') &&
    !rawTitle.startsWith('Aqui está')
  ) {
    return rawTitle;
  }

  return 'Nova conversa';
}
