import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.ts';

test('serves existing address, Unicode ENS and DNS-name routes while rejecting missing paths', async () => {
  const assets = { async fetch(request) { return new Response(null, { status: new URL(request.url).pathname === '/' ? 200 : 404 }); } };
  for (const path of ['/0x'+'1'.repeat(40), '/xmtp-docs.eth', '/@xmtp-docs.eth/', '/deanpierce.net', '/caf%C3%A9.eth']) assert.equal((await worker.fetch(new Request('https://xmtp.im'+path), { ASSETS: assets })).status, 200, path);
  for (const path of ['/migration-missing', '/assets/missing.js', '/missing.css', '/missing.wasm', '/a%2Fb.eth', '/bad%ZZ.eth']) assert.equal((await worker.fetch(new Request('https://xmtp.im'+path), { ASSETS: assets })).status, 404, path);
});

test('fallback preserves query and HEAD without forwarding Range to HTML', async () => {
  const calls = [];
  const env = { ASSETS: { async fetch(request) {
    calls.push(request);
    return calls.length === 1 ? new Response(null, { status: 404 }) : new Response(null, { status: 200 });
  } } };
  const response = await worker.fetch(new Request('https://xmtp.im/xmtp-docs.eth?q=retained', { method: 'HEAD', headers: { Range: 'bytes=0-1' } }), env);
  assert.equal(response.status, 200);
  assert.equal(calls[1].url, 'https://xmtp.im/?q=retained');
  assert.equal(calls[1].method, 'HEAD');
  assert.equal(calls[1].headers.has('Range'), false);
});

test('assets, missing paths and mutation methods retain original status', async () => {
  for (const [path, method, status] of [['/asset.js', 'GET', 200], ['/missing.js', 'GET', 404], ['/migration-missing', 'GET', 404], ['/name.eth', 'POST', 405]]) {
    let calls = 0;
    const response = await worker.fetch(new Request('https://xmtp.im'+path, { method }), { ASSETS: { async fetch() { calls++; return new Response(null, { status }); } } });
    assert.equal(response.status, status);
    assert.equal(calls, 1);
  }
});
