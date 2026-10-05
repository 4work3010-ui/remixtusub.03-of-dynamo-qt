import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, DatabaseZap, FileSpreadsheet, Info, Link2, Loader2, RotateCcw, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { WebhookConfig } from '@/components/webhook-config';
import { items as sampleItems, money, number, type QTItem } from '@/lib/dynamo-data';
import { SHEET_URL, fetchSheetItems, mapRows, parseCsvRows } from '@/lib/dynamo-source';

export const Route = createFileRoute('/sync')({ head: () => ({ meta: [{ title: 'Nạp CSV & Đồng bộ | DYNAMO VIETNAM QT - MES' }, { name: 'description', content: 'Nạp tệp CSV hoặc đồng bộ trực tiếp từ Google Sheets công khai vào hệ thống luân chuyển QT.' }, { property: 'og:title', content: 'Nạp CSV & Đồng bộ | DYNAMO VIETNAM QT - MES' }, { property: 'og:description', content: 'Đồng bộ dữ liệu gia công QT từ CSV hoặc Google Sheets.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: Sync });

const columns = ['ID_Key', 'phong_sx', 'doi_tuong_hang', 'ma_hang', 'so_luong', 'vat_lieu', 'do_cung', 'Kich_Thuoc_SP', 'kg_Lot', 'don_vi_tinh', 'don_gia', 'thanh_tien', 'ngay_gui_QT', 'cty_QT', 'TrangThai', 'So_DatHang'];
const preview = ['ID_Key', 'phong_sx', 'ma_hang', 'vat_lieu', 'so_luong', 'cty_QT', 'TrangThai', 'So_DatHang'];

function Sync() {
  const { applyDataset, resetDataset, sourceLabel, dataset, isLive } = useDynamo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheetUrl, setSheetUrl] = useState(SHEET_URL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [rows, setRows] = useState<QTItem[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [applied, setApplied] = useState(false);

  const stage = (result: { items: QTItem[]; skipped: number }, name: string) => {
    setRows(result.items); setSkipped(result.skipped); setLabel(name); setApplied(false); setError('');
  };

  const syncSheet = async () => {
    setBusy(true); setError(''); setRows([]); setApplied(false);
    try { stage(await fetchSheetItems(sheetUrl.trim()), 'Google Sheets'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không tải được Google Sheets.'); }
    finally { setBusy(false); }
  };

  const loadFile = async (file?: File) => {
    if (!file) return;
    setError(''); setApplied(false);
    if (!file.name.toLowerCase().endsWith('.csv')) { setRows([]); setError('Chỉ hỗ trợ tệp CSV.'); return; }
    const parsed = parseCsvRows(await file.text());
    const missing = columns.filter(c => !parsed.headers.includes(c));
    if (missing.length) { setRows([]); setError(`Thiếu cột bắt buộc: ${missing.join(', ')}`); return; }
    const mapped = mapRows(parsed.rows);
    if (!mapped.items.length) { setRows([]); setError('Không có dòng dữ liệu hợp lệ trong tệp.'); return; }
    stage(mapped, file.name);
  };

  const download = () => {
    const content = [columns.join(','), ...sampleItems.map(i => columns.map(k => `"${String(i[k as keyof QTItem] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }));
    a.download = 'dynamo-qt-mau.csv'; a.click(); URL.revokeObjectURL(a.href);
  };

  const totalCost = rows.reduce((a, i) => a + i.thanh_tien, 0);
  const byWorkshop = (['PIN', 'INSERT', 'MOLD'] as const).map(w => ({ w, n: rows.filter(i => i.phong_sx === w).length }));

  return <><PageHeading eyebrow="HỆ THỐNG / DỮ LIỆU" title="Đồng bộ dữ liệu QT" description="Nạp dữ liệu thật từ Google Sheets công khai hoặc tệp CSV rồi áp dụng cho toàn bộ hệ thống." action={<span className="flex items-center gap-2 border border-border bg-card px-3 py-2 text-xs"><DatabaseZap size={14} className="text-primary" /> Nguồn hiện tại: <b>{sourceLabel}</b> · {dataset.length.toLocaleString('vi-VN')} dòng</span>} />
  <WebhookConfig />
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="mes-card p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary"><Link2 size={20} /></span>
          <div><h2 className="font-display text-base font-bold">Đồng bộ từ Google Sheets</h2><p className="mt-1 text-xs text-muted-foreground">Link chia sẻ công khai ("Anyone with the link").</p></div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={sheetUrl} onChange={e => { setSheetUrl(e.target.value); setError(''); }} placeholder="https://docs.google.com/spreadsheets/d/..." aria-label="Link Google Sheets" className="h-10 min-w-0 flex-1 rounded-sm border border-input bg-card px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary" />
          <Button onClick={syncSheet} disabled={busy} className="h-10 shrink-0 rounded-sm font-bold">{busy ? <Loader2 size={15} className="animate-spin" /> : <DatabaseZap size={15} />}{busy ? 'Đang tải...' : 'Tải & kiểm tra'}</Button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Hệ thống tự chuẩn hóa trạng thái, ngày tháng, khối lượng và chi phí; dòng thiếu mã khóa, mã hàng hoặc số đặt hàng sẽ được bỏ qua.</p>
        <div className="my-5 border-t border-border" />
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-sm bg-setup/10 text-setup"><UploadCloud size={20} /></span>
          <div><h2 className="font-display text-base font-bold">Nạp tệp CSV</h2><p className="mt-1 text-xs text-muted-foreground">Kéo thả hoặc chọn tệp CSV UTF-8 có dòng tiêu đề.</p></div>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => void loadFile(e.target.files?.[0])} />
        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); void loadFile(e.dataTransfer.files[0]); }} className="mt-4 flex min-h-[140px] flex-col items-center justify-center border border-dashed border-input bg-secondary/50 p-6 text-center">
          <FileSpreadsheet size={26} className="mb-3 text-primary" />
          <p className="text-sm font-semibold">{label || 'Kéo thả tệp CSV vào đây'}</p>
          <Button className="mt-4" size="sm" onClick={() => fileRef.current?.click()}>Chọn tệp CSV</Button>
        </div>
      </section>
      <section className="mes-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-sm bg-info/10 text-info"><DatabaseZap size={20} /></span>
          <div><h2 className="font-display text-base font-bold">Kết quả kiểm tra</h2><p className="mt-1 text-xs text-muted-foreground">Xem trước trước khi áp dụng cho toàn hệ thống</p></div>
        </div>
        {error && <p role="alert" className="mb-4 flex gap-2 border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"><AlertCircle size={15} className="shrink-0" />{error}</p>}
        {rows.length > 0 ? <>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="border border-border p-3"><p className="text-[10px] text-muted-foreground">DÒNG HỢP LỆ</p><p className="mt-1 font-display text-lg font-bold">{number(rows.length)}</p></div>
            <div className="border border-border p-3"><p className="text-[10px] text-muted-foreground">BỎ QUA</p><p className="mt-1 font-display text-lg font-bold">{number(skipped)}</p></div>
            <div className="border border-border p-3"><p className="text-[10px] text-muted-foreground">SỐ ĐƠN QT</p><p className="mt-1 font-display text-lg font-bold">{number(new Set(rows.map(i => i.So_DatHang)).size)}</p></div>
            <div className="border border-border p-3"><p className="text-[10px] text-muted-foreground">TỔNG CHI PHÍ</p><p className="mt-1 font-display text-sm font-bold">{money(totalCost)}</p></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">{byWorkshop.map(x => <span key={x.w} className="border border-border bg-secondary px-2 py-1">{x.w}: <b className="text-foreground">{number(x.n)}</b></span>)}</div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button onClick={() => { applyDataset(rows, label === 'Google Sheets' ? 'Google Sheets' : `Tệp ${label}`); setApplied(true); }} className="font-bold"><CheckCircle2 size={15} /> {applied ? 'Đã áp dụng' : 'Áp dụng vào toàn hệ thống'}</Button>
            {isLive && <Button variant="outline" onClick={() => { resetDataset(); setApplied(false); }}><RotateCcw size={15} /> Về bộ mẫu 12 dòng</Button>}
          </div>
          {applied && <p className="mt-3 text-xs font-semibold text-primary">Toàn bộ màn hình Tổng quan, Đơn hàng, Luân chuyển và Đối soát đã dùng dữ liệu này.</p>}
        </> : !error && <p className="text-xs text-muted-foreground">Chưa có dữ liệu kiểm tra. Nhấn "Tải & kiểm tra" hoặc chọn tệp CSV.</p>}
        <div className="my-6 border-t border-border" />
        <div className="flex flex-wrap gap-2">{columns.map(c => <span key={c} className="border border-border bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">{c}</span>)}</div>
        <Button variant="outline" size="sm" className="mt-4" onClick={download}><FileSpreadsheet size={15} /> Tải CSV mẫu</Button>
        <div className="mt-6 flex gap-2 text-[11px] leading-relaxed text-muted-foreground"><Info size={15} className="shrink-0 text-warning" /><p>Dữ liệu được lưu trong trình duyệt của bạn để dùng lại ở lần truy cập sau; bảng tính gốc không bị thay đổi.</p></div>
      </section>
    </div>
    {rows.length > 0 && <section className="mes-card mt-6">
      <div className="border-b border-border p-5"><h2 className="font-display text-base font-bold">Xem trước dữ liệu</h2><p className="mt-1 text-xs text-muted-foreground">10 dòng đầu tiên · Tổng {number(rows.length)} dòng hợp lệ</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-xs"><thead className="bg-secondary text-muted-foreground"><tr>{preview.map(c => <th key={c} className="px-4 py-3 font-mono text-[10px]">{c}</th>)}</tr></thead><tbody>{rows.slice(0, 10).map(r => <tr key={r.ID_Key} className="border-t border-border">{preview.map(c => <td key={c} className="whitespace-nowrap px-4 py-3">{String(r[c as keyof QTItem] ?? '')}</td>)}</tr>)}</tbody></table></div>
    </section>}</>;
}
