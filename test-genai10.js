import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const client = new GoogleGenAI({ apiKey: process.env.IA_API_KEY });
async function run() {
  const res1 = await client.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: "call my_tool right now",
    config: {
      tools: [{
        functionDeclarations: [{ name: "my_tool", parameters: { type: "OBJECT", properties: { x: {type: "NUMBER"} } } }]
      }],
      toolConfig: { functionCallingConfig: { mode: "ANY" } }
    }
  });

  const modelParts = res1.candidates[0].content.parts;
  console.log("Model Parts from Turn 1:", JSON.stringify(modelParts, null, 2));

  const currentContents = [
    { role: "user", parts: [{ text: "call my_tool right now" }] },
    { role: "model", parts: modelParts },
    { role: "user", parts: [{ functionResponse: { name: "my_tool", response: { result: "ok" } } }] }
  ];

  try {
    const res2 = await client.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: currentContents,
      config: {
        tools: [{
          functionDeclarations: [{ name: "my_tool", parameters: { type: "OBJECT", properties: { x: {type: "NUMBER"} } } }]
        }]
      }
    });
    console.log("Response from Turn 2:", JSON.stringify(res2.candidates[0].content.parts, null, 2));
  } catch (e) {
    console.error("API ERROR on Turn 2:", e.message);
  }
}
run().catch(console.error);
