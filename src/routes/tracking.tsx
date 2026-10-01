import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Download, LayoutGrid, PackageOpen, Table2, X } from 'lucide-react';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { date, daysLate, isLate, number, statuses, type QTItem } from '@/lib/dynamo-data';

export const Route = createFileRoute('/tracking')({
  head: () => ({ meta: [{ title: 'Luân chuyển QT | DYNAMO VIETNAM QT - MES' }, { name: 'description', content: 'Bảng Kanban giám sát lô gia công từ xuất xưởng đến nhập kho.' }, { property: 'og:title', content: 'Luân chuyển QT | DYNAMO VIETNAM QT - MES' }, { property: 'og:description', content: 'Theo dõi tiến độ và cảnh báo quá hạn gia công ngoài.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
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
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [picked, setPicked] = useState<Priority[]>([]);
  const [dateField, setDateField] = useState<'ngay_gui_QT' | 'han_tra'>('ngay_gui_QT');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pageSize, setPageSize] = useState(30);
  const [shown, setShown] = useState<Record<string, number>>({});
  const [tablePage, setTablePage] = useState(0);

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
              <button onClick={() => setView('kanban')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}><LayoutGrid size={14} /> Kanban</button>
              <button onClick={() => setView('table')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}><Table2 size={14} /> Bảng</button>
            </div>
          </div>
        }
      />

      <div className="mb-4 space-y-3 border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold tracking-wide text-muted-foreground">MỨC ƯU TIÊN</span>
          {PRIORITIES.map((p) => {
            const on = picked.includes(p.key);
            return (
              <button key={p.key} onClick={() => toggle(p.key)} className={`flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-medium ${on ? p.chip : 'border-border bg-background text-muted-foreground'}`}>
                <span className={`size-2 rounded-full ${p.dot}`} />{p.label}
                <b className="ml-1 font-mono">{number(counts[p.key])}</b>
              </button>
            );
          })}
          {(picked.length > 0 || from || to) && <button onClick={reset} className="flex items-center gap-1 border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground"><X size={12} /> Xóa lọc</button>}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-[11px] font-bold tracking-wide text-muted-foreground">THỜI GIAN</span>
          <select value={dateField} onChange={(e) => { setDateField(e.target.value as 'ngay_gui_QT' | 'han_tra'); setShown({}); setTablePage(0); }} className="border border-border bg-background px-2 py-1.5 text-[11px]">
            <option value="ngay_gui_QT">Ngày gửi QT</option>
            <option value="han_tra">Hạn trả</option>
          </select>
          <button onClick={() => shiftMonth(-1)} className="border border-border bg-background p-1.5 text-muted-foreground"><ChevronLeft size={14} /></button>
          <button onClick={() => shiftMonth(1)} className="border border-border bg-background p-1.5 text-muted-foreground"><ChevronRight size={14} /></button>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setShown({}); setTablePage(0); }} className="border border-border bg-background px-2 py-1.5 text-[11px]" />
          <span className="text-[11px] text-muted-foreground">→</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setShown({}); setTablePage(0); }} className="border border-border bg-background px-2 py-1.5 text-[11px]" />
          {([['today', 'Hôm nay'], ['week', '7 ngày qua'], ['this', 'Tháng này'], ['prev', 'Tháng trước'], ['all', 'Tất cả']] as const).map(([k, label]) => (
            <button key={k} onClick={() => preset(k)} className="border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground">{label}</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-[11px] font-bold tracking-wide text-muted-foreground">SỐ LÔ MỖI TRANG</span>
          {PAGE_SIZES.map((n) => (
            <button key={n} onClick={() => { setPageSize(n); setShown({}); setTablePage(0); }} className={`border px-2.5 py-1.5 text-[11px] font-semibold ${pageSize === n ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`}>{n}</button>
          ))}
          <button onClick={exportCsv} className="ml-auto flex items-center gap-1.5 border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground"><Download size={13} /> Xuất CSV kết quả lọc</button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span>{number(rows.length)} / {number(filtered.length)} lô khớp bộ lọc</span>
        <span className="size-1 rounded-full bg-muted-foreground" />
        <span>{number(totalKg, 1)} kg tổng khối lượng</span>
        <span className="size-1 rounded-full bg-muted-foreground" />
        <span>02 đối tác gia công</span>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {statuses.map((status, idx) => {
            const list = byStatus.get(status) ?? [];
            const limit = shown[status] ?? pageSize;
            const visible = list.slice(0, limit);
            const color = ['bg-muted-foreground', 'bg-info', 'bg-warning', 'bg-primary'][idx];
            return (
              <section key={status} className="min-w-0 bg-secondary/50">
                <div className="border border-border border-t-2 p-4" style={{ borderTopColor: `var(${['--muted-foreground', '--info', '--warning', '--primary'][idx]})` }}>
                  <div className="flex items-center justify-between"><h2 className="text-sm font-bold">{status}</h2><span className="flex min-w-6 items-center justify-center rounded-sm bg-background px-1 text-xs font-semibold">{number(list.length)}</span></div>
                  <p className="mt-2 text-[11px] text-muted-foreground">{number(list.reduce((a, i) => a + i.kg_Lot, 0), 1)} kg <span className={`mx-1 inline-block size-1.5 rounded-full ${color}`} /> {number(list.reduce((a, i) => a + i.so_luong, 0))} pcs</p>
                </div>
                <div className="space-y-2 p-2">
                  {visible.length ? visible.map((i) => (
                    <article key={i.ID_Key} className={`border bg-card p-4 ${isLate(i) ? 'animate-late-border border-destructive' : 'border-border'}`}>
                      <div className="mb-3 flex items-start justify-between gap-2"><span className="font-mono text-[11px] font-semibold text-primary">{i.So_DatHang}</span><span className="bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{i.phong_sx}</span></div>
                      <p className="font-mono text-sm font-semibold">{i.ma_hang}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{i.vat_lieu} · {i.cong_doan}</p>
                      <div className="my-3 border-t border-border" />
                      <div className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">{i.cty_QT}</span><span>{number(i.kg_Lot, 1)} kg</span></div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays size={12} /> Hạn {date(i.han_tra)}</span>{isLate(i) && <b className="text-destructive">Trễ {daysLate(i.han_tra)} ngày</b>}</div>
                    </article>
                  )) : <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-muted-foreground"><PackageOpen size={22} /><p className="text-xs">Chưa có lô hàng</p></div>}
                  {list.length > visible.length && (
                    <div className="space-y-1.5 px-1 py-2 text-center">
                      <p className="text-[11px] text-muted-foreground">Đang xem {number(visible.length)} / {number(list.length)} lô</p>
                      <button onClick={() => setShown((s) => ({ ...s, [status]: limit + pageSize }))} className="w-full border border-border bg-card px-3 py-2 text-[11px] font-semibold text-primary">Tải thêm {pageSize} lô</button>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
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
            <span>Đang xem {number(rows.length ? tablePage * pageSize + 1 : 0)} – {number(Math.min((tablePage + 1) * pageSize, rows.length))} trong {number(rows.length)} lô</span>
            <div className="flex items-center gap-2">
              <button disabled={tablePage === 0} onClick={() => setTablePage((p) => p - 1)} className="border border-border px-2.5 py-1.5 disabled:opacity-40">Trang trước</button>
              <span>Trang {tablePage + 1} / {number(totalPages)}</span>
              <button disabled={tablePage + 1 >= totalPages} onClick={() => setTablePage((p) => p + 1)} className="border border-border px-2.5 py-1.5 disabled:opacity-40">Trang sau</button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><ArrowRight size={13} /> Dữ liệu phản ánh nguồn đã áp dụng trong mục Đồng bộ; bảng tính gốc không bị thay đổi.</p>
    </>
  );
}
