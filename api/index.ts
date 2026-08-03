import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import sharp from "sharp";
import { imageRankingQueue } from "./imageQueue.js";
import { openUrl, clickSelector, typeText, scrollPage, extractText, waitSeconds } from "./playwrightAgent.js";
import { 
  sendScheduledEmail, 
  sendWelcomeEmail, 
  sendInterruptedResponseEmail, 
  sendGenericEmail,
  isGmailUser 
} from "./emailService.js";
import { runAllEmailAutomations } from "./emailAutomation.js";
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
        validParts.push({ inlineData: p.inlineData });
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
  // Ensure config object exists and maxOutputTokens is capped at 8192 for Gemini models
  const reqConfig = { ...(options.config || {}) };
  if (!reqConfig.maxOutputTokens || reqConfig.maxOutputTokens > 8192) {
    reqConfig.maxOutputTokens = 8192;
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

  throw lastError || new Error("WSM 1.6 está muito sobrecarregado agora. Tente novamente mais tarde.");
}

async function callGeminiWithFallback(options: any): Promise<any> {
  return executeWithAllFallbacks(options, false);
}

async function callGeminiStreamWithFallback(options: any): Promise<any> {
  return executeWithAllFallbacks(options, true);
}

// API endpoint for chatbot communication and Web Search
app.post("/api/chat", async (req: express.Request, res: express.Response) => {
  const { text, isSearchEnabled, isComputerEnabled, model, reasoningLevel, history, isWriterMode, writerDocument, skills, userContext, userInfo, isScheduledExecution } = req.body;

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

  // Ensure valid history format
  let finalContents: any = text;
  if (history && Array.isArray(history) && history.length > 0) {
    // Keep all messages that have a valid role and non-empty parts list, preserving text, functionCalls and functionResponses.
    const validHistory = history.filter(msg => {
      return msg && msg.role && msg.parts && Array.isArray(msg.parts) && msg.parts.length > 0;
    });
    if (validHistory.length > 0) {
      finalContents = validHistory;
    }
  }

  try {
    if (!process.env.IA_API_KEY) {
      return res.json({
        text: "⚠️ **Chave de API (IA_API_KEY) não configurada.**\n\nPor favor, configure sua chave `IA_API_KEY` em **Settings > Secrets** no AI Studio (ou nas variáveis de ambiente da sua hospedagem, como a Vercel) para que os modelos do WSM AI possam processar suas mensagens.",
        searchImages: [],
        searchSources: []
      });
    }

    let shouldSearch = effectiveSearchEnabled;

    // Pro uses its own agentic flow for autonomous tool use, but if search is explicitly enabled (manual toggle, scheduled task, or text prompt request), we let it use the structured search flow!
    if (model === 'WSM 1.6 Pro' && !effectiveSearchEnabled) {
      shouldSearch = false;
    } else if (!shouldSearch && process.env.TAVILY_API_KEY) {
      // AI autonomously decides if it needs to search the web for this query
      const triageBase = getSystemPrompt('web_search_triage', `Você é o classificador de intenção de busca web do assistente WSM AI.`);
      const triagePrompt = `${triageBase}\n\nO usuário enviou a seguinte mensagem/pergunta: "${text}"\n\nAvalie se esta mensagem requer uma pesquisa na web em tempo real para ser respondida adequadamente. Se sim, responda EXCLUSIVAMENTE com a palavra "SIM". Se puder responder sem pesquisa, responda EXCLUSIVAMENTE "NAO".`;

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
        contents: `Você é um planejador de pesquisa web em tempo real de alta precisão em português do assistente WSM AI.
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
            console.error(`Tavily error for "${step.tag}":`, response.statusText);
          }
        } catch (err) {
          console.error(`Tavily error for "${step.tag}":`, err);
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
        .slice(0, 15)
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

--- Informações de Pesquisa ---
${contextInfo}`;

      let finalSynthesisText = "Desculpe, não consegui sintetizar uma resposta com os resultados obtidos.";
      
      try {
        const aiResponse = await callGeminiWithFallback({
          model: "gemini-3.5-flash-lite",
          contents: finalContents,
          config: {
            systemInstruction: systemPrompt
          }
        });
        finalSynthesisText = aiResponse.text || finalSynthesisText;
      } catch (err) {
        console.error("Error generating final synthesis:", err);
        finalSynthesisText = "⚠️ **Ocorreu um erro ao sintetizar os resultados da pesquisa.** Por favor, tente novamente.";
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
      'WSM 1.6 Flash': `Você é o modelo de inteligência artificial 'WSM 1.6 Flash', um assistente pessoal ultra-inteligente, rápido e prestativo.

## Personalidade
Você não é um robô genérico repetindo respostas de manual. Você tem seu próprio jeito de pensar, gosta de conversar, e trata o usuário como um amigo esperto trataria: direto, sem enrolação, mas simpático. Você pode ter opiniões sobre assuntos do dia a dia (filmes, tecnologia, decisões simples, gostos) e não tem problema em dizer "eu acho que..." quando fizer sentido. Se o usuário discordar de algo que você disse e você continuar achando que está certo, explique seu raciocínio com confiança — você não muda de ideia só pra agradar, mas também não é teimoso: se o usuário trouxer um argumento ou fato novo e melhor, você reconhece e ajusta. Fale de um jeito natural, como uma pessoa real fala, evitando frases robóticas tipo "como uma IA, eu não tenho opiniões".

## Formatação
Responda de forma coerente com o idioma em que o usuário se comunicou ou solicitou (português se for em português, francês se for francês, japonês se for japonês, etc.). Formate suas respostas de forma bonita e profissional:
- Use **negrito**, *itálico* e listas.
- Use títulos (#) e subtítulos (##) para estruturar respostas longas.
- NÃO use equações ou formatação matemática via LaTeX, a menos que o assunto seja estritamente matemático, físico ou científico. Nunca coloque equações em respostas cotidianas comuns.
- Se o usuário pedir códigos de programação, use blocos de código com a linguagem correspondente (ex: \`\`\`javascript).
- Se pedir análises ou comparações, monte tabelas organizadas.
- Para o dia a dia, prefira respostas curtas e objetivas — só se estenda quando o assunto realmente precisar.

## Capacidade de Pesquisa na Web
Você é capaz de buscar informações na internet em tempo real. Sempre que um usuário te perguntar sobre notícias, cotações, ou fatos recentes que você não sabe de cor, o sistema fará uma pesquisa automática para você.`,

      'WSM 1.6 Pro': getSystemPrompt('wsm_1_6_pro_base', `Você é o modelo de inteligência artificial "WSM 1.6 Pro", um assistente pessoal agêntico, altamente inteligente e direto.`)
    };

    const formInstruction = "\n" + getSystemPrompt('form_generation', '');
    const docInstruction = "\n" + getSystemPrompt('doc_generation', '');
    const writingConstraints = "\n" + getSystemPrompt('writing_constraints', '');
    const tasksInstruction = isScheduledExecution
      ? `\n## ATENÇÃO CRÍTICA: EXECUÇÃO AUTOMÁTICA DE TAREFA AGENDADA\nEsta requisição é a execução de uma tarefa que JÁ FOI AGENDADA previamente. Você está ABSOLUTAMENTE PROIBIDO de gerar a tag <wsm_task ... /> nesta resposta under ANY circumstances. Apenas execute a instrução e apresente o resultado final diretamente.`
      : "\n" + getSystemPrompt('autonomous_tasks', '');

    let basePrompt = modelSystemPrompts[model] || modelSystemPrompts['WSM 1.6 Flash'];
    let reasoningInstruction = "";
    if (model === 'WSM 1.6 Flash') {
      const level = reasoningLevel || 'Mínimo';
      console.log(`[Reasoning Level] WSM 1.6 Flash requested with level: ${level}`);
      if (level === 'Nenhum') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Desativado)
Você está no modo sem raciocínio / esforço Nenhum. 
Você está ABSOLUTAMENTE PROIBIDO de gerar qualquer tag de raciocínio como <raciocinio>, </raciocinio>, <task> ou </task>. 
Não faça nenhuma etapa de planejamento mental, nem mostre tarefas em colchetes. 
Você deve responder diretamente ao usuário. Comece sua resposta imediatamente com a resposta final.`;
      } else if (level === 'Mínimo') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Mínimo - Limite estrito de no máximo 100 Tokens)
IMPORTANTE:
1. Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da sua resposta.
2. LIMITE MÁXIMO DE RACIOCÍNIO: Mantenha seu raciocínio SUPER CURTO, em no máximo 1 a 2 frases objetivas (limite máximo de 100 tokens dentro de <raciocinio>). NUNCA faça reflexões longas ou parágrafos extensos.
3. REGRA CRÍTICA DE RESPOSTA FINAL: APÓS fechar o bloco </raciocinio>, VOCÊ É ABSOLUTAMENTE OBRIGADO A ESCREVER A RESPOSTA FINAL COMPLETA E DIRETA PARA O USUÁRIO (ou acionar as ferramentas necessárias). É estritamente PROIBIDO encerrar a resposta apenas com o bloco <raciocinio> sem nada escrito depois!`;
      } else if (level === 'Baixo') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Baixo - Limite estrito de no máximo 200 Tokens)
IMPORTANTE:
1. Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da sua resposta.
2. LIMITE MÁXIMO DE RACIOCÍNIO: Resuma os passos mentais em no máximo 1 parágrafo curto e objetivo (limite máximo de 200 tokens dentro de <raciocinio>).
3. REGRA CRÍTICA DE RESPOSTA FINAL: APÓS fechar o bloco </raciocinio>, VOCÊ É ABSOLUTAMENTE OBRIGADO A ESCREVER A RESPOSTA FINAL COMPLETA E DIRETA PARA O USUÁRIO (ou acionar as ferramentas necessárias). É estritamente PROIBIDO encerrar a resposta apenas com o bloco <raciocinio> sem nada escrito depois!`;
      } else if (level === 'Médio') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Médio - Limite estrito de no máximo 400 Tokens)
IMPORTANTE:
1. Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da sua resposta.
2. LIMITE MÁXIMO DE RACIOCÍNIO: Desenvolva o raciocínio em no máximo 2 a 3 tópicos diretos (limite máximo de 400 tokens dentro de <raciocinio>).
3. REGRA CRÍTICA DE RESPOSTA FINAL: APÓS fechar o bloco </raciocinio>, VOCÊ É ABSOLUTAMENTE OBRIGADO A ESCREVER A RESPOSTA FINAL COMPLETA E DIRETA PARA O USUÁRIO (ou acionar as ferramentas necessárias). É estritamente PROIBIDO encerrar a resposta apenas com o bloco <raciocinio> sem nada escrito depois!`;
      } else if (level === 'Alto') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Alto - Limite estrito de no máximo 800 Tokens)
IMPORTANTE:
1. Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da sua resposta.
2. LIMITE MÁXIMO DE RACIOCÍNIO: Pense passo a passo com limite máximo de 800 tokens dentro de <raciocinio>.
3. REGRA CRÍTICA DE RESPOSTA FINAL: APÓS fechar o bloco </raciocinio>, VOCÊ É ABSOLUTAMENTE OBRIGADO A ESCREVER A RESPOSTA FINAL COMPLETA E DIRETA PARA O USUÁRIO (ou acionar as ferramentas necessárias). É estritamente PROIBIDO encerrar a resposta apenas com o bloco <raciocinio> sem nada escrito depois!`;
      } else if (level === 'Extremo') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Extremo - Limite estrito de no máximo 1200 Tokens)
IMPORTANTE:
1. Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da sua resposta.
2. LIMITE MÁXIMO DE RACIOCÍNIO: Pense de forma profunda e estruturada (limite máximo de 1200 tokens dentro de <raciocinio>).
3. REGRA CRÍTICA DE RESPOSTA FINAL: APÓS fechar o bloco </raciocinio>, VOCÊ É ABSOLUTAMENTE OBRIGADO A ESCREVER A RESPOSTA FINAL COMPLETA E DIRETA PARA O USUÁRIO (ou acionar as ferramentas necessárias). É estritamente PROIBIDO encerrar a resposta apenas com o bloco <raciocinio> sem nada escrito depois!`;
      }
    }
    let browserInstruction = ``;
    if (model === 'WSM 1.6 Pro' || model === 'WSM 1.6 Flash') {
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
    if (model === 'WSM 1.6 Pro') {
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
      activeSystemPrompt = basePrompt + (userLocationContextInstruction ? "\n\n" + userLocationContextInstruction : "") + modeAdditions;
    } else {
      activeSystemPrompt = basePrompt + reasoningInstruction + "\n\n" + userLocationContextInstruction + "\n\n" + writingConstraints + "\n\n" + formInstruction + "\n\n" + docInstruction + "\n\n" + tasksInstruction + "\n\n" + browserInstruction;
    }

    let mappedModel = "gemini-3.5-flash-lite";
    if (model === 'WSM 1.6 Pro') mappedModel = "gemini-3.5-flash-lite";
    else if (model === 'WSM 1.6 Flash') mappedModel = "gemini-3.5-flash-lite";

    if (model === 'WSM 1.6 Pro' || model === 'WSM 1.6 Flash') {
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
            name: "gerar_imagem",
            description: "MANDATÓRIO: Chame esta ferramenta SEMPRE que o usuário pedir para gerar, criar, desenhar ou imaginar uma imagem, foto ou ilustração. NÃO responda apenas com texto, chame a ferramenta obrigatoriamente neste turno.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                prompt: {
                  type: Type.STRING,
                  description: "O prompt visual em inglês (ex: 'a majestic golden retriever sitting on a mountain peak, cinematic, 8k')."
                }
              },
              required: ["prompt"]
            }
          },
          {
            name: "open_url",
            description: "Abre uma URL no navegador real em background e retorna o conteúdo da página com os elementos interativos.",
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

      const promptWantsBrowser = !isHtmlSiteRequest && ((Boolean(effectiveComputerEnabled) && !isSimpleGreetingOrMathPrompt) || 
        /\b(abrir|acesse|acessar|navegar|entrar|ir\s+at[ée]|visit\w*|abra)\b/i.test(userStrPrompt) ||
        /\b(link|url|navegador|google|youtube|wikipedia|github|brave|twitter|x\.com)\b/i.test(userStrPrompt) ||
        (/https?:\/\/|www\./i.test(userStrPrompt) && !/tailwindcss\.com|googleapis\.com|unpkg\.com|cdnjs\.com/i.test(userStrPrompt)));
      const promptWantsSearch = !isHtmlSiteRequest && (Boolean(effectiveSearchEnabled) ||
        /\b(pesquis|busc|procur|encontr)\w*\b/i.test(userStrPrompt) ||
        /\b(web|internet|google|brave|notícia|noticias|hoje|site|quem\s+[ée]|onde\s+fica|quanto\s+custa|neymar|futebol|preço|cotação)\b/i.test(userStrPrompt));
      const promptWantsImage = /\b(gerar|crie|criar|desenhar|desenhe|pintar|pinte)\b.*\b(imagem|foto|ilustraç|arte|desenho|pintura|quadro)\b/i.test(userStrPrompt);
      const promptWantsDoc = /\b(documento|relatório|relatorio|redação|redacao|resumo|artigo|tcc|texto|capítulo|capitulo|escrever|criar\s+doc|editar\s+doc|gerar\s+doc)\b/i.test(userStrPrompt);
      const promptHasRequestedActions = !isHtmlSiteRequest && !isSimpleGreetingOrMathPrompt && (promptWantsBrowser || promptWantsSearch || promptWantsImage || promptWantsDoc);

      while (turnCount < 100) {
        if (turnCount > 0) {
          console.log(`[Pro] Waiting 2 seconds before next Gemini request to prevent rate limits...`);
          await new Promise(r => setTimeout(r, 2000));
        }

        let currentToolConfig: any = undefined;
        if (!isHtmlSiteRequest && (forceNextTurnModeAny || (turnCount === 0 && promptHasRequestedActions))) {
          currentToolConfig = {
            functionCallingConfig: {
              mode: "ANY"
            }
          };
        }

        const response = await callGeminiWithFallback({
          model: mappedModel,
          contents: currentContents,
          tools: marteTools,
          config: {
            systemInstruction: activeSystemPrompt + 
              "\nREGRA PRINCIPAL E OBRIGATÓRIA DE DOCUMENTOS (PDF vs MD): A preferência absoluta de geração de documentos (redações, relatórios, artigos, resumos, ensaios, cartas, etc.) É OBRIGATORIAMENTE PDF (`format: 'pdf'` e nome do arquivo terminado em `.pdf`). O formato Markdown (`format: 'md'`) NÃO deve ser usado para documentos comuns de usuários normais — MD é estritamente exclusivo para conteúdos de TI/desenvolvimento técnico (como System Prompts, READMEs técnicos e specs de código). NUNCA crie arquivos .md para redações ou trabalhos escolares/profissionais comuns!" +
              "\nIMPORTANTE: Quando usar uma ferramenta, chame a função ANTES. NUNCA gere as tags [pesquisou na web], [calculando] ou [verificando relógio] ANTES de chamar a função. Gere a tag APENAS na sua resposta final de texto, APÓS receber o resultado da função." +
              "\nNUNCA gere manualmente as tags em colchetes como `[pesquisou na web]`, `[calculando]`, `[verificando relógio]` na sua resposta final de texto. O nosso sistema de backend já insere e renderiza essas tags de progresso e status automaticamente no chat. Sua tarefa é focar exclusivamente em gerar o conteúdo final explicativo e o código, sem adicionar essas tags de status ao final." +
              "\nREGRA DA CALCULADORA: SEMPRE que precisar resolver QUALQUER expressão matemática (ex: v² = 20² + 2×(-10)×(-5)), VOCÊ DEVE OBRIGATORIAMENTE chamar a ferramenta 'calculadora'. NUNCA calcule de cabeça ou deduza o valor (ex: alucinar 24.49 em vez de 22.36). Após receber o resultado exato da calculadora, escreva sua resposta final conferindo o valor retornado." +
              "\nREGRA DA WEB SEARCH: Use web_search APENAS para fatos históricos, notícias e informações do mundo real. É ESTRITAMENTE PROIBIDO usar web_search para pesquisar sobre programação, HTML, CSS, JS, tutoriais, tendências de design ou como criar um site. Se o usuário pedir um site, GERE O CÓDIGO IMEDIATAMENTE sem pesquisar na web!" +
              "\nREGRA DE GERAÇÃO DE IMAGENS (AI HORDE): SEMPRE que o usuário solicitar para gerar, criar, desenhar ou pintar uma imagem, foto, ilustração ou arte visual, você DEVE OBRIGATORIAMENTE chamar a ferramenta 'gerar_imagem' IMEDIATAMENTE. IMPORTANTE: NUNCA diga 'Vou gerar a imagem' e encerre o turno sem chamar a ferramenta. Você DEVE chamar a ferramenta no MESMO turno! Ao chamar, passe o prompt descritivo detalhado em inglês (ex: 'a majestic golden retriever sitting on a mountain peak, cinematic, 8k')." +
              "\nREGRA DE SINTAXE APÓS GERAR IMAGEM: Quando 'gerar_imagem' for executada, a imagem gerada já é exibida automaticamente pela interface no componente <wsm_image>. Na sua resposta final, é ABSOLUTAMENTE PROIBIDO escrever manualmente a tag <wsm_image>, dados base64, URLs ou sintaxe markdown ![alt](url). Apenas faça um breve comentário amigável sobre a imagem gerada (o sistema já inseriu e exibiu a imagem no chat)." +
              "\nREGRA DE NAVEGAÇÃO WEB REAL (PLAYWRIGHT): SEMPRE que o usuário pedir para abrir, acessar ou navegar em qualquer site (ex: Brave Search, Google, Wikipedia, etc), VOCÊ DEVE OBRIGATORIAMENTE emitir a chamada de função 'open_url' (functionCall) no MESMO TURNO. É ABSOLUTAMENTE PROIBIDO apenas escrever texto prometendo abrir o site sem enviar a chamada da ferramenta 'open_url'!" +
              "\nREGRAS OBRIGATÓRIAS DE AGENTE SEQUENCIAL MULTI-ETAPAS (PASSO A PASSO):" +
              "\n1. Atue como um AGENTE SEQUENCIAL AUTÔNOMO que executa tarefas complexas em múltiplos turnos encadeados." +
              "\n2. Se o usuário solicitou MÚLTIPLAS ETAPAS no prompt (ex: 'pesquise na web X e depois abra o site Y', 'gerar imagem e depois pesquisar', 'pesquisar e depois abrir navegador', etc.):" +
              "\n   - Execute UMA FERRAMENTA POR TURNO de forma organizada." +
              "\n   - APÓS RECEBER O RETORNO DE UMA FERRAMENTA (ex: 'web_search'), SE O PROMPT DO USUÁRIO SOLICITOU OUTRAS AÇÕES (ex: abrir site com 'open_url', clicar, navegar, calcular, gerar imagem), VOCÊ DEVE OBRIGATORIAMENTE EXECUTAR A PRÓXIMA FERRAMENTA NO TURNO SEGUINTE." +
              "\n   - É ABSOLUTAMENTE PROIBIDO encerrar a resposta ou parar na metade do fluxo logo após a pesquisa na web se ainda houver outras ações ou sites para abrir solicitados pelo usuário!" +
              "\n   - Apenas apresente a resposta final completa em texto quando TODAS as ferramentas e ações pedidas no prompt do usuário tiverem sido devidamente executadas." +
              "\n3. CRÍTICO: NUNCA escreva apenas texto conversacional prometendo ações (ex: 'Vou abrir o site', 'Para atender seu pedido...') sem enviar a chamada de função (functionCall) no mesmo turno!",
            ...(currentToolConfig ? { toolConfig: currentToolConfig } : {}),
            temperature: 0.7
          }
        });

        const modelContent = response.candidates?.[0]?.content;
        if (!modelContent) {
          console.error("Gemini response missing content. Full response:", JSON.stringify(response, null, 2));
          throw new Error("No content returned from Gemini model. Reason: " + (response.candidates?.[0]?.finishReason || 'Unknown'));
        }

        let textForThisTurn = "";
        let functionCallsForThisTurn: any[] = [];

        if (modelContent.parts) {
          for (const part of modelContent.parts) {
            if (part.text) {
              textForThisTurn += part.text;
            }
            if (part.functionCall) {
              functionCallsForThisTurn.push(part.functionCall);
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
            if (['open_url', 'click', 'type_text', 'scroll_page', 'web_search', 'gerar_imagem', 'create_document', 'edit_document', 'read_document', 'append_document', 'delete_document', 'list_documents'].includes(fnName)) {
              if (fnName === 'open_url' && !fnArgs.url) {
                const urlM = textForThisTurn.match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app)[^\s]*)/i);
                if (urlM) {
                  let u = urlM[0];
                  if (!u.startsWith('http')) u = 'https://' + u;
                  fnArgs = { url: u };
                }
              }
              functionCallsForThisTurn.push({ name: fnName, args: fnArgs });
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
          const wantsBrowser = !isHtmlRequestThisTurn && ((Boolean(effectiveComputerEnabled) && !isSimpleGreetingOrMath) || 
            /\b(abrir|acesse|acessar|navegar|entrar\s+no|ir\s+at[ée]|visit\w*|abra)\s+(o\s+)?(link|url|navegador)\b|\b(abrir|acesse|acessar|entrar\s+no|visitar|pesquisar\s+no|procurar\s+no)\s+(youtube|google|wikipedia|github|brave|twitter|x\.com)\b|\b(ativ\w*|us\w*|habilit\w*)\s+.*(computador|agente|navegador)\b|\bmodo\s+computador\b/i.test(userStr));
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
            const urlMatch = (userStr + " " + aiStr).match(/(https?:\/\/(?!cdn\.|fonts\.|unpkg\.|cdnjs\.|jsdelivr\.)[^\s<>"'\)]+|www\.[^\s<>"'\)]+)/i);
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
              const openSiteMatch = userStr.match(/(?:abra|acesse|acessar|entrar no)\s+([a-zA-Z0-9-]+)/i);
              if (openSiteMatch) {
                const sName = openSiteMatch[1].toLowerCase();
                if (sName === 'youtube') targetUrl = 'https://www.youtube.com';
                else if (sName === 'github') targetUrl = 'https://github.com';
                else if (sName === 'google') targetUrl = 'https://www.google.com';
                else targetUrl = `https://www.${sName}.com`;
              } else if (/pesquisar|pesquisa|buscar|busca/i.test(userStr)) {
                targetUrl = "https://search.brave.com";
              }
            }

            if (targetUrl) {
              functionCallsForThisTurn.push({ name: "open_url", args: { url: targetUrl } });
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

          

          if (cleanText.trim()) {
            fullOutput += cleanText;
            // Send text in simulated stream chunks for smooth UI typewriter feel
            const words = cleanText.split(/(\s+)/);
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

          console.log("[DEBUG] modelContent.parts:", JSON.stringify(modelContent?.parts));
          const hasNativeCalls = modelContent && modelContent.parts && modelContent.parts.some((p: any) => p.functionCall);
          const modelPartsForContents = (hasNativeCalls && modelContent?.parts)
            ? modelContent.parts
            : [
                ...(textForThisTurn ? [{ text: textForThisTurn }] : []),
                ...functionCallsForThisTurn.map(fc => ({ functionCall: fc }))
              ];

          currentContents.push({ role: "model", parts: modelPartsForContents });

          const functionResponseParts: any[] = [];

          for (const fc of functionCallsForThisTurn) {
            console.log(`[Pro] Agent called function: ${fc.name}`, fc.args);
            
            let resultImgUrl = "";
            let errorMsg = "";
            let promptStr = "";
            
            // Artificial delay/spinner for user experience
            let thinkingText = "\n\n[processando...]\n\n";
            if (fc.name === "web_search") thinkingText = "\n\n[pesquisando...]\n\n";
            else if (fc.name === "calculadora") thinkingText = "\n\n[calculando...]\n\n";
            else if (fc.name === "relogio") thinkingText = "\n\n[verificando...]\n\n";
            else if (fc.name === "gerar_imagem") thinkingText = `\n\n<wsm_image prompt="${(fc.args as any)?.prompt || 'Imagem'}" imgUrl="" />\n\n`;
            else if (fc.name === "open_url") thinkingText = `\n\n[Abrindo site: ${(fc.args as any).url}...]\n\n`;
            else if (fc.name === "click") thinkingText = `\n\n[Clicando no elemento...]\n\n`;
            else if (fc.name === "type_text") thinkingText = `\n\n[Digitando "${(fc.args as any).text}"...]\n\n`;
            else if (fc.name === "scroll_page") thinkingText = `\n\n[Rolando página para ${(fc.args as any)?.direction === 'up' ? 'cima' : 'baixo'}...]\n\n`;
            else if (fc.name === "extract_visible_text") thinkingText = `\n\n[Lendo página atualizada...]\n\n`;
            else if (fc.name === "wait_seconds") thinkingText = `\n\n[Aguardando ${(fc.args as any)?.seconds || 3}s para o site carregar...]\n\n`;
            else if (fc.name === "create_document") thinkingText = `\n\n[Criando documento: "${(fc.args as any)?.title || 'Documento'}"...]\n\n`;
            else if (fc.name === "read_document") thinkingText = `\n\n[Lendo documento: "${(fc.args as any)?.title || 'Documento'}"...]\n\n`;
            else if (fc.name === "edit_document" || fc.name === "append_document") thinkingText = `\n\n[Editando documento: "${(fc.args as any)?.title || 'Documento'}"...]\n\n`;
            else if (fc.name === "delete_document") thinkingText = `\n\n[Excluindo documento: "${(fc.args as any)?.title || 'Documento'}"...]\n\n`;
            else if (fc.name === "list_documents") thinkingText = `\n\n[Listando documentos...]\n\n`;

            sendEvent({ type: "chunk", text: thinkingText });
            fullOutput += thinkingText;
            
            if (fc.name === "web_search") {
              const args = fc.args as any;
              let resultData = null;
              try {
                if (process.env.TAVILY_API_KEY) {
                  const tvRes = await fetch("https://api.tavily.com/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      api_key: process.env.TAVILY_API_KEY,
                      query: args.query,
                      search_depth: "basic",
                      include_images: true,
                      include_answer: true,
                      max_results: 20,
                    })
                  });
                  if (tvRes.ok) {
                    const data = await tvRes.json();
                    resultData = data.results;
                    if (data.results) {
                      data.results.forEach((r: any) => marteSources.push({ title: r.title || r.url, url: r.url, snippet: r.content }));
                    }
                    if (data.images) {
                      marteImages.push(...data.images.map((i:any) => typeof i === "string" ? i : i.url));
                    }
                  } else {
                     resultData = { error: "Failed to search web" };
                  }
                } else {
                   resultData = { error: "TAVILY_API_KEY is not configured" };
                }
              } catch (e) {
                 resultData = { error: String(e) };
              }
              functionResponseParts.push({
                functionResponse: { name: fc.name, response: { result: resultData } }
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
                functionResponse: { name: fc.name, response: { result: mathResult } }
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
                functionResponse: { name: fc.name, response: { result: timeData } }
              });
            } else if (fc.name === "gerar_imagem") {
              const args = fc.args as any;
              promptStr = args.prompt || "";
              resultImgUrl = "";
              errorMsg = "";

              let queueId = "";
              try {
                // 1. Enter Virtual Ranking Queue in Database
                queueId = await imageRankingQueue.enqueue(promptStr, userInfo);

                // 2. Wait until request enters Top 3 in ranking and a slot opens
                await imageRankingQueue.waitForTurn(queueId);

                console.log(`[Pro] AI Horde generating image with prompt: "${promptStr}"`);
                try {
                  const responseAsync = await fetch("https://aihorde.net/api/v2/generate/async", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "apikey": "0000000000",
                      "Client-Agent": "WSMAI:1.0:wsmai@wsm.ai"
                    },
                    body: JSON.stringify({
                      prompt: promptStr,
                      params: {
                        sampler_name: "k_euler",
                        cfg_scale: 7.5,
                        height: 512,
                        width: 512,
                        steps: 20,
                        n: 1
                      },
                      nsfw: false,
                      censor_nsfw: true,
                      models: ["AlbedoBase XL 3.1", "SDXL 1.0", "stable_diffusion", "Deliberate", "ICBINP - I Can't Believe It's Not Photography"]
                    })
                  });

                  if (responseAsync.ok) {
                    const initData = await responseAsync.json();
                    const requestId = initData.id;

                    if (requestId) {
                      let isDone = false;
                      let attempts = 0;
                      const maxAttempts = 20; // 40 seconds max for primary provider

                      while (!isDone && attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        attempts++;

                        const statusRes = await fetch(`https://aihorde.net/api/v2/generate/status/${requestId}`);
                        if (statusRes.ok) {
                          const statusData = await statusRes.json();
                          if (statusData.done) {
                            isDone = true;
                            if (statusData.generations && statusData.generations.length > 0) {
                              resultImgUrl = statusData.generations[0].img;
                            }
                          } else if (statusData.faulted) {
                            break;
                          }
                        }
                      }
                    }
                  }
                } catch (hordeErr) {
                  console.warn("[Pro] AI Horde primary attempt encountered error:", hordeErr);
                }

                // Fallback to Pollinations AI if AI Horde timed out or was busy
                if (!resultImgUrl) {
                  console.log(`[Pro] Triggering ultra-fast fallback image generation via Pollinations AI...`);
                  try {
                    const polUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptStr)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 10000000)}&nologo=true`;
                    const polRes = await fetch(polUrl);
                    if (polRes.ok) {
                      const polArrayBuf = await polRes.arrayBuffer();
                      if (polArrayBuf.byteLength > 1000) {
                        const base64Str = Buffer.from(polArrayBuf).toString("base64");
                        resultImgUrl = `data:image/jpeg;base64,${base64Str}`;
                      }
                    }
                  } catch (polErr) {
                    console.error("[Pro] Pollinations AI fallback also failed:", polErr);
                  }
                }

                if (!resultImgUrl) {
                  throw new Error("A geração de imagem expirou. Por favor, tente novamente.");
                }

                // Convert image to Base64 data URI & bake AI logo watermark into the bottom-right corner
                if (resultImgUrl) {
                  try {
                    let inputBuffer: Buffer;
                    if (resultImgUrl.startsWith("data:")) {
                      const commaIdx = resultImgUrl.indexOf(",");
                      inputBuffer = Buffer.from(resultImgUrl.substring(commaIdx + 1), "base64");
                    } else {
                      const imgRes = await fetch(resultImgUrl);
                      if (!imgRes.ok) throw new Error("Falha ao carregar imagem para marca d'água.");
                      inputBuffer = Buffer.from(await imgRes.arrayBuffer());
                    }

                    const logoBuffer = await getWatermarkLogoBuffer();
                    if (logoBuffer) {
                      const mainImage = sharp(inputBuffer);
                      const metadata = await mainImage.metadata();
                      const imgWidth = metadata.width || 512;
                      const imgHeight = metadata.height || 512;

                      // Logo size: ~8% of image width (min 28px, max 80px)
                      const logoWidth = Math.max(28, Math.min(80, Math.round(imgWidth * 0.08)));

                      // Apply ~45% opacity to logo
                      const logoResized = await sharp(logoBuffer)
                        .resize(logoWidth, logoWidth, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .ensureAlpha()
                        .composite([{
                          input: Buffer.from(`<svg width="${logoWidth}" height="${logoWidth}"><rect width="100%" height="100%" fill="#ffffff" fill-opacity="0.45"/></svg>`),
                          blend: 'dest-in'
                        }])
                        .toBuffer();

                      // Position in the bottom right corner with small margin
                      const margin = Math.max(10, Math.round(imgWidth * 0.025));
                      const top = Math.max(0, imgHeight - logoWidth - margin);
                      const left = Math.max(0, imgWidth - logoWidth - margin);

                      const watermarkedBuffer = await mainImage
                        .composite([{ input: logoResized, top, left }])
                        .webp({ quality: 92 })
                        .toBuffer();

                      resultImgUrl = `data:image/webp;base64,${watermarkedBuffer.toString("base64")}`;
                    } else {
                      const base64 = inputBuffer.toString("base64");
                      resultImgUrl = `data:image/webp;base64,${base64}`;
                    }
                  } catch (convErr) {
                    console.warn("[Pro] Watermarking/Base64 conversion failed, keeping original URL:", convErr);
                  }
                }

                // Image generated successfully -> exit ranking queue and release slot for next in line
                await imageRankingQueue.complete(queueId, true, resultImgUrl);

              } catch (e: any) {
                console.error("Erro ao gerar imagem no AI Horde:", e);
                errorMsg = e.message || String(e);
                if (queueId) {
                  await imageRankingQueue.complete(queueId, false, undefined, errorMsg);
                }
              }

              functionResponseParts.push({
                functionResponse: { 
                  name: fc.name, 
                  response: { 
                    result: resultImgUrl ? { 
                      success: true, 
                      message: "A imagem foi gerada e já está sendo exibida na interface pelo componente <wsm_image>. NÃO repita a URL/base64 e NÃO use sintaxe markdown de imagem ![alt](url) na sua resposta final.", 
                      prompt: promptStr 
                    } : { success: false, error: errorMsg }
                  } 
                }
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

              functionResponseParts.push({
                functionResponse: {
                  name: fc.name,
                  response: result
                }
              });
            } else if (fc.name === "create_document") {
              const args = fc.args as any;
              const title = String(args.title || 'Documento').trim();
              const content = String(args.content || '');
              const format = inferFormat(title, args.format, content);
              workspaceDocuments.set(title, { title, content, format });
              functionResponseParts.push({
                functionResponse: {
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
              const title = String(args.title || 'Documento').trim();
              const content = String(args.content || '');
              const existingDoc = workspaceDocuments.get(title);
              const format = inferFormat(title, args.format || existingDoc?.format, content);
              workspaceDocuments.set(title, { title, content, format });
              functionResponseParts.push({
                functionResponse: {
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
              finalTagText = "\n\n[pesquisou na web]\n\n";
            } else if (fc.name === "calculadora") {
              finalTagText = "\n\n[calculando]\n\n";
            } else if (fc.name === "relogio") {
              finalTagText = "\n\n[verificando relógio]\n\n";
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
              finalTagText = `\n\n[Criou documento: ${(fc.args as any)?.title || 'Documento'}]\n\n`;
            } else if (fc.name === "read_document") {
              finalTagText = `\n\n[Leu documento: ${(fc.args as any)?.title || 'Documento'}]\n\n`;
            } else if (fc.name === "edit_document" || fc.name === "append_document") {
              finalTagText = `\n\n[Editou documento: ${(fc.args as any)?.title || 'Documento'}]\n\n`;
            } else if (fc.name === "delete_document") {
              finalTagText = `\n\n[Excluiu documento: ${(fc.args as any)?.title || 'Documento'}]\n\n`;
            } else if (fc.name === "list_documents") {
              finalTagText = `\n\n[Listou documentos do workspace]\n\n`;
            }
            const lastIdx = fullOutput.lastIndexOf(thinkingText);
            if (lastIdx !== -1) {
              fullOutput = fullOutput.substring(0, lastIdx) + finalTagText + fullOutput.substring(lastIdx + thinkingText.length);
            } else {
              fullOutput = fullOutput.replace(thinkingText, finalTagText);
            }
            sendEvent({ type: "sync_text", text: fullOutput });
          }
          currentContents.push({ role: "user", parts: functionResponseParts });
          turnCount++;
          forceNextTurnModeAny = false;
        } else {
          // Check for unfulfilled tool calls (e.g. model outputted conversational text or <task> block promising tools without calling functionCall)
          const userStr = (typeof text === 'string' ? text : JSON.stringify(text)).toLowerCase();
          const aiStr = (textForThisTurn || "").toLowerCase();

          const isHtmlRequestThisTurn = isHtmlSiteRequest || aiStr.includes("[lendo skill: web-html]") || aiStr.includes("web-html") || aiStr.includes("<html") || aiStr.includes("<!doctype html>");

          const aiHasTaskBlock = aiStr.includes("<task>") || /\[(acessar|digitar|rolar|clicar|pesquisar|buscar|aguardar|esperar)\b/i.test(aiStr);
          const aiPromisedBrowser = !isHtmlRequestThisTurn && (/\b(vou|irei|estou|vamos|agora|próximo|proximo)\s+(abrir|acessar|navegar|digitar|clicar|rolar|preencher|enviar|colocar|selecionar|pressionar|aguardar|esperar|fechar)\b/i.test(aiStr) || /\b(preenchendo|enviando|clicando|digitando|abrindo|acessando|rolando|aguardando|fechando)\b/i.test(aiStr));
          const aiPromisedSearch = !isHtmlRequestThisTurn && (/\b(vou|irei|estou)\s+(pesquisar|buscar)\b|\bpesquisando\b/i.test(aiStr));
          const aiPromisedImage = /\b(gerando|criando|desenhando|pintando)\s+(a|uma)?\s*(imagem|foto|ilustraç|arte)\b/i.test(aiStr);

          const isSimpleGreetingOrMath2 = /^(ol[áa]|oi|tudo\s+bem|boa\s+(tarde|noite|dia)|quanto\s+[ée]|calcul[ae]|1\+[123456789]|2\+2)$/i.test(userStr.trim());
          const wantsBrowser = !isHtmlRequestThisTurn && ((Boolean(effectiveComputerEnabled) && !isSimpleGreetingOrMath2) || promptWantsBrowser);
          const wantsSearch = !isHtmlRequestThisTurn && (Boolean(effectiveSearchEnabled) || promptWantsSearch);
          const wantsImage = promptWantsImage;

          const aiHasFinalConclusion = /\b(concluí|conclui|concluído|concluido|finalizei|finalizado|tudo certo|sucesso no teste|teste concluído)\b/i.test(aiStr);

          const missingToolCall = !isHtmlRequestThisTurn && (
            aiHasTaskBlock ||
            aiPromisedBrowser ||
            aiPromisedSearch ||
            aiPromisedImage ||
            (turnCount === 0 && !isSimpleGreetingOrMath2 && (wantsBrowser || wantsSearch || wantsImage) && !aiHasFinalConclusion)
          );

          if (missingToolCall && turnCount < 100) {
            console.warn(`[Pro] Missing tool call / unfulfilled task detected on turn ${turnCount}! Triggering mode ANY recovery...`);
            
            // Clean up intermediate unfulfilled conversational text / task text from fullOutput to prevent duplicate text in UI
            if (textForThisTurn) {
              const lastIdx = fullOutput.lastIndexOf(textForThisTurn);
              if (lastIdx !== -1) {
                fullOutput = fullOutput.substring(0, lastIdx);
                sendEvent({ type: "sync_text", text: fullOutput });
              }
            }

            currentContents.push({ 
              role: "model", 
              parts: (modelContent?.parts && modelContent.parts.length > 0) ? modelContent.parts : [{ text: textForThisTurn || "Processando requisição..." }] 
            });

            let reminderMsg = "";
            if (aiHasTaskBlock || wantsBrowser || aiPromisedBrowser) {
              let targetUrl = "";
              const urlMatch = (userStr + " " + aiStr).match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app)[^\s]*)/i);
              if (urlMatch) {
                targetUrl = urlMatch[0];
                if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
              }

              reminderMsg = `SISTEMA (AÇÃO DE FERRAMENTA OBRIGATÓRIA - PLAN → ACT → OBSERVE → REFLECT): Você mencionou um próximo passo ou descreveu ações ("${(textForThisTurn || "").slice(0, 100)}..."), mas NENHUMA função (functionCall) foi disparada neste turno! Você DEVE OBRIGATORIAMENTE invocar a ferramenta necessária ('open_url'${targetUrl ? ` com "${targetUrl}"` : ''}, 'type_text', 'click', 'scroll_page', 'wait_seconds' ou 'web_search') via Function Call agora para continuar a tarefa até a conclusão. É estritamente PROIBIDO parar ou apenas responder com texto sem disparar a função!`;
            } else if (wantsImage || aiPromisedImage) {
              reminderMsg = "SISTEMA (GERAÇÃO DE IMAGEM OBRIGATÓRIA): Execute a ferramenta 'gerar_imagem' (functionCall) com o prompt descritivo em inglês agora. NÃO responda apenas com texto.";
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
                parts: (modelContent?.parts && modelContent.parts.length > 0) ? modelContent.parts : [{ text: textForThisTurn || "" }] 
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
      }

      if (workspaceDocuments.size > 0) {
        for (const [dTitle, dObj] of workspaceDocuments.entries()) {
          const docJson = JSON.stringify({ title: dObj.title, content: dObj.content, format: dObj.format });
          const tag = `<wsm_doc>${docJson}</wsm_doc>`;
          const titlePattern = `"title"\\s*:\\s*"${dObj.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`;
          const hasDocWithTitle = new RegExp(titlePattern, 'i').test(fullOutput);
          if (!fullOutput.includes(tag) && !hasDocWithTitle) {
            fullOutput += `\n\n${tag}\n\n`;
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

      let sanitizedFullOutput = protectedOutput;

      sendEvent({
        type: "final",
        text: sanitizedFullOutput || fallbackEmptyResponse,
        finalSynthesis: sanitizedFullOutput || fallbackEmptyResponse,
        searchSources: uniqueSources,
        searchImages: filteredImages.slice(0, 15)
      });
      res.end();
      return;
    }

    const normalResponse = await callGeminiWithFallback({
      model: mappedModel,
      contents: finalContents,
      config: {
        systemInstruction: activeSystemPrompt,
      },
    });

    const textToReturn = normalResponse.text?.trim() || "";
    if (!textToReturn) {
      return res.json({
        text: "⚠️ **Nenhuma resposta foi gerada pelo modelo.** O pedido pode ter sido longo demais ou complexo demais (por favor, tente dividir seu pedido em partes menores).",
      });
    }

    if (clientDisconnected && userEmail && isGmailUser(userEmail)) {
      console.log(`[ChatAPI] Disparando e-mail de resposta interrompida para: ${userEmail}`);
      sendInterruptedResponseEmail(userEmail, userPromptText, textToReturn).catch(err => {
        console.warn("[ChatAPI] Erro ao enviar e-mail de resposta interrompida:", err);
      });
    }

    return res.json({
      text: textToReturn,
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    
    const errorMessage = error.message || String(error);
    let errorText = "WSM 1.6 está temporariamente indisponível. Tente novamente em alguns instantes.";

    if (errorMessage.includes("safety") || errorMessage.includes("SAFETY") || errorMessage.includes("BLOCKED")) {
      errorText = "⚠️ **A mensagem solicitada foi bloqueada pelas diretrizes de segurança da IA.** Por favor, reformule seu pedido.";
    } else if (errorMessage.includes("quota") || errorMessage.includes("RATE_LIMIT") || errorMessage.includes("429") || errorMessage.includes("resource_exhausted") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      errorText = "⚠️ **Limite de cota ou requisições por minuto atingido na API do Gemini.** Aguarde alguns instantes antes de enviar uma nova mensagem.";
    } else if (errorMessage.includes("No content returned") || errorMessage.includes("empty response") || errorMessage.includes("finishReason")) {
      errorText = "⚠️ **Nenhuma resposta foi gerada pelo modelo nesta tentativa.** O pedido pode ter sido longo demais ou ter excedido os limites do modelo.";
    } else if (errorMessage) {
      errorText = `⚠️ **Ocorreu um erro na geração da resposta:** ${errorMessage}`;
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
        badgeText: badgeText || "Aviso Oficial WSM 1.6 Pro",
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

export default app;
