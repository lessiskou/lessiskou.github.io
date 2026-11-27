/**
 * 文章列表与路由用到的纯函数。不依赖 Astro 运行时，便于用 node:test 直接单测。
 */

const PERMALINK_RE = /^[a-z0-9-]+$/;

/**
 * 构建期是否发布该条目：正式构建排除草稿，本地开发一律可见。
 * @param {{ data: { draft?: boolean } }} entry
 * @param {{ prod: boolean }} options
 * @returns {boolean}
 */
export function isPublished(entry, { prod }) {
  return prod ? entry.data?.draft !== true : true;
}

/**
 * 按 pubDate 倒序返回新数组，不改动入参。
 * @template T
 * @param {T[]} entries
 * @returns {T[]}
 */
export function sortByDateDesc(entries) {
  return [...entries].sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

/**
 * UTC 年份。
 * @param {Date} date
 * @returns {number}
 */
export function yearOf(date) {
  return Number(date.toISOString().slice(0, 4));
}

/**
 * UTC 的 MM-DD。
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return date.toISOString().slice(5, 10);
}

/**
 * 自定义地址优先，否则用条目 id（文件名派生）。
 * @param {{ id: string, data: { permalink?: string } }} entry
 * @returns {string}
 */
export function permalinkOf(entry) {
  return entry.data?.permalink ?? entry.id;
}

/**
 * 拼出站内文章地址：`<base>/posts/<permalink>/`，逐段百分号编码。
 * @param {{ id: string, data: { permalink?: string } }} entry
 * @param {string} base import.meta.env.BASE_URL
 * @returns {string}
 */
export function postPath(entry, base) {
  const prefix = base.replace(/\/+$/, '');
  const segment = encodeURIComponent(permalinkOf(entry));
  return `${prefix}/posts/${segment}/`;
}

/**
 * 按 UTC 年份分组，年份与组内条目都按日期倒序。
 * @template T
 * @param {T[]} entries
 * @returns {Array<{ year: number, entries: T[] }>}
 */
export function groupByYear(entries) {
  const groups = new Map();
  for (const entry of sortByDateDesc(entries)) {
    const year = yearOf(entry.data.pubDate);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(entry);
  }
  return [...groups.entries()].map(([year, grouped]) => ({ year, entries: grouped }));
}

/**
 * 校验自定义地址：格式必须是 /^[a-z0-9-]+$/，且最终地址不得重复。
 * 重复或非法时抛错，错误信息点名涉及的源文件 id。
 * @param {Array<{ id: string, data: { permalink?: string } }>} entries
 * @returns {void}
 */
export function validatePermalinks(entries) {
  const seen = new Map();
  for (const entry of entries) {
    const explicit = entry.data?.permalink;
    if (explicit !== undefined && !PERMALINK_RE.test(explicit)) {
      throw new Error(
        `permalink「${explicit}」不合法：${entry.id} 的 permalink 只能包含小写字母、数字与连字符`,
      );
    }
    const path = permalinkOf(entry);
    const previous = seen.get(path);
    if (previous !== undefined) {
      throw new Error(`permalink 重复：「${path}」同时被 ${previous} 与 ${entry.id} 使用`);
    }
    seen.set(path, entry.id);
  }
}
