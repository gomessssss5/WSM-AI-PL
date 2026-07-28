import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const client = new GoogleGenAI({ apiKey: process.env.IA_API_KEY });
async function run() {
  const res = await client.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: "What is 2+2? Use calculator tool.",
    tools: [{
      functionDeclarations: [{ name: "calculator", parameters: { type: "OBJECT", properties: { expr: { type: "STRING" } } } }]
    }]
  });
  console.log(JSON.stringify(res.candidates[0].content.parts, null, 2));
}
run().catch(console.error);
