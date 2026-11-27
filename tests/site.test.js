import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const postsDir = join(root, 'src/content/posts');

function readFrontmatter() {
  return readdirSync(postsDir, { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.md'))
    .map((rel) => {
      // 相对路径统一用正斜杠：下游要拼成 URL 片段，与 postPath 的逐段编码一致。
      const file = rel.split(sep).join('/');
      const raw = readFileSync(join(postsDir, file), 'utf8');
      const block = (raw.match(/^---\r?\n([\s\S]*?)\r?\n---/) ?? [])[1] ?? '';
      const field = (name) => (block.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1] ?? '').trim().replace(/^["']|["']$/g, '');
      return {
        file,
        title: field('title'),
        pubDate: field('pubDate'),
        permalink: field('permalink') || undefined,
        draft: /^draft:\s*true\s*$/m.test(block),
      };
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

test('首页列出所有已发布文章，且没有重复链接', () => {
  const html = distIndex();
  for (const post of readFrontmatter().filter((p) => !p.draft)) {
    assert.ok(unescape(html).includes(post.title), `${post.file} 的标题应出现在首页`);
  }
  // 不数标题出现次数：「读书笔记」与「读书笔记（二）」这种真实内容会误报。
  const hrefs = [...html.matchAll(/href="([^"]*\/posts\/[^"]*)"/g)].map((m) => m[1]);
  assert.equal(new Set(hrefs).size, hrefs.length, '首页不应重复链接同一篇文章');
});

test('标题里的 & 与尖括号被转义，不破坏页面结构', (t) => {
  const html = distIndex();
  const risky = readFrontmatter().filter((p) => !p.draft && p.title.includes('&'));
  if (risky.length === 0) return t.skip('没有含 & 标题的夹具');
  assert.ok(html.includes('&amp;'), '& 应被转义为 &amp;');
  for (const post of risky) assert.ok(!html.includes(`>${post.title}<`), `${post.file} 的原始字符不应直接出现`);
});

test('首页出现每个存在文章的年份', () => {
  const years = new Set(readFrontmatter().filter((p) => !p.draft && p.pubDate).map((p) => p.pubDate.slice(0, 4)));
  const html = distIndex();
  for (const year of years) assert.match(html, new RegExp(`>\\s*${year}\\s*<`), `首页缺少 ${year} 分组`);
});

test('没有 description 的文章不产生空提要', () => {
  assert.doesNotMatch(distIndex(), /class="excerpt"[^>]*>\s*</);
});

test('每篇已发布文章都有自己的页面，地址与 permalink 一致', () => {
  const pages = distHtml();
  for (const post of readFrontmatter().filter((p) => !p.draft)) {
    const segment = post.permalink ?? post.file.replace(/\.md$/, '');
    const expected = join(root, 'dist', 'posts', segment, 'index.html');
    const page = pages.find((p) => p.path === expected);
    assert.ok(page, `${post.file} 应生成 ${expected}`);
    assert.ok(unescape(page.text).includes(post.title), `${post.file} 的标题应出现在自己的页面里`);
  }
});

test('草稿不生成任何页面，也不出现在首页', () => {
  const all = distHtml().map((p) => unescape(p.text)).join('\n');
  for (const post of readFrontmatter().filter((p) => p.draft)) {
    assert.ok(!all.includes(post.title), `草稿「${post.title}」不应出现在任何产物里`);
  }
});

test('每页都引入样式表，且排版参数已落地', () => {
  let css;
  for (const page of distHtml()) {
    const href = page.text.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1];
    assert.ok(href, `${page.path} 应引入样式表`);
    // 所有页面共用同一份外部样式表，只读一次。
    css ??= readFileSync(join(root, 'dist', href.replace(/^\//, '')), 'utf8');
  }
  assert.ok(css, '应该至少有一个页面');
  assert.match(css, /max-width:\s*40rem/, '正文宽度应为 40rem');
  assert.match(css, /line-height:\s*1\.75/, '行高应为 1.75');
});

test('所有页面都是中文文档且不加载脚本', () => {
  for (const page of distHtml()) {
    assert.match(page.text, /<html lang="zh-CN">/, `${page.path} 缺少 lang="zh-CN"`);
    assert.doesNotMatch(page.text, /<script\b/, `${page.path} 不应含 script 标签`);
  }
});

test('所有文章页都有返回首页的链接', () => {
  const pages = distHtml().filter((p) => p.path.includes(`${sep}posts${sep}`));
  assert.ok(pages.length > 0, '应至少有一个文章页');
  for (const page of pages) assert.match(page.text, /href="\/"/, `${page.path} 缺少返回链接`);
});

test('每篇已发布文章的页面都显示带年份的日期', () => {
  const pages = distHtml();
  for (const post of readFrontmatter().filter((p) => !p.draft && p.pubDate)) {
    const segment = post.permalink ?? post.file.replace(/\.md$/, '');
    const expected = join(root, 'dist', 'posts', segment, 'index.html');
    const page = pages.find((p) => p.path === expected);
    assert.ok(page, `${post.file} 应生成 ${expected}`);
    // 只认 <time> 的文字内容：datetime 属性里本来就有完整 ISO 时间，匹配不到它才有判别力。
    assert.match(page.text, new RegExp(`<time[^>]*>${post.pubDate}</time>`), `${post.file} 的日期应显示为 ${post.pubDate}`);
  }
});
