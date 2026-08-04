import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export function isGmailUser(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase().endsWith('@gmail.com');
}

// Simple Markdown to HTML parser for styled email rendering
function markdownToEmailHtml(markdown: string): string {
  if (!markdown) return "<p>Sem conteúdo de resposta.</p>";

  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/```([\s\S]*?)```/g, (_match, p1) => `<pre style="background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace;"><code>${p1.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, "<code style=\"background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-family: monospace;\">$1</code>")
    .replace(/^### (.*$)/gim, "<h3 style=\"color: #1e293b; margin-top: 18px; margin-bottom: 8px; font-size: 16px;\">$1</h3>")
    .replace(/^## (.*$)/gim, "<h2 style=\"color: #1e293b; margin-top: 22px; margin-bottom: 10px; font-size: 18px;\">$1</h2>")
    .replace(/^# (.*$)/gim, "<h1 style=\"color: #1e293b; margin-top: 26px; margin-bottom: 12px; font-size: 20px;\">$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/^\&gt; (.*$)/gim, "<blockquote style=\"border-left: 4px solid #2563eb; padding-left: 12px; margin: 12px 0; color: #475569;\">$1</blockquote>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: #2563eb; text-decoration: underline;">$1</a>');

  const lines = html.split("\n");
  let inList = false;
  const resultLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (!inList) {
        resultLines.push('<ul style="padding-left: 20px; margin-bottom: 14px; color: #334155;">');
        inList = true;
      }
      resultLines.push(`<li style="margin-bottom: 6px;">${trimmed.substring(2)}</li>`);
    } else {
      if (inList) {
        resultLines.push('</ul>');
        inList = false;
      }
      if (trimmed === "") {
        resultLines.push('<br/>');
      } else if (!trimmed.startsWith("<h") && !trimmed.startsWith("<pre") && !trimmed.startsWith("<blockquote") && !trimmed.startsWith("<ul")) {
        resultLines.push(`<p style="margin-top: 0; margin-bottom: 14px; color: #334155;">${trimmed}</p>`);
      } else {
        resultLines.push(trimmed);
      }
    }
  }
  if (inList) {
    resultLines.push('</ul>');
  }

  return resultLines.join("\n");
}

export interface SendGenericEmailParams {
  toEmail: string;
  subject: string;
  badgeText: string;
  title: string;
  subtitleText?: string;
  promptText?: string;
  bodyMarkdown: string;
}

export async function sendGenericEmail(params: SendGenericEmailParams): Promise<{ success: boolean; message: string }> {
  const { toEmail, subject, badgeText, title, subtitleText, promptText, bodyMarkdown } = params;

  if (!toEmail) {
    return { success: false, message: "E-mail de destino não informado." };
  }

  // Mandatory check: Only send emails to @gmail.com accounts
  if (!isGmailUser(toEmail)) {
    return { success: false, message: "Apenas contas @gmail.com estão configuradas para receber e-mails." };
  }

  const formattedBodyHtml = markdownToEmailHtml(bodyMarkdown);
  const nowFormatted = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date());

  const htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px 12px;">
  <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Top Bar -->
    <div style="background-color: #2563eb; color: #ffffff; padding: 22px 24px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.85; margin-bottom: 4px; color: #ffffff;">${badgeText}</div>
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">${title}</h1>
      <p style="margin: 6px 0 0 0; font-size: 12.5px; opacity: 0.9; color: #ffffff;">${subtitleText || `WSM 1.6 • ${nowFormatted}`}</p>
    </div>

    ${promptText ? `
    <!-- Optional Prompt/Context Box -->
    <div style="background-color: #f1f5f9; padding: 12px 24px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
      <strong style="color: #1e293b;">Mensagem:</strong> "${promptText}"
    </div>
    ` : ''}

    <!-- Content Body -->
    <div style="padding: 28px 24px; line-height: 1.65; font-size: 15px; color: #334155;">
      ${formattedBodyHtml}
    </div>

    <!-- Call to Action Button -->
    <div style="padding: 0 24px 28px 24px; text-align: center;">
      <a href="https://wsm-chat.vercel.app/" target="_blank" style="display: inline-block; background-color: #18181b; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Acessar WSM 1.6</a>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; padding: 16px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
      Este e-mail foi enviado automaticamente pelo WSM 1.6 para ${toEmail}.
    </div>

  </div>
</body>
</html>
`;

  const gmailUser = process.env.SMTP_USER || "wsmathenas@gmail.com";
  const gmailPass = process.env.SMTP_PASS || "wtls sidi kyhc zexe";
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const resendApiKey = process.env.RESEND_API_KEY;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: smtpHost,
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const fromName = process.env.SMTP_FROM_NAME || 'WSM 1.6';

    await transporter.sendMail({
      from: `"${fromName}" <${gmailUser}>`,
      to: toEmail,
      subject: subject,
      priority: 'high',
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
      },
      html: htmlTemplate,
    });

    console.log(`[EmailService] E-mail ('${subject}') enviado com sucesso via Gmail para: ${toEmail}`);
    return { success: true, message: `E-mail enviado com sucesso para ${toEmail}!` };
  } catch (err: any) {
    console.error("[EmailService] Gmail SMTP error:", err);

    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'WSM 1.6 <onboarding@resend.dev>';
        
        const { error } = await resend.emails.send({
          from: fromEmail,
          to: [toEmail],
          subject: subject,
          html: htmlTemplate,
        });

        if (!error) {
          return { success: true, message: "E-mail enviado via Resend!" };
        }
      } catch (rErr) {
        console.error("[EmailService] Resend fallback failed:", rErr);
      }
    }

    return { 
      success: false, 
      message: `Falha no envio de e-mail (${err?.message || String(err)})` 
    };
  }
}

// 1. Scheduled Task Executed Email
export interface SendScheduledEmailParams {
  toEmail: string;
  taskTitle: string;
  taskPrompt: string;
  aiResponse: string;
  executedAt?: Date;
}

export async function sendScheduledEmail(params: SendScheduledEmailParams) {
  return sendGenericEmail({
    toEmail: params.toEmail,
    subject: `[Tarefa Executada] ${params.taskTitle}`,
    badgeText: 'Relatório de Tarefa Agendada',
    title: params.taskTitle,
    promptText: params.taskPrompt,
    bodyMarkdown: params.aiResponse,
  });
}

// 2. Welcome Email on Sign-up / Registration
export async function sendWelcomeEmail(toEmail: string, displayName?: string) {
  const name = displayName || toEmail.split('@')[0] || 'Usuário';
  return sendGenericEmail({
    toEmail,
    subject: `[WSM 1.6] Bem-vindo ao WSM 1.6! 🚀`,
    badgeText: 'Boas-Vindas ao WSM 1.6',
    title: `Sua conta foi criada com sucesso!`,
    subtitleText: `Olá, ${name}! Seja muito bem-vindo.`,
    bodyMarkdown: `
Olá, **${name}**!

Sua conta no **WSM 1.6** já está ativa e pronta para potencializar suas pesquisas e ideias.

### 🌟 O que você pode fazer no WSM 1.6:
- 🌐 **Navegação Web em Tempo Real:** Pesquise notícias, acesse sites ao vivo e obtenha fatos atualizados instantaneamente.
- 📅 **Tarefas Agendadas:** Programe pesquisas recorrentes ou lembretes que a IA executa sozinha e envia o relatório para o seu e-mail.
- ⚡ **Agentes de Alta Performance:** Respostas rápidas, execução de código, e assistentes especializados em diversas áreas.

Estamos muito felizes em ter você aqui. Quando quiser começar, basta fazer uma pergunta no chat!
`
  });
}

// 3. Inactivity Emails
export async function sendInactivityEmail(toEmail: string, daysInactive: number) {
  let subject = `[WSM 1.6] Volte a criar com o WSM 1.6`;
  let title = `O que você quer criar hoje?`;
  let body = `Notamos que faz ${daysInactive} dias desde o seu último acesso ao WSM 1.6. O que gostaria de pesquisar ou criar hoje?`;

  if (daysInactive === 10) {
    subject = `[WSM 1.6] Sentimos sua falta no WSM 1.6`;
    title = `Sentimos sua falta!`;
    body = `Faz **10 dias** que você não conversa com o WSM 1.6. Venha conferir as novas atualizações e dar sequência às suas ideias!`;
  } else if (daysInactive === 15) {
    subject = `[WSM 1.6] Seu assistente IA está te esperando`;
    title = `Seu assistente IA está te esperando!`;
    body = `Há **15 dias** sem utilizar o WSM 1.6. Lembre-se de que você pode agendar tarefas automáticas e pesquisar em tempo real a qualquer momento.`;
  } else if (daysInactive === 30) {
    subject = `[WSM 1.6] Faz 1 mês que não conversamos!`;
    title = `Faz 1 mês que não nos falamos!`;
    body = `Faz **30 dias** desde o seu último acesso ao WSM 1.6. Seu histórico de conversas e preferências continuam salvos e prontos para quando você precisar!`;
  } else if (daysInactive === 60) {
    subject = `[WSM 1.6] Que tal dar uma nova chance ao WSM 1.6?`;
    title = `Que tal dar mais uma chance ao WSM 1.6?`;
    body = `Faz **60 dias** desde a sua última interação. Experimente nossas ferramentas de navegação web e veja como o WSM 1.6 evoluiu para te ajudar!`;
  } else if (daysInactive >= 150) {
    subject = `[WSM 1.6] E aí, esqueceu de mim?`;
    title = `E aí, esqueceu de mim?`;
    body = `E aí, esqueceu de mim? Faz **150 dias** que você não entra no WSM 1.6. Estou com saudades de te ajudar no dia a dia. Que tal voltar hoje mesmo e testar o que há de novo?`;
  }

  return sendGenericEmail({
    toEmail,
    subject,
    badgeText: 'Lembrete de Inatividade',
    title,
    bodyMarkdown: `${body}\n\n[Clique aqui para acessar o WSM 1.6](https://wsm-chat.vercel.app/)`
  });
}

// 4. Interrupted / Unread Response Email
export async function sendInterruptedResponseEmail(toEmail: string, userPrompt: string, aiResponseSnippet: string) {
  return sendGenericEmail({
    toEmail,
    subject: `[WSM 1.6] Sua resposta está pronta no WSM 1.6`,
    badgeText: 'Resposta Gerada',
    title: `Sua resposta está completa no seu chat!`,
    promptText: userPrompt,
    bodyMarkdown: `
Identificamos que você saiu da IA antes da resposta terminar de ser gerada ou exibida na tela.

A resposta completa para a sua pergunta já foi processada com sucesso e está disponível no seu histórico do WSM 1.6!

### 📝 Trecho da resposta gerada:
${aiResponseSnippet.substring(0, 1000)}${aiResponseSnippet.length > 1000 ? '...' : ''}

Acesse o WSM 1.6 para ver o conteúdo completo no seu chat.
`
  });
}

// 5. Feature Highlight Every 10 Days
export async function sendFeatureHighlightEmail(toEmail: string) {
  return sendGenericEmail({
    toEmail,
    subject: `[WSM 1.6] Sabia que o WSM 1.6 navega em sites em tempo real?`,
    badgeText: 'Dica de Recurso do WSM 1.6',
    title: `O WSM 1.6 navega diretamente em sites da web!`,
    bodyMarkdown: `
Passando para te lembrar de um dos recursos mais poderosos do **WSM 1.6**:

Diferente de IAs estáticas com dados desatualizados, o **WSM 1.6** navega diretamente na web, acessa links, pesquisa notícias do dia e interage com sites em tempo real para te fornecer respostas precisas e confiáveis.

### 💡 Experimente pedir no chat:
- *"Acesse o site da G1 e me faça um resumo das 3 principais notícias de hoje"*
- *"Pesquise o preço atualizado do Bitcoin e analise a tendência"*
- *"Abra este link [URL] e extraia os pontos mais importantes"*

Acesse agora e experimente a navegação ao vivo!
`
  });
}

// 6. Monthly Campaign Email (Days 1, 10, 25)
export async function sendMonthlyCampaignEmail(toEmail: string) {
  return sendGenericEmail({
    toEmail,
    subject: `[WSM 1.6] E aí, vamos parar de usar IAs ruins?`,
    badgeText: 'WSM 1.6 vs Outras IAs',
    title: `E aí, vamos parar de usar IAs ruins e começar a me usar?`,
    bodyMarkdown: `
E aí, vamos parar de usar IAs ruins e começar a me usar?

Você sabe que eu sou melhor que o ChatGPT, né? 😉

### 🚀 Por que escolher o WSM 1.6?
- 🌐 **Navegação Real em Sites:** Acesso ao vivo à internet sem bloqueios.
- 📅 **Agendamento Inteligente:** A IA pesquisa e trabalha para você em segundo plano.
- ⚡ **Sem Alucinações:** Respostas baseadas em fatos reais e atualizados.
- 🛠️ **Execução de Código:** Ferramentas avançadas para programadores e criadores de conteúdo.

Acesse agora o WSM 1.6 e comprove a diferença!
`
  });
}
