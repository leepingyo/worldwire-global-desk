import assert from 'node:assert/strict';
import worker from '../worker/index.js';

const response = await worker.fetch(new Request('https://worldwire.example/'));
assert.equal(response.status, 200);
const html = await response.text();
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script);
new Function(script);
assert.ok(html.includes("['智庫報告','▤','think']"));
assert.ok(html.includes("['付費報導','▣','paid']"));
const feeds = JSON.parse(script.match(/const feeds=(\[.*?\]);/s)[1]);
assert.equal(feeds.length, 86);
assert.equal(feeds.filter(f => f.lang === 'ja').length, 8);
assert.equal(feeds.filter(f => f.lang === 'ko').length, 7);
assert.equal(feeds.filter(f => f.category === '智庫').length, 20);
for (const region of ['亞洲', '歐洲', '非洲', '北美洲', '南美洲', '大洋洲']) {
  const media = new Set(feeds.filter(f => f.region === region && f.category !== '智庫').map(f => f.publisher));
  assert.ok(media.size >= 6, `${region}: ${media.size} different news outlets`);
  console.log(`${region}: ${media.size} different news outlets`);
}
assert.equal(new Set(feeds.filter(f => f.name.startsWith('BBC ')).map(f => f.publisher)).size, 1);
assert.equal(new Set(feeds.filter(f => f.name.startsWith('NHK ')).map(f => f.publisher)).size, 1);
assert.ok(!feeds.some(f => ['拉丁美洲', '中東'].includes(f.region)));
assert.ok(html.includes('id="coverage"'));
assert.ok(html.includes('id="language"'));
const categorySource = script.slice(script.indexOf('function category('), script.indexOf('function parse('));
const classify = new Function(categorySource + '; return category;')();
for (const [title, expected] of [
  ['半導体メーカーが新技術を発表', '科技'],
  ['韓国の大統領選挙が始まる', '政治'],
  ['정부, 새로운 경제 정책 발표', '經濟'],
  ['백신 임상 시험 시작', '醫藥'],
  ['미사일 시험 발사', '軍事'],
  ['映画祭が開幕', '娛樂'],
  ['Literature exhibition opens', '藝術'],
  ['Awards showcase fashion brilliance', '綜合'],
  ['Environmental champion honoured', '綜合']
]) assert.equal(classify(title, {}), expected, title);
for (const id of ['999', '-1', 'https://example.com', '']) {
  assert.equal((await worker.fetch(new Request(`https://worldwire.example/api/feed?id=${encodeURIComponent(id)}`))).status, 400);
}
assert.equal((await worker.fetch(new Request('https://worldwire.example/missing'))).status, 404);
console.log('Passed: HTML, embedded JavaScript, section buttons, feed allowlist, and 404 routing.');
