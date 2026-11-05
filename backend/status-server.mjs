import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createSharePointTicketStore } from './sharepoint-ticket-store.mjs';
import { getTicketStatus } from './ticket-status.mjs';

const env = process.env;
const store = createSharePointTicketStore({
  tenantId: env.STATUS_TENANT_ID,
  clientId: env.STATUS_CLIENT_ID,
  clientSecret: env.STATUS_CLIENT_SECRET,
  siteId: env.STATUS_SITE_ID,
  listId: env.STATUS_LIST_ID
});
const page = await readFile(new URL('../frontend/Ticket_time/sailor_status.html', import.meta.url));

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const json = (status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(value));
  };
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(405, { error: 'Method not allowed' });
  }
  const path = (req.url || '').split('?')[0];
  const pageRoute = /^\/t\/[A-Za-z0-9_-]{43}$/.test(path);
  if (pageRoute) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(page);
  }
  const match = /^\/api\/tickets\/status\/([A-Za-z0-9_-]{43})$/.exec(path);
  if (!match) return json(404, { error: 'Ticket link unavailable' });

  try {
    const status = await getTicketStatus(match[1], store);
    return status ? json(200, status) : json(404, { error: 'Ticket link unavailable' });
  } catch {
    return json(503, { error: 'Ticket status temporarily unavailable' });
  }
}).listen(Number(env.PORT || 8080), env.STATUS_BIND_HOST || '127.0.0.1');
