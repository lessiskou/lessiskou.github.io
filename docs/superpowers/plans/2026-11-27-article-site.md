# 个人文章站（Astro + GitHub Pages）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `lessiskou.github.io` 上发布一个由 Markdown 驱动的极简中文文章站，推送即上线。

**Architecture:** Astro 7 静态站。文章放在内容集合 `src/content/posts/`，构建期用 `getStaticPaths()` 生成每篇的静态页面；首页从集合查询生成按年分组的列表。纯函数（排序、UTC 日期、地址拼装、草稿过滤、permalink 校验）抽到 `src/lib/posts.js`，用 Node 自带测试运行器做单测；再由一个跑真实构建的验收测试断言产物 HTML。零客户端 JS、零网络字体、无 CSS 框架。

**Tech Stack:** Astro 7.4.13（精确锁定）、Node 22+、`node:test` + `node:assert`（零依赖测试）、GitHub Actions（`withastro/action@v6` + `actions/deploy-pages@v5`）。

**Spec:** `docs/superpowers/specs/2026-11-27-article-site-design.md`

## 执行协议（子代理收不到任务正文时必须自举）

本仓库的子代理通道会丢失派发正文。你被派来干活时，按下面的规则自举：

1. 先读本文件的 Global Constraints、Review Focus 与目标任务的**完整**正文。
2. 按编号顺序找到**第一个标题不带 ✅** 的任务，只做那一个。完成后把它的标题加上 ✅、把它的所有步骤复选框改成 `[x]`，然后停手——不要顺手做下一个任务。
3. 任务原文另有等价的独立副本：`.superpowers/sdd/2026-11-27-article-site/task-<N>-brief.md`；该任务若有 **Dispatch notes**，一并遵守。
4. 把完整报告写到 `.superpowers/sdd/2026-11-27-article-site/task-<N>-report.md`，回复只给：状态（DONE/DONE_WITH_CONCERNS/BLOCKED/NEEDS_CONTEXT）、提交 SHA、一行测试结果、顾虑、报告路径。
5. 不得派发任何子代理；审阅由控制端另行安排。
6. 如果你是来审阅的：不要实现任何任务，先读仓库根目录的 `REVIEW-QUEUE.md`，按它执行。

## Global Constraints

- `astro` 版本必须精确写为 `"7.4.13"`（不带 `^`），`package-lock.json` 必须提交。
- `site: 'https://lessiskou.github.io'`；不设置 `base`（站点在根路径）。
- 所有站内链接与静态资源前缀都用 `import.meta.env.BASE_URL` 拼，不允许手写 `/xxx`。
- 构建期过滤草稿要在**列表页与 `getStaticPaths` 两处**都做：`import.meta.env.PROD ? data.draft !== true : true`。
- 日期一律走 UTC（实现用 `toISOString()` 切片/取值），不允许 `getFullYear()`/`getMonth()`/`getDate()`。
- 根元素必须是 `<html lang="zh-CN">`。
- 正文最大宽度约 `40rem`，行高 `1.75`；字体栈只用系统字体，不加载网络字体（不允许 `@import` / `<link>` 到字体 CDN）。
- 任何页面不得输出 `<script>` 标签（无客户端 JS）。
- 自定义地址字段叫 `permalink`，值必须匹配 `/^[a-z0-9-]+$/`；不得使用 `slug` 作字段名（Astro 保留名）。
- 测试命令：`npm test`（即 `node --test "tests/**/*.test.js"`——Node 22 在 Windows 上传目录名会当作模块解析，必须用 glob 形式）。构建命令：`npm run build`。
- Node `>=22.12.0`；Actions 里由 `withastro/action` 提供 Node 24。

## Review Focus

- **中文或含空格的文件名**：没写 `permalink` 时，文章地址由文件名派生，链接必须百分号编码且点得开；期望 `你好.md` 的文章能通过 `/posts/%E4%BD%A0%E5%A5%BD/` 打开。（Task 2 单测 + Task 4 产物断言）
- **日期写成 `2026-1-5` 或带时间**：期望构建明确失败或按 UTC 正确归组，绝不静默落到错误年份。（Task 1 负向校验 + Task 2 单测）
- **两篇 `permalink` 相同**：期望构建直接报错并点名两个源文件，而不是一篇悄悄覆盖另一篇。（Task 2 单测 + Task 4 在 `getStaticPaths` 中调用）
- **标题里含 `&`、`<`**：期望列表与文章页输出转义后的 HTML，不破坏页面结构。（Task 3 产物断言）
- **没有 `description` 的文章**：期望列表不产生空的提要元素，也不显示空括号。（Task 3 产物断言）

---

### Task 1: 项目骨架、内容集合与一篇示例文章 ✅

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `src/content.config.ts`
- Create: `src/pages/index.astro`（本任务只放占位标题）
- Create: `src/content/posts/hello-world.md`, `src/content/posts/older-note.md`, `src/content/posts/qa-amp.md`, `src/content/posts/draft-note.md`

**Interfaces:**
- Consumes: 无
- Produces: 集合名 `posts`，条目形状 `{ id: string, data: { title: string, description?: string, pubDate: Date, draft?: boolean, permalink?: string }, body: string }`。后续任务的页面与测试都按这个形状取值。

- [ ] **Step 1: 写 `package.json`**

```json
{
  "name": "lessiskou-site",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --test tests/"
  },
  "dependencies": { "astro": "7.4.13" }
}
```

- [ ] **Step 2: 写 `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lessiskou.github.io',
  // Astro 7 默认 'jsx' 会删掉行内元素之间的空白；true 保留 HTML 语义下的空格。
  compressHTML: true,
});
```

- [ ] **Step 3: 写 `tsconfig.json` 与 `.gitignore`**

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

`.gitignore`:

```
node_modules/
dist/
.astro/
```

- [ ] **Step 4: 写 `src/content.config.ts`**

```ts
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
```

- [ ] **Step 5: 写三篇示例文章（作为测试夹具）**

`src/content/posts/hello-world.md`（含表格、代码块、长段落，用来验证渲染）：

```markdown
---
title: 开始写
description: 第一篇，用来验证渲染路径。
pubDate: 2026-11-27
permalink: hello-world
---

这是第一篇示例文章。它要验证三件事：段落排版、表格、代码块。

一个足够长的段落，用来检查行宽是否舒适。中文正文排到一行结束时不应该让人回读串行，所以正文
宽度会被限制在四十来个汉字左右。这个段落还会继续写下去，好让它至少折行两次。

| 字段 | 说明 |
| --- | --- |
| `title` | 必填 |
| `pubDate` | 必填 |

```js
const answer = 42;
console.log(answer);
```
```

`src/content/posts/older-note.md`:

```markdown
---
title: 更早的一篇
pubDate: 2025-12-11
permalink: older-note
---

这篇没有 description，用来检查列表不会渲染空提要。它同时验证年份分组：这应该出现在 2025 组里。
```

`src/content/posts/qa-amp.md`（标题含 `&` 与 `<`，用来钉住转义行为）:

```markdown
---
title: "问答 & 摘录 <一>"
pubDate: 2026-03-02
permalink: qa-amp
---

标题里有 `&` 和尖括号。如果页面结构被撑坏，说明转义出了问题。
```

`src/content/posts/draft-note.md`:

```markdown
---
title: 草稿不该上线
pubDate: 2026-10-01
permalink: draft-note
draft: true
---

如果这篇出现在构建产物里，说明草稿过滤失效了。
```

- [ ] **Step 6: 写占位首页 `src/pages/index.astro`**

```astro
---
---
<html lang="zh-CN">
  <head><title>寇强</title></head>
  <body><h1>寇强</h1></body>
</html>
```

- [ ] **Step 7: 安装依赖并确认版本被锁定**

Run: `npm install`
Expected: 成功，`package-lock.json` 出现；`npm ls astro` 输出 `astro@7.4.13`。

- [ ] **Step 8: 构建成功**

Run: `npm run build`
Expected: 无报错，`dist/index.html` 存在。

- [ ] **Step 9: 负向校验——缺少 `title` 必须构建失败**

新建 `src/content/posts/broken.md`，内容只有：

```markdown
---
pubDate: 2026-01-01
---

没有标题。
```

Run: `npm run build`
Expected: 失败，输出里包含 `title` 与 `broken.md`（Zod 校验报错）。确认后删除该文件，再跑一次 `npm run build` 确认恢复通过。

- [ ] **Step 10: 提交**

```bash
git init -b main
git add -A
git commit -m "chore: Astro 骨架与文章内容集合"
```

---

### Task 2: 纯函数库（排序、UTC 日期、地址、草稿过滤、permalink 校验） ✅

**Files:**
- Create: `src/lib/posts.js`
- Test: `tests/posts.test.js`

**Interfaces:**
- Consumes: Task 1 的条目形状。
- Produces（后续所有任务按这些签名调用）:
  - `isPublished(entry, { prod }: { prod: boolean }): boolean`
  - `sortByDateDesc(entries): entries[]`（不改动入参）
  - `yearOf(date: Date): number`（UTC）
  - `formatDate(date: Date): string`（`MM-DD`，UTC）
  - `permalinkOf(entry): string`（`data.permalink` 优先，否则 `entry.id`）
  - `postPath(entry, base: string): string`（`base` + `/posts/<seg>/`，逐段 `encodeURIComponent`）
  - `groupByYear(entries): Array<{ year: number, entries: entries[] }>`
  - `validatePermalinks(entries): void`（重复或格式非法时抛错，错误信息含涉及的源文件 id）

- [ ] **Step 1: 写失败的测试 `tests/posts.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isPublished, sortByDateDesc, yearOf, formatDate,
  permalinkOf, postPath, groupByYear, validatePermalinks,
} from '../src/lib/posts.js';

const entry = (over = {}) => ({
  id: over.id ?? 'note.md',
  data: { title: 'T', pubDate: new Date('2026-11-27'), ...(over.data ?? {}) },
});

test('草稿在正式构建里被排除，本地开发可见', () => {
  const draft = entry({ data: { draft: true } });
  assert.equal(isPublished(draft, { prod: true }), false);
  assert.equal(isPublished(draft, { prod: false }), true);
  assert.equal(isPublished(entry(), { prod: true }), true);
});

test('按 pubDate 倒序，且不改动入参', () => {
  const a = entry({ id: 'a.md', data: { pubDate: new Date('2025-01-01') } });
  const b = entry({ id: 'b.md', data: { pubDate: new Date('2026-06-01') } });
  const input = [a, b];
  const sorted = sortByDateDesc(input);
  assert.deepEqual(sorted.map((e) => e.id), ['b.md', 'a.md']);
  assert.deepEqual(input.map((e) => e.id), ['a.md', 'b.md']);
});

test('日期按 UTC 取值，不受本机时区影响', () => {
  assert.equal(yearOf(new Date('2026-01-01')), 2026);
  assert.equal(formatDate(new Date('2026-01-01')), '01-01');
  assert.equal(formatDate(new Date('2026-01-01T23:30:00Z')), '01-01');
  assert.equal(yearOf(new Date('2025-12-31T23:30:00Z')), 2025);
});

test('permalink 优先于文件名，否则用 id', () => {
  assert.equal(permalinkOf(entry({ id: 'orig.md', data: { permalink: 'hello-world' } })), 'hello-world');
  assert.equal(permalinkOf(entry({ id: 'orig' })), 'orig');
});

test('文章地址带 base 前缀，中文文件名被百分号编码', () => {
  assert.equal(postPath(entry({ data: { permalink: 'hello-world' } }), '/'), '/posts/hello-world/');
  assert.equal(postPath(entry({ data: { permalink: 'hello-world' } }), '/blog'), '/blog/posts/hello-world/');
  assert.equal(postPath(entry({ data: { permalink: 'hello-world' } }), '/blog/'), '/blog/posts/hello-world/');
  assert.equal(postPath(entry({ id: '你好' }), '/'), '/posts/%E4%BD%A0%E5%A5%BD/');
});

test('按年分组，年份与组内都倒序', () => {
  const grouped = groupByYear([
    entry({ id: 'a.md', data: { pubDate: new Date('2026-11-27') } }),
    entry({ id: 'b.md', data: { pubDate: new Date('2025-12-11') } }),
    entry({ id: 'c.md', data: { pubDate: new Date('2026-02-01') } }),
  ]);
  assert.deepEqual(grouped.map((g) => g.year), [2026, 2025]);
  assert.deepEqual(grouped[0].entries.map((e) => e.id), ['a.md', 'c.md']);
  assert.deepEqual(grouped[1].entries.map((e) => e.id), ['b.md']);
});

test('permalink 重复时抛错并点名两个源文件', () => {
  const a = entry({ id: 'a.md', data: { permalink: 'same' } });
  const b = entry({ id: 'b.md', data: { permalink: 'same' } });
  assert.throws(() => validatePermalinks([a, b]), /same[\s\S]*a\.md[\s\S]*b\.md|same[\s\S]*b\.md[\s\S]*a\.md/);
});

test('permalink 含中文或斜杠时抛错', () => {
  assert.throws(
    () => validatePermalinks([entry({ id: 'x.md', data: { permalink: '中文' } })]),
    /permalink/,
  );
  assert.throws(
    () => validatePermalinks([entry({ id: 'y.md', data: { permalink: 'a/b' } })]),
    /permalink/,
  );
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL，报 `Cannot find module '../src/lib/posts.js'` 或导出缺失。

- [ ] **Step 3: 实现 `src/lib/posts.js`**

必须遵守的两处实现选择：日期用 `toISOString()` 取值（`yearOf` 取前 4 位，`formatDate` 取第 6–10 位）；
路径拼装先去掉 `base` 末尾斜杠、再逐段 `encodeURIComponent`，保证 `'/blog'` 与 `'/blog/'` 结果一致。

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS，8 个测试全绿。

- [ ] **Step 5: 提交**

```bash
git add src/lib/posts.js tests/posts.test.js
git commit -m "feat: 文章排序、UTC 日期与地址拼装工具"
```

---

### Task 3: 首页列表（由内容集合生成） ✅

**Dispatch notes:** 本任务开头有一个 Step 0，是 Task 1/2 审阅提出的三条修正（日期校验、UTC 测试、嵌套 id 编码）。先完成 Step 0 并跑绿 `npm test`，再做 Step 1 起的首页工作；两者要在同一个任务里提交。

**Files:**
- Create: `tests/site.test.js`
- Modify: `src/pages/index.astro`, `src/content.config.ts`, `src/lib/posts.js`, `tests/posts.test.js`

**Interfaces:**
- Consumes: `isPublished`, `groupByYear`, `formatDate`, `postPath`, `permalinkOf`（Task 2）；集合 `posts`（Task 1）。
- Produces: `tests/site.test.js` 里三个可复用助手，供 Task 4/5 的断言使用：`readFrontmatter()` 返回 `{ file, title, draft }[]`；`distHtml()` 返回全部 `dist/**/*.html` 的 `{ path, text }[]`；`buildOnce()` 在 `before` 钩子里跑 `npm run build`。

- [ ] **Step 0a: 收紧 `pubDate` 校验（日期写错必须报错，而不是静默归错年份）**

`z.coerce.date()` 会接受 `2026-1-5` 这种非补零字符串，并按**本地时区**解释——在东八区会把日子算成 `01-04`，元旦那篇会掉进上一年。修改 `src/content.config.ts` 里的 `pubDate`：

```ts
const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'pubDate 必须是补零的 YYYY-MM-DD');

// 在 collection 的 schema 里：
pubDate: z
  .union([z.date(), isoDay])
  .transform((v) => (v instanceof Date ? v : new Date(`${v}T00:00:00Z`))),
```

YAML 会把 `2026-11-27` 直接解析成 `Date`（UTC 零点），这条分支原样保留；非补零的 `2026-1-5` 是字符串且过不了正则，构建时报错并点名该文件。带时间的 ISO 字符串仍会被 YAML 解析成 `Date`，同样可用。

- [ ] **Step 0b: 跑一次负向校验，确认坏日期被拦下**

新建 `src/content/posts/bad-date.md`（只有 `title` 与 `pubDate: 2026-1-5`），Run: `npm run build`
Expected: 失败，错误信息包含 `pubDate` 与 `bad-date.md`。删除该文件后重跑 `npm run build` 应通过。

**Step 0b 偏差已裁定（执行中实测，以实测为准）：** 未加引号的 `2026-1-5` 到不了 schema——YAML 的
timestamp 解析器先把它变成 `Date.UTC(2026, 0, 5)` → `2026-01-05T00:00:00Z`，所以构建不失败，且日期与
年份分组都是 UTC 正确的（不会掉年份）。真正全红的只有三种：带引号的非补零串、格式非法串、日历
非法串（`"2026-13-45"`）。已知残留限制：未加引号的越界日期（如 `2026-13-45`）会被 YAML 归一成
`2027-02-14` 并正常上线——loader 层已丢失原始文本，schema 无法拦，只能靠作者写规范日期。
因此上面这条 Step 0b 的 Expected 仅在**加引号**的形式下成立。

- [ ] **Step 0c: 修正 `postPath` 的嵌套 id 编码**

当前整串 `encodeURIComponent` 会把子目录 id `sub/note` 编成 `sub%2Fnote`，而 `[...id]` 路由实际服务的是 `/posts/sub/note/`，结果是死链。改为逐段编码：`permalinkOf(entry).split('/').map(encodeURIComponent).join('/')`。

在 `tests/posts.test.js` 补两条断言：

```js
assert.equal(postPath(entry({ id: 'sub/note' }), '/'), '/posts/sub/note/');
assert.equal(formatDate(new Date('2026-01-01T00:30:00+08:00')), '12-31');
```

第二条是 UTC 回归：本机在东八区时，用本地取值会得到 `01-01`。

- [ ] **Step 0d: 跑测试确认 Step 0 完成**

Run: `npm test`
Expected: PASS（10 个测试：原 8 个 + 新增 2 个）。

- [ ] **Step 1: 写失败的验收测试 `tests/site.test.js`**

```js
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
      const draft = /^draft:\s*true\s*$/m.test(block);
      return { file, title, draft };
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

before(() => {
  execSync('npm run build', { cwd: root, stdio: 'pipe' });
}, { timeout: 300_000 });

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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL——占位首页里没有文章标题（`hits` 为 0）。

- [ ] **Step 3: 实现 `src/pages/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import { groupByYear, formatDate, postPath, isPublished, sortByDateDesc, validatePermalinks } from '../lib/posts.js';

const base = import.meta.env.BASE_URL;
const posts = sortByDateDesc(
  await getCollection('posts', ({ data }) => isPublished({ data }, { prod: import.meta.env.PROD })),
);
validatePermalinks(posts);
const groups = groupByYear(posts);
---
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>寇强</title>
  </head>
  <body>
    <header>
      <h1>寇强</h1>
      <p>写点文章。</p>
    </header>
    <main>
      {groups.map(({ year, entries }) => (
        <section>
          <h2>{year}</h2>
          <ul>
            {entries.map((post) => (
              <li>
                <a href={postPath(post, base)}>{post.data.title}</a>
                <time datetime={post.data.pubDate.toISOString()}>{formatDate(post.data.pubDate)}</time>
                {post.data.description?.trim() && <p class="excerpt">{post.data.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  </body>
</html>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS（Task 2 的 8 个单测 + 本任务的 3 个验收测试）。若提示 `unused import` 或构建失败，按报错删掉未使用的导入。

- [ ] **Step 5: 人工看一眼产物结构**

Run: `node -e "const h=require('fs').readFileSync('dist/index.html','utf8');console.log(h.slice(h.indexOf('<main'),h.indexOf('</main>')+7))"`
Expected: 两篇已发布文章按 2026、2025 分组，`draft-note` 不出现。

- [ ] **Step 6: 提交**

```bash
git add tests/site.test.js src/pages/index.astro
git commit -m "feat: 首页按年份列出文章"
```

---

### Task 4: 文章页路由 ✅

**Dispatch notes:** 本任务开头有一个 Step 0，处理 Task 3 审阅留下的两个小口子（文案与注释），
与本任务的路由一起提交、一起受审。

**Files:**
- Create: `src/pages/posts/[...id].astro`
- Modify: `tests/site.test.js`（追加两个测试）, `src/content.config.ts`

**Interfaces:**
- Consumes: `isPublished`、`permalinkOf`、`validatePermalinks`（Task 2）；`distHtml`/`readFrontmatter`（Task 3）；`render(entry)` 来自 `astro:content`。
- Produces: 路由 `/posts/<permalink 或 id>/`；`getStaticPaths` 返回 `params: { id }` + `props: { post }`。

- [ ] **Step 0: 收掉 Task 3 审阅的两个小口子**

1. `src/content.config.ts` 里的 `pubDate` 报错文案现在说「必须是补零的 YYYY-MM-DD」，但作者如果是手写了带时区的带引号 ISO 串，被这句引到的地方是错的。改成：
   `'pubDate 请写成不带引号的 YYYY-MM-DD（不要加引号，日期会由 YAML 解析）'`。
2. 在同一个文件、`pubDate` 定义上方加一行注释：`// 未加引号的越界日期（如 2026-13-45）会被 YAML 归一化成合法 Date，schema 层拦不住。`

Run: `npm test`
Expected: PASS（14 个测试，文案改动不影响行为）。

- [ ] **Step 1: 追加失败的测试**

在 `tests/site.test.js` 末尾追加：

```js
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
```

**Step 1 偏差已裁定（执行中实测）：** 初版断言只看「某处出现这个标题」，而 `distHtml()` 包含
`dist/index.html`，首页本来就有每篇已发布文章的标题——于是它在实现之前就是绿的，对「文章页缺失」
零判别力。改为按 `join('posts', permalink)` 精确匹配路径（`readFrontmatter()` 相应多返回一个
`permalink` 字段）。

- [ ] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: FAIL——`dist/posts/` 下没有页面，断言「应有 /posts/<permalink>/ 页面」失败。

- [ ] **Step 3: 实现 `src/pages/posts/[...id].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import { isPublished, permalinkOf, validatePermalinks } from '../../lib/posts.js';

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) =>
    isPublished({ data }, { prod: import.meta.env.PROD }),
  );
  validatePermalinks(posts);
  return posts.map((post) => ({ params: { id: permalinkOf(post) }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await render(post);
const backHref = import.meta.env.BASE_URL;
---
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{post.data.title} — 寇强</title>
  </head>
  <body>
    <nav><a href={backHref}>← 返回</a></nav>
    <article>
      <h1>{post.data.title}</h1>
      <time datetime={post.data.pubDate.toISOString()}>{post.data.pubDate.toISOString().slice(0, 10)}</time>
      <Content />
    </article>
  </body>
</html>
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npm test`
Expected: PASS（16 个测试）。同时确认 `ls dist/posts` 里有 `hello-world`、`older-note`、`qa-amp`，没有 `draft-note`。

- [ ] **Step 5: 提交**

```bash
git add "src/pages/posts/[...id].astro" tests/site.test.js
git commit -m "feat: 由内容集合生成文章页，排除草稿"
```

---

### Task 5: 版式与排版（Base/Post 布局、样式、无脚本） ✅

**Dispatch notes:** 本任务开头有一个 Step 0，处理 Task 4 审阅留下的两个验证盲区（permalink 护栏、
子串匹配）。先做完 Step 0 并跑绿，再做布局与样式；同一个任务里一起提交。

**Files:**
- Create: `src/layouts/Base.astro`, `src/layouts/Post.astro`, `src/styles/global.css`, `src/content/posts/note-alias.md`
- Modify: `src/pages/index.astro`, `src/pages/posts/[...id].astro`, `tests/site.test.js`

**Interfaces:**
- Consumes: Task 3/4 的页面。
- Produces: `Base.astro` 接收 `{ title: string }` 与 `<slot />`；`Post.astro` 接收 `{ post }`（Task 1 的条目形状），内部渲染 `<Content />`。页面只保留各自的 `frontmatter` 数据逻辑。

- [x] **Step 0a: 加一个「permalink 与文件名不同」的夹具**

现有三篇夹具的 `permalink` 恰好都等于文件名，所以路由写成 `post.id` 也能全绿——`permalinkOf`
没有任何回归护栏。新建 `src/content/posts/note-alias.md`：

```markdown
---
title: 别名地址
description: permalink 与文件名不同的一篇。
pubDate: 2024-06-05
permalink: alias-name
---

这一篇的地址应该是 /posts/alias-name/，而不是文件名。
```

- [x] **Step 0b: 把路径断言改成精确匹配，并覆盖 id 回退**

`tests/site.test.js` 里那条测试改成：

```js
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
```

Run: `npm test`
Expected: PASS（16 个测试；夹具与断言改动不改变数量）。同时确认 `dist/posts/alias-name/index.html` 存在（若路由误用 `post.id`，这里会变成 `note-alias` 并挂红）。

- [x] **Step 1: 追加失败的测试**

在 `tests/site.test.js` 末尾追加：

```js
test('页面引入样式表，且排版参数已落地', () => {
  const page = distHtml()[0];
  const href = page.text.match(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/)?.[1];
  assert.ok(href, '页面应引入样式表');
  const css = readFileSync(join(root, 'dist', href.replace(/^\//, '')), 'utf8');
  assert.match(css, /max-width:\s*40rem/, '正文宽度应为 40rem');
  assert.match(css, /line-height:\s*1\.75/, '行高应为 1.75');
});

test('所有页面都是中文文档且不加载脚本', () => {
  for (const page of distHtml()) {
    assert.match(page.text, /<html lang="zh-CN">/, `${page.path} 缺少 lang="zh-CN"`);
    assert.doesNotMatch(page.text, /<script\b/, `${page.path} 不应含 script 标签`);
  }
});

test('文章页有返回首页的链接', () => {
  const post = distHtml().find((p) => p.path.includes(join('posts', 'hello-world')));
  assert.ok(post, '应该有 hello-world 的页面');
  assert.match(post.text, /href="\/"/);
});
```

- [x] **Step 2: 跑测试确认失败**

Run: `npm test`
Expected: 样式表测试 FAIL（还没有 CSS）。另两个断言此时可能已通过（Task 3/4 的页面已经内联了 `lang` 与返回链接）——只要有一个新测试是红的，这一轮就成立。

- [x] **Step 3: 写 `src/styles/global.css`**

```css
:root {
  --ink: #1f2328;
  --muted: #6b7280;
  --rule: #e5e7eb;
  --link: #1a5fb4;
}

* { box-sizing: border-box; }

html {
  font-size: 18px;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0 auto;
  padding: 3rem 1.25rem 6rem;
  max-width: 40rem;
  color: var(--ink);
  background: #fff;
  font-family: system-ui, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  line-height: 1.75;
}

h1 { font-size: 1.5rem; line-height: 1.35; margin: 0 0 0.5rem; }
h2 { font-size: 1rem; color: var(--muted); font-weight: 600; margin: 2.5rem 0 0.5rem; }

a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }

header p { color: var(--muted); margin: 0 0 2rem; }

ul { list-style: none; margin: 0; padding: 0; }
li { padding: 0.35rem 0; border-bottom: 1px solid var(--rule); }
li time { float: right; color: var(--muted); font-size: 0.85rem; font-variant-numeric: tabular-nums; }

.excerpt { margin: 0.25rem 0 0.5rem; color: var(--muted); font-size: 0.9rem; }

article { margin-top: 1.5rem; }
article > time { color: var(--muted); font-size: 0.85rem; }

pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
pre {
  overflow-x: auto;
  padding: 0.85rem 1rem;
  border: 1px solid var(--rule);
  border-radius: 6px;
  font-size: 0.85rem;
  line-height: 1.6;
}

table { border-collapse: collapse; width: 100%; font-size: 0.92rem; }
th, td { border: 1px solid var(--rule); padding: 0.4rem 0.6rem; text-align: left; }

nav { margin-bottom: 1rem; font-size: 0.9rem; }
```

- [x] **Step 4: 写 `src/layouts/Base.astro`**

```astro
---
import '../styles/global.css';

const { title } = Astro.props;
---
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

- [x] **Step 5: 写 `src/layouts/Post.astro`**

```astro
---
import { render } from 'astro:content';
import Base from './Base.astro';
import { formatDate } from '../lib/posts.js';

const { post } = Astro.props;
const { Content } = await render(post);
const backHref = import.meta.env.BASE_URL;
---
<Base title={`${post.data.title} — 寇强`}>
  <nav><a href={backHref}>← 返回</a></nav>
  <article>
    <h1>{post.data.title}</h1>
    <time datetime={post.data.pubDate.toISOString()}>{formatDate(post.data.pubDate)}</time>
    <Content />
  </article>
</Base>
```

- [x] **Step 6: 两个页面改用布局**

`src/pages/index.astro`：删掉自己的 `<html>/<head>/<body>` 外壳，改成

```astro
---
import Base from '../layouts/Base.astro';
// …保留原有的 getCollection / 分组逻辑…
---
<Base title="寇强">
  <header>
    <h1>寇强</h1>
    <p>写点文章。</p>
  </header>
  <main>
    {/* 原有的分组列表不变 */}
  </main>
</Base>
```

`src/pages/posts/[...id].astro`：`getStaticPaths` 原样保留，渲染部分改成

```astro
---
// …getStaticPaths 不变…
const { post } = Astro.props;
---
<Post post={post} />
```

- [x] **Step 7: 跑测试确认通过**

Run: `npm test`
Expected: PASS（19 个测试）。

- [x] **Step 8: 本地肉眼验一遍**

Run: `npm run dev`，打开 `http://localhost:4321/`，确认：列表无缩进符号、日期右对齐、正文行宽约 40rem、文章页有返回链接。
Expected: 与描述一致。看完 `Ctrl+C` 停掉。

- [x] **Step 9: 提交**

```bash
git add -A
git commit -m "feat: 抽出布局与中文排版样式"
```

---

### Task 6: 部署工作流、README、上线

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`, `src/content/posts/随笔.md`
- Modify: `src/layouts/Post.astro`, `src/lib/posts.js`, `tests/posts.test.js`, `tests/site.test.js`

**Interfaces:**
- Consumes: 全部前面的产物。
- Produces: 仓库 `lessiskou/lessiskou.github.io`，Pages 以 Actions 为源，站点 `https://lessiskou.github.io/` 返回 200。

**Dispatch notes:**
- 本机 `gh` 已登录为账号 `lessiskou`，具备 `repo` 与 `workflow` scope，无需重新登录。
- 仓库尚未创建（本地 `origin` 不存在），`gh repo create` 会创建公开仓库并推送，这是计划已批准的动作。
- 本章最后一步（网页端新建文章验证）会写入真实仓库并触发一次部署；验证完必须删掉那篇临时文章。若删除失败，停下并报告，不要留着。
- **上线之前**先做 Step 0——它修复的是用户打开分享链接时会看到的缺陷（文章页日期没有年份），必须在部署前完成。

- [ ] **Step 0a: 文章页日期补上年份**

`Post.astro` 现在调 `formatDate()`，只输出 `MM-DD`；列表页有 `<h2>2026</h2>` 提供上下文，单篇页
没有，读者看到的只是 `06-05`。在 `src/lib/posts.js` 里 `formatDate` 旁边加一个整日期函数：

```js
/**
 * UTC 的 YYYY-MM-DD，用于单篇页（列表页已有年份标题，故用 formatDate）。
 * @param {Date} date
 * @returns {string}
 */
export function formatFullDate(date) {
  return date.toISOString().slice(0, 10);
}
```

`src/layouts/Post.astro` 改用 `formatFullDate(post.data.pubDate)`（导入一并改）。

在 `tests/posts.test.js` 补一条：`assert.equal(formatFullDate(new Date('2026-01-01')), '2026-01-01');`

- [ ] **Step 0b: 用断言盯住这个回归**

在 `tests/site.test.js` 末尾追加：

```js
test('单篇页显示带年份的日期', () => {
  const page = distHtml().find((p) => p.path === join(root, 'dist', 'posts', 'hello-world', 'index.html'));
  assert.ok(page, '应该有 hello-world 的页面');
  assert.match(page.text, /2026-11-27/);
});
```

- [ ] **Step 0c: 让 id 回退路径真的被执行**

现有 5 篇夹具都写了 `permalink`，所以验收测试里 `post.permalink ?? 文件名` 的左分支永远命中，
「不写 permalink 时地址由文件名派生」这条从未被验证。新建 `src/content/posts/随笔.md`（故意用中文名、
不写 `permalink`）：

```markdown
---
title: 没有自定义地址的一篇
pubDate: 2024-01-15
---

这一篇没有 permalink，地址应该由文件名派生。
```

- [ ] **Step 0d: 样式断言覆盖所有页面**

`tests/site.test.js` 里样式表那条现在只看 `distHtml()[0]`（首页）。改成逐页断言：把读取
`<link rel="stylesheet">` 与 `href` 的检查放进对 `distHtml()` 的循环（CSS 文件仍然只读一次）。

- [ ] **Step 0e: 跑测试确认 Step 0 完成**

Run: `npm test`
Expected: PASS（21 个测试：10 个单测 + 1 个新单测 + 10 个验收）。若中文文件名派生的路径不是
`dist/posts/随笔/index.html`，先报告实际路径再动断言，不要反过来改断言迁就实现。

- [ ] **Step 1: 写 `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: withastro/action@v6

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

- [ ] **Step 2: 写 `README.md`**

包含四小节：**写一篇新文章**（在 `src/content/posts/` 新建 `.md`，写 `title`/`pubDate`，可选 `description`/`permalink`/`draft`；提交即上线）、**本地预览**（`npm install`、`npm run dev`）、**测试**（`npm test`，说明 `tests/site.test.js` 会跑一次真实构建）、**部署**（Pages 的 Source 必须是 GitHub Actions；构建失败去 Actions 标签页看日志）。

- [ ] **Step 3: 本地最后一次全绿**

Run: `npm test`
Expected: PASS（21 个测试）。

- [ ] **Step 4: 把工作流与说明先提交到本地**

必须在上传前提交：仓库里没有 `deploy.yml` 的第一条推送不会触发部署，后面等 Actions 会白等。

```bash
git add -A
git commit -m "chore: 部署工作流与写作说明"
```

Expected: `git log --oneline -1` 显示这条提交，`git status` 干净。

- [ ] **Step 5: 建仓库并推送**

```bash
gh repo create lessiskou.github.io --public --source=. --remote=origin --push
```

Expected: 输出仓库 URL，`git remote -v` 显示 `origin`。

- [ ] **Step 6: 把 Pages 的源设为 GitHub Actions**

```bash
gh api --method POST repos/lessiskou/lessiskou.github.io/pages -f build_type=workflow
```

若返回 409（Pages 已存在），改用：

```bash
gh api --method PUT repos/lessiskou/lessiskou.github.io/pages -f build_type=workflow
```

Expected: 返回 JSON 里 `"build_type": "workflow"`。

- [ ] **Step 7: 重跑并等第一次部署成功**

Step 5 推送时 Pages 还没启用，那次运行会在部署步骤失败——这是预期内的一次失败。启用后手动重跑：

```bash
gh workflow run deploy.yml --repo lessiskou/lessiskou.github.io
sleep 5
gh run list --repo lessiskou/lessiskou.github.io --limit 3
```

Expected: 出现一条 `Deploy to GitHub Pages` 的运行；`gh run watch <run-id>` 到它变成 `completed success`。若仍失败，看日志里是哪个 step，而不是盲目重试。

- [ ] **Step 8: 验证在线站点**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://lessiskou.github.io/
curl -sS -o /dev/null -w '%{http_code}\n' https://lessiskou.github.io/posts/hello-world/
```

Expected: 两个都输出 `200`。

- [ ] **Step 9: 验证「网页上新建文章就能上线」这条硬约束**

不经本地仓库，直接用 GitHub API 新建一篇文章（等同于在网页上新建文件并提交）：

```bash
BODY=$(node -e "console.log(Buffer.from('---\\ntitle: 网页端新建\\npubDate: 2026-11-28\\npermalink: web-edit-check\\n---\\n\\n这一篇是在网页上新建的。\\n').toString('base64'))")
gh api --method PUT repos/lessiskou/lessiskou.github.io/contents/src/content/posts/web-edit-check.md \
  -f message="test: 网页端新建文章" -f content="$BODY"
```

等 Actions 跑完（`gh run watch`），然后：

```bash
curl -sS -o /dev/null -w '%{http_code}\n' https://lessiskou.github.io/posts/web-edit-check/
```

Expected: `200`，首页也出现「网页端新建」。这条通过才说明作者无需本地环境也能发文章。

- [ ] **Step 10: 删掉这篇验证用的临时文章**

```bash
SHA=$(gh api repos/lessiskou/lessiskou.github.io/contents/src/content/posts/web-edit-check.md --jq .sha)
gh api --method DELETE repos/lessiskou/lessiskou.github.io/contents/src/content/posts/web-edit-check.md \
  -f message="chore: 删除网页端验证文章" -f sha="$SHA"
```

Expected: 删除成功，下一次部署后该地址变 404。

---

## 备注

- 示例文章（`hello-world.md`、`older-note.md`、`qa-amp.md`、`draft-note.md`）是测试夹具。作者删掉它们时，`tests/site.test.js` 仍是结构化的（按目录里实际存在的文件推导预期），不会因此失败；但 `draft-note.md` 这类用于验证「草稿不出现」的夹具，删掉后就少了一层保护，建议至少留一篇草稿。
- 第一次部署前 Pages 尚未启用，`gh run` 里可能先出现一次失败；Step 6 设好 `build_type=workflow` 后在 Actions 页手动重跑（`gh workflow run deploy.yml`）即可。
- 本计划不包含 RSS、标签、搜索、评论、自定义域名——都是 spec 里的非目标。

---

### Task 7: 收尾修正（README 模板、夹具删除后的测试、CI 跑单测） ✅

**Files:**
- Modify: `README.md`, `tests/site.test.js`, `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: Task 1–6 的全部产物；`readFrontmatter()`（Task 3/4/5）、`unescape`（Task 3）。
- Produces: 无新接口；测试数量保持 21。

- [x] **Step 1: 拿掉 README 模板里的 `draft: true`**

`README.md` 的「写一篇新文章」示例 frontmatter 里现在有一行未注释的 `draft: true`。作者照抄就会
得到「构建成功、部署成功、站点上没有」——正是最该避免的静默失败。删掉那一行；`draft` 仍保留在
下面的字段说明里（作为可选字段解释何时该用）。

- [x] **Step 2: 在 README 里点名示例文章**

在「测试」或「写一篇新文章」小节加一段：`src/content/posts/` 下现有 6 篇是示例/夹具
（`hello-world.md`、`older-note.md`、`qa-amp.md`、`note-alias.md`、`随笔.md`、`draft-note.md`），
可以随时删除，删完不需要改任何列表文件；但请至少留一篇 `draft: true` 的文章，否则「草稿不上线」
这条保护就没有夹具在验证。

- [x] **Step 3: 让日期断言不再依赖某一篇具体文章**

`tests/site.test.js` 现在的日期测试硬编码 `hello-world`，作者删掉示例文章后它会红，而且报错看不懂。
改成结构化断言：

1. `readFrontmatter()` 的返回值加一个 `pubDate` 字段（正则 `^pubDate:\s*(\d{4}-\d{2}-\d{2})`）。
2. 把那条测试改成：对每一篇非草稿且带 `pubDate` 的文章，找到它自己的页面，断言页面里存在
   `<time[^>]*>${pubDate}</time>`（必须匹配 `<time>` 里的文字，不能只匹配 ISO 属性）。

- [x] **Step 4: 部署前跑单测**

`.github/workflows/deploy.yml` 的 `build` job 里，`withastro/action` 之前插入两步：

```yaml
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - name: Unit tests
        run: node --test tests/posts.test.js
```

只跑纯函数单测（毫秒级、不需要 Astro 构建），验收测试仍留在本地 `npm test`：它自己会跑一次
完整构建，放进部署流水线等于每次部署构建两遍。

- [x] **Step 5: 本地验证**

Run: `npm test`
Expected: PASS（21 个测试，数量不变）。

- [x] **Step 6: 提交、推送并确认线上仍绿**

```bash
git add -A
git commit -m "chore: README 模板去 draft、日期断言去夹具依赖、部署前跑单测"
git push
gh run list --repo lessiskou/lessiskou.github.io --limit 2
```

Expected: 最新运行 `completed success`（含新增的 Unit tests 步骤），且
`curl -sS -o /dev/null -w '%{http_code}\n' https://lessiskou.github.io/` 仍为 `200`。
