// Client-side role simulation (no backend). Not real security — UI gating only.
export type Role = 'admin' | 'leader' | 'qc';
export const ROLE_LABEL: Record<Role, string> = { admin: 'Admin Điều hành', leader: 'Leader Phân xưởng', qc: 'QC Kiểm hàng' };
export const ROLE_BADGE: Record<Role, string> = {
  admin: 'bg-dynamo/20 text-dynamo',
  leader: 'bg-sidebar-primary/20 text-sidebar-primary',
  qc: 'bg-warning/20 text-warning',
};
const BLOCKED: Record<Role, string[]> = { admin: [], leader: ['/sync'], qc: ['/sync', '/audit-costs'] };
export const canAccessRoute = (role: Role, path: string) => !BLOCKED[role].some(p => path.startsWith(p));
export const canViewPricing = (role: Role) => role !== 'qc';
export const readRole = (): Role => {
  if (typeof window === 'undefined') return 'admin';
  const r = window.localStorage.getItem('dynamo-role');
  return r === 'leader' || r === 'qc' ? r : 'admin';
};
let pricingVisible = true;
export const setPricingVisible = (v: boolean) => { pricingVisible = v; };
export const isPricingVisible = () => pricingVisible;
