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

test('嵌套 id 的斜杠保留，不被当成数据编码', () => {
  assert.equal(postPath(entry({ id: 'sub/note' }), '/'), '/posts/sub/note/');
});

test('跨时区的日期仍按 UTC 取值', () => {
  assert.equal(formatDate(new Date('2026-01-01T00:30:00+08:00')), '12-31');
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
