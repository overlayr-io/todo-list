// Minimal OpenGraph / HTML metadata fetcher (no external deps).
// Returns { title, description, image } best-effort; never throws.

function pickMeta(html, ...names) {
  for (const name of names) {
    // property="og:title" content="..."  OR  content="..." property="og:title"
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`,
      'i'
    );
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`,
      'i'
    );
    const m = html.match(re1) || html.match(re2);
    if (m) return decodeEntities(m[1].trim());
  }
  return null;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

export async function fetchLinkMetadata(url) {
  const result = { title: null, description: null, image: null };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'ObjectifsBot/1.0 (+link-preview)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    const type = res.headers.get('content-type') || '';
    if (!type.includes('text/html')) return result;

    const html = (await res.text()).slice(0, 500_000);
    result.title =
      pickMeta(html, 'og:title', 'twitter:title') ||
      (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? null);
    result.description = pickMeta(html, 'og:description', 'twitter:description', 'description');
    result.image = pickMeta(html, 'og:image', 'twitter:image');
    if (result.title) result.title = decodeEntities(result.title);
  } catch {
    // network error / timeout / invalid URL → return empty metadata
  }
  return result;
}
