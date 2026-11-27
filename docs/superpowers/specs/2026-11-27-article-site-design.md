# 个人文章站（GitHub Pages + Astro）设计

日期：2026-11-27
状态：待批准

## 意图与原因

作者写各种主题的文章，形式是 Markdown 文件。需要一个地方把这些文章统一发布出去，让别人能
翻、能读、能把某一篇单独发链接给别人。核心诉求是一句话：**做得越轻越好**——不引框架生态之外的
东西，不接第三方服务，版面能读就行，维护成本接近零。

成因不是流量，也不是品牌经营。这决定了取舍方向：任何为了「更好看」「更专业」而增加维护负担的
东西，默认拒绝。

## 目标

- 文章的源文件就是 Markdown，放进仓库即可发布，不需要转换、不需要手写 HTML。
- 推送后在 GitHub Actions 自动构建并部署，无需任何手动发布步骤。
- 首页列出全部文章，按年份分组；每篇文章有独立 URL，可直接分享。
- 单篇文章页：标题、日期、正文；中文排版可读（行宽受限、行高宽松）。
- 移动端单栏可读。
- 不引入客户端 JS 来渲染正文；页面是构建期生成的静态 HTML。

## 非目标

- 评论、阅读量统计、全文搜索、站内用户系统。
- 分类、标签、分页、相关文章推荐。
- RSS、sitemap（后续想加是十几行的事，不在第一版）。
- 多语言、暗色模式、自定义域名。
- CMS 后台或网页写作界面（写作发生在编辑器和 GitHub 网页上）。

## 反目标（即使「能用」也算失败）

- 因为一个配置项或依赖升级而整站构建失败，作者看不懂错误。
- 发一篇文章必须先装 Node、跑命令。**这条是硬约束**：Astro 需要 Node 才能本地预览，但发布
  路径必须保证「在 GitHub 网页上改一个 .md 文件并提交」也能成功上线。
- 文章列表需要手工维护。列表必须从内容自动生成。
- 引入框架后产出还不如手写 HTML 轻量（例如塞进运行时 JS、大量内联样式）。

## 约束

- GitHub Pages 只托管静态文件；无服务器逻辑。
- 站点地址取决于仓库名：仓库名为 `<用户名>.github.io` 时根路径是 `/`，否则是 `/<仓库名>/`。
  这决定 `astro.config.mjs` 里的 `base`，写错会导致全站链接与 CSS 404。
- 官方推荐用 Actions 部署（`withastro/action`），Pages 设置里 Source 必须选 GitHub Actions。
- 构建环境由 Actions 提供（Node 24），作者本地版本不影响线上产物。

## 方案

考虑过三条路，作者选定第三条。

1. **Jekyll，从分支发布**：本地零安装，Markdown 原样进 `_posts/`。但被钉在 Jekyll 3.10，
   构建失败信息难以定位，版式要自己重写或用旧主题。轻，但写作体验和样式控制都退让得多。
2. **Hugo**：单二进制、构建极快。但主题靠 submodule / modules 拉取，配置项多，版本间有过
   兼容性问题的历史。对偶发写作的人是负担。
3. **Astro（选定）**：内容集合直接读 Markdown，模板是 `.astro`（近乎 HTML），构建产物是纯
   静态 HTML，默认不向浏览器发送任何 JS。代价是本地需要 Node 和 `npm install` 才能预览——
   而发布路径不受此影响，因为构建发生在 Actions 里。

选 Astro 的实质收益：文章文件命名自由（不像 Jekyll 必须 `YYYY-MM-DD-` 前缀，那个坑是静默的）、
frontmatter 校验在构建期报错且错误信息可读、版式完全自控、后续想加 RSS 或标签时不必换工具。

## 设计

### 目录结构

```
/
├─ astro.config.mjs          # site、base
├─ package.json              # astro 版本固定到精确版本
├─ package-lock.json         # 提交进仓库，保证 Actions 安装可复现
├─ tsconfig.json
├─ .github/workflows/deploy.yml
├─ src/
│  ├─ content.config.ts      # 集合定义 + frontmatter 校验
│  ├─ content/posts/          # 文章：一个 .md 一个文件
│  │  └─ 2026-11-27-示例文章.md
│  ├─ layouts/Base.astro      # <html> 骨架、<head>、页头页脚
│  ├─ layouts/Post.astro      # 文章页版式
│  ├─ pages/
│  │  ├─ index.astro          # 首页：简介 + 按年分组列表
│  │  └─ posts/[...id].astro  # 文章路由，由内容集合生成
│  └─ styles/global.css
└─ public/                    # 静态资源（favicon 等）
```

选 `src/content/posts/` 而不是 `src/pages/`：文章与页面分离，列表页可以从集合查询生成，
且新增文件不会意外变成无版式的裸页面。

### 内容模型

frontmatter 字段（`src/content.config.ts` 用 Zod 校验）：

| 字段 | 必填 | 类型 | 说明 |
|---|---|---|---|
| `title` | 是 | string | 文章标题，用于列表和页面标题 |
| `description` | 否 | string | 列表里的一句话提要 |
| `pubDate` | 是 | 日期（`2026-11-27` 或 ISO） | 排序依据；缺失则构建失败。按 UTC 解释 |
| `draft` | 否 | boolean | 为 `true` 时只在 `astro dev` 出现，正式构建排除 |
| `permalink` | 否 | string | 自定义 URL 段；缺省时由文件名生成 id。只用 `[a-z0-9-]` |

**两条必须显式实现的机制**（不是 Astro 的默认行为，写错就是静默出错）：

- **`draft` 排除**：列表页的 `getCollection` 与文章页 `getStaticPaths` 两处都要加过滤
  （`import.meta.env.PROD ? data.draft !== true : true`）。漏掉文章页那处，草稿会有 URL
  但不在列表里；漏掉两处，草稿直接上线。
- **自定义地址字段**：id 由集合 loader 从文件路径生成。字段名不能用 `slug`——那是 Astro
  的保留名，写进 schema 会直接报 `ContentSchemaContainsSlugError`。所以用 `permalink`：
  `content.config.ts` 里声明 `permalink: z.string().optional()`，并在 `getStaticPaths` 与所有
  链接拼装处优先使用它。`permalink` 只允许 `[a-z0-9-]`（不允许斜杠），违反时构建报错，
  避免中文/斜杠造成的编码歧义；文件名路径则允许中文，链接会做百分号编码。
- **permalink 去重**：两篇文章写同一个 `permalink` 会互相覆盖页面。构建期显式校验，
  报错时点名两个源文件。

文件名默认参与 URL（中文文件名会得到百分号编码的地址，可读性差但能用）。规范是：**已有文件
不强制改名**；作者若想让某篇的地址好看或稳定，就在 frontmatter 写 `slug`。链接拼装统一走一个
`postUrl(entry)` 辅助函数（应用 `base` 前缀、优先 `slug`、必要时 `encodeURIComponent`），
不允许各处手拼字符串。

日期取值一律按 UTC（`getUTCFullYear` / `getUTCMonth` 或 `Intl.DateTimeFormat` 指定
`timeZone: 'UTC'`）。`2026-11-27` 这类纯日期被解析为 UTC 零点，用本地时区取值会让东八区之外
的作者看到差一天，元旦的文章还会掉进错误的年份分组。

排序：`pubDate` 倒序，纯内容集合排序，不写死在代码里的清单。

### 页面

**首页（`/`）**：站名 → 一句话简介 → 按年份倒序分组，每组下的文章按日期倒序列出标题，有
`description` 时显示提要。没有摘要卡片、没有缩略图、没有「阅读更多」按钮。

```
  站名
  一句话简介

  2026 ────────────────────────────
    · 一篇关于某主题的文章              11-27
    · 另一篇                            08-03
  2025 ────────────────────────────
    · 更早的一篇                        12-11
```

**文章页（`/posts/<id>/`）**：标题、日期、正文 Markdown 渲染结果（含 GFM 表格、代码块）。
顶部一行返回首页的链接。文末不放开评论，不放分享按钮。

**排版**：`Base.astro` 的根元素写 `<html lang="zh-CN">`（决定中文字体回退、断行与读屏行为，
不是可选项）。正文最大宽度约 34–38 个汉字宽（约 `40rem`），行高 1.75 左右，段间距充足；
字体栈使用系统中文字体回退（`system-ui, "PingFang SC", "Microsoft YaHei", ...`），不加载
任何网络字体。代码块用 Astro 内置的高亮，不额外引 JS。

`compressHTML` 在 Astro 7 里默认是 `'jsx'`，会把行内元素之间的空格当作 JSX 空白删除（例如
「发表于」和日期之间的空格）。配置里显式设为 `true` 保留 HTML 语义下的空白。

### 部署

- `.github/workflows/deploy.yml`：`actions/checkout` + `withastro/action`（安装依赖、构建、
  上传 artifact）+ `actions/deploy-pages`（部署）。以下三项缺一不可，缺了首次推送就报一个
  看不出原因的错误（正是反目标里禁掉的那类失败）：
  - 触发：`on: push: branches: [main]`，加 `workflow_dispatch` 便于手动重跑；
  - 权限：`permissions: contents: read, pages: write, id-token: write`；
  - `concurrency` 组（如 `group: pages`，`cancel-in-progress: false`），避免连续两次推送互相
    覆盖部署。
- `astro.config.mjs`：仓库名为 `lessiskou.github.io`（用户主页仓形式，地址最干净），
  因此 `site: 'https://lessiskou.github.io'`、`base: '/'`（可省略不写）。
  **站内链接与静态资源前缀统一走 `import.meta.env.BASE_URL`**，不手拼——将来若改成项目仓
  （如 `blog`），只需改 `base` 一行，其余不动。
  `<img src="/favicon.ico">` 这种绝对路径在 `base` 非 `/` 时同样会 404，这就是不用手拼的原因。
- 依赖可复现：`package.json` 里 `astro` 用精确版本（不带 `^`），`package-lock.json` 提交；
  Actions 按 lockfile 安装。这样半年后重新构建得到的是同一个东西，不会被次版本升级打断。
- 仓库 Settings → Pages → Source 选 **GitHub Actions**。首次推送后行为一次部署。
- 仓库需为 public（免费账户下 Pages 仅公开仓库可用），或使用符合账户计划的可见性。
- 分支默认 `main`。

### 发一篇文章的流程（验收标准）

1. 在 `src/content/posts/` 新建 `任意名字.md`，写 frontmatter 的 `title` 和 `pubDate`，正文照常写。
2. 提交并推送（或在 GitHub 网页上直接提交）。
3. Actions 构建 → 部署 → 首页列表自动出现这篇。

不需要改任何列表文件、不需要跑本地命令。

## 已确定的前提

| 项 | 值 |
|---|---|
| GitHub 用户名 | `lessiskou` |
| 仓库名 | `lessiskou.github.io`（用户主页仓，站点在根路径） |
| 站点地址 | `https://lessiskou.github.io/` |
| 站名 | 寇强 |
| 首页一句话简介 | 首版用占位文字，作者随时改 |
| 首批内容 | 一篇示例文章（验证渲染路径），真实文章以后迁移 |

**更正（执行期实测）：** 作者给出的用户名 `less-is-kou` 在 GitHub 上不存在（`gh api users/less-is-kou` 返回 404），
实际登录账号是 **`lessiskou`**。因此仓库建为 `lessiskou.github.io`（用户主页仓），站点根路径仍是 `/`，
设计原意（根路径、不设 `base`）不变。若将来把 GitHub 账号改成 `less-is-kou`，重新命名仓库 + 改
`astro.config.mjs` 的 `site` 一行即可。

**不做迁移工具。** 作者说了以后自己迁。设计只保证“迁进来的文件能用”，不为批量转换
写脚本、不做旧平台导入——那是一件尚未发生的需求，现在写就是不轻。

## 留给实施者的决定

- CSS 的具体字号、间距标尺、链接/分隔线的视觉细节。
- 首页简介那行文字的确切措辞（作者可随时改，实施者用占位文字）。
- 示例文章的内容（用来验证渲染路径，作者之后可删除）。
- 是否需要 `robots.txt`、`favicon`（便宜的，允许顺手加）。

## 待作者后续提供（不阻塞开工）

- 首页那一句话简介的定稿文字。
- 真实文章的 Markdown 文件（自选时间逐篇迁入，只需补 `title` 与 `pubDate`）。
