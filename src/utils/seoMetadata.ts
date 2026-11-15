import type { ProductItem } from '../data/storeProducts';

const DEFAULT_TITLE = 'ShivAmrit Healers — Store & Spiritual Wellness';
const DEFAULT_DESCRIPTION =
  'Authentic consecrated healing crystals, energized malas, Reiki bath salts, botanical herbal oils, and certified spiritual healing sessions by Reiki Grandmaster Parul Suthar.';

function setMetaContent(selector: string, content: string): void {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(selector);
  if (el) {
    el.setAttribute('content', content);
  }
}

function setCanonicalHref(href: string): void {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function buildProductJsonLd(product: ProductItem, canonicalUrl: string, inStock: boolean) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    sku: product.id,
    description: product.description || product.shortDescription,
    category: product.category,
    brand: {
      '@type': 'Brand',
      name: 'ShivAmrit Healers',
    },
    offers: {
      '@type': 'Offer',
      url: canonicalUrl,
      priceCurrency: 'INR',
      price: String(product.price),
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };
}

export function syncProductSeoMetadata(
  product: ProductItem | null,
  inStock: boolean = true
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  const existingJsonLd = document.getElementById('dynamic-product-jsonld');

  if (!product) {
    document.title = DEFAULT_TITLE;
    setMetaContent('meta[name="description"]', DEFAULT_DESCRIPTION);
    setMetaContent('meta[property="og:title"]', DEFAULT_TITLE);
    setMetaContent('meta[property="og:description"]', DEFAULT_DESCRIPTION);
    setMetaContent('meta[name="twitter:title"]', DEFAULT_TITLE);
    setMetaContent('meta[name="twitter:description"]', DEFAULT_DESCRIPTION);
    setCanonicalHref(baseUrl);
    if (existingJsonLd) existingJsonLd.remove();
    return;
  }

  const productTitle = `${product.name} (₹${product.price}) — ShivAmrit Healers`;
  const productDescription = `${product.shortDescription || product.description} Genuine consecrated ${product.stones || product.category} by ShivAmrit Healers.`.slice(
    0,
    160
  );
  const canonicalUrl = `${baseUrl}?product=${encodeURIComponent(product.id)}`;

  document.title = productTitle;
  setMetaContent('meta[name="description"]', productDescription);
  setMetaContent('meta[property="og:title"]', productTitle);
  setMetaContent('meta[property="og:description"]', productDescription);
  setMetaContent('meta[name="twitter:title"]', productTitle);
  setMetaContent('meta[name="twitter:description"]', productDescription);
  setCanonicalHref(canonicalUrl);

  const scriptEl =
    (existingJsonLd as HTMLScriptElement | null) || document.createElement('script');
  scriptEl.id = 'dynamic-product-jsonld';
  scriptEl.type = 'application/ld+json';
  scriptEl.textContent = JSON.stringify(buildProductJsonLd(product, canonicalUrl, inStock));
  if (!existingJsonLd) {
    document.head.appendChild(scriptEl);
  }
}
