import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const client = new GoogleGenAI({
  apiKey: process.env.IA_API_KEY,
});

async function run() {
  const promptsConfig = JSON.parse(fs.readFileSync('./api/promptsConfig.json', 'utf8'));
  const activeSystemPrompt = promptsConfig.activeSystemPrompt;

  const res = await client.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: [
      {
        role: 'user',
        parts: [{ text: `Mano tá bugado MUITO BUGADO! um aluno teste meu acabou a prova corretamente, e apareceu pra professora que o aluno acabou por violação!!! outra: eu professor, cadastrei as alternativas do simulado no lugar certo. mas o aluno fez e ele fez a prova 100% correta! mas o sistema botava as alternativas corretas das questões, em questões que o professor não selecionou como ccerto!! mano arruma isso` }]
      },
      {
        role: 'model',
        parts: [{ text: `[Lendo Skill: web-html]` }]
      },
      {
        role: 'user',
        parts: [{ text: `[SISTEMA: SKILL REQUISITADA] Você solicitou a leitura da Skill "web-html". O conteúdo completo dela é:\n<wsm_skill_content>\nConteúdo da skill...\n</wsm_skill_content>\n\nPor favor, prossiga e execute a solicitação do usuário utilizando os conhecimentos desta skill.` }]
      }
    ],
    tools: [
      {
        functionDeclarations: [
          {
            name: "create_document",
            description: "Cria um novo documento ou arquivo no Workspace de Documentos da sessão.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                format: { type: Type.STRING }
              },
              required: ["title", "content"]
            }
          }
        ]
      }
    ],
    config: {
      systemInstruction: activeSystemPrompt,
      maxOutputTokens: 8192,
    }
  });
  console.log("RESPONSE TEXT:", res.text);
  console.log("RESPONSE FUNCTION CALLS:", JSON.stringify(res.functionCalls, null, 2));
}
run();
