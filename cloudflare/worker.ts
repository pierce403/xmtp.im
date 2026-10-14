// Preserve recipient deep links while retaining genuine missing-asset responses.
function isRecipientPath(pathname: string): boolean {
  let target: string;
  try {
    target = decodeURIComponent(pathname.replace(/^\//, '').replace(/\/$/, '')).replace(/^@/, '');
  } catch { return false; }
  if (!target || /[\s/\\\u0000-\u001f]/u.test(target)) return false;
  if (/^0x[\da-f]{40}$/iu.test(target)) return true;
  return target.includes('.') && !target.startsWith('0x') &&
    !/\.(?:js|mjs|css|json|html?|wasm|png|jpe?g|webp|svg|ico|woff2?|map|txt|xml)$/iu.test(target);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !['GET', 'HEAD'].includes(request.method)) return response;
    const url = new URL(request.url);
    if (!isRecipientPath(url.pathname)) return response;
    await response.body?.cancel();
    url.pathname = '/';
    const headers = new Headers(request.headers);
    headers.delete('Range');
    return env.ASSETS.fetch(new Request(url, { method: request.method, headers }));
  },
};
