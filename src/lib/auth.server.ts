// Server-only: AUTH_CONFIG lookup. Never imported by client code.
export async function lookupCode(raw: string): Promise<{ ok: true; role: string; note: string } | { ok: false; error?: string }> {
  const needle = raw.trim().slice(0, 64).toLowerCase();
  if (!needle) return { ok: false };
  const url = 'https://docs.google.com/spreadsheets/d/1cC9VnRrjf3IgADbzYL1VulrqgcSf2h56XkXEJILdyuE/export?format=csv&gid=1278143039';
  let text = '';
  try {
    const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) { console.error(`AUTH_CONFIG fetch failed [${res.status}]`); return { ok: false, error: 'unavailable' }; }
    text = await res.text();
  } catch (e) {
    console.error('AUTH_CONFIG fetch error', e);
    return { ok: false, error: 'unavailable' };
  }
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const head = (lines[0] ?? '').split(',').map(h => h.trim().toLowerCase());
  const iRole = head.indexOf('vai_tro'), iCode = head.indexOf('ma_code'), iNote = head.indexOf('ghi_chu');
  for (const l of lines.slice(1)) {
    const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map(x => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()) ?? [];
    const code = (c[iCode] ?? '').toLowerCase();
    if (!code || code !== needle) continue;
    let role = (c[iRole] ?? '').trim().toLowerCase();
    if (role === 'qc') role = 'viewer';
    if (!['admin', 'leader', 'viewer'].includes(role) && !/^qt_[a-z0-9_-]+$/.test(role)) return { ok: false };
    return { ok: true, role, note: c[iNote] ?? '' };
  }
  return { ok: false };
}
