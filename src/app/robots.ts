import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/invite/', '/private/'], // クロール不要なパス
    },
    sitemap: 'pachimoney.vercel.app',
  };
}