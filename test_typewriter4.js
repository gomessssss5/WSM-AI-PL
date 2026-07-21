let currentSegments = "Eu comi [corrigindo erro detectado no código]".split("");
let currentIndexRef = { current: 0 };
let charsPerMs = 1; // 1 char per tick

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
       // Look at the FULL available stream for checking if it's agentic
       const textInsideFullStream = stream.slice(lastOpenBracketIndex + 1).join('').toLowerCase();
       const prefixes = [
          "pesquisou na web", "calculando", "verificando",
          "código 100% verificado", "corrigindo erro",
          "sandbox de depuração", "criando skill", "editando skill",
          "excluindo skill", "criou skill", "editou skill", "excluiu skill",
          "nova tarefa", "tarefa removida", "passo concluído"
       ];
       const isAgentic = prefixes.some(p => p.startsWith(textInsideFullStream) || textInsideFullStream.startsWith(p));
       
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
