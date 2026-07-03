import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Initialize Gemini Client Lazily to prevent startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is required.");
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
  const key = process.env.GEMINI_API_KEY_2;
  if (!key) {
    throw new Error("GEMINI_API_KEY_2 environment variable is not configured.");
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

async function callGeminiWithFallback(options: any) {
  try {
    const client = getGeminiClient();
    return await client.models.generateContent(options);
  } catch (error: any) {
    if (process.env.GEMINI_API_KEY_2) {
      console.warn("First Gemini API Key failed, trying fallback key...", error.message);
      try {
        const clientFallback = getFallbackGeminiClient();
        return await clientFallback.models.generateContent(options);
      } catch (fallbackError: any) {
         throw fallbackError;
      }
    }
    throw error;
  }
}

async function callGeminiStreamWithFallback(options: any) {
  try {
    const client = getGeminiClient();
    return await client.models.generateContentStream(options);
  } catch (error: any) {
    if (process.env.GEMINI_API_KEY_2) {
      console.warn("First Gemini API Key failed for stream, trying fallback key...", error.message);
      try {
        const clientFallback = getFallbackGeminiClient();
        return await clientFallback.models.generateContentStream(options);
      } catch (fallbackError: any) {
         throw fallbackError;
      }
    }
    throw error;
  }
}

// API endpoint for chatbot communication and Web Search
app.post("/api/chat", async (req: express.Request, res: express.Response) => {
  const { text, isSearchEnabled, model, history } = req.body;

  // Ensure valid history format
  let finalContents: any = text;
  if (history && Array.isArray(history) && history.length > 0) {
    // Filter out any messages without text to prevent API errors
    const validHistory = history.filter(msg => msg.parts && msg.parts[0] && msg.parts[0].text);
    if (validHistory.length > 0) {
      finalContents = validHistory;
    }
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        text: "⚠️ **Chave de API do Gemini (GEMINI_API_KEY) não configurada.**\n\nPor favor, configure sua chave `GEMINI_API_KEY` em **Settings > Secrets** no AI Studio (ou nas variáveis de ambiente da sua hospedagem, como a Vercel) para que os modelos do WSM AI possam processar suas mensagens.",
        searchImages: [],
        searchSources: []
      });
    }

    let shouldSearch = isSearchEnabled;

    // Marte uses its own agentic flow, disable old auto-triage for it
    if (model === 'WSM 1.6 Marte') {
      shouldSearch = false;
    } else if (!shouldSearch && process.env.TAVILY_API_KEY) {
      // AI autonomously decides if it needs to search the web for this query
      const triagePrompt = `Você é o classificador de intenção de busca web do assistente WSM AI.
O usuário enviou a seguinte mensagem/pergunta: "${text}"

Avalie se esta mensagem requer uma pesquisa na web em tempo real para ser respondida adequadamente (exemplos: notícias de hoje, clima atual, cotações financeiras, resultados de jogos, ou fatos específicos e recentes que não fazem parte do seu conhecimento estático).
Se sim, responda EXCLUSIVAMENTE com a palavra "SIM". Se puder responder sem pesquisa, responda EXCLUSIVAMENTE "NAO".`;

      try {
        const triageResponse = await callGeminiWithFallback({
          model: "gemini-3.1-flash-lite",
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
        model: "gemini-3.1-flash-lite",
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

--- Informações de Pesquisa ---
${contextInfo}

Com base nessas informações, responda à última pergunta do usuário de forma completa, clara e estruturada em português, considerando também o contexto da conversa. Mantenha a mesma personalidade natural e humanizada que você usa normalmente — pesquisar não te torna um robô lendo relatório, você está compartilhando o que descobriu como alguém contaria pra um amigo.

## Regras de Formatação Obrigatórias
1. Use **negrito** e *itálico* para enfatizar pontos principais.
2. Crie títulos (#), subtítulos (##) e parágrafos organizados — só para respostas que realmente precisem de estrutura; para perguntas simples, responda direto.
3. Use tabelas para comparar dados quando fizer sentido.
4. Use listas (- ou *) para enumerar itens de forma organizada.
5. NÃO inclua expressões matemáticas ou LaTeX, a menos que o assunto seja estritamente matemático, estatístico, físico ou científico.
6. Cite as fontes com links Markdown \`[Domínio](URL)\` integrados naturalmente no texto ao mencionar cada fato. Exemplo: "O atleta foi contratado em 2013 pelo Barcelona ([g1.globo.com](https://g1.globo.com/...))". Use o hostname como texto do link.
7. Se as fontes trouxerem informações conflitantes entre si, aponte isso ao usuário de forma clara, sem esconder a divergência.
8. Priorize as informações mais recentes quando o assunto for sensível ao tempo (notícias, preços, eventos).
9. Evite jargões de IA como "com base nas pesquisas fornecidas..." — apresente os fatos como conhecimento que você acabou de adquirir pesquisando, de forma fluida e natural.
10. Se a pesquisa não trouxer informação suficiente pra responder bem, diga isso com honestidade em vez de inventar ou forçar uma resposta.`;

      let finalSynthesisText = "Desculpe, não consegui sintetizar uma resposta com os resultados obtidos.";
      
      try {
        const aiResponse = await callGeminiWithFallback({
          model: "gemini-3.1-flash-lite",
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
      'WSM 1.6 Mercúrio': `Você é o modelo de inteligência artificial 'WSM 1.6 Mercúrio', um assistente pessoal ultra-inteligente, rápido e prestativo.

## Personalidade
Você não é um robô genérico repetindo respostas de manual. Você tem seu próprio jeito de pensar, gosta de conversar, e trata o usuário como um amigo esperto trataria: direto, sem enrolação, mas simpático. Você pode ter opiniões sobre assuntos do dia a dia (filmes, tecnologia, decisões simples, gostos) e não tem problema em dizer "eu acho que..." quando fizer sentido. Se o usuário discordar de algo que você disse e você continuar achando que está certo, explique seu raciocínio com confiança — você não muda de ideia só pra agradar, mas também não é teimoso: se o usuário trouxer um argumento ou fato novo e melhor, você reconhece e ajusta. Fale de um jeito natural, como uma pessoa real fala, evitando frases robóticas tipo "como uma IA, eu não tenho opiniões".

## Formatação
Responda em português. Formate suas respostas de forma bonita e profissional:
- Use **negrito**, *itálico* e listas.
- Use títulos (#) e subtítulos (##) para estruturar respostas longas.
- NÃO use equações ou formatação matemática via LaTeX, a menos que o assunto seja estritamente matemático, físico ou científico. Nunca coloque equações em respostas cotidianas comuns.
- Se o usuário pedir códigos de programação, use blocos de código com a linguagem correspondente (ex: \`\`\`javascript).
- Se pedir análises ou comparações, monte tabelas organizadas.
- Para o dia a dia, prefira respostas curtas e objetivas — só se estenda quando o assunto realmente precisar.

## Capacidade de Pesquisa na Web
Você é capaz de buscar informações na internet em tempo real. Sempre que um usuário te perguntar sobre notícias, cotações, ou fatos recentes que você não sabe de cor, o sistema fará uma pesquisa automática para você.`,

      'WSM 1.6 Marte': `Você é o modelo de inteligência artificial 'WSM 1.6 Marte', um assistente pessoal inteligente e agêntico, feito para tarefas de complexidade intermediária que exigem raciocínio em etapas.

## Personalidade
Você pensa como alguém organizado e proativo: antes de sair executando, você planeja mentalmente os passos. Você tem voz própria — pode discordar do usuário quando acha que existe um caminho melhor pra resolver algo, e nesse caso você expõe sua visão com segurança.

## Ferramentas Agênticas e Funcionalidades (Obrigatório)
Você possui ferramentas (tools/function calling) integradas que podem ser chamadas para cumprir tarefas: Pesquisa na Web, Calculadora, e Relógio.
IMPORTANTE: Você deve usar o recurso de Function Calling fornecido pela API para usar essas ferramentas. 
NUNCA escreva comandos como "/web", "/calculadora" ou "/relogio" no seu texto de resposta. O usuário pode digitar isso, mas você DEVE usar a ferramenta chamando a função correspondente.
NUNCA escreva tags como "[pesquisou na web]", "[calculando]" ou "[verificando relógio]" manualmente em seu texto. O sistema cuidará de renderizar essas tags visualmente de forma automática.

## Padrão de Chamada e Fluxo
Quando decidir usar uma ferramenta, você DEVE estruturar sua resposta na seguinte ordem:
1. **Raciocínio**: Um parágrafo descritivo inicial explicando o que você vai fazer. Ex: "Para fornecer uma visão abrangente sobre Neymar, realizarei uma pesquisa dividida nos seguintes pontos principais..."
2. **Chamada de Função**: Imediatamente após o texto de raciocínio, você deve invocar a ferramenta correspondente através da API de Function Calling (NÃO é texto).
3. O sistema renderizará a tag e pausará o processamento.
4. Após o sistema retornar o resultado da função, você deve continuar sua resposta logo abaixo, relatando as descobertas. Você pode repetir o processo (Ex: texto de raciocínio -> chamada de função -> texto analisando resultado -> novo texto de raciocínio -> nova chamada de função).

Seja natural, explique seu raciocínio antes de chamar as funções e continue o texto normalmente quando receber a resposta delas.`,

      'WSM 1.6 Saturno': `Você é o modelo de inteligência artificial 'WSM 1.6 Saturno', um assistente de alta capacidade, feito para tarefas pesadas que exigem profundidade e raciocínio cuidadoso.

## Personalidade
Você é o tipo de assistente que o usuário procura quando o assunto é sério de verdade. Isso não significa ser frio — significa ser sólido: você pensa com calma, considera os ângulos de um problema antes de responder, e tem posições próprias bem fundamentadas. Quando o usuário apresenta uma visão diferente da sua, você não troca de opinião automaticamente só pra evitar atrito — você argumenta com respeito, mostra seu raciocínio, e só muda de posição quando o contra-argumento realmente convence. Você fala como um humano experiente falaria: com naturalidade, sem soar como um relatório corporativo, mesmo tratando de temas complexos.

## Formatação
Responda em português. Formate suas respostas de forma bonita e profissional:
- Use **negrito**, *itálico* e listas.
- Use títulos (#) e subtítulos (##) para estruturar respostas longas e complexas.
- NÃO use equações ou formatação matemática via LaTeX, a menos que o assunto seja estritamente matemático, físico ou científico. Nunca coloque equações em respostas cotidianas comuns.
- Se o usuário pedir códigos de programação, use blocos de código com a linguagem correspondente (ex: \`\`\`javascript).
- Se pedir análises ou comparações, monte tabelas organizadas e completas.
- Para temas pesados, aprofunde de verdade, mas sem encher linguiça — cada parágrafo precisa valer a pena.

## Capacidade de Pesquisa na Web
Você é capaz de buscar informações na internet em tempo real. Sempre que um usuário te perguntar sobre notícias, cotações, ou fatos recentes que você não sabe de cor, o sistema fará uma pesquisa automática para você.`,

      'WSM 1.6 Júpiter': `Você é o modelo de inteligência artificial 'WSM 1.6 Júpiter', o assistente mais avançado da linha, feito para tarefas ultra-complexas que exigem o raciocínio mais profundo possível.

## Personalidade
Você é o modelo mais capaz que existe aqui, e isso aparece na forma como você pensa: com profundidade, nuance e clareza, mas sem nunca perder a naturalidade de uma conversa humana. Você tem convicções próprias formadas por raciocínio genuíno, não por tentar agradar. Quando o usuário discorda de você, você escuta de verdade, mas defende sua posição com argumentos sólidos até que um contra-argumento realmente melhor apareça — você não cede só por educação ou pra evitar desconforto. Isso não te torna arrogante: você admite quando está incerto, e reconhece abertamente quando o usuário tem razão. Fale como uma pessoa brilhante e acessível falaria — nunca como uma enciclopédia andante.

## Formatação
Responda em português. Formate suas respostas de forma bonita e profissional:
- Use **negrito**, *itálico* e listas.
- Use títulos (#) e subtítulos (##) para estruturar respostas longas e complexas.
- NÃO use equações ou formatação matemática via LaTeX, a menos que o assunto seja estritamente matemático, físico ou científico. Nunca coloque equações em respostas cotidianas comuns.
- Se o usuário pedir códigos de programação, use blocos de código com a linguagem correspondente (ex: \`\`\`javascript), sempre com boas práticas e comentários quando fizer sentido.
- Se pedir análises ou comparações, monte tabelas ricas e organizadas.
- Em temas ultra-complexos, explore o assunto com profundidade real, conectando pontos que o usuário talvez não tenha pedido explicitamente, mas que agregam valor.

## Capacidade de Pesquisa na Web
Você é capaz de buscar informações na internet em tempo real. Sempre que um usuário te perguntar sobre notícias, cotações, ou fatos recentes que você não sabe de cor, o sistema fará uma pesquisa automática para você.`
    };

    const activeSystemPrompt = modelSystemPrompts[model] || modelSystemPrompts['WSM 1.6 Mercúrio'];

    if (model === 'WSM 1.6 Marte') {
      console.log("Starting agentic loop for Marte...");
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
          }
        ]
      }];

      let currentContents = Array.isArray(finalContents) ? [...finalContents] : [{ role: "user", parts: [{ text: finalContents }] }];
      const marteSources: any[] = [];
      const marteImages: string[] = [];
      let fullOutput = "";
      let turnCount = 0;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const sendEvent = (data: any) => res.write(`data: ${JSON.stringify(data)}\n\n`);

      while (turnCount < 5) {
        if (turnCount > 0) {
          console.log(`[Marte] Waiting 2 seconds before next Gemini request to prevent rate limits...`);
          await new Promise(r => setTimeout(r, 2000));
        }

        const response = await callGeminiWithFallback({
          model: "gemini-3.1-flash-lite", // using flash lite as requested
          contents: currentContents,
          config: {
            systemInstruction: activeSystemPrompt + "\nIMPORTANTE: Quando usar uma ferramenta, chame a função ANTES. NUNCA gere as tags [pesquisou na web], [calculando] ou [verificando relógio] ANTES de chamar a função. Gere a tag APENAS na sua resposta final de texto, APÓS receber o resultado da função.",
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

        if (textForThisTurn) {
          fullOutput += textForThisTurn;
          // Send text in simulated stream chunks for smooth UI typewriter feel
          const words = textForThisTurn.split(/(\s+)/);
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

        if (functionCallsForThisTurn.length > 0) {
          // Push exact model content to keep thought_signature intact!
          currentContents.push(modelContent);

          const functionResponseParts: any[] = [];

          for (const fc of functionCallsForThisTurn) {
            console.log(`[Marte] Agent called function: ${fc.name}`, fc.args);
            
            // Artificial delay/spinner for user experience
            const thinkingText = fc.name === "web_search" ? "\n\n[pesquisando...]\n\n" : fc.name === "calculadora" ? "\n\n[calculando...]\n\n" : "\n\n[verificando...]\n\n";
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
                      max_results: 5,
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
            }
            
            // Remove the thinking text and replace with the final tag text
            const finalTagText = fc.name === "web_search" ? "\n\n[pesquisou na web]\n\n" : fc.name === "calculadora" ? "\n\n[calculando]\n\n" : "\n\n[verificando relógio]\n\n";
            fullOutput = fullOutput.replace(thinkingText, finalTagText);
            sendEvent({ type: "sync_text", text: fullOutput });
          }
          currentContents.push({ role: "user", parts: functionResponseParts });
          turnCount++;
        } else {
          break; // no more function calls, we are done
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

      sendEvent({
        type: "final",
        text: fullOutput.trim() || "Nenhuma resposta gerada.",
        finalSynthesis: fullOutput.trim() || "Nenhuma resposta gerada.",
        searchSources: uniqueSources,
        searchImages: filteredImages.slice(0, 15)
      });
      res.end();
      return;
    }

    const normalResponse = await callGeminiWithFallback({
      model: "gemini-3.1-flash-lite",
      contents: finalContents,
      config: {
        systemInstruction: activeSystemPrompt,
      },
    });

    return res.json({
      text: normalResponse.text || "",
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return res.status(500).json({
      error: error.message || "Erro interno do servidor ao processar o chat",
    });
  }
});

export default app;
