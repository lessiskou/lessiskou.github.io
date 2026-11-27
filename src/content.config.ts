import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    draft: z.boolean().optional(),
    permalink: z.string().optional(),
  }),
});

export const collections = { posts };
