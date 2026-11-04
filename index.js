/**
 * Host half of the Nasdaq-100 panel bundle.
 *
 * Owns one read-only HTTP route on the Harness web carrier so the browser half
 * can read market data same-origin. The route owner (this plugin) applies its
 * own policy: it serves public market data only, never session or workspace data.
 */

import { buildDashboard, errorPayload } from './data.js';

export const inject = ['webServer'];

const ROUTE_PATH = '/dsh-nasdaq100/data';

export function apply(ctx) {
  const handler = async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'content-type': 'text/plain; charset=utf-8', allow: 'GET, HEAD' });
        res.end('Method Not Allowed');
        return;
      }
      let range = '1y';
      try {
        const url = new URL(req.url || ROUTE_PATH, 'http://127.0.0.1');
        range = url.searchParams.get('range') || '1y';
      } catch {
        // keep the default range
      }

      let payload;
      try {
        payload = await buildDashboard(range);
      } catch (error) {
        payload = errorPayload(error);
      }

      const body = JSON.stringify(payload);
      res.writeHead(payload.ok ? 200 : 502, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      try {
        if (!res.headersSent) {
          res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        }
        res.end(
          JSON.stringify({
            ok: false,
            error: { code: 'internal', message: error instanceof Error ? error.message : String(error) },
          }),
        );
      } catch {
        // response already gone
      }
    }
  };

  ctx.effect(
    () => ctx.webServer.register({ kind: 'exact', path: ROUTE_PATH, handler }),
    'nasdaq100: market data route',
  );
}
