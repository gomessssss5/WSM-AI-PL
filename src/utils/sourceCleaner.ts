export interface RawSource {
  title: string;
  url: string;
  snippet?: string;
  hostname?: string;
  relevanceScore?: number;
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
      'offset', 'limit', 'share', 'm', 's'
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
 * Checks whether a URL or source item represents a generic category, tag, feed, archive, or non-article page.
 */
export function isGenericOrInvalidSource(urlStr: string, title?: string, snippet?: string): boolean {
  if (!urlStr) return true;
  const lowerUrl = urlStr.toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  const lowerSnippet = (snippet || '').toLowerCase();

  // 1. RSS / Feeds / XML / Sitemaps
  if (
    lowerUrl.endsWith('/feed') || lowerUrl.endsWith('/rss') || 
    lowerUrl.endsWith('/feed/') || lowerUrl.endsWith('/rss/') ||
    lowerUrl.includes('/feed/') || lowerUrl.includes('/rss/') ||
    lowerUrl.endsWith('.xml') || lowerUrl.includes('sitemap')
  ) {
    return true;
  }

  // 2. Generic archive, category, tag, search, or pagination patterns
  const genericUrlPatterns = [
    /\/tag\//i, /\/tags\//i, /\/tag-/i,
    /\/category\//i, /\/categories\//i, /\/categoria\//i, /\/categorias\//i,
    /\/topic\//i, /\/topics\//i, /\/topico\//i, /\/topicos\//i,
    /\/archive\//i, /\/archives\//i, /\/arquivo\//i, /\/arquivos\//i,
    /\/secao\//i, /\/secoes\//i, /\/section\//i,
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

  // 3. Generic page titles
  const genericTitles = [
    'página', 'page', 'tag', 'categoria', 'category', 'arquivo', 'archive',
    'feed', 'rss', 'verificação', 'ocr', 'busca', 'search', 'home', 'index',
    'notícias de', 'artigos sobre', 'resultado da busca', 'tags'
  ];
  if (genericTitles.some(t => lowerTitle === t || lowerTitle.startsWith(`${t}:`) || lowerTitle.startsWith(`${t} `) || lowerTitle.endsWith(` - ${t}`))) {
    return true;
  }

  // 4. Must have a specific path (not root domain landing page like https://site.com)
  try {
    const urlObj = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    const path = urlObj.pathname.replace(/\/$/, '');
    if (!path || path === '' || path === '/') {
      return true; // Root domain homepages are generic landing pages, not specific news articles
    }
  } catch {
    return true;
  }

  // 5. 404 / Error / Empty snippets
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
export function cleanAndDeduplicateSources<T extends { title: string; url: string; snippet?: string }>(
  rawSources: T[],
  userQuery?: string,
  maxResults: number = 15
): T[] {
  if (!Array.isArray(rawSources) || rawSources.length === 0) return [];

  const seenCanonicalUrls = new Set<string>();
  const processedSources: { source: T; canonicalUrl: string; score: number }[] = [];

  const isNewsQuery = userQuery ? /notícia|noticia|jornal|manchete|artigo|hoje|futebol|governo|eleição|economia|mundo/i.test(userQuery) : false;

  for (const src of rawSources) {
    if (!src || !src.url) continue;

    // 1. Get canonical URL
    const canonical = normalizeCanonicalUrl(src.url);
    if (!canonical) continue;

    // 2. Check deduplication
    if (seenCanonicalUrls.has(canonical)) continue;

    // 3. Check if generic/invalid
    if (isGenericOrInvalidSource(canonical, src.title, src.snippet)) continue;

    // 4. If news query, reject Wikipedia or generic encyclopedia pages
    if (isNewsQuery && (canonical.includes('wikipedia.org') || (src.title && src.title.includes('Wikipédia')))) {
      continue;
    }

    // 5. Calculate relevance score if userQuery provided
    let score = 1;
    if (userQuery) {
      score = calculateSourceRelevance(userQuery, src.title, src.snippet, canonical);
      // Filter out off-topic sources (if query has strong keywords and score is 0)
      if (score === 0 && userQuery.split(' ').length > 3) {
        continue;
      }
    }

    seenCanonicalUrls.add(canonical);
    processedSources.push({
      source: {
        ...src,
        url: canonical // Use clean canonical URL!
      },
      canonicalUrl: canonical,
      score
    });
  }

  // Sort by relevance score descending
  processedSources.sort((a, b) => b.score - a.score);

  return processedSources.slice(0, maxResults).map(p => p.source);
}
