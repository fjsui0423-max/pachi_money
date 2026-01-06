import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  // ▼ 修正: https:// を追加
  const baseUrl = 'https://pachimoney.vercel.app'; 
  return [
    { url: baseUrl, lastModified: new Date() },
    { url: `${baseUrl}/terms`, lastModified: new Date() },
    { url: `${baseUrl}/privacy`, lastModified: new Date() },
  ];
}