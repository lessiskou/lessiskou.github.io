import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://less-is-kou.github.io',
  // Astro 7 默认 'jsx' 会删掉行内元素之间的空白；true 保留 HTML 语义下的空格。
  compressHTML: true,
});
