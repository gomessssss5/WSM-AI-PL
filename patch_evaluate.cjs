const fs = require('fs');
let code = fs.readFileSync('src/components/ChatWindow.tsx', 'utf8');

const oldCode = `  const handleEvaluate = (msgId: string, rating: 'up' | 'down') => {
    const evals = { ...evaluations, [msgId]: rating };
    setEvaluations(evals);
    localStorage.setItem('wsm_evaluations', JSON.stringify(evals));
    try {
      const stored = JSON.parse(localStorage.getItem('wsm_evaluations_data') || '[]');
      const existingIdx = stored.findIndex((e: any) => e.msgId === msgId);
      const newEntry = { msgId, rating, conversation: messages.slice(0, messages.findIndex(m => m.id === msgId) + 1), timestamp: new Date().toISOString() };
      if (existingIdx >= 0) {
        stored[existingIdx] = newEntry;
      } else {
        stored.push(newEntry);
      }
      localStorage.setItem('wsm_evaluations_data', JSON.stringify(stored));
      saveEvaluationToDb(newEntry).catch(err => console.error("Error saving evaluation to Firestore:", err));
    } catch {}
    
    setToastMessage(rating === 'up' ? 'Obrigado pelo seu feedback positivo! 🌟' : 'Agradecemos o feedback! Vamos melhorar.');
    setTimeout(() => setToastMessage(null), 3000);
  };`;

const newCode = `  const handleEvaluate = (msgId: string, rating: 'up' | 'down') => {
    const evals = { ...evaluations, [msgId]: rating };
    setEvaluations(evals);
    
    try {
      localStorage.setItem('wsm_evaluations', JSON.stringify(evals));
      const stored = JSON.parse(localStorage.getItem('wsm_evaluations_data') || '[]');
      const existingIdx = stored.findIndex((e: any) => e.msgId === msgId);
      const newEntry = { msgId, rating, conversation: messages.slice(0, messages.findIndex(m => m.id === msgId) + 1), timestamp: new Date().toISOString() };
      if (existingIdx >= 0) {
        stored[existingIdx] = newEntry;
      } else {
        stored.push(newEntry);
      }
      localStorage.setItem('wsm_evaluations_data', JSON.stringify(stored));
      saveEvaluationToDb(newEntry).catch(err => console.error("Error saving evaluation to Firestore:", err));
    } catch (err) {
      console.error("Error saving evaluation to local storage:", err);
    }
    
    setToastMessage(rating === 'up' ? 'Obrigado pelo seu feedback positivo! 🌟' : 'Agradecemos o feedback! Vamos melhorar.');
    setTimeout(() => setToastMessage(null), 3000);
  };`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/components/ChatWindow.tsx', code);
