import { UrlPreview } from '../models/urlPreview.model.js';
import { safeFetchText, UnsafeUrlError } from '../utils/safeFetch.util.js';

export interface UrlMetadata {
  title?: string | undefined;
  description?: string | undefined;
  image?: string | undefined;
  url: string;
  siteName?: string | undefined;
  favIcon?: string | undefined;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class UrlPreviewService {
  /**
   * Fetches metadata for a given URL.
   * Checks database cache first, then fetches from the web if needed.
   */
  static async getMetadata(url: string): Promise<UrlMetadata> {
    try {
      // 1. Check Cache
      const cached = await UrlPreview.findOne({ url });
      if (cached) {
        return {
          url: cached.url,
          title: cached.title,
          description: cached.description,
          image: cached.image,
          siteName: cached.siteName,
          favIcon: cached.favIcon,
        };
      }

      // 2. Fetch through the SSRF-safe fetcher (public hosts only, capped size).
      const response = await safeFetchText(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PlatformLinkPreview/1.0)',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      if (response.status >= 400 || !response.body) {
        return { url };
      }
      const html = response.body;

      // Use final URL after redirects for accurate base resolution
      const finalUrl = response.finalUrl;
      const domain = new URL(finalUrl).origin;

      // Extract all meta and link tags for robust attribute parsing
      const metaTags = this.parseTags(html, 'meta');
      const linkTags = this.parseTags(html, 'link');

      // Extract Title
      const title = this.getAttr(metaTags, 'property', 'og:title') ||
                    this.getAttr(metaTags, 'name', 'twitter:title') ||
                    this.getAttr(metaTags, 'name', 'title') ||
                    (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);

      // Extract Description
      const description = this.getAttr(metaTags, 'property', 'og:description') ||
                          this.getAttr(metaTags, 'name', 'twitter:description') ||
                          this.getAttr(metaTags, 'name', 'description');

      // Extract Image
      const image = this.getAttr(metaTags, 'property', 'og:image:secure_url') ||
                    this.getAttr(metaTags, 'property', 'og:image') ||
                    this.getAttr(metaTags, 'name', 'twitter:image') ||
                    this.getAttr(linkTags, 'rel', 'image_src');

      // Extract Site Name
      const siteName = this.getAttr(metaTags, 'property', 'og:site_name');

      // Extract Favicon
      const favIcon = this.getAttr(linkTags, 'rel', 'icon') ||
                      this.getAttr(linkTags, 'rel', 'shortcut icon') ||
                      this.getAttr(linkTags, 'rel', 'apple-touch-icon') ||
                      this.getAttr(linkTags, 'rel', 'mask-icon');

      // Extract from all JSON-LD blocks
      const jsonLd = this.extractFromAllJsonLd(html);

      const metadata: UrlMetadata = {
        url: finalUrl,
        title: this.decodeHtmlEntities(title || jsonLd.title)?.trim() || undefined,
        description: this.decodeHtmlEntities(description || jsonLd.description)?.trim() || undefined,
        image: this.makeAbsoluteUrl(image || jsonLd.image, domain),
        siteName: this.decodeHtmlEntities(siteName)?.trim() || new URL(finalUrl).hostname,
        favIcon: this.makeAbsoluteUrl(favIcon, domain) || `${domain}/favicon.ico`,
      };

      // 3. Store in Cache
      await UrlPreview.findOneAndUpdate(
        { url: finalUrl },
        { 
          ...metadata, 
          expiresAt: new Date(Date.now() + CACHE_DURATION) 
        },
        { upsert: true, returnDocument: 'after' }
      );

      return metadata;
    } catch (error) {
      if (error instanceof UnsafeUrlError) throw error;
      console.error('Error fetching URL metadata:', error);
      return { url };
    }
  }

  /**
   * Robust tag parsing that handles '>' inside quoted attribute values.
   */
  private static parseTags(html: string, tagName: string): Record<string, string>[] {
    const tags: Record<string, string>[] = [];
    // Bounded, non-nested pattern (the previous nested quantifier allowed ReDoS).
    const tagRegex = new RegExp(`<${tagName}\\s([^>]{0,2000})>`, 'gi');
    
    for (const match of html.matchAll(tagRegex)) {
      const attrsStr = match[1];
      if (!attrsStr) continue;
      
      const attrs: Record<string, string> = {};
      const attrRegex = /([a-z0-9:-]+)\s*=\s*(?:["']([^"']*)["']|([^\s>]+))/gi;
      
      for (const attrMatch of attrsStr.matchAll(attrRegex)) {
        attrs[(attrMatch[1] || '').toLowerCase()] = attrMatch[2] || attrMatch[3] || '';
      }
      tags.push(attrs);
    }
    return tags;
  }

  /**
   * Helper to find an attribute value with case-insensitive matching and multi-value support (like 'rel').
   */
  private static getAttr(tags: Record<string, string>[], keyName: string, keyValue: string, targetAttr: string = 'content'): string | undefined {
    const found = tags.find(tag => {
      const val = tag[keyName]?.toLowerCase();
      if (!val) return false;
      const target = keyValue.toLowerCase();
      // Match exact value or one of the values in a space-separated list (e.g. rel="icon shortcut")
      return val === target || val.split(/\s+/).includes(target);
    });
    return found ? found[targetAttr] : undefined;
  }

  /**
   * Scans all JSON-LD blocks on the page to find metadata.
   */
  private static extractFromAllJsonLd(html: string): Partial<UrlMetadata> {
    const results: Partial<UrlMetadata> = {};
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    
    for (const match of html.matchAll(jsonLdRegex)) {
      try {
        const data = JSON.parse(match[1] || '');
        const list = Array.isArray(data) ? data : [data];
        
        for (const obj of list) {
          results.title = results.title || obj.headline || obj.name || obj.title;
          results.description = results.description || obj.description;
          results.image = results.image || obj.image?.url || obj.image?.[0]?.url || obj.image?.[0] || obj.image;
        }
      } catch (e) {}
    }
    return results;
  }

  private static makeAbsoluteUrl(url: string | undefined, domain: string): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('http')) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    if (trimmed.startsWith('/')) return `${domain}${trimmed}`;
    return `${domain}/${trimmed}`;
  }

  private static decodeHtmlEntities(str: string | undefined): string | undefined {
    if (!str) return undefined;
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&ldquo;/g, '"')
      .replace(/&rdquo;/g, '"')
      .replace(/&ndash;/g, '-')
      .replace(/&mdash;/g, '-')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, "/")
      .replace(/&copy;/g, "©")
      .replace(/&reg;/g, "®");
  }
}
