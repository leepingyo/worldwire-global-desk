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
for (const id of ['999', '-1', 'https://example.com', '']) {
  assert.equal((await worker.fetch(new Request(`https://worldwire.example/api/feed?id=${encodeURIComponent(id)}`))).status, 400);
}
assert.equal((await worker.fetch(new Request('https://worldwire.example/missing'))).status, 404);
console.log('Passed: HTML, embedded JavaScript, section buttons, feed allowlist, and 404 routing.');
