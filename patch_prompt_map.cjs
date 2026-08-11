const fs = require('fs');
const file = 'api/promptsConfig.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));

const targetStr = `- **Mapas**: \`<wsm_map lat="-23.5505" lon="-46.6333" zoom="12" place="São Paulo" wiki="São Paulo" text="Centro" />\``;
const replaceStr = `- **Mapas**: \`<wsm_map lat="-23.5505" lon="-46.6333" zoom="12" place="São Paulo" wiki="São Paulo" text="Centro" />\`
- **Mapas com Vários Pontos**: Se o usuário pedir múltiplos locais no mapa, use a prop \`markers\` com um JSON array de pontos: \`<wsm_map lat="-23.55" lon="-46.63" zoom="11" markers='[{"lat":-23.55,"lon":-46.63,"title":"Sé"},{"lat":-23.58,"lon":-46.65,"title":"Ibirapuera"}]' />\``;

data.forEach(p => {
  if (p.content.includes(targetStr)) {
    p.content = p.content.replace(targetStr, replaceStr);
  }
});

fs.writeFileSync(file, JSON.stringify(data, null, 2));
console.log('Prompts updated');
