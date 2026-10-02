// Client-side role simulation (no backend). Not real security — UI gating only.
// Roles: admin | leader | viewer | qt_<vendor> (partner, scoped to cty_QT = VENDOR).
export type Role = 'admin' | 'leader' | 'viewer' | `qt_${string}`;

export const AUTH_CONFIG_URL = 'https://docs.google.com/spreadsheets/d/1cC9VnRrjf3IgADbzYL1VulrqgcSf2h56XkXEJILdyuE/export?format=csv&gid=1278143039';

export const getVendorScope = (role: Role): string | null => role.startsWith('qt_') ? role.slice(3).toUpperCase() : null;

export const normalizeRole = (raw: string): Role | null => {
  const r = raw.trim().toLowerCase();
  if (r === 'admin' || r === 'leader' || r === 'viewer') return r;
  if (r === 'qc') return 'viewer';
  if (/^qt_[a-z0-9_-]+$/.test(r)) return r as Role;
  return null;
};

export const roleLabel = (role: Role) => {
  const v = getVendorScope(role);
  if (v) return `Đối tác: ${v}`;
  return role === 'admin' ? 'Admin Điều hành' : role === 'leader' ? 'Leader Phân xưởng' : 'Viewer (Chỉ xem)';
};
export const roleBadge = (role: Role) => getVendorScope(role) ? 'bg-warning/20 text-warning' : role === 'admin' ? 'bg-dynamo/20 text-dynamo' : role === 'leader' ? 'bg-sidebar-primary/20 text-sidebar-primary' : 'bg-info/20 text-info';

const RESTRICTED = ['/sync', '/audit-costs'];
export const canAccessRoute = (role: Role, path: string) => {
  if (role === 'admin') return true;
  if (role === 'leader') return !path.startsWith('/sync');
  return !RESTRICTED.some(p => path.startsWith(p));
};
export const canViewPricing = (role: Role) => role === 'admin' || role === 'leader';

export const readRole = (): Role => {
  if (typeof window === 'undefined') return 'admin';
  return normalizeRole(window.localStorage.getItem('dynamo-role') ?? '') ?? 'viewer';
};

let pricingVisible = true;
export const setPricingVisible = (v: boolean) => { pricingVisible = v; };
export const isPricingVisible = () => pricingVisible;

type AuthEntry = { role: Role; code: string; note: string };
const parseCsv = (text: string): AuthEntry[] => {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const head = (lines[0] ?? '').split(',').map(h => h.trim().toLowerCase());
  const iRole = head.indexOf('vai_tro'), iCode = head.indexOf('ma_code'), iNote = head.indexOf('ghi_chu');
  return lines.slice(1).map(l => {
    const c = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map(x => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()) ?? [];
    const role = normalizeRole(c[iRole] ?? '');
    return role && c[iCode] ? { role, code: c[iCode]!, note: c[iNote] ?? '' } : null;
  }).filter((x): x is AuthEntry => !!x);
};

/** Verify a ULID code against the AUTH_CONFIG sheet (cached copy used when offline). */
export async function verifyCode(code: string): Promise<AuthEntry | null> {
  const needle = code.trim().toLowerCase();
  if (!needle) return null;
  let entries: AuthEntry[] = [];
  try {
    const res = await fetch(`${AUTH_CONFIG_URL}&t=${Date.now()}`);
    if (!res.ok) throw new Error(String(res.status));
    entries = parseCsv(await res.text());
    window.localStorage.setItem('dynamo-auth-config', JSON.stringify(entries));
  } catch {
    try { entries = JSON.parse(window.localStorage.getItem('dynamo-auth-config') ?? '[]'); } catch { entries = []; }
  }
  return entries.find(e => e.code.toLowerCase() === needle) ?? null;
}
