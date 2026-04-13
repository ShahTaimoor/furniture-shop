import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const DEFAULT_META = {
  title: 'FURNITURE | Modern Furniture & Lifestyle Store',
  description:
    'Discover curated furniture, lifestyle essentials, and personalized shopping experiences at FURNITURE. Fast shipping, secure checkout, and new arrivals every week.',
  keywords: [
    'furniture store',
    'modern furniture',
    'home decor',
    'interior design',
    'FURNITURE'
  ],
  image: '/logo.jpeg',
  siteName: 'FURNITURE',
  twitterHandle: '@furniture_store'
};

const ensureTag = ({ selector, tagName = 'meta', attributes }) => {
  if (!selector || !attributes) return null;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement(tagName);
    tag.setAttribute('data-managed-by', 'seo-component');
    document.head.appendChild(tag);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value) {
      tag.setAttribute(key, value);
    } else {
      tag.removeAttribute(key);
    }
  });

  return tag;
};

const removeManagedTags = () => {
  document
    .querySelectorAll('meta[data-managed-by="seo-component"], link[data-managed-by="seo-component"]')
    .forEach((tag) => tag.remove());
};

const SEO = ({
  title,
  description,
  keywords = [],
  canonical,
  noIndex = false,
  openGraph = {},
  twitter = {},
  structuredData
}) => {
  const location = useLocation();

  const pageUrl = useMemo(() => {
    if (canonical) return canonical;
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.sort();
    return url.toString();
  }, [canonical, location.pathname, location.search]);

  const keywordSignature = useMemo(() => keywords.join(','), [keywords]);
  const structuredDataSignature = useMemo(
    () => (structuredData ? JSON.stringify(structuredData) : ''),
    [structuredData]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const merged = {
      title: title ? `${title} | FURNITURE` : DEFAULT_META.title,
      description: description || DEFAULT_META.description,
      keywords:
        keywords.length > 0
          ? Array.from(new Set([...keywords, ...DEFAULT_META.keywords])).join(', ')
          : DEFAULT_META.keywords.join(', '),
      image: openGraph.image || DEFAULT_META.image,
      siteName: openGraph.siteName || DEFAULT_META.siteName,
      twitterHandle: twitter.handle || DEFAULT_META.twitterHandle
    };

    document.title = merged.title;
    removeManagedTags();

    ensureTag({
      selector: 'meta[name="description"][data-managed-by="seo-component"]',
      attributes: { name: 'description', content: merged.description }
    });

    ensureTag({
      selector: 'meta[name="keywords"][data-managed-by="seo-component"]',
      attributes: { name: 'keywords', content: merged.keywords }
    });

    ensureTag({
      selector: 'meta[name="robots"][data-managed-by="seo-component"]',
      attributes: { name: 'robots', content: noIndex ? 'noindex, nofollow' : 'index, follow' }
    });

    ensureTag({
      selector: 'link[rel="canonical"][data-managed-by="seo-component"]',
      tagName: 'link',
      attributes: { rel: 'canonical', href: pageUrl }
    });

    const ogTitle = openGraph.title ? `${openGraph.title} | FURNITURE` : merged.title;
    const ogDescription = openGraph.description || merged.description;

    ensureTag({
      selector: 'meta[property="og:title"][data-managed-by="seo-component"]',
      attributes: { property: 'og:title', content: ogTitle }
    });

    ensureTag({
      selector: 'meta[property="og:description"][data-managed-by="seo-component"]',
      attributes: { property: 'og:description', content: ogDescription }
    });

    ensureTag({
      selector: 'meta[property="og:type"][data-managed-by="seo-component"]',
      attributes: { property: 'og:type', content: openGraph.type || 'website' }
    });

    ensureTag({
      selector: 'meta[property="og:url"][data-managed-by="seo-component"]',
      attributes: { property: 'og:url', content: pageUrl }
    });

    ensureTag({
      selector: 'meta[property="og:image"][data-managed-by="seo-component"]',
      attributes: { property: 'og:image', content: merged.image }
    });

    ensureTag({
      selector: 'meta[property="og:site_name"][data-managed-by="seo-component"]',
      attributes: { property: 'og:site_name', content: merged.siteName }
    });

    ensureTag({
      selector: 'meta[name="twitter:card"][data-managed-by="seo-component"]',
      attributes: { name: 'twitter:card', content: twitter.card || 'summary_large_image' }
    });

    ensureTag({
      selector: 'meta[name="twitter:title"][data-managed-by="seo-component"]',
      attributes: { name: 'twitter:title', content: twitter.title || ogTitle }
    });

    ensureTag({
      selector: 'meta[name="twitter:description"][data-managed-by="seo-component"]',
      attributes: { name: 'twitter:description', content: twitter.description || ogDescription }
    });

    ensureTag({
      selector: 'meta[name="twitter:image"][data-managed-by="seo-component"]',
      attributes: { name: 'twitter:image', content: twitter.image || merged.image }
    });

    ensureTag({
      selector: 'meta[name="twitter:site"][data-managed-by="seo-component"]',
      attributes: { name: 'twitter:site', content: merged.twitterHandle }
    });

    let jsonLdScript = document.getElementById('furniture-structured-data');
    if (structuredDataSignature) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.type = 'application/ld+json';
        jsonLdScript.id = 'furniture-structured-data';
        jsonLdScript.setAttribute('data-managed-by', 'seo-component');
        document.head.appendChild(jsonLdScript);
      }
      jsonLdScript.textContent = structuredDataSignature;
    } else if (jsonLdScript) {
      jsonLdScript.remove();
    }

    return () => {
      // Intentionally left blank; next page load will re-run the effect
    };
  }, [
    canonical,
    description,
    keywordSignature,
    noIndex,
    openGraph.description,
    openGraph.image,
    openGraph.siteName,
    openGraph.title,
    openGraph.type,
    pageUrl,
    title,
    twitter.card,
    twitter.description,
    twitter.handle,
    twitter.image,
    twitter.title,
    structuredDataSignature
  ]);

  return null;
};

export default SEO;


