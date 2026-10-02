import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, CircleAlert, Download, GanttChart, PackageOpen, Table2, X } from 'lucide-react';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { date, daysLate, isLate, money, number, statuses, type QTItem } from '@/lib/dynamo-data';

export const Route = createFileRoute('/tracking')({
  head: () => ({ meta: [{ title: 'Luân chuyển QT | DYNAMO VIETNAM QT - MES' }, { name: 'description', content: 'Timeline giám sát lô gia công theo đơn hàng từ xuất xưởng đến nhập kho.' }, { property: 'og:title', content: 'Luân chuyển QT | DYNAMO VIETNAM QT - MES' }, { property: 'og:description', content: 'Theo dõi tiến độ và cảnh báo quá hạn gia công ngoài.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: Tracking,
});

type Priority = 'critical' | 'warning' | 'due_soon' | 'on_track' | 'done';
const PRIORITIES: { key: Priority; label: string; dot: string; chip: string }[] = [
  { key: 'critical', label: 'Quá hạn > 3 ngày', dot: 'bg-destructive', chip: 'border-destructive/40 bg-destructive/10 text-destructive' },
  { key: 'warning', label: 'Trễ 1 – 3 ngày', dot: 'bg-warning', chip: 'border-warning/40 bg-warning/10 text-warning' },
  { key: 'due_soon', label: 'Cận hạn trong 48h', dot: 'bg-info', chip: 'border-info/40 bg-info/10 text-info' },
  { key: 'on_track', label: 'Đúng hạn (đang chạy)', dot: 'bg-primary', chip: 'border-primary/40 bg-primary/10 text-primary' },
  { key: 'done', label: 'Đã nhập kho', dot: 'bg-muted-foreground', chip: 'border-border bg-secondary text-muted-foreground' },
];
const PAGE_SIZES = [10, 30, 50, 100];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY = 86400000;

function priorityOf(row: QTItem): Priority {
  if (row.TrangThai === 'Đã nhập kho') return 'done';
  const late = daysLate(row.han_tra);
  if (late > 3) return 'critical';
  if (late > 0) return 'warning';
  const diff = Math.floor((new Date(row.han_tra + 'T00:00:00').getTime() - new Date().setHours(0, 0, 0, 0)) / DAY);
  if (diff <= 2) return 'due_soon';
  return 'on_track';
}
const RANK: Record<Priority, number> = { critical: 0, warning: 1, due_soon: 2, on_track: 3, done: 4 };

function Tracking() {
  const { filtered } = useDynamo();
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  const [orderLimit, setOrderLimit] = useState(30);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<QTItem | null>(null);
  const [picked, setPicked] = useState<Priority[]>([]);
  const [dateField, setDateField] = useState<'ngay_gui_QT' | 'han_tra'>('ngay_gui_QT');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pageSize, setPageSize] = useState(30);
  const [shown, setShown] = useState<Record<string, number>>({});
  const [tablePage, setTablePage] = useState(0);
  const [range, setRange] = useState<'all' | 'today' | 'week' | 'this' | 'prev' | 'custom'>('all');

  const enriched = useMemo(() => filtered.map((row) => ({ row, p: priorityOf(row) })), [filtered]);

  const rows = useMemo(() => {
    const set = new Set(picked);
    return enriched
      .filter(({ row, p }) => {
        if (set.size && !set.has(p)) return false;
        const d = row[dateField];
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .sort((a, b) => RANK[a.p] - RANK[b.p] || a.row.han_tra.localeCompare(b.row.han_tra))
      .map((x) => x.row);
  }, [enriched, picked, dateField, from, to]);

  const counts = useMemo(() => {
    const map = { critical: 0, warning: 0, due_soon: 0, on_track: 0, done: 0 } as Record<Priority, number>;
    for (const e of enriched) map[e.p]++;
    return map;
  }, [enriched]);

  const byStatus = useMemo(() => {
    const map = new Map<string, QTItem[]>(statuses.map((s) => [s, [] as QTItem[]]));
    for (const r of rows) map.get(r.TrangThai)?.push(r);
    return map;
  }, [rows]);

  const lateCount = useMemo(() => rows.filter(isLate).length, [rows]);
  const totalKg = useMemo(() => rows.reduce((a, i) => a + i.kg_Lot, 0), [rows]);

  const toggle = (p: Priority) => { setPicked((v) => (v.includes(p) ? v.filter((x) => x !== p) : [...v, p])); setShown({}); setTablePage(0); };
  const reset = () => { setPicked([]); setFrom(''); setTo(''); setShown({}); setTablePage(0); };
  const preset = (kind: 'today' | 'week' | 'this' | 'prev' | 'all') => {
    const now = new Date();
    if (kind === 'all') { setFrom(''); setTo(''); }
    if (kind === 'today') { const t = ymd(now); setFrom(t); setTo(t); }
    if (kind === 'week') { setFrom(ymd(new Date(now.getTime() - 6 * DAY))); setTo(ymd(now)); }
    if (kind === 'this') { setFrom(ymd(new Date(now.getFullYear(), now.getMonth(), 1))); setTo(ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))); }
    if (kind === 'prev') { setFrom(ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1))); setTo(ymd(new Date(now.getFullYear(), now.getMonth(), 0))); }
    setShown({}); setTablePage(0);
  };
  const shiftMonth = (dir: -1 | 1) => {
    const base = from ? new Date(from + 'T00:00:00') : new Date();
    const m = new Date(base.getFullYear(), base.getMonth() + dir, 1);
    setFrom(ymd(m)); setTo(ymd(new Date(m.getFullYear(), m.getMonth() + 1, 0))); setShown({}); setTablePage(0);
  };

  const exportCsv = () => {
    const head = ['ID_Key', 'So_DatHang', 'phong_sx', 'ma_hang', 'vat_lieu', 'do_cung', 'so_luong', 'kg_Lot', 'cty_QT', 'ngay_gui_QT', 'han_tra', 'TrangThai', 'Tre_ngay'];
    const body = rows.map((r) => [r.ID_Key, r.So_DatHang, r.phong_sx, r.ma_hang, r.vat_lieu, r.do_cung, r.so_luong, r.kg_Lot, r.cty_QT, r.ngay_gui_QT, r.han_tra, r.TrangThai, isLate(r) ? daysLate(r.han_tra) : 0].join(','));
    const url = URL.createObjectURL(new Blob(['\ufeff' + [head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'luan-chuyen-qt.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const tableRows = rows.slice(tablePage * pageSize, tablePage * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  return (
    <>
      <PageHeading
        eyebrow="GIÁM SÁT / LUÂN CHUYỂN"
        title="Theo dõi luân chuyển"
        description="Tiến độ từng lô hàng từ phân xưởng qua đối tác gia công đến nhập kho."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"><CircleAlert size={15} />{number(lateCount)} lô quá hạn</span>
            <div className="flex border border-border">
              <button onClick={() => setView('timeline')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${view === 'timeline' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}><GanttChart size={14} /> Timeline</button>
              <button onClick={() => setView('table')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}><Table2 size={14} /> Bảng</button>
            </div>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 border border-border bg-card px-3 py-2">
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium">
            Mức ưu tiên: <b>{picked.length ? `${picked.length} đã chọn` : 'Tất cả'}</b><ChevronRight size={12} className="rotate-90" />
          </summary>
          <div className="absolute left-0 z-30 mt-1 w-60 border border-border bg-popover p-1 shadow-lg">
            {PRIORITIES.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-accent">
                <input type="checkbox" checked={picked.includes(p.key)} onChange={() => toggle(p.key)} />
                <span className={`size-2 rounded-full ${p.dot}`} />{p.label}<b className="ml-auto font-mono">{number(counts[p.key])}</b>
              </label>
            ))}
          </div>
        </details>
        <select value={dateField} onChange={(e) => { setDateField(e.target.value as 'ngay_gui_QT' | 'han_tra'); setShown({}); setTablePage(0); }} className="border border-border bg-background px-2 py-1.5 text-[11px]">
          <option value="ngay_gui_QT">Theo ngày gửi QT</option>
          <option value="han_tra">Theo hạn trả</option>
        </select>
        <select value={range} onChange={(e) => { const v = e.target.value as typeof range; setRange(v); if (v !== 'custom') preset(v); }} className="border border-border bg-background px-2 py-1.5 text-[11px]">
          <option value="all">Thời gian: Tất cả</option>
          <option value="today">Hôm nay</option>
          <option value="week">7 ngày qua</option>
          <option value="this">Tháng này</option>
          <option value="prev">Tháng trước</option>
          <option value="custom">Tùy chọn ngày…</option>
        </select>
        {range === 'custom' && (
          <>
            <button onClick={() => shiftMonth(-1)} aria-label="Tháng trước" className="border border-border bg-background p-1.5 text-muted-foreground"><ChevronLeft size={14} /></button>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setShown({}); setTablePage(0); }} className="border border-border bg-background px-2 py-1 text-[11px]" />
            <span className="text-[11px] text-muted-foreground">→</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setShown({}); setTablePage(0); }} className="border border-border bg-background px-2 py-1 text-[11px]" />
            <button onClick={() => shiftMonth(1)} aria-label="Tháng sau" className="border border-border bg-background p-1.5 text-muted-foreground"><ChevronRight size={14} /></button>
          </>
        )}
        {(picked.length > 0 || from || to) && <button onClick={() => { reset(); setRange('all'); }} className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"><X size={12} /> Xóa lọc</button>}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>{number(rows.length)} / {number(filtered.length)} lô khớp bộ lọc</span>
        <span className="size-1 rounded-full bg-muted-foreground" />
        <span>{number(totalKg, 1)} kg tổng khối lượng</span>
        <span className="size-1 rounded-full bg-muted-foreground" />
        <span>02 đối tác gia công</span>
      </div>

      {view === 'timeline' ? (() => {
        const groups: { id: string; lots: QTItem[] }[] = [];
        const idx = new Map<string, number>();
        for (const r of rows) { const k = idx.get(r.So_DatHang); if (k === undefined) { idx.set(r.So_DatHang, groups.length); groups.push({ id: r.So_DatHang, lots: [r] }); } else groups[k]!.lots.push(r); }
        const visible = groups.slice(0, orderLimit);
        const today = ymd(new Date());
        let min = today, max = today;
        for (const g of visible) for (const l of g.lots) { if (l.ngay_gui_QT < min) min = l.ngay_gui_QT; const e = l.ngay_nhan ?? l.han_tra; if (e > max) max = e; if (l.han_tra > max) max = l.han_tra; }
        const t0 = new Date(min + 'T00:00:00').getTime(); const span = Math.max(DAY, new Date(max + 'T00:00:00').getTime() + DAY - t0);
        const pos = (d: string) => ((new Date(d + 'T00:00:00').getTime() - t0) / span) * 100;
        const ticks = Array.from({ length: 6 }, (_, k) => ymd(new Date(t0 + (span * k) / 5)));
        const barColor: Record<Priority, string> = { critical: 'bg-destructive', warning: 'bg-warning', due_soon: 'bg-info', on_track: 'bg-primary/70', done: 'bg-muted-foreground/60' };
        return (
          <div className="border border-border bg-card">
            <div className="grid grid-cols-[minmax(220px,300px)_1fr] border-b border-border bg-secondary text-[10px] font-bold text-muted-foreground">
              <div className="px-3 py-2">ĐƠN HÀNG / LÔ</div>
              <div className="relative h-8">{ticks.map((t, k) => <span key={k} className="absolute top-2 -translate-x-1/2 whitespace-nowrap" style={{ left: `${Math.min(96, Math.max(4, k * 20))}%` }}>{date(t)}</span>)}</div>
            </div>
            {visible.length ? visible.map((g) => {
              const open = !collapsed[g.id];
              const late = g.lots.filter(isLate).length;
              return (
                <div key={g.id} className="border-b border-border">
                  <button onClick={() => setCollapsed((c) => ({ ...c, [g.id]: open }))} className="grid w-full grid-cols-[minmax(220px,300px)_1fr] bg-secondary/40 text-left hover:bg-secondary">
                    <span className="flex items-center gap-2 px-3 py-2"><ChevronRight size={13} className={`transition-transform ${open ? 'rotate-90' : ''}`} /><b className="font-mono text-xs text-primary">{g.id}</b><span className="text-[10px] text-muted-foreground">{g.lots.length} lô · {g.lots[0]?.cty_QT}</span></span>
                    <span className="flex items-center px-3 text-[10px] text-muted-foreground">{late > 0 && <b className="text-destructive">{late} lô trễ hạn</b>}</span>
                  </button>
                  {open && g.lots.slice(0, 50).map((l) => {
                    const p = priorityOf(l);
                    const end = l.ngay_nhan ?? (today > l.ngay_gui_QT ? today : l.ngay_gui_QT);
                    const left = pos(l.ngay_gui_QT); const width = Math.max(1, pos(end) + (DAY / span) * 100 - left);
                    return (
                      <button key={l.ID_Key} onClick={() => setDetail(l)} className="grid w-full grid-cols-[minmax(220px,300px)_1fr] border-t border-border/60 text-left hover:bg-accent/40">
                        <span className="min-w-0 px-3 py-2 pl-8"><span className="block truncate font-mono text-[11px] font-semibold">{l.ma_hang}</span><span className="block truncate text-[10px] text-muted-foreground">{l.phong_sx} · {l.vat_lieu} · {l.TrangThai}</span></span>
                        <span className="relative my-2 mr-3 h-6">
                          <span className="absolute inset-y-0 w-px bg-destructive/60" style={{ left: `${pos(today)}%` }} />
                          <span className="absolute inset-y-0 w-px border-l border-dashed border-muted-foreground/50" style={{ left: `${pos(l.han_tra) + (DAY / span) * 100}%` }} title={`Hạn trả ${date(l.han_tra)}`} />
                          <span className={`absolute top-1 flex h-4 items-center overflow-hidden rounded-sm px-1.5 text-[9px] font-bold text-primary-foreground ${barColor[p]} ${p === 'critical' ? 'animate-late-border' : ''}`} style={{ left: `${left}%`, width: `${width}%` }}>{isLate(l) ? `Trễ ${daysLate(l.han_tra)}d` : ''}</span>
                        </span>
                      </button>
                    );
                  })}
                  {open && g.lots.length > 50 && <p className="px-8 py-2 text-[10px] text-muted-foreground">+{g.lots.length - 50} lô khác — dùng chế độ Bảng để xem đủ</p>}
                </div>
              );
            }) : <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-muted-foreground"><PackageOpen size={22} /><p className="text-xs">Không có lô hàng khớp bộ lọc</p></div>}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-[11px] text-muted-foreground">
              <span className="flex flex-wrap items-center gap-3">{PRIORITIES.map((p) => <span key={p.key} className="flex items-center gap-1"><span className={`size-2 rounded-full ${p.dot}`} />{p.label}</span>)}<span className="flex items-center gap-1"><span className="h-3 w-px bg-destructive" />Hôm nay</span></span>
              {groups.length > visible.length && <button onClick={() => setOrderLimit((n) => n + pageSize)} className="border border-border px-3 py-1.5 font-semibold text-primary">Đang xem {number(visible.length)} / {number(groups.length)} đơn — Tải thêm {pageSize} đơn</button>}
            </div>
          </div>
        );
      })() : (
        <div className="border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-[11px]">
              <thead className="bg-secondary text-muted-foreground">
                <tr>{['Mã lô', 'Đơn hàng', 'Xưởng', 'Mã hàng', 'Vật liệu', 'Độ cứng', 'SL', 'Kg', 'Vendor', 'Ngày gửi', 'Hạn trả', 'Trạng thái', 'Trễ'].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {tableRows.length ? tableRows.map((r) => (
                  <tr key={r.ID_Key} className="border-t border-border">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-primary">{r.ID_Key}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono">{r.So_DatHang}</td>
                    <td className="px-3 py-2">{r.phong_sx}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono font-semibold">{r.ma_hang}</td>
                    <td className="px-3 py-2">{r.vat_lieu}</td>
                    <td className="whitespace-nowrap px-3 py-2">{r.do_cung}</td>
                    <td className="px-3 py-2 text-right">{number(r.so_luong)}</td>
                    <td className="px-3 py-2 text-right">{number(r.kg_Lot, 1)}</td>
                    <td className="px-3 py-2">{r.cty_QT}</td>
                    <td className="whitespace-nowrap px-3 py-2">{date(r.ngay_gui_QT)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{date(r.han_tra)}</td>
                    <td className="whitespace-nowrap px-3 py-2">{r.TrangThai}</td>
                    <td className="px-3 py-2">{isLate(r) ? <b className="text-destructive">{daysLate(r.han_tra)} ngày</b> : '—'}</td>
                  </tr>
                )) : <tr><td colSpan={13} className="px-3 py-10 text-center text-muted-foreground">Không có lô hàng khớp bộ lọc</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-2">
              Đang xem {number(rows.length ? tablePage * pageSize + 1 : 0)} – {number(Math.min((tablePage + 1) * pageSize, rows.length))} trong {number(rows.length)} lô
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setTablePage(0); }} className="border border-border bg-background px-2 py-1 text-[11px]">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} dòng/trang</option>)}
              </select>
              <button onClick={exportCsv} className="flex items-center gap-1.5 border border-border bg-background px-2.5 py-1 font-medium"><Download size={13} /> Xuất CSV</button>
            </span>
            <div className="flex items-center gap-2">
              <button disabled={tablePage === 0} onClick={() => setTablePage((p) => p - 1)} className="border border-border px-2.5 py-1.5 disabled:opacity-40">Trang trước</button>
              <span>Trang {tablePage + 1} / {number(totalPages)}</span>
              <button disabled={tablePage + 1 >= totalPages} onClick={() => setTablePage((p) => p + 1)} className="border border-border px-2.5 py-1.5 disabled:opacity-40">Trang sau</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between"><div><p className="text-[10px] font-bold tracking-widest text-primary">{detail.So_DatHang}</p><h3 className="font-mono text-lg font-bold">{detail.ma_hang}</h3></div><button onClick={() => setDetail(null)} aria-label="Đóng" className="text-muted-foreground"><X size={16} /></button></div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              {([['Mã lô', detail.ID_Key], ['Phân xưởng', detail.phong_sx], ['Kích thước SP', detail.Kich_Thuoc_SP], ['Mác thép', detail.vat_lieu], ['Độ cứng', detail.do_cung], ['Số lượng / Kg', `${number(detail.so_luong)} pcs · ${number(detail.kg_Lot, 1)} kg`], ['Đơn giá', `${money(detail.don_gia)}/${detail.don_vi_tinh}`], ['Thành tiền', money(detail.thanh_tien)], ['Nhà thầu', detail.cty_QT], ['Trạng thái', detail.TrangThai], ['Ngày gửi', date(detail.ngay_gui_QT)], ['Hạn trả', date(detail.han_tra)], ['Ngày nhận', detail.ngay_nhan ? date(detail.ngay_nhan) : '—'], ['Trễ hạn', isLate(detail) ? `${daysLate(detail.han_tra)} ngày` : '—']] as const).map(([k, v]) => <div key={k}><dt className="text-[10px] font-bold text-muted-foreground">{k}</dt><dd className="mt-0.5 font-semibold">{v}</dd></div>)}
            </dl>
          </div>
        </div>
      )}

      <p className="mt-5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><ArrowRight size={13} /> Dữ liệu phản ánh nguồn đã áp dụng trong mục Đồng bộ; bảng tính gốc không bị thay đổi.</p>
    </>
  );
}
