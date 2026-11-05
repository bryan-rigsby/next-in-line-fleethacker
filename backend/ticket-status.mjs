import { createHash, randomBytes } from 'node:crypto';

export const statusTokenPattern = /^[A-Za-z0-9_-]{43}$/;
const departments = new Set(['N00', 'N00C', 'N1', 'N3', 'N4', 'N5', 'N6', 'N7', 'N9']);
const activeStatuses = new Set(['Waiting', 'Called', 'Serving']);

export function hashStatusToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createStatusToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashStatusToken(token) };
}

export async function getTicketStatus(token, store, now = Date.now()) {
  if (!statusTokenPattern.test(token)) return null;
  const hash = hashStatusToken(token);
  const ticket = await store.findByHash(hash);
  if (!ticket || ticket.StatusTokenHash !== hash ||
      !(Date.parse(ticket.StatusTokenExpiresAt) > now) ||
      !activeStatuses.has(ticket.Status) || !departments.has(ticket.Department)) return null;

  const joined = Date.parse(ticket.JoinedAt);
  const id = Number(ticket.id);
  if (!Number.isFinite(joined) || !Number.isSafeInteger(id) || id < 1) {
    throw new Error('Invalid ticket ordering data');
  }

  let queuePosition = null;
  if (ticket.Status === 'Waiting') {
    const queue = await store.readDepartment(ticket.Department);
    let ahead = 0;
    for (const row of queue) {
      if (row.Department !== ticket.Department || row.Status !== 'Waiting') continue;
      const time = Date.parse(row.JoinedAt);
      const rowId = Number(row.id);
      if (!Number.isFinite(time) || !Number.isSafeInteger(rowId) || rowId < 1) {
        throw new Error('Invalid queue ordering data');
      }
      if (rowId !== id && (time < joined || (time === joined && rowId < id))) ahead++;
    }
    queuePosition = ahead + 1;
  }

  return {
    ticketNumber: ticket.Title || 'Queue ticket',
    department: ticket.Department,
    serviceRequested: ticket.Service || '',
    status: ticket.Status,
    queuePosition,
    joinedAt: ticket.JoinedAt,
    calledAt: ticket.FirstCalledAt || null,
    calledLocation: ticket.Status === 'Called' || ticket.Status === 'Serving'
      ? ticket.CalledLocation || null
      : null,
    lastUpdatedAt: new Date(now).toISOString()
  };
}
