import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();
const client = new GoogleGenAI({ apiKey: process.env.IA_API_KEY });
async function run() {
  const parts = [
    {
      "functionCall": {
        "name": "my_tool",
        "args": {}
      },
      "thoughtSignature": "CpICARFNMg8aELShQg0UzBFaAq6JXXFjDmrxMddLNQNSyLs9IpdxALjAfFZ27ghJcGZntGr/CWvb09dhzfQsz08bq9zi/1ZIiLGDMYALgPN7Z1M4yb5O379k7L8sxl5ec6fXEoEFKDSRD/flknWUaIXfO+RI7US8qNlEpNdnrWa/4VMObWBauX8lOjcPWOOVwzqiNUJS2HOcS0ADcuJydcJ6MvVC/2450TLQUiiMcBpqk9w23s02BYhWueoPl0ZIKJssy2Z4GQVz40+rkHcgYqLP4ayf2SRFDWngHWmPzp9JDaP0BQJmDZrTY4wn7zmgLXZY2QkTT3tgNPNVUWQZTVYdUxtMYqTaKbWr7QwK+Ldq1vshUA=="
    }
  ];
  
  const contents = [
    { role: "user", parts: [{ text: "call my_tool" }] },
    { role: "model", parts: parts },
    { role: "user", parts: [{ functionResponse: { name: "my_tool", response: { result: "ok" } } }] }
  ];

  try {
    const res = await client.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: contents,
      config: {
        tools: [{
          functionDeclarations: [{ name: "my_tool", parameters: { type: "OBJECT", properties: { x: {type: "NUMBER"} } } }]
        }]
      }
    });
    console.log(JSON.stringify(res.candidates[0].content.parts, null, 2));
  } catch (e) {
    console.error("API ERROR:", e.message);
  }
}
run().catch(console.error);
