import { useEffect } from 'react';
import { SEO_CONFIG } from '../constants/seo.constants';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
}

export function useDocumentHeader({
  title,
  description,
  keywords,
  ogImage,
  ogType = 'website',
  canonical,
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    const baseTitle = title ? SEO_CONFIG.TITLE_TEMPLATE.replace('%s', title) : SEO_CONFIG.DEFAULT_TITLE;
    if (document.title !== baseTitle) {
      document.title = baseTitle;
    }

    // 2. Update Description
    updateMetaTag('description', description || SEO_CONFIG.DEFAULT_DESCRIPTION);
    updateMetaTag('og:description', description || SEO_CONFIG.DEFAULT_DESCRIPTION);

    // 3. Update Keywords
    updateMetaTag('keywords', keywords || SEO_CONFIG.DEFAULT_KEYWORDS);

    // 4. Update Open Graph Tags
    updateMetaTag('og:title', baseTitle);
    updateMetaTag('og:type', ogType);
    updateMetaTag('og:image', ogImage || SEO_CONFIG.DEFAULT_OG_IMAGE);
    updateMetaTag('og:site_name', SEO_CONFIG.SITE_NAME);

    // 5. Update Canonical URL
    updateLinkTag('canonical', canonical || window.location.href);

    // 6. Update Theme Color
    updateMetaTag('theme-color', SEO_CONFIG.THEME_COLOR);

    return () => {
      // Optional: Restore previous title on unmount if needed
      // However, usually we want the next page to set its own title
    };
  }, [title, description, keywords, ogImage, ogType, canonical]);
}

function updateMetaTag(name: string, content: string) {
  if (!content) return;

  let element = document.querySelector(`meta[name="${name}"]`) || 
                document.querySelector(`meta[property="${name}"]`);

  if (!element) {
    element = document.createElement('meta');
    if (name.startsWith('og:')) {
      element.setAttribute('property', name);
    } else {
      element.setAttribute('name', name);
    }
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function updateLinkTag(rel: string, href: string) {
  if (!href) return;

  let element = document.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}
