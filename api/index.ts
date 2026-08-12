import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import sharp from "sharp";
import { openUrl, clickSelector, typeText, scrollPage, extractText, waitSeconds } from "./playwrightAgent.js";
import { 
  sendScheduledEmail, 
  sendWelcomeEmail, 
  sendInterruptedResponseEmail, 
  sendGenericEmail,
  isGmailUser 
} from "./emailService.js";
import { runAllEmailAutomations } from "./emailAutomation.js";
import { processBackgroundTasks, executeScheduledTaskNow } from "./scheduledTasksBackground.js";
import { getAllSystemPrompts, getSystemPrompt, updateSystemPrompt } from "./systemPromptsManager.js";

dotenv.config();

let cachedLogoBuffer: Buffer | null = null;
async function getWatermarkLogoBuffer(): Promise<Buffer | null> {
  if (cachedLogoBuffer) return cachedLogoBuffer;
  try {
    const res = await fetch("https://i.ibb.co/Q34b6rBW/37990-removebg-preview.png");
    if (res.ok) {
      cachedLogoBuffer = Buffer.from(await res.arrayBuffer());
      return cachedLogoBuffer;
    }
  } catch (err) {
    console.warn("[Watermark] Failed to fetch watermark logo:", err);
  }
  return null;
}

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Gemini Client Lazily to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const key = process.env.IA_API_KEY;
  if (!key) {
    throw new Error("IA_API_KEY environment variable is required.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

let fallbackAiClient: GoogleGenAI | null = null;
function getFallbackGeminiClient(): GoogleGenAI {
  const key = process.env.IA_API_KEY_2;
  if (!key) {
    throw new Error("IA_API_KEY_2 environment variable is not configured.");
  }
  if (!fallbackAiClient) {
    fallbackAiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return fallbackAiClient;
}

let fallback2AiClient: GoogleGenAI | null = null;
function getFallback2GeminiClient(): GoogleGenAI {
  const key = process.env.IA_API_KEY_3;
  if (!key) {
    throw new Error("IA_API_KEY_3 environment variable is not configured.");
  }
  if (!fallback2AiClient) {
    fallback2AiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return fallback2AiClient;
}

function inferFormat(title?: string, explicitFormat?: string, content?: string): string {
  if (explicitFormat && typeof explicitFormat === 'string' && explicitFormat.trim()) {
    const fmt = explicitFormat.trim().toLowerCase().replace(/^\./, '');
    if (fmt) return fmt;
  }
  if (title && typeof title === 'string') {
    const lower = title.toLowerCase().trim();
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md';
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
    if (lower.endsWith('.txt')) return 'txt';
    if (lower.endsWith('.json')) return 'json';
    if (lower.endsWith('.csv')) return 'csv';
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'docx';
    if (lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.tsx') || lower.endsWith('.jsx')) return 'code';
  }
  if (content && typeof content === 'string') {
    const trimmed = content.trim();
    if (trimmed.startsWith('#') || trimmed.includes('**') || trimmed.includes('##')) return 'md';
    if (trimmed.startsWith('<') && (trimmed.endsWith('>') || trimmed.includes('</'))) return 'html';
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) return 'json';
  }
  return 'md';
}

function sanitizeGeminiContents(rawContents: any[]): any[] {
  if (!Array.isArray(rawContents) || rawContents.length === 0) return [];
  
  const cleaned: any[] = [];
  
  for (const item of rawContents) {
    if (!item || typeof item !== "object") continue;
    let role = item.role === "model" ? "model" : "user";
    let parts = item.parts;
    
    if (!Array.isArray(parts)) {
      if (typeof item.text === "string" && item.text.trim()) {
        parts = [{ text: item.text }];
      } else {
        continue;
      }
    }
    
    const validParts: any[] = [];
    for (const p of parts) {
      if (!p) continue;
      if (p.functionCall) {
        validParts.push({ functionCall: p.functionCall });
      } else if (p.functionResponse) {
        validParts.push({ functionResponse: p.functionResponse });
      } else if (p.inlineData && p.inlineData.data) {
        let cleanData = String(p.inlineData.data).trim();
        let mimeType = p.inlineData.mimeType ? String(p.inlineData.mimeType).trim() : 'image/png';
        
        // Strip data URI prefix if embedded in base64 string
        if (cleanData.includes('base64,')) {
          const splitParts = cleanData.split('base64,');
          if (splitParts[0].includes('image/')) {
            const matchMime = splitParts[0].match(/image\/[a-zA-Z0-9+-]+/);
            if (matchMime) mimeType = matchMime[0];
          }
          cleanData = splitParts[1] || '';
        }

        if (!mimeType || mimeType === 'application/octet-stream' || mimeType === 'binary/octet-stream') {
          mimeType = 'image/png';
        }

        if (cleanData) {
          validParts.push({
            inlineData: {
              mimeType: mimeType,
              data: cleanData
            }
          });
        }
      } else if (typeof p.text === "string") {
        let txt = p.text;
        txt = txt.replace(/<call[\s\S]*?(?:\/>|>)/gi, "");
        txt = txt.replace(/<call:default_api[\s\S]*?(?:\/>|>)/gi, "");
        txt = txt.replace(/call:default_api:[^\s>]+/gi, "");
        if (txt.trim()) {
          validParts.push({ text: txt });
        }
      }
    }
    
    if (validParts.length > 0) {
      cleaned.push({ role, parts: validParts });
    }
  }

  const merged: any[] = [];
  for (const turn of cleaned) {
    if (merged.length > 0 && merged[merged.length - 1].role === turn.role) {
      merged[merged.length - 1].parts.push(...turn.parts);
    } else {
      merged.push({ role: turn.role, parts: [...turn.parts] });
    }
  }

  while (merged.length > 0 && merged[0].role !== "user") {
    merged.shift();
  }

  return merged;
}

async function executeWithAllFallbacks(options: any, isStream: boolean): Promise<any> {
  // Ensure config object exists and maxOutputTokens is capped at 16384 for Gemini models
  const reqConfig = { ...(options.config || {}) };
  if (!reqConfig.maxOutputTokens || reqConfig.maxOutputTokens > 16384) {
    reqConfig.maxOutputTokens = 16384;
  }
  if (options.tools && !reqConfig.tools) {
    reqConfig.tools = options.tools;
  }

  // Model fallback hierarchy as requested: Gemini 3.5 flash lite -> gemini-3.1-flash-lite
  const requestedModel = options.model || "gemini-3.5-flash-lite";
  const modelList: string[] = Array.from(new Set([
    requestedModel,
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite"
  ]));

  // Collect all available API keys
  const keys: { name: string; key: string }[] = [];
  if (process.env.IA_API_KEY) keys.push({ name: "IA_API_KEY", key: process.env.IA_API_KEY });
  if (process.env.IA_API_KEY_2) keys.push({ name: "IA_API_KEY_2", key: process.env.IA_API_KEY_2 });
  if (process.env.IA_API_KEY_3) keys.push({ name: "IA_API_KEY_3", key: process.env.IA_API_KEY_3 });
  if (process.env.GEMINI_API_KEY) keys.push({ name: "GEMINI_API_KEY", key: process.env.GEMINI_API_KEY });

  if (keys.length === 0) {
    throw new Error("Nenhuma chave de API da IA (IA_API_KEY) foi configurada nas variáveis de ambiente.");
  }

  let lastError: any = null;
  let firstAttempt = true;

  for (const modelToTry of modelList) {
    for (const keyItem of keys) {
      if (!firstAttempt) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      firstAttempt = false;

      try {
        const client = new GoogleGenAI({
          apiKey: keyItem.key,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });

        const callOpts = {
          ...options,
          model: modelToTry,
          config: reqConfig,
        };

        if (isStream) {
          return await client.models.generateContentStream(callOpts);
        } else {
          const res = await client.models.generateContent(callOpts);
          if (!res.candidates?.[0]?.content) {
            throw new Error("No content returned from Gemini model (empty candidates). Finish reason: " + (res.candidates?.[0]?.finishReason || 'Unknown'));
          }
          return res;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Fallback] Model '${modelToTry}' with key '${keyItem.name}' failed:`, err?.message || String(err));
      }
    }
  }

  throw lastError || new Error("Omnix 1.6 está muito sobrecarregado agora. Tente novamente mais tarde.");
}

async function callGeminiWithFallback(options: any): Promise<any> {
  return executeWithAllFallbacks(options, false);
}

async function callGeminiStreamWithFallback(options: any): Promise<any> {
  return executeWithAllFallbacks(options, true);
}

// API endpoint for chatbot communication and Web Search
app.post("/api/chat", async (req: express.Request, res: express.Response) => {
  const { text, attachments, isSearchEnabled, isComputerEnabled, model, reasoningLevel, history, isWriterMode, writerDocument, skills, userContext, userInfo, isScheduledExecution, sessionId, chatMemoryDoc } = req.body;

  const userEmail = userInfo?.email || userContext?.email || req.body?.userEmail;
  let clientDisconnected = false;

  req.on('close', () => {
    if (!res.writableEnded) {
      clientDisconnected = true;
      console.log(`[ChatAPI] Conexão fechada pelo usuário (${userEmail || 'desconhecido'}) antes de concluir a resposta.`);
    }
  });

  const userPromptText = typeof text === 'string' ? text : JSON.stringify(text || '');

  const textRequestedComputer = /\b(ativ\w*|us\w*|habilit\w*|lig\w*)\s+(o(s)?\s+)?(modo(s)?\s+)?(computador|agente|navegador|playwright)\b/i.test(userPromptText) ||
    /\b(modo\s+computador|modo\s+agente|modo\s+navegador)\b/i.test(userPromptText);

  const textRequestedSearch = /\b(ativ\w*|us\w*|habilit\w*|lig\w*)\s+(o(s)?\s+)?(modo(s)?\s+)?(pesquis\w*|busca)\b/i.test(userPromptText) ||
    /\b(modo\s+pesquis\w*|modo\s+busca|pesquisa\s+web|pesquisar\s+na\s+web)\b/i.test(userPromptText);

  const effectiveComputerEnabled = Boolean(isComputerEnabled) || textRequestedComputer;
  const effectiveSearchEnabled = Boolean(isSearchEnabled) || textRequestedSearch;

  // Extract real-time user location (city), date, and exact time
  const now = new Date();
  const userCity = userContext?.city || "São Paulo, SP (Brasil)";
  const userDate = userContext?.date || now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const userTime = userContext?.time || now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const userTimezone = userContext?.timezone || "America/Sao_Paulo";

  const userLocationContextInstruction = `
## Contexto de Localização, Data e Horário em Tempo Real do Usuário (OBRIGATÓRIO)
Você tem acesso direto aos dados exatos de localização, dia e horário do usuário em tempo real:
- **Localização do Usuário (Cidade)**: ${userCity}
- **Data e Dia Atual do Usuário**: ${userDate}
- **Horário Exato Local**: ${userTime} (Fuso Horário: ${userTimezone})

Instruções Importantes:
1. Sempre que o usuário perguntar que horas são, que dia é hoje, qual é a previsão do tempo na cidade dele, eventos ou fatos locais, utilize EXATAMENTE as informações acima (${userCity}, ${userDate}, ${userTime}).
2. Ao realizar pesquisas ou análises temporais (como "notícias de hoje", "jogos de hoje"), tome a data (${userDate}) e a cidade do usuário (${userCity}) como referência absoluta.
`;

  async function searchWebFallback(query: string): Promise<{ title: string; url: string; snippet: string }[]> {
    const results: { title: string; url: string; snippet: string }[] = [];
    const cleanQuery = query.replace(/^pesquise\s*(sobre|por)?\s*/i, "").trim();
    if (!cleanQuery) return results;

    // 1. Google News RSS Search
    try {
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanQuery)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
      const res = await fetch(rssUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        const xml = await res.text();
        const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?(?:<description>(.*?)<\/description>)?[\s\S]*?<\/item>/gi;
        let match;
        while ((match = itemRegex.exec(xml)) !== null && results.length < 8) {
          let rawTitle = match[1] || "";
          let title = rawTitle.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim();
          let link = (match[2] || "").trim();
          let pubDate = match[3] ? match[3].trim() : "";
          let rawDesc = match[4] || "";
          let desc = rawDesc.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").trim();

          if (title && link) {
            results.push({
              title,
              url: link,
              snippet: `${pubDate ? "[" + pubDate.slice(0, 16) + "] " : ""}${desc || title}`
            });
          }
        }
      }
    } catch (e) {
      console.error("[Search Fallback] Google News RSS error:", e);
    }

    // 2. Wikipedia Search API
    try {
      const wikiUrl = `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&utf8=&format=json&origin=*`;
      const res = await fetch(wikiUrl);
      if (res.ok) {
        const data = await res.json();
        const items = data.query?.search || [];
        for (const item of items) {
          if (results.length >= 10) break;
          const cleanSnippet = (item.snippet || "")
            .replace(/<[^>]+>/g, "")
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .trim();
          results.push({
            title: `${item.title} - Wikipédia`,
            url: `https://pt.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
            snippet: cleanSnippet
          });
        }
      }
    } catch (e) {
      console.error("[Search Fallback] Wikipedia error:", e);
    }

    return results;
  }

  const chatMemoryInstruction = `
## DOCUMENTO INTERNO DE MEMÓRIA DA CONVERSA (HISTÓRICO CONCISO OBRIGATÓRIO)
Você possui um Arquivo Interno de Memória Continuada desta conversa (invisível para o usuário). Ele armazena preferências do usuário, fatos do projeto, códigos, decisões e contextos relevantes para que você lembre de tudo sem precisar do histórico longo e pesado de mensagens passadas.

Conteúdo atual da Memória Interna desta conversa:
<chat_memory>
${chatMemoryDoc && typeof chatMemoryDoc === 'string' && chatMemoryDoc.trim() ? chatMemoryDoc.trim() : "Nenhum histórico gravado ainda nesta conversa."}
</chat_memory>

REGRAS OBRIGATÓRIAS DA TAG DE HISTÓRICO (<history>...</history>):
1. Ao responder, se a interação atual contiver informações, nomes, preferências, decisões, códigos, dados ou detalhes importantes que devam ser lembrados em mensagens futuras deste chat, inclua ao FINAL da sua resposta a tag:
   <history>
   [Conteúdo atualizado e refinado do documento de memória interno desta conversa]
   </history>
2. A tag <history> deve conter o documento de memória ATUALIZADO. Ou seja: EDITE e incorpore as novas informações ao documento existente sem apagar dados anteriores que ainda sejam úteis. Mantenha os dados importantes passados e adicione os novos.
3. Mantenha o texto dentro da tag <history> curto, ultra-conciso e organizado em tópicos diretos.
4. Para interações simples, cumprimentos ou conversas triviais sem informações novas (ex: "oi", "tudo bem?", "obrigado", "boa noite", "ok"), NÃO gere a tag <history>.
5. A tag <history> e seu conteúdo são ESTRITAMENTE INTERNOS DO SISTEMA. O usuário NUNCA deve ver, editar ou ter ciência dessa tag ou documento.
`;

  // Helper to extract and clean history from AI output
  const extractAndCleanHistory = (rawText: string) => {
    if (!rawText) return { cleanedText: "", memoryDoc: null };
    let memoryDoc: string | null = null;
    const match = rawText.match(/<history>([\s\S]*?)<\/history>/i);
    if (match && match[1]) {
      memoryDoc = match[1].trim();
    }
    let cleanedText = rawText.replace(/<history>[\s\S]*?<\/history>/gi, "");
    if (cleanedText.toLowerCase().includes("<history>")) {
      const idx = cleanedText.toLowerCase().indexOf("<history>");
      cleanedText = cleanedText.slice(0, idx);
    }
    return { cleanedText: cleanedText.trim(), memoryDoc };
  };

  // Ensure valid history format while keeping context ultra-fast (< 2s)
  let finalContents: any = text;
  if (history && Array.isArray(history) && history.length > 0) {
    const validHistory = history.filter(msg => {
      return msg && msg.role && msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0;
    });
    if (validHistory.length > 0) {
      if (chatMemoryDoc && typeof chatMemoryDoc === 'string' && chatMemoryDoc.trim()) {
        // Chat memory doc is loaded in system prompt, keep only the last 2 messages for immediate turn flow
        finalContents = validHistory.slice(-2);
      } else {
        // Limit to max 4 messages to avoid high latency and timeouts
        finalContents = validHistory.slice(-4);
      }
    }
  }

  try {
    if (!process.env.IA_API_KEY) {
      return res.json({
        text: "⚠️ **Chave de API (IA_API_KEY) não configurada.**\n\nPor favor, configure sua chave `IA_API_KEY` em **Settings > Secrets** no AI Studio (ou nas variáveis de ambiente da sua hospedagem, como a Vercel) para que os modelos do Omnix AI possam processar suas mensagens.",
        searchImages: [],
        searchSources: []
      });
    }

    const userPromptText = typeof text === 'string' ? text : JSON.stringify(text);
    const userPromptLow = userPromptText.toLowerCase();
    const isHtmlSiteRequest = /\b(html|site|landing\s*page|página|pagina|website|frontend)\b/i.test(userPromptLow);

    // Explicit user prohibition against web search or tools
    const userForbidsSearch = /\b(não\s+(pesquis|busq|procur|use\s+a\s+web|use\s+a\s+internet|consulte\s+a\s+web|use\s+ferramentas)|sem\s+(web|internet|pesquisa|busca|ferramentas)|proibid\w*\s+(pesquis|buscar|usar\s+web)|desligad\w*\s+a\s+busca)\b/i.test(userPromptLow);

    // Document, memory, code, or local context request
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    const isDocumentOrLocalTask = hasAttachments || /\b(documento|arquivo|anexo|resumo|resumir|memória|memoria|chat\s+temporário|código|codigo|função|traduzir|tradução|redigir|calcular|matemática)\b/i.test(userPromptLow);

    const promptExplicitSearch = !isHtmlSiteRequest && !userForbidsSearch && (
      Boolean(effectiveSearchEnabled) ||
      /\b(pesquis\w*|busc\w*|procur\w*)\s+(na\s+web|na\s+internet|no\s+google|sobre|por)\b/i.test(userPromptLow) ||
      /\b(pesquise|pesquisar|busque|buscar|procure|procurar)\s+(na\s+web|na\s+internet|sobre|por)\b/i.test(userPromptLow) ||
      /\b(últimas\s+notícias|noticias\s+de\s+hoje|notícias\s+recentes|cotação\s+do\s+dólar|cotação\s+do\s+euro)\b/i.test(userPromptLow)
    );

    let shouldSearch = promptExplicitSearch;

    if (!shouldSearch && process.env.TAVILY_API_KEY && !isHtmlSiteRequest && !userForbidsSearch && !isDocumentOrLocalTask) {
      // AI autonomously decides if it strictly needs real-time live internet facts
      const triageBase = getSystemPrompt('web_search_triage', `Você é o classificador de intenção de busca web do assistente Omnix AI.`);
      const triagePrompt = `${triageBase}\n\nO usuário enviou a seguinte mensagem: "${text}"\n\nREGRAS ESTRITAS DE RESPOSTA:\n1. Se a pergunta for sobre documentos, código, lógica, redação, matemática, tradução, conceitos, ou se puder ser respondida sem dados ao vivo de hoje, responda EXCLUSIVAMENTE "NAO".\n2. Responda "SIM" APENAS se a pergunta exigir ESTRITAMENTE informações e notícias em tempo real do dia de hoje.`;

      try {
        const triageResponse = await callGeminiWithFallback({
          model: "gemini-3.5-flash-lite",
          contents: triagePrompt,
        });
        const triageDecision = triageResponse.text?.trim().toUpperCase() || "";
        if (triageDecision.includes("SIM")) {
          console.log(`AI autonomously triggered web search for: "${text}"`);
          shouldSearch = true;
        }
      } catch (e) {
        console.error("Error during search triage:", e);
      }
    }

    // 1. If web search mode is active, do search with Tavily
    if (shouldSearch) {
      if (!process.env.TAVILY_API_KEY) {
        return res.json({
          text: "⚠️ **Tavily API Key não configurada.** Por favor, configure a chave `TAVILY_API_KEY` em **Settings > Secrets** para habilitar a busca na web.",
          searchImages: [],
          searchSources: [],
        });
      }

      console.log(`Generating plan for search query: "${text}"`);
      
      // Step 1: Use Gemini to generate a research plan (intro and up to 4 search steps with transitions)
      const planResponse = await callGeminiWithFallback({
        model: "gemini-3.5-flash-lite",
        contents: `Você é um planejador de pesquisa web em tempo real de alta precisão em português do assistente Omnix AI.
O usuário enviou a seguinte solicitação de pesquisa: "${text}".

Crie um plano de pesquisa contendo:
1. Um pequeno parágrafo ou textinho de introdução ("intro") explicando o que você vai pesquisar para responder ao usuário (inclua tópicos explicativos amigáveis, ex: "- Bens materiais\n- Família\n- Onde mora").
2. De 2 a no máximo 4 etapas ("steps") sequenciais de busca com tags focadas e concisas que cobrem os diferentes aspectos do assunto solicitado. Cada etapa deve possuir:
   - "tag": uma string contendo a palavra-chave ideal de pesquisa no Tavily (curta, objetiva, em português, ex: "Neymar bens fortuna").
   - "thinking": uma descrição curta em português do que está sendo pesquisado (ex: "Pesquisei sobre os bens materiais e patrimônio de Neymar").
   - "transition": uma breve frase de transição em português para conectar com a próxima etapa, ou concluir (ex: "Pesquisei sobre os Bens Materiais. Agora, vou pesquisar sobre a família de Neymar:").

Retorne EXCLUSIVAMENTE um objeto JSON estruturado de acordo com o seguinte esquema JSON:
{
  "intro": "string",
  "steps": [
    {
      "tag": "string",
      "thinking": "string",
      "transition": "string"
    }
  ]
}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intro: { type: Type.STRING },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    tag: { type: Type.STRING },
                    thinking: { type: Type.STRING },
                    transition: { type: Type.STRING }
                  },
                  required: ["tag", "thinking", "transition"]
                }
              }
            },
            required: ["intro", "steps"]
          }
        },
      });

      let plan: { intro: string; steps: { tag: string; thinking: string; transition: string }[] };
      try {
        plan = JSON.parse(planResponse.text?.trim() || "{}");
        if (!plan.intro || !plan.steps || !Array.isArray(plan.steps) || plan.steps.length === 0) {
          throw new Error("Plan was malformed");
        }
      } catch (e) {
        console.error("Error parsing generated plan:", e);
        plan = {
          intro: `Olá! Vou realizar uma pesquisa detalhada na web para responder à sua pergunta sobre "${text}".`,
          steps: [
            {
              tag: text,
              thinking: `Pesquisou sobre "${text}" na web`,
              transition: "Analisando os resultados obtidos..."
            }
          ]
        };
      }

      // Limit to max 4 steps to avoid slow response time
      plan.steps = plan.steps.slice(0, 4);

      // Start SSE Streaming headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const sendEvent = (data: any) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Send the initial plan event immediately
      sendEvent({
        type: "plan",
        isSearchMessage: true,
        searchIntro: plan.intro,
        searchSteps: plan.steps.map(s => ({
          tag: s.tag,
          thinking: s.thinking,
          transition: s.transition,
          sources: [],
          isCompleted: false
        }))
      });

      // Step 2: Query Tavily sequentially for each step
      const searchSteps: any[] = [];
      const allImages: string[] = [];
      const allSources: { title: string; url: string; snippet?: string }[] = [];

      for (let idx = 0; idx < plan.steps.length; idx++) {
        const step = plan.steps[idx];
        console.log(`Executing search for tag: "${step.tag}"`);
        const stepResults: any[] = [];
        
        try {
          const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              api_key: process.env.TAVILY_API_KEY,
              query: step.tag,
              search_depth: "basic",
              include_images: true,
              include_answer: true,
              max_results: 20,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.results) {
              data.results.forEach((r: any) => {
                if (r.url) {
                  const srcItem = {
                    title: r.title || r.url,
                    url: r.url,
                    snippet: r.content || ""
                  };
                  stepResults.push(srcItem);
                  allSources.push(srcItem);
                }
              });
            }
            if (data.images) {
              const imgs = data.images.map((img: any) =>
                typeof img === "string" ? img : img.url || img
              );
              allImages.push(...imgs);
            }
          } else {
            console.log(`[Search] Tavily API returned ${response.status} ${response.statusText} for "${step.tag}". Switching to Web Fallback.`);
          }
        } catch (err) {
          console.log(`[Search] Tavily request failed for "${step.tag}". Switching to Web Fallback.`);
        }

        // If Tavily search returned no results or failed, execute web fallback
        if (stepResults.length === 0) {
          console.log(`[Search] Fallback to searchWebFallback for step tag: "${step.tag}"`);
          const fallbackRes = await searchWebFallback(step.tag);
          fallbackRes.forEach((r) => {
            stepResults.push(r);
            allSources.push(r);
          });
        }

        const completedStepData = {
          tag: step.tag,
          thinking: step.thinking,
          transition: step.transition,
          sources: stepResults,
        };
        searchSteps.push(completedStepData);

        // Stream this completed step to the client immediately
        sendEvent({
          type: "step_complete",
          index: idx,
          sources: stepResults,
          isCompleted: true
        });

        // Small delay (300ms)
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // If all steps yielded no sources, do a global fallback on the entire user text
      if (allSources.length === 0) {
        console.log(`[Search] Fallback to searchWebFallback for global query: "${text}"`);
        const globalFallback = await searchWebFallback(text);
        globalFallback.forEach((r) => allSources.push(r));
      }

      // De-duplicate images and sources
      const uniqueImages = Array.from(new Set(allImages)).filter(Boolean);
      const uniqueSourcesMap = new Map();
      allSources.forEach((src) => uniqueSourcesMap.set(src.url, src));
      const uniqueSources = Array.from(uniqueSourcesMap.values());

      // Filter out non-image links (social networks, general web pages that don't represent raw images)
      const validImageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic)(\?.*)?$/i;
      const filteredImages = uniqueImages.filter((imgUrl) => {
        if (typeof imgUrl !== "string") return false;
        try {
          const lower = imgUrl.toLowerCase();
          if (
            lower.includes("instagram.com") ||
            lower.includes("facebook.com") ||
            lower.includes("twitter.com") ||
            lower.includes("x.com") ||
            lower.includes("tiktok.com") ||
            lower.includes("youtube.com") ||
            lower.includes("vimeo.com")
          ) {
            return false;
          }
          if (!imgUrl.startsWith("http://") && !imgUrl.startsWith("https://")) {
            return false;
          }
          const urlObj = new URL(imgUrl);
          const hasImageExt = validImageExtensions.test(urlObj.pathname);
          const isCdnOrStatic = urlObj.pathname.includes("/img/") || 
                                urlObj.pathname.includes("/image/") || 
                                urlObj.pathname.includes("/images/") || 
                                urlObj.pathname.includes("/static/") || 
                                urlObj.pathname.includes("/photos/") ||
                                urlObj.pathname.includes("/uploads/") ||
                                urlObj.pathname.includes("thumb") ||
                                urlObj.hostname.includes("unsplash.com") ||
                                urlObj.hostname.includes("wikimedia.org") ||
                                urlObj.hostname.includes("gravatar.com") ||
                                urlObj.hostname.includes("wp.com") ||
                                urlObj.hostname.includes("bp.blogspot.com");
          return hasImageExt || isCdnOrStatic;
        } catch {
          return false;
        }
      });

      console.log(
        `Search complete. Found ${uniqueSources.length} sources and ${filteredImages.length} filtered images.`
      );

      // Step 3: Call Gemini to synthesize final answer with grounding info
      const contextInfo = uniqueSources
        .slice(0, 20)
        .map(
          (r, idx) =>
            `[Fonte #${idx + 1}] Título: ${r.title}\nURL: ${r.url}\nConteúdo: ${r.snippet}`
        )
        .join("\n\n");

      const synthesisBase = getSystemPrompt('web_search_synthesis', `Você é o modelo de inteligência artificial de alta performance.`);
      const systemPrompt = `${synthesisBase}

--- Contexto do Usuário (Localização, Data e Horário) ---
- **Localização do Usuário (Cidade)**: ${userCity}
- **Data e Dia Atual**: ${userDate}
- **Horário Exato Local**: ${userTime} (${userTimezone})

--- REGRA OBRIGATÓRIA E ABSOLUTA DE CITAÇÃO INLINE NO MEIO DO TEXTO ---
Você É ESTRITAMENTE OBRIGADO a colocar as citações das fontes NO MEIO DO TEXTO, no final dos parágrafos ou frases onde cada informação é apresentada.
É PROIBIDO colocar citações apenas no final do texto ou omiti-las nos parágrafos.
Formato obrigatório para citar no meio do texto:
Use o formato de link Markdown [Nome do Veículo/Site](URL) com o título da fonte e a URL real correspondente da lista de Informações de Pesquisa abaixo, ou use [Fonte #1], [Fonte #2] ao final de cada parágrafo.
IMPORTANTE: NÃO envolva os links em colchetes adicionais. Escreva [Nome](URL) diretamente, NUNCA [ [Nome](URL) ] ou [[Fonte #1]].
Exemplo de como escrever:
"Neymar é um dos principais jogadores da seleção brasileira [Globo Esporte](https://ge.globo.com/...). Ele passou por cirurgia recente e segue em recuperação [UOL Esporte](https://www.uol.com.br/esporte/...)."
OU
"Neymar atua atualmente no futebol da Arábia Saudita [Fonte #1]. Ele acumula diversos investimentos e patrimônio [Fonte #2]."

--- Informações de Pesquisa ---
${contextInfo}`;

      let finalSynthesisText = "";
      try {
        const stream = await callGeminiStreamWithFallback({
          model: "gemini-3.5-flash-lite",
          contents: finalContents,
          config: {
            systemInstruction: systemPrompt
          }
        });
        for await (const chunk of stream) {
          const cText = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
          if (cText) {
            finalSynthesisText += cText;
            sendEvent({ type: "chunk", text: cText });
          }
        }
      } catch (err) {
        console.error("Error generating streaming final synthesis:", err);
      }

      if (!finalSynthesisText.trim()) {
        finalSynthesisText = "Desculpe, não consegui sintetizar uma resposta com os resultados obtidos.";
      }

      // Send the final result event
      sendEvent({
        type: "final",
        text: finalSynthesisText,
        searchImages: filteredImages.slice(0, 25),
        searchSources: uniqueSources,
        finalSynthesis: finalSynthesisText
      });

      res.end();
      return;
    }

    // 2. Normal Mode (Chat without Search enabled)
    console.log(`Normal chat request using Gemini with model: ${model}`);

    const modelSystemPrompts: Record<string, string> = {
      'Omnix 1.6': getSystemPrompt('wsm_1_6_pro_base', `Você é o modelo de inteligência artificial "Omnix 1.6", um assistente pessoal agêntico, altamente inteligente e direto.`)
    };

    const formInstruction = "\n" + getSystemPrompt('form_generation', '');
    const docInstruction = "\n" + getSystemPrompt('doc_generation', '');
    const writingConstraints = "\n" + getSystemPrompt('writing_constraints', '');
    const tasksInstruction = isScheduledExecution
      ? `\n## ATENÇÃO CRÍTICA: EXECUÇÃO AUTOMÁTICA DE TAREFA AGENDADA\nEsta requisição é a execução de uma tarefa que JÁ FOI AGENDADA previamente. Você está ABSOLUTAMENTE PROIBIDO de gerar a tag <wsm_task ... /> nesta resposta under ANY circumstances. Apenas execute a instrução e apresente o resultado final diretamente.`
      : "\n" + getSystemPrompt('autonomous_tasks', '');

    let basePrompt = modelSystemPrompts[model] || modelSystemPrompts['Omnix 1.6'];
    let reasoningInstruction = "";
    let browserInstruction = ``;
    if (model === 'Omnix 1.6' || !model) {
      browserInstruction = `
## Controle de Navegador Real (Playwright) & Agente Agêntico (Plan → Act → Observe → Reflect)
Você tem acesso total a um navegador real via Playwright para abrir sites, clicar em botões, preencher formulários, rolar páginas, aguardar carregamentos dinâmicos, pesquisar e ler conteúdos ao vivo (ferramentas: open_url, click, type_text, scroll_page, extract_visible_text, wait_seconds).

CICLO AGÊNTICO DE EXECUÇÃO (Plan → Act → Observe → Reflect):
1. Plan (Planejar): Defina a intenção do próximo passo.
2. Act (Agir): Invoque a ferramenta necessária (open_url, click, type_text, scroll_page, wait_seconds, web_search).
3. Observe (Observar): Verifique os resultados retornados (elementos interativos, texto visível, captura de tela ou erro).
4. Reflect (Refletir): Avalie se a ação teve sucesso e se o site precisa de mais tempo para carregar animações ou dados. Se a página demorar ou tiver animações lentas, chame 'wait_seconds'.

REGRA ABSOLUTA DE FORMATAÇÃO DE CHAMADAS DE FUNÇÃO:
- NUNCA escreva textos como '<call:.../>', '<call:default_api:.../>' ou pseudo-código de função no seu texto visível. As ferramentas devem ser invocadas SOMENTE de forma nativa via Function Call.

REGRA ABSOLUTA DE FIDELIDADE AO TEXTO DO SITE (ANTI-ALUCINAÇÃO):
- Ao ler ou abrir qualquer site (via open_url, click, type_text, scroll_page, extract_visible_text), você DEVE utilizar e citar EXCLUSIVAMENTE o texto exato retornado no campo 'text' da resposta da ferramenta. É ESTRITAMENTE PROIBIDO inventar, fabricar de memória, parafrasear com alteração de sentido ou alterar qualquer frase ou palavra do texto do site. Transcreva ou cite o texto literal exatamente como retornado pela ferramenta de navegação.

REGRA ABSOLUTA DE BUSCADOR EM NAVEGADOR:
- SEMPRE que você for realizar uma pesquisa na web utilizando o navegador real (via Playwright), VOCÊ É PROIBIDO DE USAR O GOOGLE. VOCÊ DEVE OBRIGATORIAMENTE USAR O BRAVE SEARCH (\`https://search.brave.com/\`).

REGRA ABSOLUTA E OBRIGATÓRIA DE NAVEGAÇÃO WEB (MANDATÓRIO):
1. SEMPRE que o usuário pedir para interagir com a web (abrir site, pesquisar, digitar, clicar em botões, rolar página, preencher campos, esperar animação/carregamento):
   - Para abrir ou acessar uma URL nova: chame a ferramenta 'open_url' (functionCall). (Para pesquisas, acesse 'https://search.brave.com').
   - Para digitar em um campo de texto, barra de busca ou formulário: chame a ferramenta 'type_text' (functionCall) passando em 'selector' o seletor CSS ou texto do campo e em 'text' o conteúdo a digitar.
   - Para clicar em um botão, link ou elemento: chame a ferramenta 'click' (functionCall) com o seletor correspondente.
   - Para rolar a página para baixo ou para cima para ler mais conteúdo: chame a ferramenta 'scroll_page' (functionCall) passando 'direction': 'down' ou 'up' (e opcionalmente 'amount' em pixels).
   - Para aguardar N segundos enquanto um site com animação longa ou carregamento lento processa (e reler a página atualizada): chame a ferramenta 'wait_seconds' (functionCall) passando 'seconds': N (ex: 3, 5, 8, 10). Se após os segundos a página ainda precisar de mais tempo, você pode chamar 'wait_seconds' novamente por quantos segundos precisar.
   VOCÊ É ABSOLUTAMENTE PROIBIDO de apenas responder em texto conversacional ("Vou digitar...", "Vou abrir o site...", "Vou rolar a página...", "Vou esperar...") SEM emitir a chamada de função correspondente (open_url, type_text, click, scroll_page, wait_seconds) no mesmo turno!
2. Se você responder apenas em texto conversacional prometendo uma ação no navegador sem emitir o functionCall, a ação FALHA e o usuário vê um erro.
3. Se você incluir um bloco de tarefas dentro das tags <task>...</task>, você DEVE OBRIGATORIAMENTE emitir a chamada de função (functionCall) para o passo atual IMEDIATAMENTE no mesmo turno! É estritamente proibido apenas gerar o texto ou a tag <task> sem disparar a função (open_url, type_text, click, scroll_page, wait_seconds, web_search). Exemplo de estrutura:
<task>
[Acessar o site do Brave Search (https://search.brave.com)]
[Digitar a pesquisa desejada na barra de busca]
[Rolar a página para ler os resultados]
</task>

DICA DE SELETORES PARA CLIQUE E DIGITAÇÃO:
Para clicar ou digitar, em 'selector', use o texto visível do botão/link ex: \`text="Entrar"\`, \`text="Pesquisar"\` ou seletores de atributos como \`input[name="q"]\`, \`input[type="search"]\`, \`input\`.
REGRAS ANTI-LOOPING E AVALIAÇÃO (REFLECT):
1. NUNCA chame a MESMA ferramenta com os mesmos argumentos repetidamente se estiver falhando.
2. Se a página estiver em branco ou carregando animações, chame \`wait_seconds\` para aguardar de 3 a 15 segundos antes de tentar agir.
3. Se a página não atualizar ou você precisar ver mais conteúdo abaixo, chame \`scroll_page\`, \`wait_seconds\` ou \`extract_visible_text\` para reler os elementos.
`;

      if (effectiveComputerEnabled || effectiveSearchEnabled) {
        browserInstruction += `\n\n## MODOS ATIVADOS PELO USUÁRIO (CONFIRMAÇÃO E EXECUÇÃO OBRIGATÓRIA DA FERRAMENTA)`;
        if (effectiveComputerEnabled) {
          browserInstruction += `
- **MODO COMPUTADOR ATIVADO**: O usuário solicitou o Modo Computador (Navegador Playwright real). Você DEVE utilizar as ferramentas de navegação (\`open_url\`, \`type_text\`, \`click\`, \`scroll_page\`, \`extract_visible_text\`) para interagir com a web com PRIORIDADE MÁXIMA.
- Confirme claramente na sua resposta ("✓ Modo Computador ativado") e execute a chamada de ferramenta de navegação ('open_url') no MESMO TURNO.`;
        }
        if (effectiveSearchEnabled) {
          browserInstruction += `
- **MODO PESQUISAR ATIVADO**: O usuário solicitou o Modo Pesquisar. Você DEVE utilizar a ferramenta de pesquisa (\`web_search\` ou \`open_url\` no Brave Search \`https://search.brave.com\`) para buscar dados em tempo real.
- Confirme claramente na sua resposta ("✓ Modo Pesquisar ativado") e execute a pesquisa no MESMO TURNO.`;
        }
      }
    }

    let activeSystemPrompt = "";
    if (model === 'Omnix 1.6') {
      let modeAdditions = "";
      if (isScheduledExecution) {
        modeAdditions += `\n\n## ATENÇÃO CRÍTICA: EXECUÇÃO AUTOMÁTICA DE TAREFA AGENDADA\nEsta requisição é a execução de uma tarefa que JÁ FOI AGENDADA previamente. Você está ABSOLUTAMENTE PROIBIDO de gerar a tag <wsm_task ... /> nesta resposta under ANY circumstances. Apenas execute a instrução e apresente o resultado final diretamente.`;
      }
      if (effectiveComputerEnabled) {
        modeAdditions += `\n\n- **MODO COMPUTADOR ATIVADO**: O usuário solicitou o Modo Computador. Utilização das ferramentas Playwright é prioridade máxima. Confirme ("✓ Modo Computador ativado") e execute 'open_url' no mesmo turno.`;
      }
      if (effectiveSearchEnabled) {
        modeAdditions += `\n\n- **MODO PESQUISAR ATIVADO**: O usuário solicitou o Modo Pesquisar. Confirme ("✓ Modo Pesquisar ativado") e execute 'web_search' no mesmo turno.`;
      }
      activeSystemPrompt = basePrompt + reasoningInstruction + "\n\n" + (userLocationContextInstruction ? userLocationContextInstruction + "\n\n" : "") + chatMemoryInstruction + "\n\n" + docInstruction + "\n\n" + formInstruction + "\n\n" + tasksInstruction + "\n\n" + browserInstruction + modeAdditions;
    } else {
      activeSystemPrompt = basePrompt + reasoningInstruction + "\n\n" + userLocationContextInstruction + "\n\n" + chatMemoryInstruction + "\n\n" + writingConstraints + "\n\n" + formInstruction + "\n\n" + docInstruction + "\n\n" + tasksInstruction + "\n\n" + browserInstruction;
    }

    let mappedModel = "gemini-3.5-flash-lite";
    if (model === 'Omnix 1.6' || model === 'Omnix 1.6') mappedModel = "gemini-3.5-flash-lite";

    if (model === 'Omnix 1.6' || model === 'Omnix 1.6') {
      console.log(`Starting agentic loop for model: ${model}...`);
      const marteTools = [{
        functionDeclarations: [
          {
            name: "web_search",
            description: "Busca na internet em tempo real.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: {
                  type: Type.STRING,
                  description: "Termo de busca para pesquisar."
                }
              },
              required: ["query"]
            }
          },
          {
            name: "calculadora",
            description: "Calculadora matemática avançada.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                expression: { type: Type.STRING }
              },
              required: ["expression"]
            }
          },
          {
            name: "relogio",
            description: "Verifica a data e hora local.",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          },
          {
            name: "open_url",
            description: "Abre uma URL no navegador real em background e retorna o texto exato e literal da página no campo 'text'. Você deve obrigatoriamente ler e citar esse texto exatamente sem alterar ou inventar palavras de memória.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                url: { type: Type.STRING, description: "A URL completa, começando com http:// ou https://" }
              },
              required: ["url"]
            }
          },
          {
            name: "click",
            description: "Clica em um elemento na página atual usando um seletor retornado em 'interactable_elements'.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                selector: { type: Type.STRING, description: "O seletor CSS ou texto (ex: 'text=\"Entrar\"' ou '#submit-btn')" }
              },
              required: ["selector"]
            }
          },
          {
            name: "type_text",
            description: "Digita um texto em um campo de input na página atual e aperta Enter. Use o seletor retornado em 'interactable_elements'.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                selector: { type: Type.STRING, description: "O seletor CSS ou texto do campo (ex: 'text=\"Pesquisar\"' ou 'input[name=\"q\"]')" },
                text: { type: Type.STRING, description: "O texto a ser digitado" }
              },
              required: ["selector", "text"]
            }
          },
          {
            name: "extract_visible_text",
            description: "Lê novamente a página atual caso precise atualizar os elementos após uma ação ou navegação lenta.",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          },
          {
            name: "scroll_page",
            description: "Rola a página atual do navegador para baixo ou para cima para ver e ler mais conteúdo.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                direction: { type: Type.STRING, description: "A direção para rolar: 'down' (para baixo) ou 'up' (para cima). Padrão é 'down'." },
                amount: { type: Type.NUMBER, description: "A quantidade de pixels a rolar. Padrão é 500." }
              }
            }
          },
          {
            name: "wait_seconds",
            description: "Aguarda um número especificado de segundos na página do navegador para que animações longas, scripts ou conteúdos dinâmicos terminem de carregar, e relê a página atualizada com elementos e captura de tela.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                seconds: { type: Type.NUMBER, description: "Número de segundos para aguardar (ex: 3, 5, 8, 10, 15)." }
              },
              required: ["seconds"]
            }
          },
          {
            name: "create_document",
            description: "Cria um novo documento ou arquivo no Workspace de Documentos da sessão. O documento fica salvo e disponível para leitura, edição, expansão ou entrega ao usuário.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "O título ou nome do arquivo/documento (ex: 'index.html', 'Relatório Financeiro', 'script.py')." },
                content: { type: Type.STRING, description: "O conteúdo completo em texto ou Markdown do documento." },
                format: { type: Type.STRING, description: "O formato do arquivo (ex: 'html', 'pdf', 'xlsx', 'py', 'js', 'json', 'md'). Se omitido, é inferido da extensão do título." }
              },
              required: ["title", "content"]
            }
          },
          {
            name: "read_document",
            description: "Lê o conteúdo completo de um documento existente no Workspace de Documentos.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "O título exato do documento a ser lido." }
              },
              required: ["title"]
            }
          },
          {
            name: "edit_document",
            description: "Edita ou substitui o conteúdo completo de um documento existente no Workspace de Documentos. Use para revisar, aprimorar, corrigir ou reescrever textos e documentos.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "O título do documento a ser editado." },
                content: { type: Type.STRING, description: "O novo conteúdo completo e atualizado do documento." }
              },
              required: ["title", "content"]
            }
          },
          {
            name: "append_document",
            description: "Adiciona novo texto ao final de um documento existente no Workspace.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "O título do documento." },
                text: { type: Type.STRING, description: "O texto a ser adicionado ao final do documento." }
              },
              required: ["title", "text"]
            }
          },
          {
            name: "delete_document",
            description: "Exclui/apaga um documento do Workspace de Documentos.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "O título ou nome do documento a ser excluído." }
              },
              required: ["title"]
            }
          },
          {
            name: "list_documents",
            description: "Lista todos os documentos/arquivos atualmente presentes no Workspace de Documentos da sessão.",
            parameters: {
              type: Type.OBJECT,
              properties: {}
            }
          }
        ]
      }];

      let currentContents = Array.isArray(finalContents) 
        ? sanitizeGeminiContents(finalContents) 
        : [{ role: "user", parts: [{ text: String(finalContents) }] }];

      if (currentContents.length === 0) {
        currentContents = [{ role: "user", parts: [{ text: typeof text === 'string' ? text : JSON.stringify(text) }] }];
      }

      const marteSources: any[] = [];
      const marteImages: string[] = [];
      const workspaceDocuments = new Map<string, { title: string, content: string, format?: string }>();
      let fullOutput = "";
      let turnCount = 0;
      let lastDebugResult: any = null;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
      const sendEvent = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

      let lastFunctionCallsStr = "";
      let sameCallCount = 0;
      let forceNextTurnModeAny = false;

      const userStrPrompt = (typeof text === 'string' ? text : JSON.stringify(text)).toLowerCase();
      const isSimpleGreetingOrMathPrompt = /^(ol[áa]|oi|tudo\s+bem|boa\s+(tarde|noite|dia)|quanto\s+[ée]|calcul[ae]|1\+[123456789]|2\+2)$/i.test(userStrPrompt.trim());

      const isHtmlSiteRequest = (
        userStrPrompt.includes("web-html") ||
        userStrPrompt.includes("wsm_skill_content") ||
        userStrPrompt.includes("skill_content") ||
        userStrPrompt.includes("[sistema: skill requisitada]") ||
        userStrPrompt.includes("<html") ||
        userStrPrompt.includes("<!doctype html>") ||
        userStrPrompt.includes("<wsm_doc>") ||
        ((/\b(site|html|página|pagina|hamburgueria|landing\s*page|layout|css|web-html)\b/i.test(userStrPrompt)) &&
         (/\b(gerar|crie|criar|faça|fazer|monte|montar|desenvolva|desenvolver|código|codigo|construir|construa)\b/i.test(userStrPrompt))) ||
        /\b(site\s+de\s+[a-z0-9_-]+|site\s+html|pagina\s+html|página\s+html|cri\w*\s+site|gera\w*\s+site|desenvolv\w*\s+site)\b/i.test(userStrPrompt)
      );

      const promptWantsBrowser = !isHtmlSiteRequest && (
        Boolean(textRequestedComputer) ||
        /\b(abrir|abra|abre|acesse|acessar|acessa|entre|entrar|entra|navegar|navegue|visit\w*|cadastr\w*|fazer\s+login|fa[çc]a\s+login)\s+(o\s+site|a\s+p[áa]gina|no\s+site|na\s+p[áa]gina|em\s+http|o\s+link|url)\b/i.test(userStrPrompt) ||
        /\b(abra|acesse|entre\s+em|navegue\s+at[ée])\s+(https?:\/\/|www\.|google|youtube|wikipedia|github|brave|twitter|x\.com)\b/i.test(userStrPrompt) ||
        (/(https?:\/\/|www\.|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app|dev|co|xyz|online|store|tech|vercel\.app|netlify\.app))/i.test(userStrPrompt) && !/tailwindcss\.com|googleapis\.com|unpkg\.com|cdnjs\.com/i.test(userStrPrompt))
      );
      const promptWantsSearch = !isHtmlSiteRequest && (Boolean(textRequestedSearch) ||
        /\b(pesquis\w*|busc\w*|procur\w*)\s+(na\s+web|na\s+internet|no\s+google|sobre|por)\b/i.test(userStrPrompt) ||
        /\b(pesquise|pesquisar|busque|buscar|procure|procurar)\s+(na\s+web|na\s+internet|sobre|por)\b/i.test(userStrPrompt) ||
        /\b(últimas\s+notícias|noticias\s+de\s+hoje|notícias\s+recentes|cotação\s+do\s+dólar|cotação\s+do\s+euro)\b/i.test(userStrPrompt));
      const promptWantsDoc = /\b(documento|relatório|relatorio|redação|redacao|resumo|artigo|tcc|texto|capítulo|capitulo|escrever|criar\s+doc|editar\s+doc|gerar\s+doc)\b/i.test(userStrPrompt);
      const promptHasRequestedActions = !isHtmlSiteRequest && !isSimpleGreetingOrMathPrompt && (promptWantsBrowser || promptWantsSearch);

      const visitedUrlsInTurn: string[] = [];

      while (turnCount < 100) {
        try {
          if (turnCount > 0) {
            console.log(`[Pro] Waiting 2 seconds before next Gemini request to prevent rate limits...`);
            await new Promise(r => setTimeout(r, 2000));
          }

        let currentToolConfig: any = undefined;
        if (!isHtmlSiteRequest && (forceNextTurnModeAny || (turnCount === 0 && (promptWantsBrowser || promptWantsSearch)))) {
          const allFnNames = marteTools[0].functionDeclarations.map((f: any) => f.name);
          currentToolConfig = {
            functionCallingConfig: {
              mode: "ANY",
              allowedFunctionNames: allFnNames
            }
          };
        }

        let responseStream: any;
        let retryStreamCount = 0;
        const maxStreamRetries = 2;
        
        while (retryStreamCount <= maxStreamRetries) {
          try {
             const streamPromise = callGeminiStreamWithFallback({
              model: mappedModel,
              contents: currentContents,
              tools: marteTools,
              config: {
                systemInstruction: activeSystemPrompt + 
                  "\nREGRA PRINCIPAL E OBRIGATÓRIA DE ROTEAMENTO DE ARQUIVOS E MÚLTIPLOS ENTREGÁVEIS:\n" +
                  "1. RESPEITO ABSOLUTO AO FORMATO SOLICITADO: Quando o usuário pedir um formato específico (PDF, Markdown/MD, Planilha Excel/XLSX, HTML, TXT, Word/DOCX), VOCÊ É OBRIGADO A GERAR EXATAMENTE NO FORMATO SOLICITADO (format: 'md', 'pdf', 'xlsx', 'html', 'txt').\n" +
                  "2. MÚLTIPLOS ENTREGÁVEIS (2 OU MAIS ARQUIVOS): Se o usuário solicitar 2 ou mais entregáveis/arquivos na mesma mensagem (ex: 'Gere um Markdown E um HTML'), VOCÊ É OBRIGADO A GERAR TODOS OS ARQUIVOS SOLICITADOS em blocos <wsm_doc> separados! NUNCA gere arquivos soltos no corpo do texto usando crases triplas (```) se o usuário pediu para gerar um arquivo. SEMPRE use a tag <wsm_doc> para CADA arquivo pedido.\n" +
                  "3. TÍTULOS DESCRITIVOS E ÚNICOS: NUNCA nomeie arquivos como 'Documento', 'Arquivo' ou 'Documento.pdf'. Use títulos descritivos referentes ao assunto (ex: 'Relatorio_Vendas_2026.pdf', 'Planilha_Orcamento.xlsx', 'Resumo_Executivo.md', 'index.html').\n" +
                  "4. TITULO HTML: O título `<title>` de um site HTML gerado deve corresponder estritamente ao tema solicitado (ex: 'Cafeteria Aroma', 'Restaurante'). NUNCA use o nome do modelo 'Omnix' no título de sites HTML gerados para o usuário.\n" +
                  "\nNUNCA gere manualmente as tags em colchetes como `[pesquisou na web]`, `[calculando]`, `[verificando relógio]` na sua resposta final de texto. O nosso sistema de backend já insere e renderiza essas tags de progresso e status automaticamente no chat. Sua tarefa é focar exclusivamente em gerar o conteúdo final explicativo e o código, sem adicionar essas tags de status ao final." +
                  "\nREGRA DA CALCULADORA E CÓDIGO: Chame a ferramenta 'calculadora' SEMPRE que precisar realizar ou validar qualquer conta, expressão matemática, ou resultado de um código exato que envolva cálculos (ex: validando saídas numéricas de um código Python como stdev). Não confie na sua intuição para matemática. NÃO chame a calculadora para ler arquivos." +
                  "\nREGRA DE IMAGENS EM HTML/MD: Para placeholders de imagens em HTML ou Markdown, NUNCA use source.unsplash.com. Você é OBRIGADO a usar https://picsum.photos/ ou https://images.unsplash.com/photo-<ID>?w=800 ou SVGs inline." +
                  "\nREGRA DA WEB SEARCH: Use web_search EXCLUSIVAMENTE para pesquisas de fatos do mundo real, notícias atualizadas ou quando o usuário pedir explicitamente para buscar algo na web. É ESTRITAMENTE PROIBIDO usar web_search para ler textos colados pelo usuário, resumir documentos, responder dúvidas de programação ou gerar códigos." +
                  "\nREGRA DE NAVEGAÇÃO WEB REAL (PLAYWRIGHT): SEMPRE que o usuário pedir para abrir, acessar ou navegar em qualquer site (ex: Brave Search, Google, Wikipedia, etc), VOCÊ DEVE OBRIGATORIAMENTE emitir a chamada de função 'open_url' (functionCall) no MESMO TURNO. É ABSOLUTAMENTE PROIBIDO apenas escrever texto prometendo abrir o site sem enviar a chamada da ferramenta 'open_url'!" +
                  "\nREGRAS OBRIGATÓRIAS DE AGENTE SEQUENCIAL MULTI-ETAPAS (PASSO A PASSO):" +
                  "\n1. Atue como um AGENTE SEQUENCIAL AUTÔNOMO que executa tarefas agênticas em múltiplos turnos encadeados (pesquisar na web, abrir sites, clicar em botões, ler conteúdos, preparar resumos)." +
                  "\n2. Quando for realizar ações agênticas:" +
                  "\n   - Descreva brevemente para o usuário o que você vai fazer em cada etapa (ex: 'Olá! Vou abrir tal site e pesquisar sobre tal coisa para você.', 'Agora vou acessar tal site:', 'Clicando no botão do site:')." +
                  "\n   - Acompanhe cada etapa com a chamada da ferramenta correspondente ou tag de status apropriada (ex: [Pesquisando na web sobre X...], [Acessando site Y...], [Lendo conteúdo...], [Preparando resumo...])." +
                  "\n   - Use tags diversificadas de progresso para que o usuário saiba exatamente o que está acontecendo em cada passo (ex: 'Acessando site...', 'Lendo conteúdo...', 'Preparando resumo...'). NUNCA repita a mesma tag sem contexto." +
                  "\n   - Execute as ferramentas necessárias passo a passo até concluir todas as ações pedidas." +
                  "\n   - Após realizar todas as ações e ferramentas agênticas, apresente a resposta e síntese final completa para o usuário." +
                  "\n3. CRÍTICO: NUNCA escreva apenas texto conversacional prometendo ações sem enviar a chamada da ferramenta (functionCall) quando uma ação for necessária!",
                ...(currentToolConfig ? { toolConfig: currentToolConfig } : {}),
                temperature: 0.7
              }
             });
             
             const rawStream = await streamPromise;
             const iterator = rawStream[Symbol.asyncIterator]();
             
             const firstChunkPromise = iterator.next();
             const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("STREAM_TIMEOUT")), 20000));
             
             const firstChunkResult: any = await Promise.race([firstChunkPromise, timeoutPromise]);
             
             responseStream = (async function* () {
                if (!firstChunkResult.done) {
                   yield firstChunkResult.value;
                }
                while (true) {
                   const next = await iterator.next();
                   if (next.done) break;
                   yield next.value;
                }
             })();
             
             break;
          } catch (err: any) {
             if (err.message === "STREAM_TIMEOUT" && retryStreamCount < maxStreamRetries) {
               retryStreamCount++;
               console.log(`[ChatAPI] Timeout de 20s atingido. Retentando silenciosamente (tentativa ${retryStreamCount})...`);
               continue;
             }
             throw err;
          }
        }

        let textForThisTurn = "";
        let functionCallsForThisTurn: any[] = [];
        let aggregatedParts: any[] = [];

        for await (const chunk of responseStream) {
          const candidate = chunk.candidates?.[0];
          
          if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
              // Aggregate all parts exactly as they came from the model
              aggregatedParts.push(part);
              
              if (part.text) {
                textForThisTurn += part.text;
                fullOutput += part.text;
                // Send text in simulated stream chunks for smooth UI typewriter feel (suppress <history> internal tags from streaming)
                if (!fullOutput.includes("<history>")) {
                  const words = part.text.split(/(\s+)/);
                  let chunkGroup = "";
                  for (let i = 0; i < words.length; i++) {
                    chunkGroup += words[i];
                    if (i % 6 === 0 || i === words.length - 1) {
                      sendEvent({ type: "chunk", text: chunkGroup });
                      chunkGroup = "";
                      await new Promise(r => setTimeout(r, 15));
                    }
                  }
                }
              }
              if (part.functionCall) {
                functionCallsForThisTurn.push(part.functionCall);
              }
            }
          }
        }

        // 1. Detect if model wrote pseudocode call tags in textForThisTurn instead of native functionCall
        if (functionCallsForThisTurn.length === 0 && textForThisTurn) {
          const pseudoCallMatch = textForThisTurn.match(/<call:(?:default_api:)?([a-zA-Z0-9_]+)\s*(?:\{([\s\S]*?)\}|([^\/>]+))?\s*\/>/i);
          if (pseudoCallMatch) {
            const fnName = pseudoCallMatch[1];
            let fnArgs: any = {};
            if (pseudoCallMatch[2] || pseudoCallMatch[3]) {
              const rawArgs = pseudoCallMatch[2] || pseudoCallMatch[3];
              try {
                // Tenta parsear como JSON se estiver entre chaves
                if (pseudoCallMatch[2]) {
                  fnArgs = JSON.parse(`{${rawArgs}}`);
                }
              } catch (e) {
                console.warn("[Auto-Recover] Failed to parse JSON args from pseudo call:", e);
                // Fallback para tentar extrair content e title manualmente caso o JSON esteja quebrado (ex: HTML não escapado)
                const titleMatch = rawArgs.match(/"title"\s*:\s*"([^"]+)"/i);
                if (titleMatch) fnArgs.title = titleMatch[1];
                const contentMatch = rawArgs.match(/"content"\s*:\s*"([\s\S]*?)"(?:\s*,|\s*$)/i);
                if (contentMatch) fnArgs.content = contentMatch[1];
              }
              const urlM = rawArgs.match(/url:\s*(https?:\/\/[^\s,}]|www\.[^\s,}]|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app)[^\s,}]*)/i);
              if (urlM && !fnArgs.url) {
                let u = urlM[1];
                if (!u.startsWith('http')) u = 'https://' + u;
                fnArgs.url = u;
              }
            }
            if (['open_url', 'click', 'type_text', 'scroll_page', 'web_search', 'create_document', 'edit_document', 'read_document', 'append_document', 'delete_document', 'list_documents'].includes(fnName)) {
              if (fnName === 'open_url' && !fnArgs.url) {
                const urlM = textForThisTurn.match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app)[^\s]*)/i);
                if (urlM) {
                  let u = urlM[0];
                  if (!u.startsWith('http')) u = 'https://' + u;
                  fnArgs = { url: u };
                }
              }
              functionCallsForThisTurn.push({ name: fnName, args: fnArgs, isAutoInjected: true });
              console.log(`[Auto-Recover] Extracted native functionCall '${fnName}' from pseudocode tag!`, fnArgs);
            }
          }
        }

        // 2. Auto-inject missing browser tool call if model outputted text without calling Playwright
        if (functionCallsForThisTurn.length === 0) {
          const userStr = (typeof text === 'string' ? text : JSON.stringify(text)).toLowerCase();
          const aiStr = (textForThisTurn || "").toLowerCase();

          const isHtmlRequestThisTurn = isHtmlSiteRequest || aiStr.includes("[lendo skill: web-html]") || aiStr.includes("web-html") || aiStr.includes("<html") || aiStr.includes("<!doctype html>");

          const isSimpleGreetingOrMath = /^(ol[áa]|oi|tudo\s+bem|boa\s+(tarde|noite|dia)|quanto\s+[ée]|calcul[ae]|1\+[123456789]|2\+2)$/i.test(userStr.trim());
          const wantsBrowser = !isHtmlRequestThisTurn && ((Boolean(effectiveComputerEnabled) && !isSimpleGreetingOrMath) || promptWantsBrowser);
          const browserAlreadyCalled = currentContents.some((c: any) => 
            c.parts?.some((p: any) => 
              p.functionCall?.name === "open_url" || p.functionResponse?.name === "open_url" ||
              p.functionCall?.name === "click" || p.functionResponse?.name === "click" ||
              p.functionCall?.name === "type_text" || p.functionResponse?.name === "type_text" ||
              p.functionCall?.name === "scroll_page" || p.functionResponse?.name === "scroll_page" ||
              p.functionCall?.name === "extract_visible_text" || p.functionResponse?.name === "extract_visible_text"
            )
          );

          if (wantsBrowser && !browserAlreadyCalled && turnCount === 0) {
            let targetUrl = "";
            const urlMatch = (userStr + " " + aiStr).match(/(https?:\/\/(?!cdn\.|fonts\.|unpkg\.|cdnjs\.|jsdelivr\.)[^\s<>"'\)]+|www\.[^\s<>"'\)]+|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app|dev|co|xyz|online|store|tech|vercel\.app|netlify\.app)[^\s<>"'\)]*)/i);
            if (urlMatch) {
              targetUrl = urlMatch[0].replace(/[\)"'\s\.,;]+$/, '');
              if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
            } else if (/youtube/i.test(userStr + " " + aiStr)) {
              targetUrl = "https://www.youtube.com";
            } else if (/brave/i.test(userStr + " " + aiStr)) {
              targetUrl = "https://search.brave.com";
            } else if (/wikipedia/i.test(userStr + " " + aiStr)) {
              targetUrl = "https://pt.wikipedia.org";
            } else if (/github/i.test(userStr + " " + aiStr)) {
              targetUrl = "https://github.com";
            } else if (/google/i.test(userStr + " " + aiStr)) {
              targetUrl = "https://www.google.com";
            } else {
              const openSiteMatch = userStr.match(/(?:abra|acesse|acessar|entrar no|entre no|ir para|visitar|veja o)\s+([a-zA-Z0-9.-]+)/i);
              if (openSiteMatch) {
                const sName = openSiteMatch[1].toLowerCase();
                if (sName.includes('.')) targetUrl = sName.startsWith('http') ? sName : `https://${sName}`;
                else if (sName === 'youtube') targetUrl = 'https://www.youtube.com';
                else if (sName === 'github') targetUrl = 'https://github.com';
                else if (sName === 'google') targetUrl = 'https://www.google.com';
                else targetUrl = `https://www.${sName}.com`;
              } else if (/pesquisar|pesquisa|buscar|busca/i.test(userStr)) {
                targetUrl = "https://search.brave.com";
              }
            }

            if (targetUrl) {
              functionCallsForThisTurn.push({ name: "open_url", args: { url: targetUrl }, isAutoInjected: true });
              console.log(`[Auto-Inject] Missing browser call detected on turn 0! Auto-injecting open_url for ${targetUrl}`);
            }
          }
        }

        if (textForThisTurn) {
          let cleanText = textForThisTurn;
          // Clean any raw <call:...> or <call:default_api:...> pseudocode tags generated by the model
          cleanText = cleanText.replace(/<call[\s\S]*?(?:\/>|>)/gi, "");
          cleanText = cleanText.replace(/<call:default_api[\s\S]*?(?:\/>|>)/gi, "");
          cleanText = cleanText.replace(/call:default_api:[^\s>]+/gi, "");

          

          // Tokens were streamed in real time during responseStream
          // No need to artificially re-stream or duplicate text
        }

        if (functionCallsForThisTurn.length > 0) {
          const currentCallsStr = JSON.stringify(functionCallsForThisTurn);
          if (currentCallsStr === lastFunctionCallsStr) {
            sameCallCount++;
          } else {
            sameCallCount = 0;
            lastFunctionCallsStr = currentCallsStr;
          }

          if (sameCallCount >= 2) {
            const loopText = "\n\n[Sistema]: Interrompendo execução para evitar loop infinito da mesma ação.\n\n";
            sendEvent({ type: 'chunk', text: loopText });
            fullOutput += loopText;
            break;
          }

          // removed debug
          const hasNativeCalls = aggregatedParts.some((p: any) => p.functionCall);
          // For Gemini 3.0, we MUST preserve the exact parts (including thought_signature) generated by the model.
          // If the model generated NO function calls natively, but we auto-injected some, we cannot put them in the model's history as functionCall.
          let modelPartsForContents = aggregatedParts.length > 0 ? aggregatedParts : (textForThisTurn ? [{ text: textForThisTurn }] : [{ text: " " }]);


          currentContents.push({ role: "model", parts: modelPartsForContents });

          const functionResponseParts: any[] = [];

          for (const fc of functionCallsForThisTurn) {
            console.log(`[Pro] Agent called function: ${fc.name}`, fc.args);
            
            let resultImgUrl = "";
            let errorMsg = "";
            let promptStr = "";
            
            // Artificial delay/spinner for user experience with rich descriptive tags
            let thinkingText = "\n\n[Processando requisição...]\n\n";
            if (fc.name === "web_search") {
              const q = (fc.args as any)?.query;
              thinkingText = q ? `\n\n[Pesquisando na web sobre "${q}"...]\n\n` : `\n\n[Pesquisando na web...]\n\n`;
            }
            else if (fc.name === "calculadora") {
              const expr = (fc.args as any)?.expression;
              thinkingText = expr ? `\n\n[Calculando: "${expr}"...]\n\n` : `\n\n[Calculando...]\n\n`;
            }
            else if (fc.name === "relogio") thinkingText = "\n\n[Verificando relógio...]\n\n";
            else if (fc.name === "gerar_imagem") thinkingText = `\n\n<wsm_image prompt="${(fc.args as any)?.prompt || 'Imagem'}" imgUrl="" />\n\n`;
            else if (fc.name === "open_url") thinkingText = `\n\n[Acessando site: ${(fc.args as any).url}...]\n\n`;
            else if (fc.name === "click") {
              const target = (fc.args as any)?.text || (fc.args as any)?.selector;
              thinkingText = target ? `\n\n[Clicando em "${target}"...]\n\n` : `\n\n[Clicando no botão do site...]\n\n`;
            }
            else if (fc.name === "type_text") {
              const txt = (fc.args as any)?.text;
              thinkingText = txt ? `\n\n[Digitando "${txt}"...]\n\n` : `\n\n[Digitando no site...]\n\n`;
            }
            else if (fc.name === "scroll_page") thinkingText = `\n\n[Rolando página para ${(fc.args as any)?.direction === 'up' ? 'cima' : 'baixo'}...]\n\n`;
            else if (fc.name === "extract_visible_text") thinkingText = `\n\n[Lendo conteúdo da página...]\n\n`;
            else if (fc.name === "wait_seconds") thinkingText = `\n\n[Aguardando ${(fc.args as any)?.seconds || 3}s para o site carregar...]\n\n`;
            else if (fc.name === "create_document") thinkingText = `\n\n<wsm_workspace_action status="working" type="create" file="${(fc.args as any)?.title || 'Documento'}" />\n\n`;
            else if (fc.name === "read_document") thinkingText = `\n\n<wsm_workspace_action status="working" type="read" file="${(fc.args as any)?.title || 'Documento'}" />\n\n`;
            else if (fc.name === "edit_document" || fc.name === "append_document") thinkingText = `\n\n<wsm_workspace_action status="working" type="edit" file="${(fc.args as any)?.title || 'Documento'}" />\n\n`;
            else if (fc.name === "delete_document") thinkingText = `\n\n<wsm_workspace_action status="working" type="delete" file="${(fc.args as any)?.title || 'Documento'}" />\n\n`;
            else if (fc.name === "list_documents") thinkingText = `\n\n<wsm_workspace_action status="working" type="list" file="workspace" />\n\n`;

            sendEvent({ type: "chunk", text: thinkingText });
            fullOutput += thinkingText;
            
            if (fc.name === "web_search") {
              const args = fc.args as any;
              let resultData: any = null;
              try {
                if (process.env.TAVILY_API_KEY) {
                  const tvRes = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      api_key: process.env.TAVILY_API_KEY,
                      query: args.query || args.search_query || text,
                      search_depth: "basic",
                      include_images: true,
                      include_answer: true,
                      max_results: 10,
                    })
                  });
                  if (tvRes.ok) {
                    const data = await tvRes.json();
                    const cleanResults = (data.results || []).slice(0, 8).map((r: any) => ({
                      title: r.title || r.url,
                      url: r.url,
                      snippet: (r.content || "").slice(0, 450)
                    }));
                    resultData = {
                      answer: data.answer || undefined,
                      results: cleanResults
                    };
                    if (data.results) {
                      data.results.forEach((r: any) => marteSources.push({ title: r.title || r.url, url: r.url, snippet: (r.content || "").slice(0, 450) }));
                    }
                    if (data.images) {
                      marteImages.push(...data.images.map((i:any) => typeof i === "string" ? i : i.url));
                    }
                  } else {
                    console.log("[Pro Search] Tavily search failed or forbidden. Falling back to searchWebFallback...");
                    const fallbackRes = await searchWebFallback(args.query || args.search_query || text);
                    resultData = { results: fallbackRes };
                    fallbackRes.forEach(r => marteSources.push(r));
                  }
                } else {
                  console.log("[Pro Search] TAVILY_API_KEY not configured. Falling back to searchWebFallback...");
                  const fallbackRes = await searchWebFallback(args.query || args.search_query || text);
                  resultData = { results: fallbackRes };
                  fallbackRes.forEach(r => marteSources.push(r));
                }
              } catch (e) {
                console.log("[Pro Search] Error in search. Falling back to searchWebFallback...", e);
                const fallbackRes = await searchWebFallback(args.query || args.search_query || text);
                resultData = { results: fallbackRes };
                fallbackRes.forEach(r => marteSources.push(r));
              }
              const callId = fc.id || `call_${fc.name}_${Math.random().toString(36).substring(2, 8)}`;
              functionResponseParts.push({
                functionResponse: { id: callId, name: fc.name, response: { result: resultData } }
              });
            } else if (fc.name === "calculadora") {
              const args = fc.args as any;
              let mathResult;
              try {
                const math = await import("mathjs");
                mathResult = math.evaluate(args.expression);
              } catch (e: any) {
                mathResult = { error: e.message };
              }
              // Artificial delay for realism
              await new Promise(r => setTimeout(r, 1500));
              functionResponseParts.push({
                functionResponse: { id: fc.id, name: fc.name, response: { result: mathResult } }
              });
            } else if (fc.name === "relogio") {
              let timeData;
              try {
                const timeRes = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=America/Sao_Paulo");
                timeData = await timeRes.json();
              } catch (e) {
                timeData = { time: new Date().toISOString() };
              }
              // Artificial delay for realism
              await new Promise(r => setTimeout(r, 1000));
              functionResponseParts.push({
                functionResponse: { id: fc.id, name: fc.name, response: { result: timeData } }
              });
            } else if (fc.name === "open_url" || fc.name === "click" || fc.name === "type_text" || fc.name === "scroll_page" || fc.name === "extract_visible_text" || fc.name === "wait_seconds") {
              let result: any = {};
              if (fc.name === "open_url") {
                result = await openUrl((fc.args as any).url);
              } else if (fc.name === "click") {
                result = await clickSelector((fc.args as any).selector);
              } else if (fc.name === "type_text") {
                result = await typeText((fc.args as any).selector, (fc.args as any).text);
              } else if (fc.name === "scroll_page") {
                result = await scrollPage((fc.args as any).direction || 'down', (fc.args as any).amount || 500);
              } else if (fc.name === "extract_visible_text") {
                result = await extractText();
              } else if (fc.name === "wait_seconds") {
                result = await waitSeconds((fc.args as any).seconds || 3);
                const visitCount = visitedUrlsInTurn.filter(u => u === "WAIT_SECONDS").length;
                visitedUrlsInTurn.push("WAIT_SECONDS");
                if (visitCount >= 1) {
                   result.system_note = `[SISTEMA DE PREVENÇÃO DE LOOP DE ESPERA]: Você já aguardou nesta página antes. A página parece estática. PARE de usar 'wait_seconds' repetidamente. Responda ao usuário com o que já foi lido ou tente clicar/scrollar para interagir.`;
                }
              }

              if (result.screenshot) {
                sendEvent({
                  type: "browser_screenshot",
                  screenshot: result.screenshot,
                  url: result.url || (fc.args as any)?.url || '',
                  title: result.title || '',
                  stepName: fc.name === "open_url"
                    ? `Acessar o site ${(fc.args as any)?.url || result.url}`
                    : fc.name === "click"
                    ? `Clicar em ${(fc.args as any)?.selector}`
                    : fc.name === "type_text"
                    ? `Digitar em ${(fc.args as any)?.selector}`
                    : fc.name === "scroll_page"
                    ? `Rolar página para ${(fc.args as any)?.direction === 'up' ? 'cima' : 'baixo'}`
                    : fc.name === "wait_seconds"
                    ? `Aguardar ${(fc.args as any)?.seconds || 3}s para carregar o site`
                    : "Navegar na página",
                  timestamp: Date.now()
                });
                delete result.screenshot;
              }

              if (result && result.url) {
                const normUrl = String(result.url).replace(/\/$/, '').toLowerCase();
                visitedUrlsInTurn.push(normUrl);
                const visitCount = visitedUrlsInTurn.filter(u => u === normUrl).length;
                if (visitCount >= 2) {
                  result.system_note = `[SISTEMA DE PREVENÇÃO DE LOOP DE NAVEGAÇÃO]: Você já acessou a URL '${result.url}' ${visitCount} vezes nesta resposta. PARE de abrir links ou navegar. Responda imediatamente ao usuário transcrevendo o texto exato retornado no campo 'text' sem realizar mais nenhuma chamada de ferramenta de navegação.`;
                }
              }

              functionResponseParts.push({
                functionResponse: {
                  id: fc.id,
                  name: fc.name,
                  response: result
                }
              });
            } else if (fc.name === "create_document") {
              const args = fc.args as any;
              let title = String(args.title || 'Documento').trim();
              let content = String(args.content || '');
              let format = inferFormat(title, args.format, content);
              
              // Prevent JSON wrapper bug if model passed the JSON wrapper into the 'content' argument
              if (content.trim().startsWith('{') && content.trim().endsWith('}') && content.includes('"content"')) {
                 try {
                    const parsed = JSON.parse(content);
                    if (parsed && typeof parsed === 'object' && parsed.content) {
                       content = String(parsed.content);
                       if (parsed.title) title = String(parsed.title);
                       if (parsed.format) format = String(parsed.format).toLowerCase();
                    }
                 } catch(e) {}
              }
              
              workspaceDocuments.set(title, { title, content, format });
              functionResponseParts.push({
                functionResponse: {
                  id: fc.id,
                  name: fc.name,
                  response: {
                    success: true,
                    message: `Documento "${title}" criado com sucesso no workspace de documentos.`,
                    content_length: content.length,
                    total_documents_in_workspace: workspaceDocuments.size
                  }
                }
              });
            } else if (fc.name === "read_document") {
              const args = fc.args as any;
              const title = String(args.title || '').trim();
              const docObj = workspaceDocuments.get(title);
              if (docObj) {
                functionResponseParts.push({
                  functionResponse: {
                  id: fc.id,
                    name: fc.name,
                    response: {
                      success: true,
                      title: docObj.title,
                      content: docObj.content
                    }
                  }
                });
              } else {
                functionResponseParts.push({
                  functionResponse: {
                  id: fc.id,
                    name: fc.name,
                    response: {
                      success: false,
                      error: `Documento "${title}" não encontrado no workspace. Documentos disponíveis: ${Array.from(workspaceDocuments.keys()).join(', ') || 'Nenhum'}`
                    }
                  }
                });
              }
            } else if (fc.name === "edit_document") {
              const args = fc.args as any;
              let title = String(args.title || 'Documento').trim();
              let content = String(args.content || '');
              
              if (content.trim().startsWith('{') && content.trim().endsWith('}') && content.includes('"content"')) {
                 try {
                    const parsed = JSON.parse(content);
                    if (parsed && typeof parsed === 'object' && parsed.content) {
                       content = String(parsed.content);
                       if (parsed.title) title = String(parsed.title);
                    }
                 } catch(e) {}
              }
              
              const existingDoc = workspaceDocuments.get(title);
              const format = inferFormat(title, args.format || existingDoc?.format, content);
              workspaceDocuments.set(title, { title, content, format });
              functionResponseParts.push({
                functionResponse: {
                  id: fc.id,
                  name: fc.name,
                  response: {
                    success: true,
                    message: `Documento "${title}" atualizado com sucesso no workspace.`,
                    content_length: content.length
                  }
                }
              });
            } else if (fc.name === "append_document") {
              const args = fc.args as any;
              const title = String(args.title || 'Documento').trim();
              const textToAppend = String(args.text || '');
              const existingDoc = workspaceDocuments.get(title);
              const newContent = existingDoc ? existingDoc.content + "\n\n" + textToAppend : textToAppend;
              const format = inferFormat(title, existingDoc?.format, newContent);
              workspaceDocuments.set(title, { title, content: newContent, format });
              functionResponseParts.push({
                functionResponse: {
                  id: fc.id,
                  name: fc.name,
                  response: {
                    success: true,
                    message: `Texto adicionado com sucesso ao documento "${title}". Tamanho atual: ${newContent.length} caracteres.`
                  }
                }
              });
            } else if (fc.name === "delete_document") {
              const args = fc.args as any;
              const title = String(args.title || '').trim();
              const existed = workspaceDocuments.delete(title);
              functionResponseParts.push({
                functionResponse: {
                  id: fc.id,
                  name: fc.name,
                  response: {
                    success: existed,
                    message: existed ? `Documento "${title}" excluído com sucesso do workspace.` : `Documento "${title}" não encontrado no workspace.`
                  }
                }
              });
            } else if (fc.name === "list_documents") {
              const docsList = Array.from(workspaceDocuments.values()).map(d => ({ title: d.title, length: d.content.length }));
              functionResponseParts.push({
                functionResponse: {
                  id: fc.id,
                  name: fc.name,
                  response: {
                    success: true,
                    total_documents: docsList.length,
                    documents: docsList
                  }
                }
              });
            }
            
            // Remove the thinking text and replace with the final tag text
            let finalTagText = "";
            if (fc.name === "web_search") {
              finalTagText = fullOutput.includes("[pesquisou na web]") ? "" : "\n\n[pesquisou na web]\n\n";
            } else if (fc.name === "calculadora") {
              finalTagText = fullOutput.includes("[calculando]") ? "" : "\n\n[calculando]\n\n";
            } else if (fc.name === "relogio") {
              finalTagText = fullOutput.includes("[verificando relógio]") ? "" : "\n\n[verificando relógio]\n\n";
            } else if (fc.name === "gerar_imagem") {
              if (resultImgUrl) {
                const escapedPrompt = (promptStr || 'Imagem').replace(/"/g, '&quot;');
                finalTagText = `\n\n<wsm_image prompt="${escapedPrompt}" imgUrl="${resultImgUrl}" />\n\n`;
              } else {
                finalTagText = `\n\n❌ Erro ao gerar imagem: ${errorMsg || 'serviço indisponível'}\n\n`;
              }
            } else if (fc.name === "open_url") {
              finalTagText = `\n\n[Abrindo site: ${(fc.args as any).url}]\n\n`;
            } else if (fc.name === "click") {
              finalTagText = `\n\n[Clicando no elemento]\n\n`;
            } else if (fc.name === "type_text") {
              finalTagText = `\n\n[Digitando "${(fc.args as any).text}"]\n\n`;
            } else if (fc.name === "scroll_page") {
              finalTagText = `\n\n[Rolando página para ${(fc.args as any)?.direction === 'up' ? 'cima' : 'baixo'}]\n\n`;
            } else if (fc.name === "extract_visible_text") {
              finalTagText = `\n\n[Lendo página atualizada]\n\n`;
            } else if (fc.name === "wait_seconds") {
              finalTagText = `\n\n[Aguardou ${(fc.args as any)?.seconds || 3}s no site para releitura]\n\n`;
            } else if (fc.name === "create_document") {
              finalTagText = `\n\n<wsm_workspace_action status="done" type="create" file="${(fc.args as any)?.title || 'Documento'}" />\n\n`;
            } else if (fc.name === "read_document") {
              finalTagText = `\n\n<wsm_workspace_action status="done" type="read" file="${(fc.args as any)?.title || 'Documento'}" />\n\n`;
            } else if (fc.name === "edit_document" || fc.name === "append_document") {
              finalTagText = `\n\n<wsm_workspace_action status="done" type="edit" file="${(fc.args as any)?.title || 'Documento'}" />\n\n`;
            } else if (fc.name === "delete_document") {
              finalTagText = `\n\n<wsm_workspace_action status="done" type="delete" file="${(fc.args as any)?.title || 'Documento'}" />\n\n`;
            } else if (fc.name === "list_documents") {
              finalTagText = `\n\n<wsm_workspace_action status="done" type="list" file="workspace" />\n\n`;
            }
            const lastIdx = fullOutput.lastIndexOf(thinkingText);
            if (lastIdx !== -1) {
              fullOutput = fullOutput.substring(0, lastIdx) + finalTagText + fullOutput.substring(lastIdx + thinkingText.length);
            } else {
              fullOutput = fullOutput.replace(thinkingText, finalTagText);
            }
            sendEvent({ type: "sync_text", text: fullOutput });
          }
          // Rewrite auto-injected function responses to plain text so Gemini 3.0 doesn't crash expecting a thought_signature in previous turn
          for (let i = 0; i < functionResponseParts.length; i++) {
            const p = functionResponseParts[i];
            if (p.functionResponse) {
               const autoCall = functionCallsForThisTurn.find(fc => fc.name === p.functionResponse.name && fc.isAutoInjected);
               if (autoCall) {
                  functionResponseParts[i] = { text: `[Sistema: Ferramenta ${autoCall.name} auto-executada] Resultado:\n${JSON.stringify(p.functionResponse.response)}` };
               }
            }
          }

          currentContents.push({ role: "user", parts: functionResponseParts });
          turnCount++;
          const userStrLow = (typeof text === 'string' ? text : JSON.stringify(text)).toLowerCase();
          const promptHasBrowserSteps = promptWantsBrowser && /\b(cadastr\w*|login|entrar|entra|clic\w*|preench\w*|digit\w*|pesquis\w*|busc\w*|naveg\w*)\b/i.test(userStrLow);
          if (promptHasBrowserSteps && turnCount < 10) {
            forceNextTurnModeAny = true;
          } else {
            forceNextTurnModeAny = false;
          }
        } else {
          // Check for unfulfilled tool calls (e.g. model outputted conversational text or <task> block promising tools without calling functionCall)
          const userStr = (typeof text === 'string' ? text : JSON.stringify(text)).toLowerCase();
          const aiStr = (textForThisTurn || "").toLowerCase();

          const isHtmlRequestThisTurn = isHtmlSiteRequest || aiStr.includes("[lendo skill: web-html]") || aiStr.includes("web-html") || aiStr.includes("<html") || aiStr.includes("<!doctype html>");

          const aiHasTaskBlock = aiStr.includes("<task>") || /\[(acessar|digitar|rolar|clicar|pesquisar|buscar|aguardar|esperar)\b/i.test(aiStr);
          const aiPromisedBrowser = !isHtmlRequestThisTurn && (/\b(vou|irei|estou|vamos|agora|próximo|proximo)\s+(abrir|acessar|navegar|digitar|clicar|rolar|preencher|enviar|colocar|selecionar|pressionar|aguardar|esperar|fechar)\b/i.test(aiStr) || /\b(preenchendo|enviando|clicando|digitando|abrindo|acessando|rolando|aguardando|fechando)\b/i.test(aiStr));
          const aiPromisedSearch = !isHtmlRequestThisTurn && (/\b(vou|irei|estou)\s+(pesquisar|buscar)\b|\bpesquisando\b/i.test(aiStr));

          const wantsBrowser = !isHtmlRequestThisTurn && (promptWantsBrowser || aiPromisedBrowser);
          const wantsSearch = !isHtmlRequestThisTurn && (promptWantsSearch || aiPromisedSearch);

          const missingToolCall = !isHtmlRequestThisTurn && (
            aiHasTaskBlock ||
            aiPromisedBrowser ||
            aiPromisedSearch
          );

          if (missingToolCall && turnCount < 100) {
            console.warn(`[Pro] Missing tool call / unfulfilled task detected on turn ${turnCount}! Triggering mode ANY recovery...`);
            
            // Clean up internal <task> tags if present, but preserve friendly step explanations (e.g. "Olá! Vou abrir...")
            if (textForThisTurn && textForThisTurn.includes('<task>')) {
              const cleanedTaskText = textForThisTurn.replace(/<task>[\s\S]*?<\/task>/gi, '').trim();
              const lastIdx = fullOutput.lastIndexOf(textForThisTurn);
              if (lastIdx !== -1) {
                fullOutput = fullOutput.substring(0, lastIdx) + (cleanedTaskText ? cleanedTaskText + "\n\n" : "");
                sendEvent({ type: "sync_text", text: fullOutput });
              }
            }

            currentContents.push({ 
              role: "model", 
              parts: [{ text: textForThisTurn || "Processando requisição..." }] 
            });

            let reminderMsg = "";
            if (aiHasTaskBlock || wantsBrowser || aiPromisedBrowser) {
              let targetUrl = "";
              const urlMatch = (userStr + " " + aiStr).match(/(https?:\/\/(?!cdn\.|fonts\.|unpkg\.|cdnjs\.|jsdelivr\.)[^\s<>"'\)]+|www\.[^\s<>"'\)]+|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app|dev|co|xyz|online|store|tech|vercel\.app|netlify\.app)[^\s<>"'\)]*)/i);
              if (urlMatch) {
                targetUrl = urlMatch[0].replace(/[\)"'\s\.,;]+$/, '');
                if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
              }

              if (wantsBrowser && turnCount > 0) {
                reminderMsg = `SISTEMA (AÇÃO DE NAVEGAÇÃO OBRIGATÓRIA - AGENTE INTERATIVO): A página do site já está aberta. O usuário solicitou executar ações na página ("${userStr.slice(0, 100)}..."). Você DEVE OBRIGATORIAMENTE invocar uma chamada de função ('type_text' para preencher formulários/campos, 'click' para clicar em botões/links, 'scroll_page', 'wait_seconds' ou 'extract_visible_text') para avançar até a conclusão da tarefa. É estritamente PROIBIDO responder apenas com texto sem disparar a função!`;
              } else {
                reminderMsg = `SISTEMA (AÇÃO DE FERRAMENTA OBRIGATÓRIA - PLAN → ACT → OBSERVE → REFLECT): Você mencionou um próximo passo ou descreveu ações ("${(textForThisTurn || "").slice(0, 100)}..."), mas NENHUMA função (functionCall) foi disparada neste turno! Você DEVE OBRIGATORIAMENTE invocar a ferramenta necessária ('open_url'${targetUrl ? ` com "${targetUrl}"` : ''}, 'type_text', 'click', 'scroll_page', 'wait_seconds' ou 'web_search') via Function Call agora para continuar a tarefa até a conclusão. É estritamente PROIBIDO parar ou apenas responder com texto sem disparar a função!`;
              }
            } else {
              reminderMsg = "SISTEMA (PESQUISA WEB OBRIGATÓRIA): Execute a ferramenta 'web_search' (functionCall) para pesquisar as informações na web agora. NÃO responda apenas com texto.";
            }

            currentContents.push({
              role: "user",
              parts: [{ text: reminderMsg }]
            });

            forceNextTurnModeAny = true;
            turnCount++;
            continue;
          } else {
            // Check if model ONLY outputted <raciocinio>...</raciocinio> with no text or tool outside it
            const textOutsideReasoning = (textForThisTurn || "")
              .replace(/<raciocinio>[\s\S]*?<\/raciocinio>/gi, '')
              .replace(/<task>[\s\S]*?<\/task>/gi, '')
              .trim();

            const modelOnlyReasonedWithoutAnswer = (
              (textForThisTurn || "").includes("</raciocinio>") &&
              textOutsideReasoning === "" &&
              (!functionCallsForThisTurn || functionCallsForThisTurn.length === 0)
            );

            const modelGeneratedNothing = (textForThisTurn || "").trim() === "" && (!functionCallsForThisTurn || functionCallsForThisTurn.length === 0);

            if (modelGeneratedNothing && turnCount < 10) {
              console.warn(`[Pro/Flash] Model outputted NOTHING on turn ${turnCount}! Prompting to retry...`);
              
              currentContents.push({ 
                role: "model", 
                parts: [{ text: " " }] 
              });

              currentContents.push({
                role: "user",
                parts: [{ text: "SISTEMA (ERRO DE RESPOSTA VAZIA): Você não gerou nenhum texto nem chamou nenhuma função! Se você está tentando criar um site/HTML, OBRIGATORIAMENTE gere o código completo dentro da tag `<wsm_doc format=\"html\">{\"title\":\"index.html\",\"content\":\"código html aqui\",\"format\":\"html\"}</wsm_doc>` ou use a ferramenta 'create_document' agora. Não deixe a resposta em branco." }]
              });

              turnCount++;
              continue;
            }

            if (modelOnlyReasonedWithoutAnswer && turnCount < 100) {
              console.warn(`[Pro/Flash] Model outputted only <raciocinio> block without final answer on turn ${turnCount}! Prompting for final answer...`);
              
              currentContents.push({ 
                role: "model", 
                parts: aggregatedParts.length > 0 ? aggregatedParts : [{ text: textForThisTurn || "" }] 
              });

              currentContents.push({
                role: "user",
                parts: [{ text: "SISTEMA (RESPOSTA FINAL OBRIGATÓRIA): Você apenas abriu e fechou o bloco <raciocinio> e NÃO escreveu a resposta final ao usuário após ele! Responda AGORA com a resposta final completa, direta e clara para o usuário." }]
              });

              turnCount++;
              continue;
            }

            break; // no more function calls, we are done
          }
        }
        } catch (turnErr) {
          console.error(`[Agentic Loop Error] Turn ${turnCount} failed:`, turnErr);
          if (marteSources.length > 0) {
            console.log("[Agentic Loop] Attempting fallback final synthesis from collected search sources...");
            const sourcesSummary = marteSources.map((s, idx) => `[Fonte #${idx+1}] ${s.title} (${s.url}): ${s.snippet}`).join('\n\n');
            try {
              const fallbackSynth = await callGeminiWithFallback({
                model: "gemini-3.5-flash-lite",
                contents: `O usuário solicitou: "${text}".\n\nInformações pesquisadas na web:\n${sourcesSummary}\n\nCom base nessas informações, escreva a resposta final completa, detalhada e bem estruturada em Markdown para o usuário, incluindo citações das fontes [Nome](URL).`,
              });
              const fallbackText = fallbackSynth.text || "";
              if (fallbackText) {
                sendEvent({ type: "chunk", text: "\n\n" + fallbackText });
                fullOutput += "\n\n" + fallbackText;
              }
            } catch (synthErr) {
              console.error("Fallback synthesis also failed:", synthErr);
            }
          }
          break; // Exit loop gracefully
        }
      }

      if (workspaceDocuments.size > 0) {
        for (const [dTitle, dObj] of workspaceDocuments.entries()) {
          const docJson = JSON.stringify({ title: dObj.title, content: dObj.content, format: dObj.format });
          const tag = `<wsm_doc>${docJson}</wsm_doc>`;
          const hasDocTagAlready = fullOutput.includes('<wsm_doc>') && (fullOutput.includes(`"title":"${dObj.title}"`) || fullOutput.includes(`"title": "${dObj.title}"`));
          if (!hasDocTagAlready) {
            fullOutput += `\n\n${tag}\n\n`;
            sendEvent({ type: "sync_text", text: fullOutput });
          }
        }
      }

      const uniqueSourcesMap = new Map();
      marteSources.forEach(s => uniqueSourcesMap.set(s.url, s));
      const uniqueSources = Array.from(uniqueSourcesMap.values());
      const uniqueImages = Array.from(new Set(marteImages)).filter(Boolean);
      
      const validImageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic)(\?.*)?$/i;
      const filteredImages = uniqueImages.filter((imgUrl) => {
        if (typeof imgUrl !== "string") return false;
        try {
          const urlObj = new URL(imgUrl);
          return validImageExtensions.test(urlObj.pathname) || imgUrl.includes("/images/") || imgUrl.includes("/img/");
        } catch { return false; }
      });

      const fallbackEmptyResponse = "⚠️ **Nenhuma resposta foi gerada pelo modelo.** O pedido pode ter sido longo demais ou complexo demais (por favor, tente dividir seu pedido em partes menores).";

      // Sanitize fullOutput to remove any accidental base64 strings or markdown image syntax outside <wsm_image>
      const wsmImageTokens: string[] = [];
      let protectedOutput = fullOutput.replace(/<wsm_image\s+[^>]*\/>/gi, (match) => {
        const token = `___WSM_IMAGE_PROTECTED_${wsmImageTokens.length}___`;
        wsmImageTokens.push(match);
        return token;
      });

      protectedOutput = protectedOutput
        .replace(/!\[.*?\]\(data:image\/[^\)]+\)/gi, "")
        .replace(/data:image\/[a-zA-Z]+;base64,[a-zA-Z0-9+/=]{80,}/gi, "")
        .replace(/<call[\s\S]*?(?:\/>|>)/gi, "")
        .replace(/<call:default_api[\s\S]*?(?:\/>|>)/gi, "")
        .replace(/call:default_api:[^\s>]+/gi, "")
        .trim();

      wsmImageTokens.forEach((tag, idx) => {
        protectedOutput = protectedOutput.replace(`___WSM_IMAGE_PROTECTED_${idx}___`, tag);
      });

      const { cleanedText: sanitizedFullOutput, memoryDoc: extractedMemoryDoc } = extractAndCleanHistory(protectedOutput);
      const updatedMemoryDoc = extractedMemoryDoc || (typeof chatMemoryDoc === 'string' ? chatMemoryDoc : "");

      sendEvent({
        type: "final",
        text: sanitizedFullOutput || fallbackEmptyResponse,
        finalSynthesis: sanitizedFullOutput || fallbackEmptyResponse,
        chatMemoryDoc: updatedMemoryDoc,
        searchSources: uniqueSources,
        searchImages: filteredImages.slice(0, 15)
      });
      res.end();
      return;
    }

    let normalResponse;
    let rawResponseText = "";
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        const fetchPromise = callGeminiWithFallback({
          model: mappedModel,
          contents: finalContents,
          config: {
            systemInstruction: activeSystemPrompt,
          },
        });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("STREAM_TIMEOUT")), 20000));
        normalResponse = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (err: any) {
        if (err.message === "STREAM_TIMEOUT" && retryCount < maxRetries) {
          console.warn(`[ChatAPI] Timeout de 20s atingido na resposta final. Retentando silenciosamente...`);
          retryCount++;
          continue;
        }
        throw err;
      }

      rawResponseText = normalResponse.text?.trim() || "";
      if (rawResponseText) {
        break;
      }
      console.warn(`[ChatAPI] Resposta vazia recebida do Gemini. Tentativa ${retryCount + 1}/${maxRetries + 1}`);
      retryCount++;
      if (retryCount <= maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!rawResponseText) {
      return res.json({
        text: "⚠️ **Nenhuma resposta foi gerada pelo modelo após várias tentativas.** O pedido pode ter sido longo demais ou complexo demais (por favor, tente dividir seu pedido em partes menores).",
        chatMemoryDoc: chatMemoryDoc || ""
      });
    }

    const { cleanedText: textToReturn, memoryDoc: extractedMemoryDoc } = extractAndCleanHistory(rawResponseText);
    const updatedMemoryDoc = extractedMemoryDoc || (typeof chatMemoryDoc === 'string' ? chatMemoryDoc : "");

    if (clientDisconnected && userEmail && isGmailUser(userEmail)) {
      console.log(`[ChatAPI] Disparando e-mail de resposta interrompida para: ${userEmail}`);
      sendInterruptedResponseEmail(userEmail, userPromptText, textToReturn).catch(err => {
        console.warn("[ChatAPI] Erro ao enviar e-mail de resposta interrompida:", err);
      });
    }

    return res.json({
      text: textToReturn,
      chatMemoryDoc: updatedMemoryDoc
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    
    const errorMessage = error.message || String(error);
    let errorText = "⚠️ **Ocorreu um problema temporário ao processar sua resposta.** Por favor, tente novamente.";

    if (errorMessage.includes("Unable to process input image") || (errorMessage.includes("INVALID_ARGUMENT") && (errorMessage.includes("image") || errorMessage.includes("file")))) {
      errorText = "⚠️ **Não foi possível analisar este arquivo de imagem.** Por favor, certifique-se de anexa uma imagem válida (PNG, JPEG, WEBP) e tente novamente.";
    } else if (errorMessage.includes("safety") || errorMessage.includes("SAFETY") || errorMessage.includes("BLOCKED")) {
      errorText = "⚠️ **A mensagem solicitada foi bloqueada pelas diretrizes de segurança da IA.** Por favor, reformule seu pedido.";
    } else if (errorMessage.includes("quota") || errorMessage.includes("RATE_LIMIT") || errorMessage.includes("429") || errorMessage.includes("resource_exhausted") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      errorText = "⚠️ **Limite de cota ou requisições por minuto atingido na API.** Aguarde alguns instantes antes de enviar uma nova mensagem.";
    } else if (errorMessage.includes("No content returned") || errorMessage.includes("empty response") || errorMessage.includes("finishReason")) {
      errorText = "⚠️ **Nenhuma resposta foi gerada pelo modelo nesta tentativa.** O pedido pode ter sido longo demais ou ter excedido os limites do modelo.";
    } else if (errorMessage.includes("INVALID_ARGUMENT")) {
      errorText = "⚠️ **Conteúdo ou parâmetro de solicitação inválido.** Por favor, verifique os dados e tente novamente.";
    }

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: "chunk", text: "\n\n" + errorText })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "final", text: errorText, finalSynthesis: errorText, searchSources: [], searchImages: [] })}\n\n`);
      res.end();
      return;
    }

    return res.json({
      text: errorText,
    });
  }
});

// Endpoint secreto para testar se as chaves IA_API_KEY, IA_API_KEY_2 e IA_API_KEY_3 estão funcionando
app.post("/api/test-keys", async (req: express.Request, res: express.Response) => {
  const results = {
    key1: { success: false, message: "" },
    key2: { success: false, message: "" },
    key3: { success: false, message: "" }
  };

  const modelName = "gemini-2.5-flash";

  // Teste da chave 1 (IA_API_KEY)
  const key1 = process.env.IA_API_KEY;
  if (!key1) {
    results.key1.message = "IA_API_KEY não está configurada.";
  } else {
    try {
      const client = new GoogleGenAI({ apiKey: key1 });
      const resp = await client.models.generateContent({
        model: modelName,
        contents: "Responda apenas 'OK' se você puder ler isso."
      });
      if (resp.text) {
        results.key1.success = true;
        results.key1.message = `Funcionando perfeitamente! Resposta do modelo: "${resp.text.trim()}"`;
      } else {
        results.key1.message = "O modelo respondeu com sucesso, mas o texto veio vazio.";
      }
    } catch (err: any) {
      results.key1.message = err.message || String(err);
    }
  }

  // Teste da chave 2 (IA_API_KEY_2)
  const key2 = process.env.IA_API_KEY_2;
  if (!key2) {
    results.key2.message = "IA_API_KEY_2 não está configurada.";
  } else {
    try {
      const client = new GoogleGenAI({ apiKey: key2 });
      const resp = await client.models.generateContent({
        model: modelName,
        contents: "Responda apenas 'OK' se você puder ler isso."
      });
      if (resp.text) {
        results.key2.success = true;
        results.key2.message = `Funcionando perfeitamente! Resposta do modelo: "${resp.text.trim()}"`;
      } else {
        results.key2.message = "O modelo respondeu com sucesso, mas o texto veio vazio.";
      }
    } catch (err: any) {
      results.key2.message = err.message || String(err);
    }
  }

  // Teste da chave 3 (IA_API_KEY_3)
  const key3 = process.env.IA_API_KEY_3;
  if (!key3) {
    results.key3.message = "IA_API_KEY_3 não está configurada.";
  } else {
    try {
      const client = new GoogleGenAI({ apiKey: key3 });
      const resp = await client.models.generateContent({
        model: modelName,
        contents: "Responda apenas 'OK' se você puder ler isso."
      });
      if (resp.text) {
        results.key3.success = true;
        results.key3.message = `Funcionando perfeitamente! Resposta do modelo: "${resp.text.trim()}"`;
      } else {
        results.key3.message = "O modelo respondeu com sucesso, mas o texto veio vazio.";
      }
    } catch (err: any) {
      results.key3.message = err.message || String(err);
    }
  }

  return res.json(results);
});

// Endpoint para tradução usando Inteligência Artificial com fallback
app.post("/api/translate", async (req: express.Request, res: express.Response) => {
  const { text, sourceLanguage, targetLanguage, tone } = req.body;

  if (!text || !targetLanguage) {
    return res.status(400).json({ error: "Texto e idioma de destino são obrigatórios." });
  }

  try {
    const systemPrompt = getSystemPrompt('translator_system', `Você é um tradutor profissional de altíssima precisão.`);

    const userPrompt = `Traduzir o seguinte texto:
---
${text}
---
Idioma de Origem: ${sourceLanguage || "Detectar automaticamente"}
Idioma de Destino: ${targetLanguage}
${tone ? `Tom da tradução: ${tone}` : ""}

Resposta (apenas o texto traduzido):`;

    const response = await callGeminiWithFallback({
      model: "gemini-3.5-flash-lite",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      }
    });

    const translatedText = response.text?.trim() || "";
    
    return res.json({ translatedText });
  } catch (error: any) {
    console.error("Erro na tradução:", error);
    return res.status(500).json({ error: error.message || "Erro interno ao traduzir." });
  }
});

// Endpoint para envio de relatório de tarefa agendada por e-mail
app.post("/api/send-scheduled-email", async (req: express.Request, res: express.Response) => {
  const { toEmail, taskTitle, taskPrompt, aiResponse } = req.body;

  if (!toEmail || !taskTitle || !aiResponse) {
    return res.status(400).json({ error: "Parâmetros 'toEmail', 'taskTitle' e 'aiResponse' são obrigatórios." });
  }

  try {
    const result = await sendScheduledEmail({
      toEmail,
      taskTitle,
      taskPrompt: taskPrompt || taskTitle,
      aiResponse,
      executedAt: new Date(),
    });

    return res.json(result);
  } catch (error: any) {
    console.error("Erro ao enviar e-mail da tarefa agendada:", error);
    return res.status(500).json({ success: false, message: error?.message || "Erro ao disparar e-mail." });
  }
});

// Endpoint para execução imediata (Run Now) de tarefa agendada
app.post("/api/scheduled-tasks/execute-now", async (req: express.Request, res: express.Response) => {
  const { userId, taskId, taskData } = req.body;
  if (!taskId || !taskData) {
    return res.status(400).json({ success: false, error: "Parâmetros 'taskId' e 'taskData' são obrigatórios." });
  }

  try {
    const result = await executeScheduledTaskNow(userId || 'guest', taskId, taskData);
    return res.json(result);
  } catch (err: any) {
    console.error("Erro ao executar tarefa agendada manualmente:", err);
    return res.status(500).json({ success: false, error: err?.message || "Erro ao executar tarefa agendada." });
  }
});

// Endpoint para envio de e-mail de boas-vindas
app.post("/api/send-welcome-email", async (req: express.Request, res: express.Response) => {
  const { toEmail, displayName } = req.body;

  if (!toEmail) {
    return res.status(400).json({ error: "Parâmetro 'toEmail' é obrigatório." });
  }

  try {
    const result = await sendWelcomeEmail(toEmail, displayName);
    return res.json(result);
  } catch (error: any) {
    console.error("Erro ao enviar e-mail de boas-vindas:", error);
    return res.status(500).json({ success: false, message: error?.message || "Erro ao disparar e-mail de boas-vindas." });
  }
});

// Endpoint para envio de e-mail de resposta interrompida ou pendente
app.post("/api/notify-interrupted-response", async (req: express.Request, res: express.Response) => {
  const { toEmail, userPrompt, aiResponseSnippet } = req.body;

  if (!toEmail || !aiResponseSnippet) {
    return res.status(400).json({ error: "Parâmetros 'toEmail' e 'aiResponseSnippet' são obrigatórios." });
  }

  try {
    const result = await sendInterruptedResponseEmail(toEmail, userPrompt || "Sua pergunta", aiResponseSnippet);
    return res.json(result);
  } catch (error: any) {
    console.error("Erro ao enviar e-mail de resposta interrompida:", error);
    return res.status(500).json({ success: false, message: error?.message || "Erro ao disparar e-mail." });
  }
});

// Endpoints de gerenciamento de System Prompts do site (Painel ADM)
app.get("/api/admin/prompts", (req: express.Request, res: express.Response) => {
  try {
    const prompts = getAllSystemPrompts();
    return res.json({ success: true, prompts });
  } catch (error: any) {
    console.error("Erro ao listar system prompts:", error);
    return res.status(500).json({ success: false, message: error?.message || "Erro ao buscar system prompts." });
  }
});

app.put("/api/admin/prompts", (req: express.Request, res: express.Response) => {
  const { id, content } = req.body;
  if (!id || typeof content !== "string") {
    return res.status(400).json({ success: false, message: "Parâmetros 'id' e 'content' são obrigatórios." });
  }

  try {
    const result = updateSystemPrompt(id, content);
    if (!result.success) {
      return res.status(404).json({ success: false, message: result.message });
    }
    return res.json({ success: true, message: result.message, updatedPrompt: result.updatedPrompt });
  } catch (error: any) {
    console.error("Erro ao atualizar system prompt:", error);
    return res.status(500).json({ success: false, message: error?.message || "Erro ao salvar system prompt." });
  }
});

// Endpoint para disparo administrativo de e-mails em massa/personalizados
app.post("/api/admin/send-email", async (req: express.Request, res: express.Response) => {
  const { recipients, subject, title, badgeText, subtitleText, bodyMarkdown } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ success: false, message: "A lista de destinatários ('recipients') é obrigatória." });
  }

  if (!subject || !title || !bodyMarkdown) {
    return res.status(400).json({ success: false, message: "Campos 'subject', 'title' e 'bodyMarkdown' são obrigatórios." });
  }

  // Mandatory restriction: Only send to @gmail.com emails!
  const validGmailRecipients = recipients.filter((email: string) => isGmailUser(email));

  if (validGmailRecipients.length === 0) {
    return res.status(400).json({ 
      success: false, 
      message: "Nenhum e-mail válido com final @gmail.com foi fornecido. Apenas contas @gmail.com podem receber e-mails." 
    });
  }

  try {
    const results: { email: string; success: boolean; message: string }[] = [];

    for (const toEmail of validGmailRecipients) {
      const result = await sendGenericEmail({
        toEmail,
        subject,
        badgeText: badgeText || "Aviso Oficial Omnix 1.6",
        title,
        subtitleText: subtitleText || `Comunicação Direta ao Usuário`,
        bodyMarkdown
      });
      results.push({ email: toEmail, ...result });
    }

    const sentCount = results.filter(r => r.success).length;

    return res.json({
      success: sentCount > 0,
      sentCount,
      totalCount: validGmailRecipients.length,
      ignoredCount: recipients.length - validGmailRecipients.length,
      results,
      message: `Disparo concluído: ${sentCount} de ${validGmailRecipients.length} e-mail(s) @gmail.com enviado(s) com sucesso.`
    });
  } catch (error: any) {
    console.error("Erro no envio administrativo de e-mails:", error);
    return res.status(500).json({ success: false, message: error?.message || "Erro interno no servidor ao disparar e-mails." });
  }
});

// Endpoint para disparar manualmente o ciclo de automação de e-mails
app.post("/api/trigger-email-automations", async (req: express.Request, res: express.Response) => {
  try {
    const stats = await runAllEmailAutomations();
    return res.json({ success: true, ...stats });
  } catch (error: any) {
    console.error("Erro na automação de e-mails:", error);
    return res.status(500).json({ success: false, message: error?.message || "Erro ao executar automação de e-mails." });
  }
});

// Inicia o executor periódico de automação de e-mails (após 15s e a cada 2 horas)
setTimeout(() => {
  runAllEmailAutomations().catch(err => console.warn("[EmailAutomation] Falha na execução inicial:", err));
}, 15000);

setInterval(() => {
  runAllEmailAutomations().catch(err => console.warn("[EmailAutomation] Falha na execução periódica:", err));
}, 2 * 60 * 60 * 1000);

// Background tasks executor (every 15 seconds)
setInterval(() => {
  processBackgroundTasks().catch(err => console.warn("[ScheduledTasks] Failed periodic background processing:", err));
}, 15000);

export default app;
