let currentSegments = "Eu comi [uma maçã]".split("");
let currentIndexRef = { current: 0 };

for (let currentStreamLen = 1; currentStreamLen <= currentSegments.length; currentStreamLen++) {
    const stream = currentSegments.slice(0, currentStreamLen);
    const currentTotalLen = stream.length;
    currentIndexRef.current += 1;
    
    let lastOpenBracketIndex = -1;
    for (let i = currentIndexRef.current - 1; i >= 0; i--) {
      if (stream[i] === '[') {
        lastOpenBracketIndex = i;
        break;
      } else if (stream[i] === ']') {
        break; 
      }
    }

    if (lastOpenBracketIndex !== -1) {
       const textInside = stream.slice(lastOpenBracketIndex + 1, currentIndexRef.current).join('').toLowerCase();
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
            if (stream[i] === ']') {
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
    
    console.log(`Stream: ${stream.join("")} => Display: ${stream.slice(0, currentIndexRef.current).join("")}`);
}
