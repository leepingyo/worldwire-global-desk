import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../worker/index.js';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(await readFile(new URL('../source-health.sql',import.meta.url),'utf8'));
const db = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    let params = {};
    const args = () => Object.keys(params).length ? [params] : [];
    return {
      bind(...values) { params = Object.fromEntries(values.map((value,index) => [String(index+1),value])); return this; },
      async all() { return {results:statement.all(...args())}; },
      async first() { return statement.get(...args()); },
      async run() { return {meta:statement.run(...args())}; }
    };
  },
  async batch(statements) { return Promise.all(statements.map(statement => statement.run())); }
};
const env = {SOURCE_HEALTH:db};
const catalog = async () => (await worker.fetch(new Request('https://test/api/sources'),env)).json();
const original = (await catalog()).feeds.find(feed => feed.id === 0);
const realFetch = globalThis.fetch;
const news = '<rss><channel><item><title>Article</title><link>https://example.org/article</link></item></channel></rss>';
let mode = 'empty';
let upstreamAttempts = 0;
globalThis.fetch = async url => {
  if (url === original.url) {
    upstreamAttempts++;
    if (mode === 'empty') return new Response('<rss><channel><item><title>Incomplete</title></item></channel></rss>');
    if (mode === 'offline') return new Response('Unavailable',{status:502});
  }
  return new Response(news);
};
try {
  const cycle = 6 * 60 * 60 * 1000;
  const check = n => worker.scheduled({cron:'*/15 * * * *',scheduledTime:n*cycle},env);
  const state = async () => (await catalog()).feeds.find(feed => feed.id === 0);
  await check(1);
  await check(1);
  assert.equal((await state()).failures,1);
  assert.equal(upstreamAttempts,1);
  mode = 'healthy';
  await check(2);
  assert.equal((await state()).failures,0);
  mode = 'offline';
  await check(3);
  await check(4);
  assert.equal((await state()).disabled,false);
  await check(5);
  assert.equal((await state()).disabled,true);
  await check(6);
  const attemptsBefore = upstreamAttempts;
  assert.equal((await worker.fetch(new Request('https://test/api/feed?id=0'),env)).status,410);
  assert.equal(upstreamAttempts,attemptsBefore);
  const weekly = {cron:'0 1 * * MON',scheduledTime:7*cycle};
  await worker.scheduled(weekly,env);
  await worker.scheduled(weekly,env);
  const after = await catalog();
  const added = after.feeds.filter(feed => feed.id >= 1000);
  assert.equal(added.length,1);
  assert.equal(added[0].region,original.region);
  assert.equal((await state()).replacement,added[0].name);
  assert.equal(after.weekly,weekly.scheduledTime);
  assert.equal((await worker.fetch(new Request('https://test/api/feed?id='+added[0].id),env)).status,200);
  console.log('Verified empty feed failure, idempotent checks, reset, third failure, upstream stop, same-region replacement and weekly retry.');
} finally {
  globalThis.fetch = realFetch;
  sqlite.close();
}
