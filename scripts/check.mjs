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
assert.equal(feeds.length, 113);
assert.equal(feeds.filter(f => !f.watch).length, 86);
assert.ok(!feeds.some(f => /taipei\s*times/i.test(f.name)));
assert.ok(feeds.some(f => f.name === 'PBS News Hour' && f.region === '北美洲' && f.lang === 'en'));
assert.equal(feeds.filter(f => f.watch === 'taiwan').length, 19);
assert.equal(feeds.filter(f => f.watch === 'taiwan' && f.search).length, 6);
assert.ok(feeds.filter(f => f.search).every(f => f.fallback?.startsWith('https://www.bing.com/news/search?')));
assert.equal(feeds.filter(f => f.watch === 'f16').length, 8);
assert.equal(feeds.filter(f => f.lang === 'ja').length, 8);
assert.equal(feeds.filter(f => f.lang === 'ko').length, 7);
assert.equal(feeds.filter(f => f.category === '智庫').length, 20);
for (const region of ['亞洲', '歐洲', '非洲', '北美洲', '南美洲', '大洋洲']) {
  const media = new Set(feeds.filter(f => f.region === region && f.category !== '智庫' && !f.watch).map(f => f.publisher));
  assert.ok(media.size >= 6, `${region}: ${media.size} different news outlets`);
  console.log(`${region}: ${media.size} different news outlets`);
}
assert.equal(new Set(feeds.filter(f => f.name.startsWith('BBC ')).map(f => f.publisher)).size, 1);
assert.equal(new Set(feeds.filter(f => f.name.startsWith('NHK ')).map(f => f.publisher)).size, 1);
assert.ok(!feeds.some(f => ['拉丁美洲', '中東'].includes(f.region)));
assert.ok(html.includes('id="coverage"'));
assert.ok(html.includes('id="language"'));
const categorySource = script.slice(script.indexOf('function isExcludedArticle('), script.indexOf('function parse('));
const classify = new Function(categorySource + '; return category;')();
for (const [title, expected] of [
  ['半導体メーカーが新技術を発表', '科技'],
  ['韓国の大統領選挙が始まる', '政治'],
  ['정부, 새로운 경제 정책 발표', '經濟'],
  ['백신 임상 시험 시작', '醫療與健康'],
  ['미사일 시험 발사', '軍事'],
  ['映画祭が開幕', '藝術與娛樂'],
  ['Literature exhibition opens', '藝術與娛樂'],
  ['Awards showcase fashion brilliance', '綜合'],
  ['Environmental champion honoured', '綜合']
]) assert.equal(classify(title, {}), expected, title);
assert.equal(classify('Public health update', {category:'健康'}), '醫療與健康');
const {isTaiwan, isF16, deduplicate} = new Function(categorySource + '; return {isTaiwan,isF16,deduplicate};')();
const isExcludedArticle = new Function(categorySource + '; return isExcludedArticle;')();
for (const article of [
  {f:{name:'Taipei Times'},url:'https://news.google.com/rss/articles/example'},
  {f:{name:'TaipeiTimes'},url:'https://www.bing.com/news/example'},
  {f:{name:'Other'},url:'https://www.taipeitimes.com/News/example'},
  {f:{name:'Other'},url:'https://www.bing.com/news?url=https%3A%2F%2Fwww.taipeitimes.com%2FNews%2Fexample'},
  {f:{name:'Other'},publisherUrl:'https://taipeitimes.com',url:'https://news.google.com/rss/articles/example'}
]) assert.ok(isExcludedArticle(article));
assert.ok(!isExcludedArticle({title:'Taipei Times mentioned by another outlet',f:{name:'PBS News Hour'},url:'https://www.pbs.org/newshour/world/example'}));
for (const text of ['Taïwan', 'Taiwans Wirtschaft', 'Taiwán', 'Đài Loan', 'Taiwan Indonesia', 'ไต้หวัน', '台灣', '台湾', '대만']) assert.ok(isTaiwan(text), text);
assert.ok(!isTaiwan('Thailand and Vietnam'));
for (const text of ['F-16 fighter', 'F16', 'F 16', 'F‑16V', 'F-16C/D', 'Fighting Falcon']) assert.ok(isF16(text), text);
for (const text of ['F-160 truck', 'Viper snake', 'F-35 aircraft']) assert.ok(!isF16(text), text);
const duplicates = deduplicate([
  {title:'Taiwan: new report!', url:'https://a.test/1', date:1, f:{}},
  {title:'TAIWAN — new report', url:'https://news.google.com/rss/2', date:2, f:{watch:'taiwan'}},
  {title:'Different title', url:'https://a.test/1', date:0, f:{}}
]);
assert.equal(duplicates.length, 1);
assert.equal(duplicates[0].url, 'https://a.test/1');
for (const id of ['999', '-1', 'https://example.com', '']) {
  assert.equal((await worker.fetch(new Request(`https://worldwire.example/api/feed?id=${encodeURIComponent(id)}`))).status, 400);
}
assert.equal((await worker.fetch(new Request('https://worldwire.example/missing'))).status, 404);
const originalFetch = globalThis.fetch;
try {
  const tracker = feeds.find(f => f.search && f.lang === 'fr');
  globalThis.fetch = async url => String(url).includes('news.google.com')
    ? new Response('Unavailable', {status:403})
    : new Response('<?xml version="1.0" encoding="UTF-8"?><rss><channel><item><title>Taïwan report</title></item></channel></rss>');
  const fallback = await worker.fetch(new Request(`https://worldwire.example/api/feed?id=${tracker.id}`));
  assert.equal(fallback.status, 200);
  assert.equal(fallback.headers.get('X-News-Index'), 'bing');
  assert.ok((await fallback.text()).includes('Taïwan report'));
} finally { globalThis.fetch = originalFetch; }
console.log('Passed: HTML, embedded JavaScript, section buttons, feed allowlist, and 404 routing.');
