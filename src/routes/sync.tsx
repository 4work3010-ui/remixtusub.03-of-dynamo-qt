import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, DatabaseZap, FileSpreadsheet, Info, Link2, Loader2, UploadCloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/dynamo-shell';
import { items, type QTItem } from '@/lib/dynamo-data';
export const Route = createFileRoute('/sync')({ head: () => ({ meta: [{ title: 'Nạp CSV & Đồng bộ | DYNAMO QT' }, { name: 'description', content: 'Nạp tệp CSV hoặc đồng bộ trực tiếp từ Google Sheets công khai vào hệ thống luân chuyển QT.' }, { property: 'og:title', content: 'Nạp CSV & Đồng bộ | DYNAMO QT' }, { property: 'og:description', content: 'Đồng bộ dữ liệu gia công QT từ CSV hoặc Google Sheets.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: Sync });
const columns = ['ID_Key', 'phong_sx', 'doi_tuong_hang', 'ma_hang', 'so_luong', 'vat_lieu', 'do_cung', 'Kich_Thuoc_SP', 'kg_Lot', 'don_vi_tinh', 'don_gia', 'thanh_tien', 'ngay_gui_QT', 'cty_QT', 'TrangThai', 'So_DatHang'];
function parseLine(line: string) { const result: string[] = []; let part = ''; let quoted = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (ch === '"') { if (quoted && line[i + 1] === '"') { part += '"'; i++; } else quoted = !quoted; } else if (ch === ',' && !quoted) { result.push(part.trim()); part = ''; } else part += ch; } result.push(part.trim()); return result; }
function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(x => x.trim());
  if (lines.length < 2) return { rows: [] as Record<string, string>[], missing: columns, error: 'Tệp cần có dòng tiêu đề và ít nhất một dòng dữ liệu.' };
  const headers = parseLine(lines[0] ?? '');
  const missing = columns.filter(x => !headers.includes(x));
  if (missing.length) return { rows: [], missing, error: `Thiếu cột bắt buộc: ${missing.join(', ')}` };
  const rows = lines.slice(1).map(line => { const cells = parseLine(line); return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])); });
  return { rows, missing: [], error: '' };
}
function Sync() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetMsg, setSheetMsg] = useState('');
  const apply = (text: string, label: string) => {
    setDone(false);
    const parsed = parseCsv(text);
    setRows(parsed.rows);
    setName(label);
    setError(parsed.error);
    if (parsed.rows.length && parsed.rows.some(r => !r['ID_Key'] || !r['ma_hang'] || !r['So_DatHang'])) setError('Một số dòng thiếu ID_Key, ma_hang hoặc So_DatHang. Vui lòng kiểm tra dữ liệu.');
  };
  const load = async (file?: File) => {
    if (!file) return;
    setError(''); setSheetMsg('');
    if (!file.name.toLowerCase().endsWith('.csv')) { setRows([]); setError('Chỉ hỗ trợ tệp CSV.'); return; }
    apply(await file.text(), file.name);
  };
  const exportUrl = (url: string) => {
    const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    const gid = url.match(/[#&?]gid=([0-9]+)/)?.[1];
    if (!id) return null;
    return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
  };
  const syncSheet = async () => {
    setError(''); setSheetMsg(''); setDone(false); setRows([]);
    const url = exportUrl(sheetUrl.trim());
    if (!url) { setError('Link không hợp lệ. Hãy dán link chia sẻ Google Sheets dạng .../spreadsheets/d/...'); return; }
    setSheetBusy(true);
    try {
      let res = await fetch(url);
      if (!res.ok) { res = await fetch(url.replace('/export?format=csv', '/gviz/tq?tqx=out:csv')); }
      if (!res.ok) throw new Error(`Google trả về mã ${res.status}`);
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('Tệp chưa được chia sẻ công khai ("Anyone with the link").');
      apply(text, 'Google Sheets');
      setSheetMsg('Đã đọc dữ liệu từ Google Sheets.');
    } catch (e) {
      setError(e instanceof Error ? `Không tải được Google Sheets: ${e.message}` : 'Không tải được Google Sheets.');
    } finally { setSheetBusy(false); }
  };
  const download = () => {
    const content = [columns.join(','), ...items.map(i => columns.map(k => `"${String(i[k as keyof QTItem] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }));
    a.download = 'dynamo-qt-mau.csv'; a.click(); URL.revokeObjectURL(a.href);
  };
  return <><PageHeading eyebrow="HỆ THỐNG / DỮ LIỆU" title="Nạp CSV & Đồng bộ dữ liệu" description="Nạp tệp CSV hoặc đồng bộ trực tiếp từ Google Sheets công khai để kiểm tra cấu trúc và xem trước kết quả." />
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="mes-card p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary"><Link2 size={20} /></span>
          <div><h2 className="font-display text-base font-bold">Đồng bộ từ Google Sheets</h2><p className="mt-1 text-xs text-muted-foreground">Dán link chia sẻ công khai ("Anyone with the link").</p></div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={sheetUrl} onChange={e => { setSheetUrl(e.target.value); setError(''); setSheetMsg(''); }} placeholder="https://docs.google.com/spreadsheets/d/..." aria-label="Link Google Sheets" className="h-10 min-w-0 flex-1 rounded-sm border border-input bg-card px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary" />
          <Button onClick={syncSheet} disabled={sheetBusy} className="h-10 shrink-0 rounded-sm font-bold">{sheetBusy ? <Loader2 size={15} className="animate-spin" /> : <DatabaseZap size={15} />}{sheetBusy ? 'Đang tải...' : 'Tải & kiểm tra'}</Button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Hệ thống tự chuyển link chia sẻ thành luồng xuất CSV trực tiếp. Nếu link là dạng chỉnh sửa (edit#gid=...), sheet hiện tại sẽ được dùng; thiếu gid thì lấy sheet đầu tiên.</p>
        {sheetMsg && <p className="mt-3 flex items-center gap-2 border border-primary/30 bg-primary/10 p-2.5 text-xs font-semibold text-primary"><CheckCircle2 size={15} />{sheetMsg}</p>}
        <div className="my-5 border-t border-border" />
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-sm bg-setup/10 text-setup"><UploadCloud size={20} /></span>
          <div><h2 className="font-display text-base font-bold">Nạp tệp CSV</h2><p className="mt-1 text-xs text-muted-foreground">Kéo thả hoặc chọn tệp CSV UTF-8 có dòng tiêu đề.</p></div>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => load(e.target.files?.[0])} />
        <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); load(e.dataTransfer.files[0]); }} className="mt-4 flex min-h-[140px] flex-col items-center justify-center border border-dashed border-input bg-secondary/50 p-6 text-center">
          <FileSpreadsheet size={26} className="mb-3 text-primary" />
          <p className="text-sm font-semibold">{name || 'Kéo thả tệp CSV vào đây'}</p>
          <Button className="mt-4" size="sm" onClick={() => fileRef.current?.click()}>Chọn tệp CSV</Button>
        </div>
      </section>
      <section className="mes-card p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-sm bg-info/10 text-info"><DatabaseZap size={20} /></span>
          <div><h2 className="font-display text-base font-bold">Cấu trúc dữ liệu bắt buộc</h2><p className="mt-1 text-xs text-muted-foreground">Áp dụng cho cả CSV và Google Sheets</p></div>
        </div>
        <div className="flex flex-wrap gap-2">{columns.map(c => <span key={c} className="border border-border bg-secondary px-2 py-1 font-mono text-[10px] text-muted-foreground">{c}</span>)}</div>
        <div className="my-6 border-t border-border" />
        <Button variant="outline" size="sm" onClick={download}><FileSpreadsheet size={15} /> Tải CSV mẫu</Button>
        {error && <p role="alert" className="mt-4 flex gap-2 border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"><AlertCircle size={15} className="shrink-0" />{error}</p>}
        {rows.length > 0 && !error && <div className="mt-4 flex items-center justify-between gap-3 border border-primary/30 bg-primary/10 p-3 text-xs"><span className="flex items-center gap-2 font-semibold text-primary"><CheckCircle2 size={16} /> Đã đọc {rows.length} dòng từ {name}</span><Button size="sm" onClick={() => setDone(true)}>{done ? 'Đã mô phỏng' : 'Mô phỏng đồng bộ'}</Button></div>}
        {done && <p className="mt-3 text-xs font-semibold text-primary">Mô phỏng hoàn tất. Dữ liệu trên các màn hình vẫn là bộ mẫu ban đầu.</p>}
        <div className="mt-6 flex gap-2 text-[11px] leading-relaxed text-muted-foreground"><Info size={15} className="shrink-0 text-warning" /><p>Chế độ mô phỏng chỉ kiểm tra và xem trước dữ liệu trên trình duyệt, không ghi đè bộ mẫu hoặc lưu lên máy chủ.</p></div>
      </section>
    </div>
    {rows.length > 0 && !error && <section className="mes-card mt-6">
      <div className="border-b border-border p-5"><h2 className="font-display text-base font-bold">Xem trước dữ liệu</h2><p className="mt-1 text-xs text-muted-foreground">Hiển thị tối đa 10 dòng đầu tiên · Tổng {rows.length} dòng</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-xs"><thead className="bg-secondary text-muted-foreground"><tr>{['ID_Key', 'phong_sx', 'ma_hang', 'vat_lieu', 'so_luong', 'cty_QT', 'TrangThai', 'So_DatHang'].map(c => <th key={c} className="px-4 py-3 font-mono text-[10px]">{c}</th>)}</tr></thead><tbody>{rows.slice(0, 10).map((r, i) => <tr key={i} className="border-t border-border">{['ID_Key', 'phong_sx', 'ma_hang', 'vat_lieu', 'so_luong', 'cty_QT', 'TrangThai', 'So_DatHang'].map(c => <td key={c} className="whitespace-nowrap px-4 py-3">{r[c]}</td>)}</tr>)}</tbody></table></div>
    </section>}</>;
}
