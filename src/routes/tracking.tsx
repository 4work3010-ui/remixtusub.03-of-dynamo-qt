import { createFileRoute } from '@tanstack/react-router';
import { ArrowRight, CalendarDays, CircleAlert, PackageOpen } from 'lucide-react';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { date, daysLate, isLate, number, statuses } from '@/lib/dynamo-data';
export const Route = createFileRoute('/tracking')({head:()=>({meta:[{title:'Luân chuyển QT | DYNAMO VIETNAM QT - MES'},{name:'description',content:'Bảng Kanban giám sát lô gia công từ xuất xưởng đến nhập kho.'},{property:'og:title',content:'Luân chuyển QT | DYNAMO VIETNAM QT - MES'},{property:'og:description',content:'Theo dõi tiến độ và cảnh báo quá hạn gia công ngoài.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Tracking});
const CARD_LIMIT = 60;
function Tracking(){
  const {filtered}=useDynamo();
  const late=filtered.filter(isLate);
  return <><PageHeading eyebrow="GIÁM SÁT / LUÂN CHUYỂN" title="Theo dõi luân chuyển" description="Tiến độ từng lô hàng từ phân xưởng qua đối tác gia công đến nhập kho." action={<span className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"><CircleAlert size={15}/>{number(late.length)} lô quá hạn</span>}/>
  <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground"><span>{number(filtered.length)} lô đang hiển thị</span><span className="size-1 rounded-full bg-muted-foreground"/><span>{number(filtered.reduce((a,i)=>a+i.kg_Lot,0),1)} kg tổng khối lượng</span><span className="size-1 rounded-full bg-muted-foreground"/><span>02 đối tác gia công</span></div>
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">{statuses.map((status,idx)=>{
    const rows=filtered.filter(i=>i.TrangThai===status);
    const shown=rows.slice(0,CARD_LIMIT);
    const color=['bg-muted-foreground','bg-info','bg-warning','bg-primary'][idx];
    return <section key={status} className="min-w-0 bg-secondary/50">
      <div className="border border-border border-t-2 p-4" style={{borderTopColor:`var(${['--muted-foreground','--info','--warning','--primary'][idx]})`}}>
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold">{status}</h2><span className="flex size-6 items-center justify-center rounded-sm bg-background text-xs font-semibold">{number(rows.length)}</span></div>
        <p className="mt-2 text-[11px] text-muted-foreground">{number(rows.reduce((a,i)=>a+i.kg_Lot,0),1)} kg <span className={`mx-1 inline-block size-1.5 rounded-full ${color}`}/> {number(rows.reduce((a,i)=>a+i.so_luong,0))} pcs</p>
      </div>
      <div className="space-y-2 p-2">{shown.length?shown.map(i=><article key={i.ID_Key} className={`border bg-card p-4 ${isLate(i)?'animate-late-border border-destructive':'border-border'}`}>
        <div className="mb-3 flex items-start justify-between gap-2"><span className="font-mono text-[11px] font-semibold text-primary">{i.So_DatHang}</span><span className="bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{i.phong_sx}</span></div>
        <p className="font-mono text-sm font-semibold">{i.ma_hang}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{i.vat_lieu} · {i.cong_doan}</p>
        <div className="my-3 border-t border-border"/>
        <div className="flex items-center justify-between text-[11px]"><span className="text-muted-foreground">{i.cty_QT}</span><span>{number(i.kg_Lot,1)} kg</span></div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><CalendarDays size={12}/> Hạn {date(i.han_tra)}</span>{isLate(i)&&<b className="text-destructive">Trễ {daysLate(i.han_tra)} ngày</b>}</div>
      </article>):<div className="flex min-h-32 flex-col items-center justify-center gap-2 text-muted-foreground"><PackageOpen size={22}/><p className="text-xs">Chưa có lô hàng</p></div>}
      {rows.length>CARD_LIMIT&&<p className="px-2 py-2 text-center text-[11px] text-muted-foreground">Hiển thị {CARD_LIMIT}/{number(rows.length)} thẻ — dùng bộ lọc trên cùng</p>}
      </div>
    </section>;
  })}</div>
  <p className="mt-5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><ArrowRight size={13}/> Dữ liệu phản ánh nguồn đã áp dụng trong mục Đồng bộ; bảng tính gốc không bị thay đổi.</p></>;
}
