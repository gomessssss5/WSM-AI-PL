import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const client = new GoogleGenAI({
  apiKey: process.env.IA_API_KEY,
});

async function run() {
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
    config: {
      maxOutputTokens: 8192,
    }
  });
  console.log("RESPONSE:", res.text);
}
run();
