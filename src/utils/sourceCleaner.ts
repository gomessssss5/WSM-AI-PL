export interface RawSource {
  title: string;
  url: string;
  url_final?: string;
  source?: string;
  published_at?: string | null;
  snippet?: string;
  hostname?: string;
  relevanceScore?: number;
  verifiedDate?: string | null;
}

const SOCIAL_MEDIA_DOMAINS = [
  'instagram.com', 'instagram.com.br',
  'facebook.com', 'fb.com',
  'twitter.com', 'x.com',
  'tiktok.com',
  'threads.net', 'threads.com',
  'linkedin.com',
  'pinterest.com', 'pinterest.pt',
  'youtube.com', 'youtu.be',
  'vimeo.com',
  'snapchat.com',
  'reddit.com'
];

/**
 * Extracts negative constraints / forbidden terms from user query.
 */
export function extractForbiddenKeywords(userQuery?: string): string[] {
  if (!userQuery) return [];
  const lower = userQuery.toLowerCase();
  const forbidden: string[] = [];

  // Match phrases like "proíba instagram", "sem instagram", "não use instagram", "bloqueie instagram"
  const regex = /(?:proíba|proibir|sem|não\s+use|não\s+inclua|bloqueie|evite)\s+([\w\.\-]+)/gi;
  let match;
  while ((match = regex.exec(lower)) !== null) {
    if (match[1] && match[1].length > 2) {
      forbidden.push(match[1].toLowerCase());
    }
  }

  if (/instagram/i.test(lower) && /(?:proíba|proibir|sem|não|bloqueie)/i.test(lower)) {
    forbidden.push('instagram');
  }
  if (/feed/i.test(lower) && /(?:proíba|proibir|sem|não|bloqueie)/i.test(lower)) {
    forbidden.push('feed', 'rss');
  }
  if (/categoria/i.test(lower) && /(?:proíba|proibir|sem|não|bloqueie)/i.test(lower)) {
    forbidden.push('category', 'categoria', 'tag', 'secao', 'noticias-sobre');
  }

  return Array.from(new Set(forbidden));
}

/**
 * Extracts a friendly source/publisher name from a hostname or title.
 */
export function extractSourceName(hostnameOrUrl: string, title?: string): string {
  if (title) {
    const titleMatch = title.match(/[\-\|–—]\s*([A-Za-z0-9\s\.À-ÿ]+)$/);
    if (titleMatch && titleMatch[1] && titleMatch[1].trim().length > 1 && titleMatch[1].trim().length < 30) {
      return titleMatch[1].trim();
    }
  }

  try {
    const parsed = new URL(hostnameOrUrl.startsWith('http') ? hostnameOrUrl : `https://${hostnameOrUrl}`);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();

    const knownSources: Record<string, string> = {
      'exame.com': 'Exame',
      'veja.abril.com.br': 'Veja',
      'g1.globo.com': 'G1',
      'globo.com': 'Globo',
      'folha.uol.com.br': 'Folha de S.Paulo',
      'uol.com.br': 'UOL',
      'estadao.com.br': 'Estadão',
      'cnnbrasil.com.br': 'CNN Brasil',
      'bbc.com': 'BBC News',
      'techtudo.com.br': 'TechTudo',
      'canaltech.com.br': 'Canaltech',
      'olhardigital.com.br': 'Olhar Digital',
      'infomoney.com.br': 'InfoMoney',
      'valor.globo.com': 'Valor Econômico',
      'iabrasilnoticias.com.br': 'IA Brasil Notícias',
      'techcrunch.com': 'TechCrunch',
      'theverge.com': 'The Verge',
      'reuters.com': 'Reuters',
      'bloomberg.com': 'Bloomberg'
    };

    for (const [domain, name] of Object.entries(knownSources)) {
      if (host === domain || host.endsWith('.' + domain)) {
        return name;
      }
    }

    const parts = host.split('.');
    if (parts.length > 0) {
      const main = parts[0] === 'noticias' || parts[0] === 'news' ? (parts[1] || parts[0]) : parts[0];
      return main.charAt(0).toUpperCase() + main.slice(1);
    }
    return host;
  } catch {
    return hostnameOrUrl;
  }
}

/**
 * Normalizes a URL to its canonical form for strict deduplication.
 */
export function normalizeCanonicalUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    let urlStr = rawUrl.trim();
    if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
      urlStr = 'https://' + urlStr;
    }
    const urlObj = new URL(urlStr);

    // Protocol normalization
    urlObj.protocol = 'https:';

    // Lowercase hostname and strip www
    let hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    urlObj.hostname = hostname;

    // Tracking query parameters to strip
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'gclid', 'fbclid', 'ref', 'source', 'amp', '_ga', 'ncid', 'page', 'p',
      'offset', 'limit', 'share', 'm', 's', 'fb_action_ids', 'fb_action_types'
    ];
    trackingParams.forEach(p => urlObj.searchParams.delete(p));

    // Path normalization
    let pathname = urlObj.pathname;

    // Strip trailing slashes
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Strip generic pagination paths like /page/2, /page/3, /p/2
    pathname = pathname.replace(/\/page\/\d+/i, '').replace(/\/p\/\d+/i, '');

    urlObj.pathname = pathname || '/';

    const searchStr = urlObj.searchParams.toString();
    return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}${searchStr ? '?' + searchStr : ''}`;
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/$/, '');
  }
}

/**
 * Extracts publication date from URL path or snippet text if available.
 */
export function extractDateFromUrlAndSnippet(urlStr: string, snippet?: string, title?: string): { dateISO: string | null; formattedDate: string | null } {
  // 1. Check URL path
  try {
    const urlObj = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    const pathname = urlObj.pathname;

    // Pattern YYYY/MM/DD
    const pathMatchYMD = pathname.match(/\/(20\d{2})[\/\.-](0[1-9]|1[0-2])[\/\.-](0[1-9]|[12]\d|3[01])\b/);
    if (pathMatchYMD) {
      const [, y, m, d] = pathMatchYMD;
      return { dateISO: `${y}-${m}-${d}`, formattedDate: `${d}/${m}/${y}` };
    }

    // Pattern YYYYMMDD
    const pathMatchYMDCompact = pathname.match(/\/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/);
    if (pathMatchYMDCompact) {
      const [, y, m, d] = pathMatchYMDCompact;
      return { dateISO: `${y}-${m}-${d}`, formattedDate: `${d}/${m}/${y}` };
    }
  } catch {}

  // 2. Check snippet / title
  const text = `${title || ''} ${snippet || ''}`;
  const textMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[\/\.-](0[1-9]|1[0-2])[\/\.-](20\d{2})\b/);
  if (textMatch) {
    const [, d, m, y] = textMatch;
    return { dateISO: `${y}-${m}-${d}`, formattedDate: `${d}/${m}/${y}` };
  }

  const textMatchPt = text.match(/\b(0[1-9]|[12]\d|3[01])\s+de\s+(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+(20\d{2})\b/i);
  if (textMatchPt) {
    const [, d, monthName, y] = textMatchPt;
    const months: Record<string, string> = {
      janeiro: '01', fevereiro: '02', março: '03', marco: '03', abril: '04',
      maio: '05', junho: '06', julho: '07', agosto: '08', setembro: '09',
      outubro: '10', novembro: '11', dezembro: '12'
    };
    const m = months[monthName.toLowerCase()] || '01';
    const paddedD = d.padStart(2, '0');
    return { dateISO: `${y}-${m}-${paddedD}`, formattedDate: `${d.padStart(2, '0')}/${m}/${y}` };
  }

  return { dateISO: null, formattedDate: null };
}

/**
 * Checks whether a URL or source item represents a generic category, tag, feed, archive, social media, or non-article page.
 */
export function isGenericOrInvalidSource(urlStr: string, title?: string, snippet?: string, userQuery?: string): boolean {
  if (!urlStr) return true;
  const lowerUrl = urlStr.toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  const lowerSnippet = (snippet || '').toLowerCase();

  // 1. Social Media Networks (Reject all social network URLs for web article searches)
  if (SOCIAL_MEDIA_DOMAINS.some(domain => lowerUrl.includes(domain))) {
    return true;
  }

  // 2. Explicit User Negative Constraints (e.g., "proíba instagram", "sem feeds", "sem categorias")
  const forbiddenKeywords = extractForbiddenKeywords(userQuery);
  for (const kw of forbiddenKeywords) {
    if (lowerUrl.includes(kw) || lowerTitle.includes(kw)) {
      return true;
    }
  }

  // 3. RSS / Feeds / XML / Sitemaps
  if (
    lowerUrl.endsWith('/feed') || lowerUrl.endsWith('/rss') || 
    lowerUrl.endsWith('/feed/') || lowerUrl.endsWith('/rss/') ||
    lowerUrl.includes('/feed/') || lowerUrl.includes('/rss/') ||
    lowerUrl.endsWith('.xml') || lowerUrl.includes('sitemap')
  ) {
    return true;
  }

  // 4. Generic archive, category, tag, search, or pagination patterns
  const genericUrlPatterns = [
    /\/tag\//i, /\/tags\//i, /\/tag-/i,
    /\/category\//i, /\/categories\//i, /\/categoria\//i, /\/categorias\//i,
    /\/topic\//i, /\/topics\//i, /\/topico\//i, /\/topicos\//i,
    /\/noticias-sobre\//i, /\/noticias-de\//i, /\/noticias_sobre\//i,
    /\/materias-sobre\//i, /\/tudo-sobre\//i, /\/assunto\//i, /\/temas?\//i,
    /\/canal\//i, /\/editoria\//i, /\/secao\//i, /\/secoes\//i, /\/section\//i,
    /\/archive\//i, /\/archives\//i, /\/arquivo\//i, /\/arquivos\//i,
    /\/page\/\d+/i, /\/p\/\d+/i,
    /\/search/i, /\/busca/i, /\/pesquisa/i,
    /\/label\//i, /\/author\//i, /\/autor\//i,
    /\/login/i, /\/register/i, /\/cadastre/i,
    /\/privacy/i, /\/terms/i, /\/termos/i,
    /\/verificacao/i, /\/ocr/i, /\/identity/i, /\/identidade/i
  ];

  if (genericUrlPatterns.some(p => p.test(lowerUrl))) {
    return true;
  }

  // 5. Generic page titles
  const genericTitles = [
    'página', 'page', 'tag', 'categoria', 'category', 'arquivo', 'archive',
    'feed', 'rss', 'verificação', 'ocr', 'busca', 'search', 'home', 'index',
    'notícias de', 'artigos sobre', 'resultado da busca', 'tags', 'notícias sobre'
  ];
  if (genericTitles.some(t => lowerTitle === t || lowerTitle.startsWith(`${t}:`) || lowerTitle.startsWith(`${t} `) || lowerTitle.endsWith(` - ${t}`))) {
    return true;
  }

  // 6. Must be a specific article page (not root domain or category hub landing page like sapo.pt or exame.com/inteligencia-artificial)
  try {
    const urlObj = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    const path = urlObj.pathname.replace(/\/$/, '');
    if (!path || path === '' || path === '/') {
      return true; // Root domain homepages are generic landing pages (e.g. https://iabrasilnoticias.com.br)
    }

    const cleanPathLower = path.toLowerCase();
    const genericSections = [
      '/noticias', '/noticia', '/ultimas-noticias', '/home',
      '/esporte', '/esportes', '/politica', '/economia', '/mundo', '/brasil',
      '/tech', '/tecnologia', '/pop', '/famosos', '/blogs', '/opiniao', '/colunas',
      '/feed', '/rss', '/xml', '/tags', '/tag', '/category', '/categorias',
      '/inteligencia-artificial', '/ia', '/mercados', '/negocios'
    ];
    if (genericSections.includes(cleanPathLower)) {
      return true; // Category hub landing pages with no article slug/id
    }

    const segments = cleanPathLower.split('/').filter(Boolean);
    // If only 1 single segment without date, without number/id, and with <= 1 word/hyphen on major news portals, it's a category/topic page
    // e.g. exame.com/inteligencia-artificial or veja.abril.com.br/tecnologia
    if (segments.length === 1) {
      const seg = segments[0];
      const hyphenCount = (seg.match(/-/g) || []).length;
      const hasDigits = /\d/.test(seg);
      const hasFileExt = /\.(html|htm|shtml|phtml|php)$/i.test(seg);
      if (!hasDigits && !hasFileExt && hyphenCount < 2) {
        return true; // Single-segment category page like /inteligencia-artificial or /tecnologia
      }
    }
  } catch {
    return true;
  }

  // 7. 404 / Error / Empty snippets
  if (lowerSnippet.includes('404 not found') || lowerSnippet.includes('página não encontrada') || lowerSnippet.includes('access denied')) {
    return true;
  }

  return false;
}

/**
 * Calculates topic relevance score (0 to 1) based on query keywords matching source title & snippet.
 */
export function calculateSourceRelevance(query: string, title?: string, snippet?: string, url?: string): number {
  if (!query || typeof query !== 'string') return 1;

  // Extract meaningful query keywords (stop words removed)
  const stopWords = new Set([
    'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'por', 'para',
    'com', 'como', 'que', 'um', 'uma', 'os', 'as', 'sobre', 'noticias', 'notícia',
    'notícias', 'hoje', 'ultimas', 'últimas', '3', 'três', 'tres', 'fonte', 'fontes',
    'site', 'links', 'pesquise', 'me', 'diga', 'quais', 'são', 'quaisquer', 'pesquisa'
  ]);

  const queryTokens = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));

  if (queryTokens.length === 0) return 1;

  const sourceText = `${title || ''} ${snippet || ''} ${url || ''}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let matches = 0;
  queryTokens.forEach(token => {
    if (sourceText.includes(token)) {
      matches++;
    }
  });

  return matches / queryTokens.length;
}

/**
 * Clean, deduplicate, filter, and rank sources.
 */
export function cleanAndDeduplicateSources<T extends { title: string; url: string; url_final?: string; source?: string; published_at?: string | null; snippet?: string; hostname?: string; verifiedDate?: string | null }>(
  rawSources: T[],
  userQuery?: string,
  maxResults: number = 15
): T[] {
  if (!Array.isArray(rawSources) || rawSources.length === 0) return [];

  const seenCanonicalUrls = new Set<string>();
  const processedSources: { source: T; canonicalUrl: string; score: number }[] = [];

  const isNewsQuery = userQuery ? /notícia|noticia|jornal|manchete|artigo|hoje|futebol|governo|eleição|economia|mundo/i.test(userQuery) : false;

  // Check if user specifically requested a date (e.g. 18/08/2026) and forbade old news
  const userForbidsOldNews = userQuery ? /(?:proíba|sem|não)\s+(?:notícias\s+)?antigas?/i.test(userQuery) || /apenas\s+(?:de\s+)?18\/08\/2026/i.test(userQuery) : false;
  
  let targetDateISO: string | null = null;
  if (userQuery) {
    const dateMatch = userQuery.match(/\b(0[1-9]|[12]\d|3[01])[\/\.-](0[1-9]|1[0-2])[\/\.-](20\d{2})\b/);
    if (dateMatch) {
      targetDateISO = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
    }
  }

  for (const src of rawSources) {
    if (!src || !src.url) continue;

    // 1. Get canonical URL
    const rawTarget = src.url_final || src.url;
    const canonical = normalizeCanonicalUrl(rawTarget);
    if (!canonical) continue;

    // 2. Check deduplication
    if (seenCanonicalUrls.has(canonical)) continue;

    // 3. Check if generic/invalid or forbidden
    if (isGenericOrInvalidSource(canonical, src.title, src.snippet, userQuery)) continue;

    // 4. If news query, reject Wikipedia or generic encyclopedia pages
    if (isNewsQuery && (canonical.includes('wikipedia.org') || (src.title && src.title.includes('Wikipédia')))) {
      continue;
    }

    // 5. Date validation
    const { dateISO, formattedDate } = extractDateFromUrlAndSnippet(canonical, src.snippet, src.title);

    // If user asked for specific date and forbade old news, filter out explicit older URL dates
    if (userForbidsOldNews && targetDateISO && dateISO && dateISO < targetDateISO) {
      console.log(`[SourceCleaner] Filtering out older source (${dateISO} < ${targetDateISO}) for URL: ${canonical}`);
      continue;
    }

    // 6. Calculate relevance score if userQuery provided
    let score = 1;
    if (userQuery) {
      score = calculateSourceRelevance(userQuery, src.title, src.snippet, canonical);
      // Boost score if publication date matches requested date
      if (targetDateISO && dateISO === targetDateISO) {
        score += 0.5;
      }
      // Filter out off-topic sources (if query has strong keywords and score is 0)
      if (score === 0 && userQuery.split(' ').length > 3) {
        continue;
      }
    }

    let host = src.hostname || '';
    try {
      host = new URL(canonical).hostname.replace(/^www\./, '');
    } catch {}

    const sourceName = src.source || extractSourceName(host, src.title);

    seenCanonicalUrls.add(canonical);
    processedSources.push({
      source: {
        ...src,
        url: canonical,
        url_final: canonical,
        source: sourceName,
        published_at: formattedDate || src.published_at || src.verifiedDate || null,
        hostname: host,
        verifiedDate: formattedDate || src.verifiedDate || null
      },
      canonicalUrl: canonical,
      score
    });
  }

  // Sort by relevance score descending
  processedSources.sort((a, b) => b.score - a.score);

  return processedSources.slice(0, maxResults).map(p => p.source);
}

