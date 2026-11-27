import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pubDate 请写成不带引号的 YYYY-MM-DD（不要加引号，日期会由 YAML 解析）');

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    // YAML 会把未加引号的 `2026-11-27` 直接解析成 Date；字符串分支只收补零日期，
    // 免得 `2026-1-5` 被按本地时区解释后掉进上一年。
    // 未加引号的越界日期（如 2026-13-45）会被 YAML 归一化成合法 Date，schema 层拦不住。
    pubDate: z
      .union([z.date(), isoDay])
      .transform((v) => (v instanceof Date ? v : new Date(`${v}T00:00:00Z`)))
      // 正则只保证形状，`2026-13-45` 这类日历非法值会得到 Invalid Date，必须在这里拦下。
      .refine((d) => Number.isFinite(d.getTime()), 'pubDate 不是有效日期'),
    draft: z.boolean().optional(),
    permalink: z.string().optional(),
  }),
});

export const collections = { posts };
