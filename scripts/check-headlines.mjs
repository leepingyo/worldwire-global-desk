import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../worker/index.js';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(await readFile(new URL('../source-health.sql',import.meta.url),'utf8'));
const db={prepare(sql){const statement=sqlite.prepare(sql);let params={};const args=()=>Object.keys(params).length?[params]:[];return {bind(...v){params=Object.fromEntries(v.map((x,i)=>[String(i+1),x]));return this},async all(){return {results:statement.all(...args())}},async first(){return statement.get(...args())},async run(){return {meta:statement.run(...args())}}}},async batch(s){return Promise.all(s.map(x=>x.run()))}};
const now=Date.parse('2026-11-16T04:00:00Z'); // 台北12:00，固定三小時邊界。
let aiCalls=0,mode='news',selected=[];
const env={SOURCE_HEALTH:db,AI:{async run(model,input){aiCalls++;assert.ok(model.includes('llama'));selected=JSON.parse(input.messages[1].content);if(mode==='ai-fail')throw Error('Temporary AI failure');return {response:JSON.stringify({headlines:selected.map(x=>({id:x.id,headline:x.category+'重點：各國公布最新政策與發展動向'}))})}}}};
const realFetch=globalThis.fetch;
function item(title,date,id){return '<item><title>'+title+'</title><description>Latest public announcement</description><link>https://example.org/'+id+'</link>'+(date?'<pubDate>'+new Date(date).toUTCString()+'</pubDate>':'')+'</item>'}
globalThis.fetch=async url=>{
  const hostname=new URL(url).hostname;
  const date=mode==='old'?now-7200000:mode==='future'?now+60000:now-1800000;
  const title=hostname.includes('bbci')?(String(url).includes('business')?'Central bank announces interest rate decision':String(url).includes('technology')?'New semiconductor technology policy':'President announces election policy'):hostname.includes('channelnewsasia')?'Singapore announces major regional policy':'Taiwan military defense policy announcement';
  return new Response('<rss><channel>'+item(title,date,encodeURIComponent(url))+item('Unknown date',0,'missing')+item('Too old',now-3600001,'old')+item('Future military',now+1000,'future')+'</channel></rss>');
};
const read=async()=> (await worker.fetch(new Request('https://test/api/headlines'),env)).json();
try{
  const missing=await worker.fetch(new Request('https://test/api/headlines'));
  assert.equal((await missing.json()).state,'unavailable');
  assert.equal((await worker.fetch(new Request('https://test/logo.svg'))).headers.get('Content-Type'),'image/svg+xml; charset=utf-8');
  await worker.scheduled({cron:'*/15 * * * *',scheduledTime:now},env);
  const first=await read();
  assert.equal(first.state,'ready');assert.equal(first.generatedAt,now);assert.equal(first.nextUpdateAt,now+10800000);
  assert.equal(first.headlines.length,5);assert.equal(new Set(first.headlines.map(x=>x.originalTitle)).size,5);
  for(const a of first.headlines)assert.ok(a.publishedAt>=now-3600000&&a.publishedAt<=now);
  assert.ok(selected.every(a=>!['Unknown date','Too old','Future military'].includes(a.title)));
  await Promise.all([worker.scheduled({cron:'*/15 * * * *',scheduledTime:now+900000},env),worker.scheduled({cron:'*/15 * * * *',scheduledTime:now+900000},env)]);
  assert.equal(aiCalls,1,'same batch cannot regenerate');
  mode='old';await worker.scheduled({cron:'*/15 * * * *',scheduledTime:now+10800000},env);
  assert.equal((await read()).headlines.length,0,'must not backfill stale stories');assert.equal(aiCalls,1);
  mode='news';const next=now+21600000;
  // Shift fixture date into this batch and inject an AI error; no fabricated translations.
  globalThis.fetch=async()=>new Response('<rss><channel>'+item('Military policy on Taiwan',next-600000,'next')+'</channel></rss>');
  mode='ai-fail';await worker.scheduled({cron:'*/15 * * * *',scheduledTime:next},env);
  assert.equal((await read()).state,'delayed');assert.equal((await read()).headlines.length,0);
  await worker.scheduled({cron:'*/15 * * * *',scheduledTime:next+900000},env);
  await worker.scheduled({cron:'*/15 * * * *',scheduledTime:next+1800000},env);
  const callsAfterLimit=aiCalls;
  await worker.scheduled({cron:'*/15 * * * *',scheduledTime:next+2700000},env);
  assert.equal(aiCalls,callsAfterLimit,'failed batch has a retry cap');
  console.log('Verified: one-hour window, five categories, dedup, three-hour lock, retry cap, stale exclusion, AI failure, missing bindings and SVG route.');
} finally {globalThis.fetch=realFetch;sqlite.close()}
