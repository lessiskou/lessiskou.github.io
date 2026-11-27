import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lessiskou.github.io',
  // Astro 7 默认 'jsx' 会删掉行内元素之间的空白；true 保留 HTML 语义下的空格。
  compressHTML: true,
  // 默认 'auto' 会把小体积 CSS 内联进每个 HTML；这里固定产出独立样式表，
  // 让 CSS 可缓存、断言能读到真实文件，也避免同一份样式逐页重复。
  build: { inlineStylesheets: 'never' },
  // 页面是白底，默认的 github-dark 会变成整页唯一的深色块。
  markdown: { shikiConfig: { theme: 'github-light' } },
});
