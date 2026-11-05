const graph = 'https://dod-graph.microsoft.us';
const timeout = () => AbortSignal.timeout(10000);

export function createSharePointTicketStore({ tenantId, clientId, clientSecret, siteId, listId }) {
  if (![tenantId, clientId, clientSecret, siteId, listId].every(Boolean)) {
    throw new Error('Missing status API tenant, credential, site or list configuration');
  }
  const collection = new URL(
    '/v1.0/sites/' + encodeURIComponent(siteId) + '/lists/' + encodeURIComponent(listId) + '/items',
    graph
  );
  let accessToken;
  let expiresAt = 0;
  let tokenRequest;

  async function requestToken() {
    const response = await fetch(
      'https://login.microsoftonline.us/' + encodeURIComponent(tenantId) + '/oauth2/v2.0/token',
      {
        method: 'POST',
        redirect: 'error',
        signal: timeout(),
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials',
          scope: graph + '/.default'
        })
      }
    );
    if (!response.ok) throw new Error('Status API authentication failed');
    const body = await response.json();
    if (!body.access_token) throw new Error('No Graph access token received');
    accessToken = body.access_token;
    expiresAt = Date.now() + Math.max(0, Number(body.expires_in) - 60) * 1000;
    return accessToken;
  }

  async function getToken() {
    if (Date.now() < expiresAt) return accessToken;
    tokenRequest ??= requestToken().finally(() => { tokenRequest = undefined; });
    return tokenRequest;
  }

  async function listItems(filter, fields, limit) {
    let next = new URL(collection);
    next.searchParams.set('$filter', filter);
    next.searchParams.set('$expand', 'fields($select=' + fields + ')');
    next.searchParams.set('$select', 'id,fields');
    const rows = [];
    const visited = new Set();
    while (next) {
      if (next.origin !== collection.origin || next.pathname !== collection.pathname ||
          visited.has(next.href) || visited.size >= 100) {
        throw new Error('Unexpected Graph pagination');
      }
      visited.add(next.href);
      const response = await fetch(next, {
        headers: { Authorization: 'Bearer ' + await getToken() },
        redirect: 'error',
        signal: timeout()
      });
      if (response.status === 401) expiresAt = 0;
      if (!response.ok) throw new Error('Tickets query failed');
      const page = await response.json();
      if (!Array.isArray(page.value)) throw new Error('Invalid Tickets response');
      for (const item of page.value) {
        rows.push({ ...item.fields, id: item.id });
        if (limit && rows.length >= limit) return rows;
      }
      next = page['@odata.nextLink'] ? new URL(page['@odata.nextLink']) : null;
    }
    return rows;
  }

  return {
    async findByHash(hash) {
      const rows = await listItems(
        "fields/StatusTokenHash eq '" + hash + "'",
        'StatusTokenHash,StatusTokenExpiresAt,Title,Department,Service,Status,JoinedAt,FirstCalledAt,CalledLocation',
        2
      );
      return rows.length === 1 ? rows[0] : null;
    },
    readDepartment(department) {
      return listItems("fields/Department eq '" + department + "'", 'Department,Status,JoinedAt');
    }
  };
}
