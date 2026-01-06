import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/invite/', '/private/'],
    },
    // ▼ 修正: https:// を追加して完全なURLにする
    sitemap: 'https://pachimoney.vercel.app/sitemap.xml',
  };
}