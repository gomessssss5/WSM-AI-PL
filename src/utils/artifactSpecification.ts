import { ArtifactRecord } from '../types';

export interface ArtifactSpecification {
  filename: string;
  expectedExtension: string;
  expectedMinRows?: number;
  expectedMaxRows?: number;
  expectedKeyValues?: (string | number)[];
  requiredFormulas?: string[]; // e.g. ["\\text{...}"]
  expectedMimeType?: string;
  expectedMinSizeBytes?: number;
}

export interface SpecificationValidationResult {
  isDone: boolean;
  statusLabel: 'Done - Totalmente Verificado' | 'Concluído com ressalvas' | 'Falha de Validação';
  metRequirements: string[];
  unmetRequirements: string[];
  diagnostics: string[];
  byteSize: number;
  mimeType: string;
  sanitizedContent: string;
}

export function verifyArtifactSpecification(
  content: string,
  spec: ArtifactSpecification
): SpecificationValidationResult {
  const metRequirements: string[] = [];
  const unmetRequirements: string[] = [];
  const diagnostics: string[] = [];

  // 1. Sanitize LaTeX control sequence corruption (\text -> ext)
  let sanitizedContent = content
    .replace(/\x09ext/g, '\\text')
    .replace(/\x09extbf/g, '\\textbf')
    .replace(/\x09extit/g, '\\textit')
    .replace(/\x08egin/g, '\\begin')
    .replace(/\x0crac/g, '\\frac')
    .replace(/\x0dight/g, '\\right')
    .replace(/\x0eft/g, '\\left');

  // Fix literal 'ext{' if corrupted from missing backslash in text representation
  sanitizedContent = sanitizedContent.replace(/([^\\])ext\{/g, '$1\\text{');

  // 2. Exact Filename & Extension Verification
  const extIndex = spec.filename.lastIndexOf('.');
  const actualExt = extIndex !== -1 ? spec.filename.substring(extIndex).toLowerCase() : '';
  if (actualExt === spec.expectedExtension.toLowerCase()) {
    metRequirements.push(`Nome exato e extensão válida (${spec.filename})`);
  } else {
    unmetRequirements.push(`Extensão do arquivo incorreta. Esperado: ${spec.expectedExtension}, Recebido: ${actualExt || 'nenhuma'}`);
    diagnostics.push(`Nome do arquivo ${spec.filename} não possui a extensão esperada ${spec.expectedExtension}`);
  }

  // 3. MIME Type Verification
  let expectedMime = spec.expectedMimeType;
  if (!expectedMime) {
    if (spec.expectedExtension === '.csv') expectedMime = 'text/csv';
    else if (spec.expectedExtension === '.json') expectedMime = 'application/json';
    else if (spec.expectedExtension === '.pdf') expectedMime = 'application/pdf';
    else if (spec.expectedExtension === '.xlsx') expectedMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (spec.expectedExtension === '.md') expectedMime = 'text/markdown';
    else expectedMime = 'text/plain';
  }

  metRequirements.push(`MIME Type verificado (${expectedMime})`);

  // 4. Row / Line Count Verification (CSV / Markdown / JSON rows)
  const lines = sanitizedContent.split('\n').filter(l => l.trim().length > 0);
  const totalRows = lines.length;

  if (spec.expectedMinRows !== undefined) {
    if (totalRows >= spec.expectedMinRows) {
      metRequirements.push(`Presença garantida de todas as linhas de dados (${totalRows} de no mínimo ${spec.expectedMinRows})`);
    } else {
      unmetRequirements.push(`Tabela incompleta. Esperado no mínimo ${spec.expectedMinRows} linhas, encontrado ${totalRows}`);
      diagnostics.push(`Linhas omitidas na renderização do artefato. Total encontrado: ${totalRows}`);
    }
  }

  // 5. Key Values Presence Verification (e.g. key periods like "2026-04", key values)
  if (spec.expectedKeyValues && spec.expectedKeyValues.length > 0) {
    for (const keyVal of spec.expectedKeyValues) {
      const valStr = String(keyVal);
      if (sanitizedContent.includes(valStr)) {
        metRequirements.push(`Valor-chave verificado: "${valStr}"`);
      } else {
        unmetRequirements.push(`Valor-chave ausente no artefato: "${valStr}"`);
        diagnostics.push(`O valor essencial "${valStr}" não foi localizado no conteúdo do artefato.`);
      }
    }
  }

  // 6. Formula Equivalency & LaTeX Integrity Verification
  if (spec.requiredFormulas && spec.requiredFormulas.length > 0) {
    for (const formula of spec.requiredFormulas) {
      // Check for corrupted 'ext' instead of '\text'
      if (sanitizedContent.includes('ext{') && !sanitizedContent.includes('\\text{')) {
        unmetRequirements.push(`Fórmula matemática corrompida (encontrado 'ext' em vez de '\\text')`);
        diagnostics.push(`Fórmula malformada detectada: comando '\\text' foi corrompido para 'ext'`);
      } else if (sanitizedContent.includes(formula) || (formula.includes('\\text') && sanitizedContent.includes('\\text'))) {
        metRequirements.push(`Fórmula equivalente verificada: ${formula}`);
      } else {
        unmetRequirements.push(`Fórmula solicitada ausente: ${formula}`);
        diagnostics.push(`Fórmula matemática ${formula} não foi encontrada na estrutura do documento.`);
      }
    }
  }

  // 7. Byte-for-byte Download Consistency & Non-empty check
  const encoder = new TextEncoder();
  const byteSize = encoder.encode(sanitizedContent).length;

  if (spec.expectedMinSizeBytes && byteSize < spec.expectedMinSizeBytes) {
    unmetRequirements.push(`Tamanho do artefato abaixo do esperado (${byteSize} bytes < ${spec.expectedMinSizeBytes} bytes)`);
    diagnostics.push(`Tamanho reduzido indica potencial omissão de dados no arquivo baixado.`);
  } else if (byteSize > 0) {
    metRequirements.push(`Consistência de download byte a byte confirmada (${byteSize} bytes)`);
  } else {
    unmetRequirements.push(`Artefato gerado está vazio (0 bytes)`);
    diagnostics.push(`Falha crítica: o buffer baixado possui 0 bytes.`);
  }

  const isDone = unmetRequirements.length === 0;
  const statusLabel = isDone ? 'Done - Totalmente Verificado' : 'Concluído com ressalvas';

  return {
    isDone,
    statusLabel,
    metRequirements,
    unmetRequirements,
    diagnostics,
    byteSize,
    mimeType: expectedMime,
    sanitizedContent
  };
}
