export interface BlocklistCheckResult {
  isBlocked: boolean;
  rule: string;
  blockedDomain: string;
  normalizedTarget: string;
  reason?: string;
}

export function normalizeDomain(raw: string): string {
  if (!raw) return "";
  let clean = raw.trim().toLowerCase();
  // Remove protocol
  clean = clean.replace(/^[a-z]+:\/\//i, "");
  // Remove credentials (user:pass@)
  clean = clean.replace(/^[^\/@]+@/, "");
  // Remove port
  clean = clean.replace(/:\d+.*$/, "");
  // Remove paths, query strings, hashes
  clean = clean.replace(/[\/\?#].*$/, "");
  // Remove leading/trailing dots
  clean = clean.replace(/^\.+|\.+$/g, "");
  // Remove leading www.
  if (clean.startsWith("www.")) {
    clean = clean.substring(4);
  }
  return clean;
}

export function parseBlocklist(blocklistStr?: string): string[] {
  const defaultBlocked = ["malicious-site.com", "untrusted-domain.org"];
  if (!blocklistStr) return defaultBlocked;

  const userList = blocklistStr
    .split(/[,;\n\s]+/)
    .map(normalizeDomain)
    .filter(Boolean);

  const combined = Array.from(new Set([...defaultBlocked, ...userList]));
  return combined;
}

export function isDomainBlocked(target: string, blocklistStr?: string): BlocklistCheckResult {
  if (!target || typeof target !== "string") {
    return { isBlocked: false, rule: "", blockedDomain: "", normalizedTarget: "" };
  }

  const blockedList = parseBlocklist(blocklistStr);
  const normalizedTarget = normalizeDomain(target);
  const lowerTarget = target.toLowerCase();

  for (const blocked of blockedList) {
    if (!blocked) continue;

    // 1. Direct domain match or subdomain match
    if (normalizedTarget === blocked || normalizedTarget.endsWith("." + blocked)) {
      return {
        isBlocked: true,
        rule: "domain_blocklist",
        blockedDomain: blocked,
        normalizedTarget,
        reason: `O domínio alvo "${normalizedTarget}" está na lista de bloqueio de segurança (${blocked}).`
      };
    }

    // 2. Target contains URL with blocked domain
    const domainRegex = new RegExp(`(?:https?:\\/\\/)?(?:[a-zA-Z0-9_-]+\\.)*${blocked.replace(/\./g, "\\.")}(?::\\d+)?(?:[\\/\\?#\\s]|$)`, "i");
    if (domainRegex.test(lowerTarget)) {
      return {
        isBlocked: true,
        rule: "domain_blocklist",
        blockedDomain: blocked,
        normalizedTarget,
        reason: `A consulta/URL faz referência ao domínio bloqueado "${blocked}".`
      };
    }

    // 3. Simple text query mentioning the exact blocked domain
    if (lowerTarget.includes(blocked)) {
      return {
        isBlocked: true,
        rule: "domain_blocklist",
        blockedDomain: blocked,
        normalizedTarget,
        reason: `A consulta faz referência direta ao domínio proibido "${blocked}".`
      };
    }
  }

  return { isBlocked: false, rule: "", blockedDomain: "", normalizedTarget };
}
