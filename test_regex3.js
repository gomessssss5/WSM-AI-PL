const slicedTextForCheck = "Aqui está o [corrigindo erro det";

const openBracketIdx = slicedTextForCheck.lastIndexOf('[');
if (openBracketIdx !== -1) {
  const closeBracketIdx = slicedTextForCheck.indexOf(']', openBracketIdx);
  if (closeBracketIdx === -1) {
    const textInside = slicedTextForCheck.slice(openBracketIdx + 1).toLowerCase();
    const prefixes = [
      "pesquisou na web", "calculando", "verificando",
      "código 100% verificado", "corrigindo erro",
      "sandbox de depuração", "criando skill", "editando skill",
      "excluindo skill", "criou skill", "editou skill", "excluiu skill",
      "nova tarefa", "tarefa removida", "passo concluído"
    ];
    // Check if textInside is a prefix of any of the prefixes, or if any prefix is a prefix of textInside
    const isAgentic = prefixes.some(p => p.startsWith(textInside) || textInside.startsWith(p));
    console.log({isAgentic, textInside});
  }
}
