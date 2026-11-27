# 寇强的文章站

极简中文文章站：Markdown 写在 `src/content/posts/`，推到 `main` 就上线。
线上地址：<https://less-is-kou.github.io/>

## 写一篇新文章

在 `src/content/posts/` 下新建一个 `.md` 文件，开头写 frontmatter：

```markdown
---
title: 文章标题
pubDate: 2026-11-27
description: 可选，列表页的一句提要。
permalink: my-post
draft: true
---

正文。
```

- `title`、`pubDate` 必填；`pubDate` 用 `YYYY-MM-DD`（按 UTC 处理，必须补零）。
- `description`、`permalink`、`draft` 可选。
- `permalink` 是自定义地址，只能用小写字母、数字与连字符，对应 `/posts/<permalink>/`。不写时地址由文件名派生（中文名会被百分号编码，能用但不美观）。
- `draft: true` 的文章只在 `npm run dev` 里可见，正式构建不会上线。

在网页上新建并提交同样生效：提交到 `main` 即触发部署，无需本地环境。

## 本地预览

```bash
npm install
npm run dev
```

打开 <http://localhost:4321/>。`Ctrl+C` 停止。

## 测试

```bash
npm test
```

`tests/posts.test.js` 是纯函数单测；`tests/site.test.js` 会跑一次真实构建，再断言 `dist/` 里的 HTML，所以要花几秒。

## 部署

推送 `main` 后由 GitHub Actions（`.github/workflows/deploy.yml`）构建并发布。仓库的
**Settings → Pages → Source 必须是 GitHub Actions**，否则不会有部署。构建失败时去 Actions
标签页看是哪一步的日志。
