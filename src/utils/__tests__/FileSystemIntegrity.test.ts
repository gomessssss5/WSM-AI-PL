import { describe, it, expect } from 'vitest';
import { computeSha256, computeSha256Bytes, buildDocumentValidation, extractWsmDoc } from '../docParser';
import { terminalSandbox } from '../../lib/terminalSandbox';
import crypto from 'crypto';

describe('Integridade de Sistema de Arquivos e Metadados (Single Source of Truth)', () => {
  // 1. Conteúdo Vazio
  describe('Caso 1: Arquivo Vazio (0 bytes)', () => {
    it('deve calcular exatamente 0 bytes e o hash SHA-256 canônico para arquivo vazio', () => {
      const emptyContent = '';
      const emptyBytes = new Uint8Array(0);
      const expectedSha256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

      // Validação do hash
      expect(computeSha256(emptyContent)).toBe(expectedSha256);
      expect(computeSha256Bytes(emptyBytes)).toBe(expectedSha256);

      // Validação do documento
      const val = buildDocumentValidation('empty.txt', 'txt', emptyContent);
      expect(val.sizeBytes).toBe(0);
      expect(val.hash).toBe(expectedSha256);

      // Sandbox filesystem
      terminalSandbox.writeFile('/workspace/empty.txt', emptyContent);
      const stats = terminalSandbox.getFileStats('empty.txt');
      expect(stats.exists).toBe(true);
      expect(stats.size).toBe(0);
      expect(stats.sha256).toBe(expectedSha256);

      // docParser com interceptação do sandbox
      const { docObjs } = extractWsmDoc('<wsm_doc title="empty.txt" format="txt"></wsm_doc>');
      expect(docObjs.length).toBe(1);
      expect(docObjs[0].size).toBe(0);
      expect(docObjs[0].hash).toBe(expectedSha256);
    });
  });

  // 2. Nova Linha Final (e.g. 21 bytes sem \n vs 22 bytes com \n)
  describe('Caso 2: Arquivo com Nova Linha Final (Consistência 21 B vs 22 B)', () => {
    it('deve preservar a nova linha final e calcular tamanho e hash exatos sem discrepância', () => {
      // 21 caracteres sem \n
      const baseText = 'omnix_regression_test';
      expect(Buffer.byteLength(baseText, 'utf8')).toBe(21);

      // 22 bytes com trailing \n gerado pelo comando echo ou terminal
      const textWithNewline = 'omnix_regression_test\n';
      expect(Buffer.byteLength(textWithNewline, 'utf8')).toBe(22);

      const nodeSha256_22 = crypto.createHash('sha256').update(Buffer.from(textWithNewline, 'utf8')).digest('hex');
      const docSha256_22 = computeSha256(textWithNewline);
      expect(docSha256_22).toBe(nodeSha256_22);

      // Gravação no sandbox
      terminalSandbox.writeFile('/workspace/omnix_regression.txt', textWithNewline);
      const stats = terminalSandbox.getFileStats('omnix_regression.txt');
      expect(stats.size).toBe(22);
      expect(stats.sha256).toBe(nodeSha256_22);

      // Extração de tags do terminal e documento
      const tagText = 'Arquivo criado.\n<wsm_terminal_file action="write" path="omnix_regression.txt" size="22" hash="' + nodeSha256_22 + '" />\n<wsm_doc title="omnix_regression.txt" format="txt">' + textWithNewline + '</wsm_doc>';
      const { docObjs } = extractWsmDoc(tagText);

      expect(docObjs.length).toBe(1);
      // O tamanho reportado no cartão DEVE ser exatamente 22 (não 21)
      expect(docObjs[0].size).toBe(22);
      expect(docObjs[0].validation?.sizeBytes).toBe(22);
      expect(docObjs[0].hash).toBe(nodeSha256_22);
      expect(docObjs[0].validation?.hash).toBe(nodeSha256_22);
    });

    it('comando echo do terminal sandbox deve produzir trailing newline por padrão e suportar -n', async () => {
      // Executa echo sem -n
      await terminalSandbox.spawn('echo "hello world" > /workspace/hello.txt');
      const statsHello = terminalSandbox.getFileStats('/workspace/hello.txt');
      expect(statsHello.content).toBe('hello world\n');
      expect(statsHello.size).toBe(12); // 11 chars + '\n' = 12 bytes

      // Executa echo com -n (sem newline)
      await terminalSandbox.spawn('echo -n "hello world" > /workspace/hello_no_nl.txt');
      const statsNoNl = terminalSandbox.getFileStats('/workspace/hello_no_nl.txt');
      expect(statsNoNl.content).toBe('hello world');
      expect(statsNoNl.size).toBe(11); // exatamente 11 chars
    });
  });

  // 3. Arquivos Binários
  describe('Caso 3: Arquivos Binários e Buffers Arbitrários', () => {
    it('deve calcular tamanho em bytes e hash SHA-256 idêntico ao Node crypto para buffers binários', () => {
      // Buffer arbitrário com bytes não-ASCII / binários
      const binaryData = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG magic header
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89
      ]);

      const expectedSize = binaryData.length;
      expect(expectedSize).toBe(33);

      const expectedHash = crypto.createHash('sha256').update(Buffer.from(binaryData)).digest('hex');
      const actualHash = computeSha256Bytes(binaryData);

      expect(actualHash).toBe(expectedHash);
    });

    it('deve calcular corretamente para bytes aleatórios de alta entropia', () => {
      const randomBytes = crypto.randomBytes(1024);
      const uint8 = new Uint8Array(randomBytes);

      const nodeHash = crypto.createHash('sha256').update(randomBytes).digest('hex');
      const customHash = computeSha256Bytes(uint8);

      expect(customHash).toBe(nodeHash);
    });
  });
});
