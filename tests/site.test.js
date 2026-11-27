import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const postsDir = join(root, 'src/content/posts');

function readFrontmatter() {
  return readdirSync(postsDir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = readFileSync(join(postsDir, file), 'utf8');
      const block = (raw.match(/^---\r?\n([\s\S]*?)\r?\n---/) ?? [])[1] ?? '';
      const title = (block.match(/^title:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
      const permalink = (block.match(/^permalink:\s*(.+)$/m)?.[1] ?? '').trim().replace(/^["']|["']$/g, '') || undefined;
      const draft = /^draft:\s*true\s*$/m.test(block);
      return { file, title, permalink, draft };
    });
}

function walk(dir, acc = []) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name);
    if (item.isDirectory()) walk(full, acc);
    else if (item.name.endsWith('.html')) acc.push({ path: full, text: readFileSync(full, 'utf8') });
  }
  return acc;
}

const distHtml = () => walk(join(root, 'dist'));
const distIndex = () => readFileSync(join(root, 'dist/index.html'), 'utf8');
// Astro 不一定会把 `>` 转成 `&gt;`（HTML 里不必须），所以比较前先归一化实体，
// 只关心“文字确实出现了”；转义本身由下面单独的断言盯。
const unescape = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
   .replace(/&#39;/g, "'").replace(/&amp;/g, '&');

function buildOnce() {
  execSync('npm run build', { cwd: root, stdio: 'pipe' });
}

before(buildOnce, { timeout: 300_000 });

test('首页列出所有已发布文章，每篇一次', () => {
  const html = unescape(distIndex());
  for (const post of readFrontmatter().filter((p) => !p.draft)) {
    const hits = html.split(post.title).length - 1;
    assert.equal(hits, 1, `${post.file} 的标题应恰好出现一次`);
  }
});

test('标题里的 & 与尖括号被转义，不破坏页面结构', () => {
  const html = distIndex();
  assert.ok(html.includes('&amp;'), '& 应被转义为 &amp;');
  assert.ok(!html.includes('<一>'), '原始尖括号不应直接出现');
});

test('首页出现年份分组标题', () => {
  const html = distIndex();
  assert.match(html, />\s*2026\s*</);
  assert.match(html, />\s*2025\s*</);
});

test('没有 description 的文章不产生空提要', () => {
  assert.doesNotMatch(distIndex(), /class="excerpt"[^>]*>\s*</);
});

test('每篇已发布文章都有自己的页面，地址与 permalink 一致', () => {
  const pages = distHtml();
  for (const post of readFrontmatter().filter((p) => !p.draft && p.permalink)) {
    const page = pages.find((p) => p.path.includes(join('posts', post.permalink)));
    assert.ok(page, `${post.file} 应有 /posts/${post.permalink}/ 页面`);
    assert.ok(unescape(page.text).includes(post.title), `${post.file} 的标题应出现在自己的页面里`);
  }
});

test('草稿不生成任何页面，也不出现在首页', () => {
  const all = distHtml().map((p) => unescape(p.text)).join('\n');
  for (const post of readFrontmatter().filter((p) => p.draft)) {
    assert.ok(!all.includes(post.title), `草稿「${post.title}」不应出现在任何产物里`);
  }
});
