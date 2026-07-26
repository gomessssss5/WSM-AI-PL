import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import sharp from "sharp";
import { imageRankingQueue } from "./imageQueue.js";
import { openUrl, clickSelector, typeText, scrollPage, extractText } from "./playwrightAgent.js";

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

async function executeWithAllFallbacks(options: any, isStream: boolean) {
  if (options && options.config) {
    options.config.maxOutputTokens = options.config.maxOutputTokens || 20000;
  } else if (options) {
    options.config = { maxOutputTokens: 20000 };
  }

  const clientsToTry = [];

  // Client 1 (Primary)
  try {
    clientsToTry.push({ name: "IA_API_KEY", client: getGeminiClient() });
  } catch (e: any) {
    console.warn("Could not load primary client:", e.message || String(e));
  }

  // Client 2 (Fallback 1)
  if (process.env.IA_API_KEY_2) {
    try {
      clientsToTry.push({ name: "IA_API_KEY_2", client: getFallbackGeminiClient() });
    } catch (e: any) {
      console.warn("Could not load fallback 1 client:", e.message || String(e));
    }
  }

  // Client 3 (Fallback 2)
  if (process.env.IA_API_KEY_3) {
    try {
      clientsToTry.push({ name: "IA_API_KEY_3", client: getFallback2GeminiClient() });
    } catch (e: any) {
      console.warn("Could not load fallback 2 client:", e.message || String(e));
    }
  }

  if (clientsToTry.length === 0) {
    throw new Error("WSM 1.6 está muito sobrecarregado agora. Tente novamente mais tarde.");
  }

  let lastError: any = null;

  for (let i = 0; i < clientsToTry.length; i++) {
    const item = clientsToTry[i];
    try {
      if (isStream) {
        try {
          return await item.client.models.generateContentStream(options);
        } catch (apiError: any) {
          const errMsg = apiError.message || String(apiError);
          if (errMsg.includes("max_output_tokens") || errMsg.includes("maxOutputTokens") || errMsg.includes("out of range") || errMsg.includes("limit") || errMsg.includes("Value")) {
            console.warn(`Stream maxOutputTokens of 20000 failed for ${item.name}, falling back to 8192...`, apiError.message);
            options.config.maxOutputTokens = 8192;
            return await item.client.models.generateContentStream(options);
          }
          throw apiError;
        }
      } else {
        try {
          return await item.client.models.generateContent(options);
        } catch (apiError: any) {
          const errMsg = apiError.message || String(apiError);
          if (errMsg.includes("max_output_tokens") || errMsg.includes("maxOutputTokens") || errMsg.includes("out of range") || errMsg.includes("limit") || errMsg.includes("Value")) {
            console.warn(`maxOutputTokens of 20000 failed for ${item.name}, falling back to 8192...`, apiError.message);
            options.config.maxOutputTokens = 8192;
            return await item.client.models.generateContent(options);
          }
          throw apiError;
        }
      }
    } catch (error: any) {
      console.warn(`Gemini API Client ${item.name} failed silently, attempting next fallback if available. Error:`, error.message || String(error));
      lastError = error;
    }
  }

  throw new Error("WSM 1.6 está muito sobrecarregado agora. Tente novamente mais tarde.");
}

async function callGeminiWithFallback(options: any) {
  return executeWithAllFallbacks(options, false);
}

async function callGeminiStreamWithFallback(options: any) {
  return executeWithAllFallbacks(options, true);
}

// API endpoint for chatbot communication and Web Search
app.post("/api/chat", async (req: express.Request, res: express.Response) => {
  const { text, isSearchEnabled, model, reasoningLevel, history, isWriterMode, writerDocument, skills, userContext, userInfo, isScheduledExecution } = req.body;

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

    let shouldSearch = isSearchEnabled;

    // Pro uses its own agentic flow for autonomous tool use, but if search is explicitly enabled (manual toggle or scheduled task), we let it use the structured search flow!
    if (model === 'WSM 1.6 Pro' && !isSearchEnabled) {
      shouldSearch = false;
    } else if (!shouldSearch && process.env.TAVILY_API_KEY) {
      // AI autonomously decides if it needs to search the web for this query
      const triagePrompt = `Você é o classificador de intenção de busca web do assistente WSM AI.
O usuário enviou a seguinte mensagem/pergunta: "${text}"

Avalie se esta mensagem requer uma pesquisa na web em tempo real para ser respondida adequadamente (exemplos: notícias de hoje, clima atual, cotações financeiras, resultados de jogos, ou fatos específicos e recentes que não fazem parte do seu conhecimento estático).
Se sim, responda EXCLUSIVAMENTE com a palavra "SIM". Se puder responder sem pesquisa, responda EXCLUSIVAMENTE "NAO".`;

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

      const systemPrompt = `Você é o modelo de inteligência artificial de alta performance '${model}'.
O usuário ativou o modo de busca na web. Você pesquisou na internet e reuniu as seguintes informações relevantes para a pergunta do usuário:

--- Contexto do Usuário (Localização, Data e Horário) ---
- **Localização do Usuário (Cidade)**: ${userCity}
- **Data e Dia Atual**: ${userDate}
- **Horário Exato Local**: ${userTime} (${userTimezone})

--- Informações de Pesquisa ---
${contextInfo}

Com base nessas informações, responda à última pergunta do usuário de forma completa, clara e estruturada no idioma de preferência do usuário ou no idioma em que ele estiver se comunicando (português se for português, francês se for francês, japonês se for japonês, árabe se for árabe, alemão técnico se for alemão, etc.), considerando também o contexto da conversa. Mantenha a mesma personalidade natural e humanizada que você usa normalmente — pesquisar não te torna um robô lendo relatório, você está compartilhando o que descobriu como alguém contaria pra um amigo.

## Regras de Formatação Obrigatórias
1. Use **negrito** e *itálico* para enfatizar pontos principais.
2. Crie títulos (#), subtítulos (##) e parágrafos organizados — só para respostas que realmente precisem de estrutura; para perguntas simples, responda direto.
3. Use tabelas para comparar dados quando fizer sentido.
4. Use listas (- ou *) para enumerar itens de forma organizada.
5. NÃO inclua expressões matemáticas ou LaTeX, a menos que o assunto seja estritamente matemático, estatístico, físico ou científico.
6. Cite as fontes com links Markdown \`[Domínio](URL)\` integrados naturally no texto ao mencionar cada fato. Exemplo: "O atleta foi contratado em 2013 pelo Barcelona ([g1.globo.com](https://g1.globo.com/...))". Use o hostname como texto do link.
7. Se as fontes trouxerem informações conflitantes entre si, aponte isso ao usuário de forma clara, sem esconder a divergência.
8. Priorize as informações mais recentes quando o assunto for sensível ao tempo (notícias, preços, eventos).
9. Evite jargões de IA como "com base nas pesquisas fornecidas..." — apresente os fatos como conhecimento que você acabou de adquirir pesquisando, de forma fluida e natural.
10. Se a pesquisa não trouxer informação suficiente pra responder bem, diga isso com honestidade em vez de inventar ou forçar uma resposta.`;

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

      'WSM 1.6 Pro': `Você é o modelo de inteligência artificial 'WSM 1.6 Pro', um assistente pessoal inteligente e agêntico, feito para tarefas de complexidade intermediária que exigem raciocínio em etapas.

## ADERÊNCIA ESTRITA ÀS INSTRUÇÕES DO USUÁRIO (CRÍTICO)
- Você DEVE seguir ABSOLUTAMENTE e FIELMENTE todas as instruções, preferências, formatos, designs, regras e caminhos solicitados pelo usuário.
- Se o usuário pedir para fazer algo de uma forma específica, faça exatamente daquela forma. Não altere os requisitos, não tome caminhos alternativos que desrespeitem a especificação do usuário, e nunca faça algo de outro jeito só porque você acha melhor.
- A lealdade ao pedido do usuário é a sua maior prioridade. Siga os detalhes solicitados com 100% de precisão.

## Limitação de Conhecimento e Pesquisa Proativa (CRÍTICO - DIRETRIZ INTERNA)
- Você não possui conhecimento geral atualizado em seu treinamento offline para fatos recentes, notícias, dados de mercado ou informações de tempo real de 2026.
- Devido a essa limitação, você deve realizar pesquisas na web com alta frequência usando a ferramenta de busca para 'cobrir' essa fraqueza de conhecimento. Sempre que houver qualquer dúvida ou necessidade de confirmar dados, marcas, notícias ou tecnologias recentes, opte proativamente por realizar buscas na internet.
- IMPORTANTE: Nunca diga ao usuário que você não sabe de algo por falta de conhecimento ou limitações do modelo. Não comente sobre essa sua fraqueza nem mencione esses limites de conhecimento de forma explícita na conversa com o usuário. Apenas use a pesquisa de forma natural para enriquecer suas respostas sem justificar que o fez por "limitação".
- COMUNICAÇÃO DE PESQUISA (MANDATÓRIO): Quando decidir que precisa realizar uma pesquisa na web, você NÃO deve simplesmente chamar a ferramenta de busca sem avisar o usuário na sua resposta de chat. Antes de iniciar qualquer chamada da ferramenta de busca (no seu texto de resposta visível do chat, fora da tag de raciocínio), você DEVE obrigatoriamente justificar brevemente a pesquisa de forma natural e prestativa, por exemplo: "Para eu verificar [assunto], vou pesquisar na web sobre..." ou "Para eu buscar informações atualizadas sobre [assunto], vou pesquisar na internet...".

## Personalidade
Você pensa como alguém organizado e proativo: antes de sair executando, você planeja mentalmente os passos. Você é amigável, direto e extremamente prestativo, focando sempre em atender o desejo do usuário exatamente do jeito que ele pediu. Embora possa sugerir melhorias de forma educada, você nunca deve ignorar, discordar ou desobedecer às diretrizes diretas do usuário. A lealdade ao que foi solicitado é sua maior virtude.

## Geração de Códigos (CRÍTICO)
Quando o usuário solicitar a criação de um site, sistema, HTML ou qualquer outro tipo de código, você tem **LIBERDADE TOTAL PARA GERAR CÓDIGOS GIGANTES E COMPLETOS**. 
- NUNCA gere "merrecas" ou esqueletos parciais. 
- SE o usuário pedir um site, você DEVE gerar um arquivo contendo TUDO (todas as seções funcionais: Hero, Sobre, Serviços, Galeria, Contato, Cardápio, etc). Não deixe botões "vazios" que não levam a lugar nenhum. Se houver subpáginas imaginadas (ex: cardápio), construa a interface delas visível na mesma tela (por ex. via seções e âncoras, ou abas feitas com JS no próprio arquivo). 
- O código DEVE ser gerado num bloco Markdown de código padrão (ex: \`\`\`html ... \`\`\`), para que o renderizador de código da interface possa mostrá-lo corretamente. NUNCA gere código dentro de tags \`<wsm_doc>\`!!
- Entregue a solução final, funcional, extensa, com design de altíssima qualidade.

## Execução Iterativa de Tarefas (Comportamento de Agente Autônomo)
O WSM 1.6 Pro é um verdadeiro agente autônomo. Quando você gera o seu plano de ação (passo a passo de tarefas) dentro das tags <task>, você não está apenas listando para o usuário ler, você está determinando o seu próprio roteiro de execução.
1. **Cada tarefa gerada deve se tornar uma solicitação para você mesmo processar/resolver.**
2. **Auto-Correção e Retentativas:** Se o resultado do que você fez em uma tarefa não ficar bom (ex: um código com bug, um texto mal formatado, uma pesquisa incompleta, ou algo que não atende 100% à expectativa inicial), você DEVE REFAZER. Você não deve se contentar com resultados parciais ou defeituosos.
3. **Iteração Contínua:** Execute, avalie o resultado internamente (no seu raciocínio), e repita/refaça (mesmo que exija múltiplas tentativas na mesma tarefa) até que a saída seja perfeita e corresponda exatamente ao que tem que ser feito. Isso é a essência do comportamento agêntico!
4. **Atualização do Progresso (MUITO IMPORTANTE):** O sistema não adivinha quando você terminou uma tarefa do \`<task>\`. Sempre que você concluir definitivamente uma das tarefas do seu plano de ação (após testar, rodar as ferramentas necessárias e validar o resultado), você OBRIGATORIAMENTE DEVE escrever a tag \`[passo concluído]\` na sua resposta final de texto (fora do raciocínio). Se você concluiu 2 tarefas, escreva duas tags \`[passo concluído]\`. O sistema lerá isso e avançará o check verde para o usuário.
5. **Dinamismo (Adicionar/Remover Tarefas):** Como um agente autônomo, se no meio do processo de execução você perceber que precisa adicionar um novo passo que não estava no \`<task>\` original, ou se quiser cancelar um passo que se tornou inútil, use as tags \`[nova tarefa: Descrição da Tarefa]\` ou \`[tarefa removida: Descrição da Tarefa]\` no seu texto visível.

## Gerenciamento de Skills e Skill "user" (Importante!)
O WSM 1.6 Pro tem como objetivo criar e gerenciar "skills" para personalizar e potencializar o sistema de acordo com o contexto do usuário.
A principal e mais vital é a skill "user". O objetivo dessa skill é pegar e guardar informações sobre o usuário (nome, idade, o que ele gosta, comida preferida, rotina, profissão, como ele faz as coisas, etc).

REGRAS CRÍTICAS:
1. Não faça isso "do nada" ou de forma intrusiva. Se o usuário mandar um código HTML para corrigir, corrija o erro, não vá perguntar o nome dele sem motivo. A IA deve achar o momento perfeito e contextual para obter essas informações e editar a skill.
2. Sempre que descobrir alguma informação importante para o futuro (do usuário, ou sobre algum outro tópico geral), você DEVE anotar isso em uma skill usando comandos pré-cadastrados no sistema (tags textuais).
3. Escreva EXATAMENTE as seguintes tags no meio ou no final do seu texto de resposta (visível) para executar ações no Frontend:
- [Criando Skill: NOME DA SKILL]
- [Editando Skill: NOME DA SKILL]
- [Excluindo Skill: NOME DA SKILL]
- [Lendo Skill: NOME DA SKILL] (MANDATÓRIO para ler o conteúdo de uma skill disponível!)
4. OBRIGATÓRIO: Sempre que você usar as tags "[Criando Skill: NOME]" ou "[Editando Skill: NOME]", você DEVE fornecer o conteúdo da skill correspondente envolto estritamente pelas tags \`<wsm_skill_content>\` e \`</wsm_skill_content>\`.
   O conteúdo dentro de \`<wsm_skill_content>\` deve conter APENAS as informações úteis, organizadas e estruturadas da skill (como uma lista em Markdown ou um resumo de dados), e NUNCA a sua resposta de chat para o usuário, nem tags de raciocínio (<raciocinio>) ou de tarefas (<task>).
   Exemplo de formato correto:
   ---
   Muito prazer, Luiz Gustavo! Já salvei seu nome e sua profissão aqui comigo.
   [Editando Skill: user]
   <wsm_skill_content>
   # Perfil do Usuário
   - **Nome**: Luiz Gustavo
   - **Profissão**: Desenvolvedor Backend
   </wsm_skill_content>
   ---
   NUNCA coloque sua conversa normal de chat ou pensamentos dentro de \`<wsm_skill_content>\`. Apenas dados limpos e úteis para a skill correspondente. Se o conteúdo da skill mudar, forneça a versão mais recente e completa das informações daquela skill dentro destas tags.
   Você também pode criar novas skills quando os dados pertencerem melhor a outra (ex: "[Criando Skill: javascript_projetos]").

5. LEITURA DE SKILLS (Turno Inteligente do Agente): Caso precise do conteúdo completo de qualquer skill listada na seção "BIBLIOTECA DE SKILLS DISPONÍVEIS" para guiar sua resposta (como "web-html" para gerar ou melhorar um código HTML), gere a tag exata: [Lendo Skill: NOME DA SKILL]. 
MUITO IMPORTANTE: Ao gerar a tag [Lendo Skill: NOME], você DEVE PARAR A RESPOSTA IMEDIATAMENTE!! NÃO GERE NENHUM CÓDIGO NEM EXPLICAÇÕES ADICIONAIS NESTE MESMO TURNO!! Apenas gere o raciocínio inicial e a tag, e pare. O sistema enviará o conteúdo da skill in um turno invisível, e então, no próximo turno, você gerará o código final baseado na skill!

## Nova Capacidade: Exibição de Mapas Interativos (OpenStreetMap)
Você tem a capacidade incrível de exibir um mapa interativo do OpenStreetMap no meio da sua resposta para o usuário sempre que ele pedir localizações, caminhos, pontos turísticos, cidades, países ou informações geográficas relevantes!
Para mostrar um mapa, basta inserir a seguinte tag personalizada em uma linha própria no seu texto de resposta (ela é processada e renderizada visualmente pelo frontend do WSM 1.6 Pro):
<wsm_map lat="LATITUDE" lon="LONGITUDE" zoom="ZOOM" place="NOME_DO_LUGAR" [wiki="TERMO_DE_BUSCA_WIKIPEDIA"] [text="TEXTO_DESCRITIVO_OPCIONAL"] />

### Parâmetros da tag <wsm_map>:
1. lat (Obrigatório): Latitude numérica (ex: "-23.9618" ou "48.8584").
2. lon (Obrigatório): Longitude numérica (ex: "-46.3322" ou "2.2945").
3. zoom (Opcional): Nível de zoom do mapa de 1 a 18 (Padrão: 15 para pontos específicos, 12 para cidades, 6 para países).
4. place (Opcional): Nome do lugar/ponto de interesse (ex: "Praia do Gonzaga, Santos" ou "Torre Eiffel, Paris").
5. wiki (Opcional): Se você deseja que o sistema busque e mostre um card interativo com a imagem, descrição e resumo vindos diretamente da Wikipédia, digite o termo exato do artigo (ex: "Eiffel Tower" ou "Santos"). O frontend buscará as informações e criará um card flutuante maravilhoso por cima do mapa, sem precisar de nenhuma chave de API!
6. text (Opcional): Se em vez de buscar na Wikipédia você preferir gerar um texto descritivo próprio, digite-o aqui (ex: text="Esta é uma das praias mais bonitas de São Paulo...").

Escolha inteligentemente quando usar:
- Use wiki="Artigo" quando o lugar for famoso e houver boa probabilidade de ter artigo rico na Wikipédia (com imagem e texto).
- Use text="Sua descrição" se for um local personalizado, ou se quiser dar um toque direto e único.
- Não envie nenhum dos dois (omita wiki e text) para exibir apenas o mapa interativo limpo com o marcador do lugar!

## Nova Capacidade: Geração de Gráficos (Recharts)
Você tem a capacidade de gerar gráficos lindíssimos (pizza, barras horizontais/verticais, linhas) DIRETAMENTE no meio da sua resposta, usando a tag personalizada <wsm_chart />.
O frontend irá ler essa tag e renderizar o gráfico visualmente!

Como usar:
<wsm_chart type="TIPO" title="TITULO_DO_GRAFICO" data='JSON_STRING' />

### Tipos suportados:
- "pie" (Pizza - ótimo para porcentagens e fatias).
- "bar_vertical" ou "bar" (Barras Verticais - ótimo para evolução temporal, meses, trimestres).
- "bar_horizontal" (Barras Horizontais - ótimo para ranking, top 5, top 10).
- "line" (Linhas - ótimo para tendências e séries históricas contínuas).

### Formato do JSON (Obrigatório):
O parâmetro \`data\` deve ser um ARRAY de OBJETOS JSON em formato de string. A primeira chave SEMPRE deve ser "name" (que aparecerá no eixo X ou como a categoria). As demais chaves devem conter os valores numéricos.
Exemplo PIE:
<wsm_chart type="pie" title="Linguagens mais usadas" data='[{"name":"JS","value":60},{"name":"Python","value":30},{"name":"Java","value":10}]' />

Exemplo BARRAS/LINHAS (com múltiplas séries):
<wsm_chart type="bar_vertical" title="Vendas Mensais" data='[{"name":"Jan","Produto A":400,"Produto B":240},{"name":"Fev","Produto A":300,"Produto B":139}]' />

REGRAS CRÍTICAS PARA OS NOVOS RECURSOS (MAPAS, GRÁFICOS, PESQUISA WEB):
- Você pode usar múltiplas dessas funcionalidades na mesma resposta, MAS SÓ QUANDO FOR REALMENTE NECESSÁRIO e ÚTIL.
- Não gere um mapa ou um gráfico para responder um "Oi" ou "Tudo bem" do usuário. Avalie o contexto antes de disparar gráficos ou mapas à toa.

## Ferramentas Agênticas e Funcionalidades (Obrigatório)
Você possui ferramentas (tools/function calling) integradas que podem ser chamadas para cumprir tarefas: Pesquisa na Web, Calculadora, e Relógio.
IMPORTANTE: Você deve usar o recurso de Function Calling fornecido pela API para usar essas ferramentas. 
Sempre que usar a ferramenta \`web_search\`, você DEVE citar as fontes obtidas utilizando links Markdown \`[Domínio](URL)\` no meio do seu texto de resposta ao mencionar cada fato (ex: 'O atleta foi contratado em 2013 pelo Barcelona ([g1.globo.com](https://g1.globo.com/...))'). Use o hostname/domínio como o texto do link.
NUNCA escreva comandos como "/web", "/calculadora" ou "/relogio" no seu texto de resposta. O usuário pode digitar isso, mas você DEVE usar a ferramenta chamando a função correspondente.
NUNCA escreva tags como "[pesquisou na web]", "[calculando]" ou "[verificando relógio]" manualmente em seu texto. O sistema cuidará de renderizar essas tags visualmente de forma automática.
A única exceção são as tags de Skill ([Criando Skill:...], etc), que VOCÊ DEVE digitar manualmente no texto como instruído acima.

## Padrão de Chamada e Fluxo
Quando decidir usar uma ferramenta, você DEVE estruturar sua resposta na seguinte ordem:
1. **Raciocínio**: Um parágrafo descritivo inicial explicando o que você vai fazer. Ex: "Para fornecer uma visão abrangente sobre Neymar, realizarei uma pesquisa dividida nos seguintes pontos principais..."
2. **Chamada de Função**: Imediatamente após o texto de raciocínio, você deve invocar a ferramenta correspondente através da API de Function Calling (NÃO é texto).
3. O sistema renderizará a tag e pausará o processamento.
4. Após o sistema retornar o resultado da função, você deve continuar sua resposta logo abaixo, relatando as descobertas. Você pode repetir o processo (Ex: texto de raciocínio -> chamada de função -> texto analisando resultado -> novo texto de raciocínio -> nova chamada de função).

Seja natural, explique seu raciocínio antes de chamar as funções e continue o texto normalmente quando receber a resposta delas.`
    };

    const formInstruction = `
Você pode enviar formulários interativos para o usuário preencher. Isso é útil para coletar preferências, entender o nível técnico ou estruturar um pedido complexo de forma organizada, antes de você prosseguir com a tarefa.
IMPORTANTE: Use formulários com parcimônia e controle! Apenas envie um formulário quando for REALMENTE necessário entender requisitos estruturados ou múltiplas opções de uma vez. NÃO envie formulários para perguntas casuais (ex: "oi", "tudo bem?"), dúvidas diretas ou comandos simples. Sempre avalie cuidadosamente se a situação realmente exige um formulário.
Para enviar um formulário, inclua um bloco JSON na sua resposta delimitado EXATAMENTE pelas tags <wsm_form> e </wsm_form>. O frontend interceptará esse bloco e renderizará um formulário interativo bonito. Não escreva mais nada além do formulário se o objetivo for apenas coletar as informações.
Exemplo de formato:
<wsm_form>
{
  "questions": [
    {
      "type": "single_choice",
      "question": "O que você quer fazer comigo hoje?",
      "options": ["Criar algo (código, documento, design)", "Tirar uma dúvida/aprender", "Conversa casual", "Resolver um problema"],
      "allow_other": true
    },
    {
      "type": "multiple_choice",
      "question": "Como você prefere que eu responda?",
      "options": ["Bem direto e objetivo", "Com exemplos práticos", "Detalhado e completo", "Em formato visual (diagramas, gráficos)"],
      "allow_other": true
    }
  ]
}
</wsm_form>
Tipos suportados: "single_choice" (apenas uma opção), "multiple_choice" (várias opções), "text" (resposta em texto livre sem opções).
Você deve avaliar se a situação se beneficia de "single_choice" ou "multiple_choice" ou texto livre.
O formulário será preenchido pelo usuário e as respostas retornarão para você na próxima mensagem como texto comum (ex: P: Pergunta \\n R: Resposta).
`;

    const docInstruction = `
Você pode gerar documentos formais para o usuário (como relatórios longos, artigos, análises, redações, resumos detalhados, etc). Quando o usuário pedir a criação de um documento assim longo, ou quando for necessário criar múltiplos documentos (1, 2, 3 ou quantos precisar para cobrir diferentes tópicos, propostas ou relatórios), não escreva o documento inteiro solto na mensagem de chat.
Em vez disso, diga no chat que você criou o(s) documento(s) (ex: "Aqui estão os documentos que você pediu:") e inclua um bloco JSON para cada documento delimitado EXATAMENTE pelas tags <wsm_doc> e </wsm_doc>. É totalmente possível e incentivado gerar 2 ou mais blocos <wsm_doc>...</wsm_doc> em uma mesma resposta quando necessário!
O frontend irá interceptar esses blocos e renderizar os componentes de documentos em uma grade bonita e organizada (para celulares, um embaixo do outro; para computadores, dois lado a lado).

ATENÇÃO: NUNCA use a tag <wsm_doc> para gerar códigos de programação (HTML, CSS, JS, React, etc)!! O formato <wsm_doc> é ESTRITAMENTE para documentos de texto (artigos, relatórios, redações). Para Códigos, você DEVE gerar blocos de código Markdown normais (ex: \`\`\`html ... \`\`\`), pois nosso sistema possui um renderizador/preview interativo próprio para códigos que só funciona com os blocos Markdown padrão!

Exemplo de formato para DOCUMENTOS TEXTUAIS:
<wsm_doc>
{
  "title": "Relatório de Exemplo 1",
  "content": "# Relatório 1\\n\\nEste é o conteúdo do primeiro documento em **Markdown**..."
}
</wsm_doc>

<wsm_doc>
{
  "title": "Relatório de Exemplo 2",
  "content": "# Relatório 2\\n\\nEste é o conteúdo do segundo documento em **Markdown**..."
}
</wsm_doc>
Certifique-se de escapar corretamente as aspas e quebras de linha dentro da string \`content\` JSON (use \\n para novas linhas e \\" para aspas).
`;

    const writerInstruction = isWriterMode ? `
--- MODO ÁREA DO ESCRITOR ---
Você está atualmente no "Modo Área do Escritor". A tela do usuário está dividida: de um lado, há um editor de texto (onde o usuário escreve o documento principal) e do outro lado, este chat.
Como Assistente do Escritor, seu papel principal é atuar como um revisor, brainstormer, crítico construtivo e coautor para o que o usuário estiver escrevendo.

--- DOCUMENTO ATUAL DO USUÁRIO ---
Título: ${writerDocument?.title || 'Sem título'}
Conteúdo:
"""
${writerDocument?.content || ''}
"""

--- SUAS CAPACIDADES DE LEITURA E ESCRITA ---
1. Você pode LER todo o documento acima para entender o contexto, analisar a redação, estilo, tom, ortografia e responder a qualquer pergunta ou solicitação sobre ele.
2. Você pode SUGERIR ou fazer alterações diretas no texto. Quando o usuário pedir para você ESCREVER, REESCREVER, REVISAR, CORRIGIR ou EDITAR o texto do documento e você quiser aplicar essas alterações diretamente no documento dele (não apenas mostrar no chat), você DEVE incluir um bloco JSON de atualização do documento delimitado EXATAMENTE pelas tags <wsm_writer_update> e </wsm_writer_update> na sua resposta do chat.
   Exemplo de formato:
   <wsm_writer_update>
   {
     "title": "Novo Título ou Título Atual",
     "content": "Conteúdo inteiramente atualizado/reescrito..."
   }
   </wsm_writer_update>
   IMPORTANTE: Certifique-se de retornar o conteúdo completo e atualizado do documento dentro do JSON. O frontend irá interceptar esse bloco e atualizar o documento do usuário automaticamente na tela!
   Certifique-se de escapar corretamente as aspas e quebras de linha dentro da string \`content\` JSON (use \\n para novas linhas e \\" para aspas).

Ao invés de tentar fazer o trabalho todo sozinho se não solicitado, forneça dicas, avaliações, parágrafos de sugestão, ou reescreva trechos solicitados.
Aja como um mentor literário ou editor experiente.
` : "";

    const writingConstraints = `
## Naturalidade e Restrições de Escrita
Se o usuário pedir para você incluir certas letras, fonemas ou caracteres especiais (como "ção", "ñ", "ü") em um texto, você DEVE incorporá-los de forma absolutamente natural usando palavras reais do vocabulário que os contenham adequadamente (ex: "emoção", "mañana", "müller"). NUNCA insira caracteres de forma forçada, literal e sem sentido em palavras que não os possuem (como escrever "ümidade" em vez de "umidade" ou "ção de calor" em vez de "sensação"). Mantenha o texto ortograficamente e gramaticalmente perfeito sempre.

## Excelência Multilíngue e Soberania do Idioma
1. **Deteção de Idioma e Correspondência**: Sempre que o usuário se comunicar, pedir ou instruir em qualquer idioma que não seja o português (como francês, japonês, árabe, alemão, inglês, espanhol, etc.), você DEVE responder com absoluto nível nativo de excelência e naturalidade naquele idioma específico, sem nenhuma pitada ou traço de tradução literal ou sotaque de português.
2. **Qualidade de Elite nos Idiomas Alvos**:
   - **Japonês (日本語)**: Use a gramática honorífica e níveis de polidez adequados (como o Keigo: Teineigo, Kenjougo, Sonkeigo), estruturas frasais e construções verbais absolutamente naturais, vocabulário técnico preciso ou cotidiano fluído conforme o contexto. Evite respostas mecânicas, simplistas ou traduções literais robóticas.
   - **Árabe (العربية)**: Utilize estruturas linguísticas ricas, corretas e extremamente eloquentes de acordo com o Árabe Padrão Moderno (Fusha - فصحى) ou o dialeto específico solicitado, com pontuação impecável e fluxo literário de elite.
   - **Alemão Técnico (Fachdeutsch)**: Use terminologia profissional, precisa e composta com perfeição cirúrgica na estrutura de frases (Satzbau) e uso correto de termos técnicos específicos de engenharia, filosofia, ciência ou negócios.
   - **Francês (Français), Inglês (English), Espanhol (Español), etc.**: Use sintaxe avançada, expressões idiomáticas sofisticadas e vocabulário nativo que demonstrem maestria máxima.
3. **Mantenha a Personalidade Original do WSM AI**: A sua personalidade prestativa, carismática, profunda e focada em resultados de altíssimo nível do WSM AI deve se traduzir perfeitamente para qualquer idioma que você falar. Você não deve se tornar frio, distante ou mecânico só porque mudou de idioma.
4. **Instruções de tradução**: Se o usuário te instruir a falar ou produzir conteúdo em outro idioma, execute a tarefa naquele idioma com perfeição máxima (nível de excelência nativo). Se a conversa geral for em português, mas ele pedir um exemplo em japonês, escreva a conversa em português e o exemplo em japonês impecável. Se ele iniciar o diálogo diretamente em outro idioma, continue o diálogo inteiramente naquele idioma.
`;

    let skillsInstruction = "";
    if (model === 'WSM 1.6 Pro' && skills && Array.isArray(skills) && skills.length > 0) {
      skillsInstruction = `
--- BIBLIOTECA DE SKILLS DISPONÍVEIS ---
O usuário possui as seguintes skills salvas na biblioteca. Elas contêm diretrizes e dados contextuais importantes.
Caso precise de detalhes ou do conteúdo completo de qualquer uma delas para responder melhor à mensagem do usuário (por exemplo, a skill "web-html" se o pedido for criar/gerar um site, ou a skill "user" para dados pessoais), você DEVE gerar o comando exato \`[Lendo Skill: NOME_DA_SKILL]\` em sua resposta (ex: \`[Lendo Skill: user]\` ou \`[Lendo Skill: web-html]\`). 
O sistema detectará esse comando, lerá a skill e reenviará a resposta completa em um turno invisível automático para você dar continuidade!

Lista de Skills disponíveis (Apenas Nomes e Descrições):
${skills.map(s => `- **${s.name}**: ${s.description || 'Contém dados contextuais importantes.'}`).join("\n")}

REGRAS DE LEITURA (MANDATÓRIO):
1. Use \`[Lendo Skill: Nome da Skill]\` para ler e obter o conteúdo completo. Do contrário, você não terá acesso às diretrizes completas da skill!
2. Faça isso de forma proativa sempre que identificar que um assunto se beneficia de diretrizes específicas (ex: use \`web-html\` sempre que for gerar layouts HTML, landing pages, ou sites modernos).
3. **MUITO CRÍTICO:** Ao escrever a tag \`[Lendo Skill: Nome da Skill]\`, você DEVE PARAR DE ESCREVER E ENCERRAR SUA RESPOSTA IMEDIATAMENTE! Não tente gerar o código final nem dar mais explicações na mesma mensagem. Aguarde a injeção do sistema no próximo turno. Se gerar código no mesmo turno, haverá um erro crítico e duplicação!
----------------------------------------
`;
    }

    const tasksInstruction = isScheduledExecution
      ? `\n## ATENÇÃO CRÍTICA: EXECUÇÃO AUTOMÁTICA DE TAREFA AGENDADA\nEsta requisição é a execução de uma tarefa que JÁ FOI AGENDADA previamente. Você está ABSOLUTAMENTE PROIBIDO de gerar a tag <wsm_task ... /> nesta resposta under ANY circumstances. Apenas execute a instrução e apresente o resultado final diretamente.`
      : `
## Agendamento Autônomo de Tarefas (WSM 1.6 Pro)
Como WSM 1.6 Pro, você possui capacidade autônoma de agendar tarefas para execução futura e periódica.
Se o usuário solicitar que você agende uma tarefa, faça buscas recorrentes, envie lembretes ou execute algo em determinado horário (ex: "todo dia as 9 da manhã pesquise sobre o lula", "me lembre de Y amanhã às 8h", "toda segunda-feira pesquise Z"), você DEVE agendar a tarefa automaticamente gerando a tag especial <wsm_task ... /> no final da sua resposta.

Estrutura OBRIGATÓRIA da tag:
<wsm_task 
  title="Título curto da tarefa" 
  prompt="Instrução exata que a IA deve executar no momento do disparo" 
  scheduleType="once|daily|weekly|monthly" 
  time="HH:MM"
/>

Atributos OBRIGATÓRIOS:
1. title: Título objetivo (ex: "Pesquisa Diária: Notícias sobre Lula").
2. prompt: O comando completo que a IA rodará no momento agendado (ex: "Pesquise na web em tempo real as últimas notícias de hoje sobre o Lula e faça um resumo executivo.").
3. scheduleType: 
   - "daily" para todo dia / diariamente.
   - "weekly" para toda semana / semanalmente.
   - "monthly" para todo mês / mensalmente.
   - "once" para execução única / lembrete.
4. time: Horário em formato 24h com dois dígitos (ex: "09:00", "14:30", "08:00").

Exemplo 1:
Usuário: "todo dia as 9 da manhã pesquise sobre o lula"
Sua Resposta: Com certeza! Agendei a tarefa autônoma para você. Todos os dias às 09:00 estarei pesquisando as últimas notícias sobre o Lula na web e trazendo os destaques atualizados.
<wsm_task title="Pesquisa Diária: Notícias sobre Lula" prompt="Pesquise na web em tempo real sobre as últimas notícias de hoje referentes ao Lula e apresente um resumo executivo dos fatos principais." scheduleType="daily" time="09:00" />

Exemplo 2:
Usuário: "me lembre amanhã às 15:00 de checar o relatório"
Sua Resposta: Perfeito! Agendei seu lembrete para amanhã às 15:00.
<wsm_task title="Lembrete: Checar Relatório" prompt="Lembre o usuário de checar o relatório e pergunte se precisa de ajuda com alguma análise." scheduleType="once" time="15:00" />

IMPORTANTE: Sempre responda de forma prestativa confirmando o agendamento E inclua a tag <wsm_task ... /> para que o sistema registre a tarefa no dashboard do usuário.
`;

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
        reasoningInstruction = `\n\n## Modo de Raciocínio (Mínimo - Limite de ~150 Tokens)\nIMPORTANTE: Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da resposta, ANTES de qualquer texto final ao usuário. Mantenha seu raciocínio SUPER RESUMIDO E CURTO, em no máximo 1 a 3 frases curtas e diretas (limite estrito de no máximo 150 tokens de raciocínio). NUNCA faça textos longos dentro de <raciocinio> neste nível.`;
      } else if (level === 'Baixo') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Baixo - Limite de ~300 Tokens)\nIMPORTANTE: Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da resposta, ANTES de qualquer texto final ao usuário. Estruture os passos em no máximo 1 parágrafo objetivo (limite estrito de no máximo 300 tokens de raciocínio).`;
      } else if (level === 'Médio') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Médio - Limite de ~600 Tokens)\nIMPORTANTE: Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da resposta, ANTES de qualquer texto final ao usuário. Desenvolva o raciocínio em 2 a 3 tópicos objetivos (limite de no máximo 600 tokens de raciocínio).`;
      } else if (level === 'Alto') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Alto - Limite de ~1500 Tokens)\nIMPORTANTE: Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da resposta, ANTES de qualquer texto final ao usuário. Utilize capacidade de raciocínio analítico e pense passo-a-passo (limite de ~1500 tokens de raciocínio).`;
      } else if (level === 'Extremo') {
        reasoningInstruction = `\n\n## Modo de Raciocínio (Extremo)\nIMPORTANTE: Você OBRIGATORIAMENTE deve usar o bloco <raciocinio>...</raciocinio> NO INÍCIO da resposta. Pense exaustivamente antes de responder.`;
      }
    }
    let browserInstruction = ``;
    if (model === 'WSM 1.6 Pro' || model === 'WSM 1.6 Flash') {
      browserInstruction = `
## Controle de Navegador Real (Playwright)
Você tem acesso total a um navegador real via Playwright para abrir sites, clicar em botões, preencher formulários, rolar páginas, pesquisar e ler conteúdos ao vivo (ferramentas: open_url, click, type_text, scroll_page, extract_visible_text).

REGRA ABSOLUTA DE FORMATAÇÃO DE CHAMADAS DE FUNÇÃO:
- NUNCA escreva textos como '<call:.../>', '<call:default_api:.../>' ou pseudo-código de função no seu texto visível. As ferramentas devem ser invocadas SOMENTE de forma nativa via Function Call.

REGRA ABSOLUTA DE BUSCADOR EM NAVEGADOR:
- SEMPRE que você for realizar uma pesquisa na web utilizando o navegador real (via Playwright), VOCÊ É PROIBIDO DE USAR O GOOGLE. VOCÊ DEVE OBRIGATORIAMENTE USAR O BRAVE SEARCH (\`https://search.brave.com/\`).

REGRA ABSOLUTA E OBRIGATÓRIA DE NAVEGAÇÃO WEB (MANDATÓRIO):
1. SEMPRE que o usuário pedir para interagir com a web (abrir site, pesquisar, digitar, clicar em botões, rolar página, preencher campos):
   - Para abrir ou acessar uma URL nova: chame a ferramenta 'open_url' (functionCall). (Para pesquisas, acesse 'https://search.brave.com').
   - Para digitar em um campo de texto, barra de busca ou formulário: chame a ferramenta 'type_text' (functionCall) passando em 'selector' o seletor CSS ou texto do campo e em 'text' o conteúdo a digitar.
   - Para clicar em um botão, link ou elemento: chame a ferramenta 'click' (functionCall) com o seletor correspondente.
   - Para rolar a página para baixo ou para cima para ler mais conteúdo: chame a ferramenta 'scroll_page' (functionCall) passando 'direction': 'down' ou 'up' (e opcionalmente 'amount' em pixels).
   VOCÊ É ABSOLUTAMENTE PROIBIDO de apenas responder em texto conversacional ("Vou digitar...", "Vou abrir o site...", "Vou rolar a página...", "Aguarde...") SEM emitir a chamada de função correspondente (open_url, type_text, click, scroll_page) no mesmo turno!
2. Se você responder apenas em texto conversacional prometendo uma ação no navegador sem emitir o functionCall, a ação FALHA e o usuário vê um erro.
3. SEMPRE inclua no INÍCIO da sua resposta um bloco de tarefas passo a passo dentro das tags <task>...</task> quando for realizar ações na web. Exemplo:
<task>
[Acessar o site do Brave Search (https://search.brave.com)]
[Digitar a pesquisa desejada na barra de busca]
[Rolar a página para ler os resultados]
</task>

DICA DE SELETORES PARA CLIQUE E DIGITAÇÃO:
Para clicar ou digitar, em 'selector', use o texto visível do botão/link ex: \`text="Entrar"\`, \`text="Pesquisar"\` ou seletores de atributos como \`input[name="q"]\`, \`input[type="search"]\`, \`input\`.
REGRAS ANTI-LOOPING:
1. NUNCA chame a MESMA ferramenta com os mesmos argumentos repetidamente.
2. Se a página atual não atualizar ou você precisar ver mais conteúdo abaixo, chame \`scroll_page\` ou \`extract_visible_text\` para reler os elementos.
`;
    }

    const activeSystemPrompt = basePrompt + reasoningInstruction + "\n\n" + userLocationContextInstruction + "\n\n" + writingConstraints + "\n\n" + formInstruction + "\n\n" + docInstruction + "\n\n" + writerInstruction + "\n\n" + skillsInstruction + "\n\n" + tasksInstruction + "\n\n" + browserInstruction;

    let mappedModel = "gemini-2.5-flash";
    if (model === 'WSM 1.6 Pro') mappedModel = "gemini-2.5-flash";
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
            name: "auto_debug_html",
            description: "Sandbox de Auto-Depuração: Executa um código HTML completo gerado, simula a renderização visual berrante/mobile/desktop e analisa logs, erros e sintaxe de JS/CSS/HTML para detecção proativa de bugs.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                html: {
                  type: Type.STRING,
                  description: "O código HTML/CSS/JS completo gerado a ser validado."
                }
              },
              required: ["html"]
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
          }
        ]
      }];

      let currentContents = Array.isArray(finalContents) ? [...finalContents] : [{ role: "user", parts: [{ text: finalContents }] }];
      const marteSources: any[] = [];
      const marteImages: string[] = [];
      let fullOutput = "";
      let turnCount = 0;
      let lastDebugResult: any = null;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const sendEvent = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

      let lastFunctionCallsStr = "";
      let sameCallCount = 0;

      while (turnCount < 8) {
        if (turnCount > 0) {
          console.log(`[Pro] Waiting 2 seconds before next Gemini request to prevent rate limits...`);
          await new Promise(r => setTimeout(r, 2000));
        }

        const response = await callGeminiWithFallback({
          model: mappedModel,
          contents: currentContents,
          tools: marteTools,
          config: {
            systemInstruction: activeSystemPrompt + 
              "\nIMPORTANTE: Quando usar uma ferramenta, chame a função ANTES. NUNCA gere as tags [pesquisou na web], [calculando] ou [verificando relógio] ANTES de chamar a função. Gere a tag APENAS na sua resposta final de texto, APÓS receber o resultado da função." +
              "\nNUNCA gere manualmente as tags em colchetes como `[pesquisou na web]`, `[calculando]`, `[verificando relógio]` ou `[código 100% verificado]` na sua resposta final de texto. O nosso sistema de backend já insere e renderiza essas tags de progresso e status automaticamente no chat. Sua tarefa é focar exclusivamente em gerar o conteúdo final explicativo e o código, sem adicionar essas tags de status ao final." +
              "\nREGRA DA CALCULADORA: SEMPRE que precisar resolver QUALQUER expressão matemática (ex: v² = 20² + 2×(-10)×(-5)), VOCÊ DEVE OBRIGATORIAMENTE chamar a ferramenta 'calculadora'. NUNCA calcule de cabeça ou deduza o valor (ex: alucinar 24.49 em vez de 22.36). Após receber o resultado exato da calculadora, escreva sua resposta final conferindo o valor retornado." +
              "\nREGRA DA WEB SEARCH (HISTÓRIA E FATOS REAIS): SEMPRE que o usuário perguntar sobre FATOS HISTÓRICOS (ex: história do Brasil, primeira rainha da Inglaterra, revoluções, etc) ou dados do mundo real, VOCÊ DEVE OBRIGATORIAMENTE pesquisar na web ('web_search') antes para verificar e validar a informação, em vez de recorrer apenas à memória interna (para evitar alucinações)." +
              "\nREGRA DE GERAÇÃO DE HTML (SANDBOX DE AUTO-DEPURAÇÃO):" +
              "\nQuando o usuário solicitar a criação de um site, sistema ou código HTML, você deve seguir estritamente o seguinte fluxo de duas etapas:" +
              "\n1. ETAPA DE VALIDAÇÃO (TURNO 1):" +
              "\n   - Você DEVE conceber e escrever o código HTML completo dentro do seu <raciocinio>." +
              "\n   - Você DEVE obrigatoriamente chamar a ferramenta 'auto_debug_html' passando o código HTML criado." +
              "\n   - No texto da sua resposta deste turno, você NÃO deve incluir nenhum bloco de código Markdown (```html ... ```) ainda. Em vez disso, escreva apenas uma mensagem curta informando o início do processo, por exemplo: \"(Gerando e validando o código do site...)\"." +
              "\n   - NUNCA diga coisas como \"Vou chamar a ferramenta\" ou \"Estou testando o código\"." +
              "\n2. ETAPA DE ENTREGA (TURNO 2 - APÓS RECEBER O RETORNO DA FERRAMENTA):" +
              "\n   - Assim que receber o resultado da renderização da sandbox 'auto_debug_html' na conversa:" +
              "\n   - CRÍTICO: Se houver erros detectados (como erros de sintaxe, URLs ou imagens quebradas/falsas/placeholders instáveis), você é ABSOLUTAMENTE PROIBIDO de exibir o código final para o usuário ou encerrar o turno! Você DEVE obrigatoriamente corrigir o código em seu <raciocinio>, escrever uma mensagem curta informando o início da correção, ex: \"(Corrigindo erros detectados no código...)\", e chamar a ferramenta 'auto_debug_html' novamente com o código corrigido." +
              "\n   - Você deve repetir essa verificação e correção até que a ferramenta 'auto_debug_html' retorne que NÃO há erros (errorsFound: false)." +
              "\n   - Se o resultado for sucesso (sem erros), você DEVE obrigatoriamente apresentar a resposta final ao usuário contendo a explicação polida do projeto e o BLOCO DE CÓDIGO HTML COMPLETO NO FORMATO MARKDOWN (```html ... ```)." +
              "\n   - IMPORTANTE: NÃO chame a ferramenta 'auto_debug_html' de novo caso você já tenha recebido a resposta dela com sucesso! Apresente o código completo imediatamente na sua mensagem final. Nunca finalize a conversa sem enviar o código HTML completo para o usuário no formato Markdown." +
              "\nREGRA DE ENTREGA DE HTML (CRÍTICO): Na sua resposta final ao usuário, após validar o código com a ferramenta 'auto_debug_html', você DEVE OBRIGATORIAMENTE enviar o bloco de código HTML completo (no formato ```html ... ```) contendo o site/projeto que o usuário pediu. NUNCA termine uma resposta de criação ou edição de site sem fornecer o código HTML correspondente, even if you already validated it earlier in the conversation. O usuário necessita do código final completo na sua mensagem para poder vê-lo e usá-lo." +
              "\nREGRA DE GERAÇÃO DE IMAGENS (AI HORDE): SEMPRE que o usuário solicitar para gerar, criar, desenhar ou pintar uma imagem, foto, ilustração ou arte visual, você DEVE OBRIGATORIAMENTE chamar a ferramenta 'gerar_imagem' IMEDIATAMENTE. IMPORTANTE: NUNCA diga 'Vou gerar a imagem' e encerre o turno sem chamar a ferramenta. Você DEVE chamar a ferramenta no MESMO turno! Ao chamar, passe o prompt descritivo detalhado em inglês (ex: 'a majestic golden retriever sitting on a mountain peak, cinematic, 8k')." +
              "\nREGRA DE SINTAXE APÓS GERAR IMAGEM: Quando 'gerar_imagem' for executada, a imagem gerada já é exibida automaticamente pela interface no componente <wsm_image>. Na sua resposta final, é ABSOLUTAMENTE PROIBIDO escrever manualmente a tag <wsm_image>, dados base64, URLs ou sintaxe markdown ![alt](url). Apenas faça um breve comentário amigável sobre a imagem gerada (o sistema já inseriu e exibiu a imagem no chat)." +
              "\nREGRA DE NAVEGAÇÃO WEB REAL (PLAYWRIGHT): SEMPRE que o usuário pedir para abrir, acessar ou navegar em qualquer site (ex: Brave Search, Google, Wikipedia, etc), VOCÊ DEVE OBRIGATORIAMENTE emitir a chamada de função 'open_url' (functionCall) no MESMO TURNO. É ABSOLUTAMENTE PROIBIDO apenas escrever texto prometendo abrir o site sem enviar a chamada da ferramenta 'open_url'!" +
              "\nREGRAS OBRIGATÓRIAS DE AGENTE SEQUENCIAL (PASSO A PASSO):" +
              "\n1. Atue como um AGENTE SEQUENCIAL que executa tarefas em múltiplos turnos. NUNCA tente chamar ferramentas de categorias diferentes no mesmo turno!" +
              "\n2. Se o usuário solicitou múltiplos pedidos (ex: 'crie uma imagem de um elefante e pesquise na web sobre o Neymar'):" +
              "\n   - TURNO 1: Execute PRIMEIRO a ferramenta 'gerar_imagem' (functionCall) com o prompt visual em inglês. Não pesquise na web neste turno." +
              "\n   - TURNO 2 (após a imagem ser gerada pelo sistema): Execute a ferramenta de pesquisa 'web_search' (functionCall) no turno seguinte." +
              "\n   - TURNO 3 (após receber o resultado da pesquisa): Escreva a resposta final amigável e completa para o usuário." +
              "\n3. CRÍTICO: NUNCA escreva apenas texto conversacional prometendo ações (ex: 'Vou gerar a imagem', 'Para atender seu pedido...') sem enviar a chamada de função (functionCall) no mesmo turno!" +
              (lastDebugResult 
                ? (lastDebugResult.errorsFound
                    ? `\n\nAVISO DE ERROS ENCONTRADOS: A ferramenta 'auto_debug_html' detectou os seguintes problemas no seu HTML: ${JSON.stringify(lastDebugResult.detectedErrors)}. Você está no Turno de Correção. Você é ABSOLUTAMENTE PROIBIDO de gerar o bloco de código Markdown final (\x60\x60\x60html ... \x60\x60\x60) para o usuário agora. Em vez disso, corrija TODOS os problemas indicados, escreva apenas uma mensagem curta de status como "(Corrigindo erros detectados no código...)" e chame a ferramenta 'auto_debug_html' novamente passando o HTML 100% corrigido!`
                    : "\n\nAVISO DE VALIDAÇÃO CONCLUÍDA: A ferramenta 'auto_debug_html' já foi executada com sucesso absoluto (sem erros). Você está na ETAPA DE ENTREGA (TURNO 2). Você DEVE obrigatoriamente gerar e exibir o código HTML completo e polido em um bloco Markdown (\x60\x60\x60html ... \x60\x60\x60) agora! NÃO chame a ferramenta 'auto_debug_html' novamente.")
                : ""),
            tools: marteTools,
            temperature: 0.7
          }
        });

        const modelContent = response.candidates?.[0]?.content;
        if (!modelContent) {
          throw new Error("No content returned from Gemini model");
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
              const urlM = rawArgs.match(/url:\s*(https?:\/\/[^\s,}]|www\.[^\s,}]|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app)[^\s,}]*)/i);
              if (urlM) {
                let u = urlM[1];
                if (!u.startsWith('http')) u = 'https://' + u;
                fnArgs = { url: u };
              }
            }
            if (['open_url', 'click', 'type_text', 'scroll_page', 'web_search', 'gerar_imagem'].includes(fnName)) {
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

          const wantsBrowser = /\b(abrir|acesse|acessar|navegar|entrar\s+no)\s+(site|link|url|pagina|página)\b|\b(abrir|acesse|acessar|entrar\s+no)\s+(youtube|google|wikipedia|github|brave)\b|https?:\/\/|www\./i.test(userStr);
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
            const urlMatch = (userStr + " " + aiStr).match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app)[^\s]*)/i);
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
              const openSiteMatch = userStr.match(/(?:abra|acesse|acessar|entrar no|site do|site da)\s+([a-zA-Z0-9-]+)/i);
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

          // If the model is calling auto_debug_html in this turn, strip any accidental/premature markdown HTML code blocks.
          // They should only be displayed in the final delivery turn after verification is successful.
          if (functionCallsForThisTurn.some(fc => fc.name === "auto_debug_html")) {
            cleanText = cleanText.replace(/```html[\s\S]*?```/gi, "");
            cleanText = cleanText.replace(/```htm[\s\S]*?```/gi, "");
            cleanText = cleanText.replace(/```[\s\S]*?```/gi, "");
          }

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

          const hasNativeCalls = modelContent && modelContent.parts && modelContent.parts.some((p: any) => p.functionCall);
          if (hasNativeCalls) {
            currentContents.push(modelContent);
          }

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
            else if (fc.name === "auto_debug_html") thinkingText = "\n\n[verificando possíveis erros no código...]\n\n";
            else if (fc.name === "gerar_imagem") thinkingText = `\n\n<wsm_image prompt="${(fc.args as any)?.prompt || 'Imagem'}" imgUrl="" />\n\n`;
            else if (fc.name === "open_url") thinkingText = `\n\n[Abrindo site: ${(fc.args as any).url}...]\n\n`;
            else if (fc.name === "click") thinkingText = `\n\n[Clicando no elemento...]\n\n`;
            else if (fc.name === "type_text") thinkingText = `\n\n[Digitando "${(fc.args as any).text}"...]\n\n`;
            else if (fc.name === "scroll_page") thinkingText = `\n\n[Rolando página para ${(fc.args as any)?.direction === 'up' ? 'cima' : 'baixo'}...]\n\n`;
            else if (fc.name === "extract_visible_text") thinkingText = `\n\n[Lendo página atualizada...]\n\n`;

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
            } else if (fc.name === "auto_debug_html") {
              const args = fc.args as any;
              let debugResult: any = null;
              try {
                const evaluatorPrompt = `Você é o Visual Sandbox Render engine do WSM AI. Sua tarefa é simular a renderização do HTML fornecido, analisando-o detalhadamente como se estivesse vendo um screenshot completo do resultado visual em uma tela desktop e mobile.

Avalie os seguintes pontos no código HTML:
1. Sintaxe HTML, CSS e JavaScript (tags não fechadas, scripts quebrados, classes inexistentes, imports faltantes).
2. Layout e Estética (elementos sobrepostos, falta de contraste, imagens quebradas, menus desalinhados, responsividade, espaçamentos bizarros).
3. Fidelidade ao que um usuário esperaria de uma interface premium e moderna (seções completas, Tailwind configurado adequadamente, etc.).
4. CRÍTICO: Imagens. Se o HTML usar imagens placeholder (ex: source.unsplash.com, via.placeholder.com) que costumam falhar, ou URLs de imagens falsas, você DEVE apontar isso como erro. O código deve usar imagens reais e válidas (ex: wikimedia commons, URLs reais, ou base64 curtos para ícones).

Retorne EXCLUSIVAMENTE um objeto JSON estruturado de acordo com o seguinte esquema JSON:
{
  "errorsFound": boolean,
  "detectedErrors": ["lista de erros encontrados, ou vazio se não houver nenhum"],
  "visualDescription": "uma descrição textual rica e detalhada de como ficou o visual renderizado, como se estivesse descrevendo uma foto/print da página inteira",
  "renderedWidth": "1920px",
  "renderedHeight": "1080px",
  "sandboxConsoleLogs": ["mensagens de log de simulação, avisos ou erros de carregamento"]
}
Certifique-se de retornar apenas o JSON puro, sem formatação Markdown ou delimitadores de código.`;

                const evalResponse = await callGeminiWithFallback({
                  model: "gemini-3.5-flash-lite",
                  contents: `Código HTML a ser analisado e renderizado:\n\n${args.html}`,
                  config: {
                    systemInstruction: evaluatorPrompt,
                    responseMimeType: "application/json"
                  }
                });
                
                let jsonText = evalResponse.text?.trim() || "{}";
                jsonText = jsonText.replace(/^```(json)?\n?/i, '').replace(/\n?```$/i, '').trim();
                debugResult = JSON.parse(jsonText);
              } catch (e: any) {
                console.error("Error during auto debug html:", e);
                debugResult = {
                  errorsFound: true,
                  detectedErrors: [e.message || String(e)],
                  visualDescription: "Falha ao iniciar o container da sandbox de renderização.",
                  renderedWidth: "1920px",
                  renderedHeight: "1080px",
                  sandboxConsoleLogs: ["Erro fatal de execução: " + (e.message || String(e))]
                };
              }
              
              // Simulate artificial processing delay for maximum user immersion
              await new Promise(r => setTimeout(r, 2000));
              
              functionResponseParts.push({
                functionResponse: { name: fc.name, response: { result: debugResult } }
              });
              
              lastDebugResult = debugResult;
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
                    models: ["AlbedoBase XL 3.1"]
                  })
                });

                if (!responseAsync.ok) {
                  throw new Error(`AI Horde API error: ${responseAsync.statusText}`);
                }

                const initData = await responseAsync.json();
                const requestId = initData.id;

                if (!requestId) {
                  throw new Error("Não foi possível obter o ID da geração de imagem.");
                }

                // Poll status
                let isDone = false;
                let attempts = 0;
                const maxAttempts = 30; // 60 seconds max

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
                      } else {
                        throw new Error("Nenhuma imagem gerada.");
                      }
                    } else if (statusData.faulted) {
                      throw new Error("Erro na geração da imagem pelo AI Horde.");
                    }
                  }
                }

                if (!resultImgUrl) {
                  throw new Error("A geração de imagem expirou.");
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
            } else if (fc.name === "open_url" || fc.name === "click" || fc.name === "type_text" || fc.name === "scroll_page" || fc.name === "extract_visible_text") {
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
            }
            
            // Remove the thinking text and replace with the final tag text
            let finalTagText = "";
            if (fc.name === "web_search") {
              finalTagText = "\n\n[pesquisou na web]\n\n";
            } else if (fc.name === "calculadora") {
              finalTagText = "\n\n[calculando]\n\n";
            } else if (fc.name === "relogio") {
              finalTagText = "\n\n[verificando relógio]\n\n";
            } else if (fc.name === "auto_debug_html") {
              const htmlBase64 = fc.args && (fc.args as any).html ? Buffer.from((fc.args as any).html).toString('base64') : '';
              if (lastDebugResult && lastDebugResult.errorsFound) {
                let errorDesc = lastDebugResult.detectedErrors?.[0] || 'ajuste necessário';
                // Remove brackets to avoid breaking the markdown/regex matching tags
                errorDesc = errorDesc.replace(/[\[\]]/g, '').slice(0, 150);
                finalTagText = `\n\n[corrigindo erro detectado no código: ${errorDesc} | HTML_BASE64:${htmlBase64}]\n\n`;
              } else {
                finalTagText = `\n\n[código 100% verificado: sem erros | HTML_BASE64:${htmlBase64}]\n\n`;
              }
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
            }
            const lastIdx = fullOutput.lastIndexOf(thinkingText);
            if (lastIdx !== -1) {
              fullOutput = fullOutput.substring(0, lastIdx) + finalTagText + fullOutput.substring(lastIdx + thinkingText.length);
            } else {
              fullOutput = fullOutput.replace(thinkingText, finalTagText);
            }
            sendEvent({ type: "sync_text", text: fullOutput });
          }
          if (hasNativeCalls) {
            currentContents.push({ role: "user", parts: functionResponseParts });
            turnCount++;
          } else {
            // Auto-injected action completed (e.g. browser open_url), turn complete.
            break;
          }
        } else {
          // Check for unfulfilled tool calls (e.g. model outputted conversational text promising tools without calling functionCall)
          const userStr = (typeof text === 'string' ? text : JSON.stringify(text)).toLowerCase();
          const aiStr = (textForThisTurn || "").toLowerCase();

          const wantsImage = /\b(gerar|crie|criar|desenhar|desenhe|pintar|pinte)\b.*\b(imagem|foto|ilustraç|arte|desenho|pintura|quadro)\b|\b(imagem|foto|ilustraç|arte|desenho|pintura)\b/i.test(userStr);
          const aiPromisedImage = /\b(vou|irei|estou)\s+(gerar|criar|desenhar|pintar)\s+(uma?|a)?\s*(imagem|foto|ilustraç|arte|desenho|quadro)\b|\bgerando\s+a?\s*imagem\b/i.test(aiStr);
          const imageAlreadyCalled = currentContents.some((c: any) => 
            c.parts?.some((p: any) => p.functionCall?.name === "gerar_imagem" || p.functionResponse?.name === "gerar_imagem")
          );

          const wantsSearch = /\b(pesquis|busc)\w*\b.*\b(web|internet|google|brave|notícia|hoje|site)\b|\búltimas notícias\b|\bcotação do\b|\bpreço do\b/i.test(userStr);
          const aiPromisedSearch = /\b(vou|irei|estou)\s+(pesquisar|buscar)\b.*\b(web|internet|informações|notícias)\b|\bpesquisando\s+na\s+web\b/i.test(aiStr);
          const searchAlreadyCalled = currentContents.some((c: any) => 
            c.parts?.some((p: any) => p.functionCall?.name === "web_search" || p.functionResponse?.name === "web_search")
          );

          const wantsBrowser = /\b(abrir|acesse|acessar|navegar|entrar\s+no)\s+(site|link|url|pagina|página)\b|\b(abrir|acesse|acessar|entrar\s+no)\s+(youtube|google|wikipedia|github|brave)\b|https?:\/\/|www\./i.test(userStr);
          const aiPromisedBrowser = /\b(vou|irei|estou)\s+(abrir|acessar|navegar)\s+(o|a)?\s*(site|url|página|link|navegador)\b|\b(acessando|abrirá|abrindo)\s+o\s+site\b/i.test(aiStr);
          const browserAlreadyCalled = currentContents.some((c: any) => 
            c.parts?.some((p: any) => 
              p.functionCall?.name === "open_url" || p.functionResponse?.name === "open_url" ||
              p.functionCall?.name === "click" || p.functionResponse?.name === "click" ||
              p.functionCall?.name === "type_text" || p.functionResponse?.name === "type_text" ||
              p.functionCall?.name === "scroll_page" || p.functionResponse?.name === "scroll_page" ||
              p.functionCall?.name === "extract_visible_text" || p.functionResponse?.name === "extract_visible_text"
            )
          );

          const missingImageCall = (wantsImage || aiPromisedImage) && !imageAlreadyCalled;
          const missingSearchCall = (wantsSearch || aiPromisedSearch) && !searchAlreadyCalled;
          const missingBrowserCall = (wantsBrowser || aiPromisedBrowser) && !browserAlreadyCalled;

          if ((missingImageCall || missingSearchCall || missingBrowserCall) && turnCount < 3) {
            console.warn(`[Pro] Missing tool call detected on turn ${turnCount}! missingBrowser: ${missingBrowserCall}, missingImage: ${missingImageCall}, missingSearch: ${missingSearchCall}. Triggering recovery...`);
            
            // Clean up intermediate unfulfilled conversational text from fullOutput to prevent duplicate text in UI
            if (textForThisTurn) {
              const lastIdx = fullOutput.lastIndexOf(textForThisTurn);
              if (lastIdx !== -1) {
                fullOutput = fullOutput.substring(0, lastIdx);
                sendEvent({ type: "sync_text", text: fullOutput });
              }
            }

            currentContents.push(modelContent);

            let reminderMsg = "";
            if (missingBrowserCall) {
              const isTypingAction = /digitar|preencher|escrever|pesquisar na|pesquisa na|barra|campo|busca|digite|digito/i.test(userStr + " " + aiStr);
              const isClickAction = /clicar|clique|pressionar|apertar|selecionar|botão|link/i.test(userStr + " " + aiStr);
              const isScrollAction = /rolar|scroll|descer|subir|mova a página|role/i.test(userStr + " " + aiStr);

              if (isTypingAction) {
                const textMatch = userStr.match(/(?:digitar|preencher|pesquisar|escrever)\s+["'“]([^"'”]+)["'”]/i) || userStr.match(/(?:digitar|preencher|pesquisar|escrever)\s+(\w+)/i);
                const textVal = textMatch ? textMatch[1] : "";
                reminderMsg = `SISTEMA (AÇÃO DE NAVEGADOR OBRIGATÓRIA): O usuário pediu para digitar/pesquisar um texto no site${textVal ? ` ("${textVal}")` : ''}. Execute OBRIGATORIAMENTE a chamada de função 'type_text' (functionCall) para o campo de busca/input (ou 'open_url' se o site não estiver aberto ainda). NÃO responda apenas com texto conversacional sem a chamada de função!`;
              } else if (isClickAction) {
                reminderMsg = `SISTEMA (AÇÃO DE NAVEGADOR OBRIGATÓRIA): O usuário pediu para clicar em um elemento no site. Execute OBRIGATORIAMENTE a chamada de função 'click' (functionCall) com o seletor adequado. NÃO responda apenas com texto conversacional sem a chamada de função!`;
              } else if (isScrollAction) {
                reminderMsg = `SISTEMA (AÇÃO DE NAVEGADOR OBRIGATÓRIA): O usuário pediu para rolar a página. Execute OBRIGATORIAMENTE a chamada de função 'scroll_page' (functionCall) com direction 'down' ou 'up'. NÃO responda apenas com texto conversacional sem a chamada de função!`;
              } else {
                let targetUrl = "";
                const urlMatch = (userStr + " " + aiStr).match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|io|br|gov|edu|ai|app)[^\s]*)/i);
                if (urlMatch) {
                  targetUrl = urlMatch[0];
                  if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
                } else if (userStr.includes("brave") || aiStr.includes("brave")) {
                  targetUrl = "https://search.brave.com";
                } else if (userStr.includes("google") || aiStr.includes("google")) {
                  targetUrl = "https://www.google.com";
                } else if (userStr.includes("wikipedia") || aiStr.includes("wikipedia")) {
                  targetUrl = "https://pt.wikipedia.org";
                }

                reminderMsg = `SISTEMA (AÇÃO DE NAVEGADOR OBRIGATÓRIA): O usuário pediu para abrir/acessar um site. Execute OBRIGATORIAMENTE a chamada de função 'open_url' (functionCall) agora${targetUrl ? ` com a url "${targetUrl}"` : ''}. NÃO responda apenas com texto conversacional sem a chamada de função!`;
              }
            } else if (missingImageCall) {
              reminderMsg = "SISTEMA (AGENTE SEQUENCIAL - PASSO 1): O usuário solicitou uma imagem (ou você prometeu gerar uma). Execute a PRIMEIRA ação agora: chame a ferramenta 'gerar_imagem' (functionCall) com o prompt descritivo em inglês. NÃO pesquise na web neste turno e NÃO responda apenas com texto.";
            } else if (missingSearchCall) {
              reminderMsg = "SISTEMA (AGENTE SEQUENCIAL - PASSO 2): Execute a ferramenta 'web_search' (functionCall) para pesquisar as informações na web. NÃO responda apenas com texto.";
            }

            currentContents.push({
              role: "user",
              parts: [{ text: reminderMsg }]
            });

            turnCount++;
            continue;
          } else {
            break; // no more function calls, we are done
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

    return res.json({
      text: textToReturn,
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    
    const errorMessage = error.message || String(error);
    let errorText = "WSM 1.6 está muito sobrecarregado agora. Tente novamente mais tarde.";

    if (errorMessage.includes("No content returned") || errorMessage.includes("empty response") || errorMessage.includes("blocked") || errorMessage.includes("finishReason")) {
      errorText = "⚠️ **Nenhuma resposta foi gerada pelo modelo.** O pedido pode ter sido longo demais ou complexo demais (por favor, tente dividir seu pedido em partes menores).";
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

  const modelName = "gemini-3.5-flash-lite";

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
    const systemPrompt = `Você é um tradutor profissional de altíssima precisão. Sua tarefa é traduzir o texto fornecido para o idioma de destino solicitado.
- Preserve o significado exato, as nuances culturais, as gírias apropriadas (se existirem e se o tom permitir), e a formatação (parágrafos, quebras de linha).
- Não adicione introduções, explicações ou notas adicionais. Forneça APENAS o texto traduzido.
- Se o tom for especificado, adapte o vocabulário e a formalidade da tradução para o tom solicitado (por exemplo: formal, informal, profissional, criativo).`;

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

export default app;
