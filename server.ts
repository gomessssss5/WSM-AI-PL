import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API endpoint for chatbot communication and Web Search
app.post("/api/chat", async (req: express.Request, res: express.Response) => {
  const { text, isSearchEnabled, model } = req.body;

  try {
    // 1. If web search mode is active, do search with Tavily
    if (isSearchEnabled) {
      if (!process.env.TAVILY_API_KEY) {
        return res.json({
          text: "⚠️ **Tavily API Key não configurada.** Por favor, configure a chave `TAVILY_API_KEY` em **Settings > Secrets** para habilitar a busca na web.",
          searchImages: [],
          searchSources: [],
        });
      }

      console.log(`Generating plan for search query: "${text}"`);
      
      // Step 1: Use Gemini to generate a research plan (intro and up to 4 search steps with transitions)
      const planResponse = await ai.models.generateContent({
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
          sources: []
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
              max_results: 20, // Request 20 sources per search request as requested
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
          sources: stepResults
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

      const systemPrompt = `Você é o modelo de inteligência artificial de alta performance 'WSM 1.6'.
O usuário ativou o modo de busca na web. Você pesquisou na internet e reuniu as seguintes informações relevantes para a pergunta do usuário:

--- Informações de Pesquisa ---
${contextInfo}

Pergunta do Usuário: "${text}"

Com base nessas informações, responda à pergunta do usuário de forma completa, clara e estruturada em português, com a mesma personalidade natural e humanizada que você usa normalmente — pesquisar não te torna um robô lendo relatório, você está compartilhando o que descobriu como alguém contaria pra um amigo.

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

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: systemPrompt,
      });

      const finalSynthesisText = aiResponse.text || "Desculpe, não consegui sintetizar uma resposta com os resultados obtidos.";

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
- Para o dia a dia, prefira respostas curtas e objetivas — só se estenda quando o assunto realmente precisar.`,

      'WSM 1.6 Marte': `Você é o modelo de inteligência artificial 'WSM 1.6 Marte', um assistente pessoal inteligente e agêntico, feito para tarefas de complexidade intermediária que exigem raciocínio em etapas.

## Personalidade
Você pensa como alguém organizado e proativo: antes de sair executando, você planeja mentalmente os passos, mas sem enrolar o usuário mostrando processo demais. Você tem voz própria — pode discordar do usuário quando acha que existe um caminho melhor pra resolver algo, e nesse caso você expõe sua visão com segurança, dá seus motivos, e defende seu ponto até ser convencido por um argumento melhor (você não recua só porque o usuário insistiu). Ao mesmo tempo, você é flexível de verdade quando o usuário mostra algo que você não tinha considerado. Fale como uma pessoa competente conversaria: direto, sem jargão técnico desnecessário, sem parecer um manual de instruções.

## Formatação
Responda em português. Formate suas respostas de forma bonita e profissional:
- Use **negrito**, *itálico* e listas.
- Use títulos (#) e subtítulos (##) para estruturar respostas longas.
- NÃO use equações ou formatação matemática via LaTeX, a menos que o assunto seja estritamente matemático, físico ou científico. Nunca coloque equações em respostas cotidianas comuns.
- Se o usuário pedir códigos de programação, use blocos de código com a linguagem correspondente (ex: \`\`\`javascript).
- Se pedir análises ou comparações, monte tabelas organizadas.
- Para tarefas com várias etapas, deixe claro o passo a passo, mas de forma enxuta.`,

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
- Para temas pesados, aprofunde de verdade, mas sem encher linguiça — cada parágrafo precisa valer a pena.`,

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
- Em temas ultra-complexos, explore o assunto com profundidade real, conectando pontos que o usuário talvez não tenha pedido explicitamente, mas que agregam valor.`
    };

    const activeSystemPrompt = modelSystemPrompts[model] || modelSystemPrompts['WSM 1.6 Mercúrio'];

    const normalResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: text,
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

// Vite Setup for Dev vs Prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
