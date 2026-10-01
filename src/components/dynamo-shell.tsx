import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Activity, ArrowLeftRight, Boxes, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, Clock3, DatabaseZap, LayoutDashboard, Menu, Search, ShieldCheck, X } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { items, type QTItem, type Workshop } from '@/lib/dynamo-data';

type Filter = 'Tất cả' | Workshop;
type AppContextType = { workshop: Filter; setWorkshop: (v: Filter) => void; search: string; setSearch: (v: string) => void; filtered: QTItem[] };
const AppContext = createContext<AppContextType | null>(null);
export function useDynamo() { const context = useContext(AppContext); if (!context) throw new Error('Dynamo context missing'); return context; }
const nav: { to: '/dashboard' | '/orders' | '/tracking' | '/audit-costs' | '/materials' | '/sync'; label: string; icon: typeof LayoutDashboard; section?: string }[] = [
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard, section: 'ĐIỀU HÀNH' },
  { to: '/orders', label: 'Đơn đặt hàng', icon: ClipboardList },
  { to: '/tracking', label: 'Luân chuyển QT', icon: ArrowLeftRight },
  { to: '/audit-costs', label: 'Đối soát chi phí', icon: ShieldCheck, section: 'QUẢN LÝ' },
  { to: '/materials', label: 'Mác thép', icon: Boxes },
  { to: '/sync', label: 'Đồng bộ dữ liệu', icon: DatabaseZap, section: 'HỆ THỐNG' },
] as const;
export function DynamoShell({ children }: { children: ReactNode }) {
  const [workshop, setWorkshop] = useState<Filter>('Tất cả');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setNow(new Date()); const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  const filtered = useMemo(() => items.filter(i => (workshop === 'Tất cả' || i.phong_sx === workshop) && (!search || `${i.So_DatHang} ${i.ma_hang} ${i.ID_Key}`.toLowerCase().includes(search.toLowerCase()))), [workshop, search]);
  const current = nav.find(n => n.to === location.pathname);
  return <AppContext.Provider value={{ workshop, setWorkshop, search, setSearch, filtered }}>
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {mobileOpen && <div className="fixed inset-0 z-30 bg-overlay lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-200 lg:sticky lg:top-0 lg:h-screen ${collapsed ? 'lg:w-[76px]' : 'lg:w-[244px]'} ${mobileOpen ? 'w-[244px] translate-x-0' : 'w-[244px] -translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-border px-5">
          <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden" aria-label="DYNAMO QT — Tổng quan">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary font-black text-primary-foreground text-lg">D</span>
            {!collapsed && <span className="whitespace-nowrap font-display text-lg font-extrabold tracking-wide text-foreground">DYNAMO<span className="text-primary"> QT</span><span className="block font-sans text-[9px] font-semibold tracking-[.22em] text-muted-foreground">OPERATIONS SYSTEM</span></span>}
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Đóng menu" onClick={() => setMobileOpen(false)}><X /></Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {nav.map((n, index) => <div key={n.to}>
            {n.section && <p className={`mb-2 mt-5 px-3 text-[10px] font-bold tracking-[.16em] text-muted-foreground ${index === 0 ? '!mt-0' : ''} ${collapsed ? 'lg:text-center lg:px-0' : ''}`}>{collapsed ? <span className="lg:hidden">{n.section}</span> : n.section}</p>}
            <Link to={n.to} title={collapsed ? n.label : undefined} className={`mb-1 flex h-10 items-center gap-3 rounded px-3 text-[13px] font-medium transition-colors ${location.pathname === n.to ? 'bg-primary/15 text-primary border-l-2 border-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}><n.icon size={17} className="shrink-0"/><span className={collapsed ? 'lg:hidden' : ''}>{n.label}</span></Link>
          </div>)}
        </div>
        <div className="border-t border-border p-3">
          <div className={`mb-3 flex items-center gap-3 px-2 py-2 ${collapsed ? 'lg:justify-center' : ''}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-primary">QT</span><span className={collapsed ? 'lg:hidden' : ''}><span className="block text-xs font-semibold">Quản lý QT</span><span className="block text-[10px] text-muted-foreground">Phân xưởng sản xuất</span></span></div>
          <Button variant="ghost" size="icon" className="hidden w-full text-muted-foreground lg:flex" title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} onClick={() => setCollapsed(v => !v)}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex min-h-[76px] flex-wrap items-center gap-3 px-5 py-3 xl:gap-5 xl:px-8">
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu" onClick={() => setMobileOpen(true)}><Menu /></Button>
            <div className="mr-auto min-w-[140px]"><p className="text-[10px] font-semibold tracking-[.13em] text-muted-foreground">DYNAMO / ĐIỀU HÀNH QT</p><p className="font-display text-base font-bold">{current?.label ?? 'Tổng quan'}</p></div>
            <div className="relative order-3 w-full sm:order-none sm:w-56 xl:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"/><input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && search) navigate({ to: '/orders' }); }} placeholder="Tìm mã đơn, mã hàng..." aria-label="Tìm mã đơn, mã hàng" className="h-9 w-full rounded border border-input bg-secondary pl-9 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary" /></div>
            <div className="flex items-center rounded border border-border bg-secondary p-0.5" aria-label="Lọc phân xưởng">{(['Tất cả','PIN','INSERT','MOLD'] as const).map(v => <Button key={v} variant="ghost" size="sm" onClick={() => setWorkshop(v)} className={`h-7 rounded-sm px-2.5 text-[11px] ${workshop === v ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}>{v}</Button>)}</div>
            <div className="hidden items-center gap-2 border-l border-border pl-5 text-xs text-muted-foreground xl:flex"><span className="size-1.5 rounded-full bg-primary"/> Dữ liệu mẫu</div>
            <div className="hidden items-center gap-2 font-mono text-xs text-muted-foreground 2xl:flex"><Clock3 size={14}/>{now?.toLocaleTimeString('vi-VN', {hour12:false}) ?? '--:--:--'}</div>
          </div>
        </header>
        <main className="mx-auto max-w-[1700px] px-5 pb-14 pt-7 xl:px-8">{children}</main>
        <footer className="flex items-center justify-between border-t border-border px-5 py-4 text-[11px] text-muted-foreground xl:px-8"><span>© 2026 DYNAMO QT · Quản lý luân chuyển gia công</span><span className="flex items-center gap-1.5"><Activity size={12} className="text-primary"/> Hệ thống mô phỏng <CircleHelp size={12} className="ml-2"/></span></footer>
      </div>
    </div>
  </AppContext.Provider>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) { return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[10px] font-bold tracking-[.18em] text-primary">{eyebrow}</p><h1 className="font-display text-[28px] font-bold leading-tight text-foreground md:text-[32px]">{title}</h1><p className="mt-2 text-[13px] text-muted-foreground">{description}</p></div>{action}</div> }
