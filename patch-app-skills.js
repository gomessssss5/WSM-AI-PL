const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /const skill = skills.find\(\s*\(\s*s\s*\) => s.name.toLowerCase\(\) === skillName.toLowerCase\(\) \|\| s.id.toLowerCase\(\) === skillName.toLowerCase\(\)\s*\);/g,
  `const allAvailableSkills = [...OFFICIAL_SKILLS, ...skills];
    const skill = allAvailableSkills.find(
      (s) => s.name.toLowerCase() === skillName.toLowerCase() || s.id.toLowerCase() === skillName.toLowerCase()
    );`
);
fs.writeFileSync('src/App.tsx', code);
