import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const client = new GoogleGenAI({ apiKey: process.env.IA_API_KEY });
async function run() {
  const res = await client.models.generateContent({
    model: "gemini-3.1-pro",
    contents: "Please call the tool named my_tool.",
    tools: [{
      functionDeclarations: [{ name: "my_tool", parameters: { type: "OBJECT", properties: {} } }]
    }]
  });
  console.log(JSON.stringify(res.candidates[0].content.parts, null, 2));
}
run().catch(console.error);
