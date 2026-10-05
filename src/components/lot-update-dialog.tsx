import { useState } from 'react';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDynamo } from '@/components/dynamo-shell';
import { getVendorScope } from '@/lib/dynamo-auth';
import { statuses, type QTItem, type Status } from '@/lib/dynamo-data';
import { updateLotProgress } from '@/lib/auth.functions';

export function LotUpdateButton({ item }: { item: QTItem }) {
  const { role, updateItem } = useDynamo();
  const vendor = getVendorScope(role);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>(item.TrangThai);
  const [hrc, setHrc] = useState(item.do_cung === '—' ? '' : item.do_cung);
  const [day, setDay] = useState(item.ngay_nhan ?? '');
  const [busy, setBusy] = useState(false);
  if (role !== 'admin' && !(vendor && vendor === String(item.cty_QT).toUpperCase())) return null;
  const save = async () => {
    if (hrc && !/^[0-9.,\s–-]+(HRC)?$/i.test(hrc.trim())) { toast.error('Độ cứng không hợp lệ (VD: 58-62 HRC).'); return; }
    setBusy(true);
    const res = await updateLotProgress({ data: {
      code: window.localStorage.getItem('dynamo-code') ?? '', webhook: window.localStorage.getItem('dynamo-webhook') ?? '',
      ID_Key: item.ID_Key, cty_QT: String(item.cty_QT), updates: { TrangThai: status, do_cung: hrc.trim(), ngay_nhan_QT: day },
    } });
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    updateItem(item.ID_Key, { TrangThai: status, do_cung: hrc.trim() || '—', ngay_nhan: day || undefined });
    toast.success(`Đã đồng bộ lô ${item.ID_Key}`); setOpen(false);
  };
  const field = 'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
  return <>
    <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setOpen(true)}><Zap size={13} />Cập nhật</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cập nhật lô {item.ID_Key}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">{item.ma_hang} · {item.cty_QT}</p>
          <label className="block">Trạng thái<select className={field} value={status} onChange={e => setStatus(e.target.value as Status)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label>
          <label className="block">Độ cứng thực tế<input className={field} value={hrc} placeholder="58-62 HRC" onChange={e => setHrc(e.target.value)} /></label>
          <label className="block">Ngày nhận QT<input type="date" className={field} value={day} onChange={e => setDay(e.target.value)} /></label>
        </div>
        <DialogFooter><Button disabled={busy} onClick={save}>{busy ? 'Đang đồng bộ…' : 'LƯU & ĐỒNG BỘ'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
