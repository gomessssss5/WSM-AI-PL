let currentSegments = "[corrigindo erro".split("");
let currentIndexRef = { current: 16 };
let currentTotalLen = currentSegments.length;

let lastOpenBracketIndex = -1;
for (let i = currentIndexRef.current - 1; i >= 0; i--) {
  if (currentSegments[i] === '[') {
    lastOpenBracketIndex = i;
    break;
  } else if (currentSegments[i] === ']') {
    break; 
  }
}

if (lastOpenBracketIndex !== -1) {
   const textInside = currentSegments.slice(lastOpenBracketIndex + 1, currentIndexRef.current).join('').toLowerCase();
   const prefixes = [
      "pesquisou na web", "calculando", "verificando",
      "código 100% verificado", "corrigindo erro",
      "sandbox de depuração", "criando skill", "editando skill",
      "excluindo skill", "criou skill", "editou skill", "excluiu skill",
      "nova tarefa", "tarefa removida", "passo concluído"
   ];
   const isAgentic = prefixes.some(p => p.startsWith(textInside) || textInside.startsWith(p));
   console.log({isAgentic, textInside});
   
   if (isAgentic) {
      let foundClosing = false;
      let closingIndex = -1;
      for (let i = lastOpenBracketIndex; i < currentTotalLen; i++) {
        if (currentSegments[i] === ']') {
          closingIndex = i + 1;
          foundClosing = true;
          break;
        }
      }

      if (foundClosing) {
         currentIndexRef.current = Math.max(currentIndexRef.current, closingIndex);
      } else {
         currentIndexRef.current = lastOpenBracketIndex;
      }
   }
}
console.log(currentIndexRef.current);

// Now test with full bracket
currentSegments = "[corrigindo erro detectado no código]".split("");
currentIndexRef.current = currentSegments.length - 1; // Before the ] is emitted
currentTotalLen = currentSegments.length;

// Loop simulating frame by frame
for (let frameIdx = 1; frameIdx <= currentTotalLen; frameIdx++) {
    currentIndexRef.current = frameIdx;
    
    lastOpenBracketIndex = -1;
    for (let i = currentIndexRef.current - 1; i >= 0; i--) {
      if (currentSegments[i] === '[') {
        lastOpenBracketIndex = i;
        break;
      } else if (currentSegments[i] === ']') {
        break; 
      }
    }

    if (lastOpenBracketIndex !== -1) {
       const textInside = currentSegments.slice(lastOpenBracketIndex + 1, currentIndexRef.current).join('').toLowerCase();
       const prefixes = [
          "pesquisou na web", "calculando", "verificando",
          "código 100% verificado", "corrigindo erro",
          "sandbox de depuração", "criando skill", "editando skill",
          "excluindo skill", "criou skill", "editou skill", "excluiu skill",
          "nova tarefa", "tarefa removida", "passo concluído"
       ];
       const isAgentic = prefixes.some(p => p.startsWith(textInside) || textInside.startsWith(p));
       
       if (isAgentic) {
          let foundClosing = false;
          let closingIndex = -1;
          for (let i = lastOpenBracketIndex; i < currentTotalLen; i++) {
            if (currentSegments[i] === ']') {
              closingIndex = i + 1;
              foundClosing = true;
              break;
            }
          }

          if (foundClosing) {
             currentIndexRef.current = Math.max(currentIndexRef.current, closingIndex);
          } else {
             currentIndexRef.current = lastOpenBracketIndex;
          }
       }
    }
    
    console.log(`Frame ${frameIdx}: ${currentSegments.slice(0, currentIndexRef.current).join("")}`);
}
