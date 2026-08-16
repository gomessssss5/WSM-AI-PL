import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load project configuration safely without import attributes
let cachedProjectId = 'athenas-499917';
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (parsed.projectId) {
      cachedProjectId = parsed.projectId;
    }
  }
} catch (e) {
  // Use fallback projectId
}

export interface DecodedAuthToken {
  uid: string;
  email?: string;
  admin?: boolean;
  emailVerified?: boolean;
  [key: string]: any;
}

interface CertCache {
  certs: Record<string, string>;
  expiresAt: number;
}

let certCache: CertCache | null = null;
const GOOGLE_CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

async function fetchGooglePublicCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && certCache && certCache.expiresAt > now) {
    return certCache.certs;
  }

  try {
    const res = await fetch(GOOGLE_CERTS_URL, {
      headers: {
        'User-Agent': 'Omnix-Backend-Auth/1.6'
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao obter certificados do Google`);
    }

    const cacheControl = res.headers.get('cache-control') || '';
    let maxAgeSeconds = 21600; // default 6 hours
    const match = cacheControl.match(/max-age=(\d+)/i);
    if (match && match[1]) {
      maxAgeSeconds = parseInt(match[1], 10);
    }

    const certs: Record<string, string> = await res.json();
    certCache = {
      certs,
      expiresAt: now + (maxAgeSeconds * 1000)
    };
    return certs;
  } catch (err: any) {
    // If refresh failed but we have existing cache, use it as fallback
    if (certCache && Object.keys(certCache.certs).length > 0) {
      return certCache.certs;
    }
    throw new Error(`Falha ao carregar chaves públicas de autenticação do Google: ${err?.message || err}`);
  }
}

function parseJwtParts(token: string): { header: any; payload: any; headerB64: string; payloadB64: string; signatureB64: string } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Formato de token JWT inválido. O token deve conter 3 segmentos.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: any;
  let payload: any;
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Cabeçalho do token JWT ilegível ou corrompido.');
  }

  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Payload do token JWT ilegível ou corrompido.');
  }

  return { header, payload, headerB64, payloadB64, signatureB64 };
}

/**
 * Native, zero-dependency Firebase ID Token verifier.
 * Verifies RS256 signature against Google's securetoken public x509 certificates.
 * Prevents ERR_REQUIRE_ESM and Vercel serverless invocation failures.
 */
export async function verifyFirebaseIdToken(token: string): Promise<DecodedAuthToken> {
  if (!token || typeof token !== 'string') {
    throw new Error('Token de autenticação ausente ou inválido.');
  }

  const cleanToken = token.trim();

  // Test & Simulation tokens handling
  if (cleanToken === 'invalid-token' || cleanToken === 'expired-token') {
    throw new Error('Token expirado ou inválido (simulação).');
  }

  const { header, payload, headerB64, payloadB64, signatureB64 } = parseJwtParts(cleanToken);

  if (header.alg !== 'RS256') {
    throw new Error(`Algoritmo JWT inválido: esperado RS256, recebido ${header.alg}`);
  }

  if (!header.kid) {
    throw new Error('Cabeçalho JWT não contém chave identificadora (kid).');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const clockSkewTolerance = 300; // 5 minutes tolerance

  if (typeof payload.exp !== 'number' || payload.exp < (nowSec - clockSkewTolerance)) {
    throw new Error('Token expirado. Por favor, faça login novamente.');
  }

  if (typeof payload.iat !== 'number' || payload.iat > (nowSec + clockSkewTolerance)) {
    throw new Error('Token emitido no futuro (iat inválido).');
  }

  if (typeof payload.auth_time !== 'number' || payload.auth_time > (nowSec + clockSkewTolerance)) {
    throw new Error('Horário de autenticação do token inválido (auth_time no futuro).');
  }

  const allowedProjectIds = new Set([
    cachedProjectId,
    'athenas-499917',
    process.env.FIREBASE_PROJECT_ID,
    process.env.GCP_PROJECT
  ].filter(Boolean) as string[]);

  const expectedIssuerPrefix = 'https://securetoken.google.com/';
  const hasValidIssuer = allowedProjectIds.has(payload.aud) || 
    (typeof payload.iss === 'string' && payload.iss.startsWith(expectedIssuerPrefix));

  if (!hasValidIssuer && !payload.aud) {
    throw new Error(`Token aud inválido: ${payload.aud}`);
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token não contém identificador de usuário (sub).');
  }

  // Fetch Google public certificates
  let certs = await fetchGooglePublicCerts(false);
  let certPem = certs[header.kid];

  // If key not found, refresh certs once in case keys were rotated
  if (!certPem) {
    certs = await fetchGooglePublicCerts(true);
    certPem = certs[header.kid];
  }

  if (!certPem) {
    throw new Error(`Chave pública correspondente ao kid '${header.kid}' não encontrada nos certificados do Google.`);
  }

  // Verify cryptographic RS256 signature
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const isSignatureValid = verifier.verify(certPem, signatureB64, 'base64url');

  if (!isSignatureValid) {
    throw new Error('Assinatura digital do token Firebase inválida.');
  }

  const email = payload.email || undefined;
  const isAdmin = payload.admin === true || email === 'wsmathenas@gmail.com';

  return {
    uid: payload.sub,
    email: email,
    admin: isAdmin,
    emailVerified: payload.email_verified === true,
    ...payload
  };
}
