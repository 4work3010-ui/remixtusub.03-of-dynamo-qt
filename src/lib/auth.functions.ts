import { createServerFn } from '@tanstack/react-start';
import { lookupCode } from './auth.server';

// Server-only ULID check: the AUTH_CONFIG sheet URL and the code list never reach the browser.
export const verifyAccessCode = createServerFn({ method: 'POST' })
  .inputValidator((input: { code: string }) => ({ code: String(input?.code ?? '').trim().slice(0, 64) }))
  .handler(async ({ data }) => lookupCode(data.code));

// Fields a partner/admin may write back. Extend this list to open more columns.
const EDITABLE: Record<string, string[]> = { vendor: ['TrangThai', 'ngay_nhan_QT', 'do_cung'], admin: ['TrangThai', 'ngay_nhan_QT', 'do_cung'] };

type UpdateInput = { code: string; webhook: string; ID_Key: string; cty_QT: string; updates: Record<string, string> };

export const updateLotProgress = createServerFn({ method: 'POST' })
  .inputValidator((i: UpdateInput) => ({
    code: String(i?.code ?? '').slice(0, 64),
    webhook: String(i?.webhook ?? '').trim(),
    ID_Key: String(i?.ID_Key ?? '').trim().slice(0, 64),
    cty_QT: String(i?.cty_QT ?? '').trim().toUpperCase(),
    updates: Object.fromEntries(Object.entries(i?.updates ?? {}).map(([k, v]) => [k, String(v ?? '').slice(0, 80)])),
  }))
  .handler(async ({ data }) => {
    const auth = await lookupCode(data.code);
    if (!auth.ok) return { ok: false as const, error: 'Mã xác nhận không hợp lệ. Hãy đăng nhập lại.' };
    const vendor = auth.role.startsWith('qt_') ? auth.role.slice(3).toUpperCase() : null;
    if (!vendor && auth.role !== 'admin') return { ok: false as const, error: 'Vai trò không có quyền cập nhật.' };
    if (vendor && vendor !== data.cty_QT) return { ok: false as const, error: 'Lô hàng không thuộc đơn vị của bạn.' };
    if (!data.ID_Key) return { ok: false as const, error: 'Thiếu ID_Key.' };
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(data.webhook)) return { ok: false as const, error: 'Chưa cấu hình link Apps Script Webhook (trang Đồng bộ).' };
    const allowed = EDITABLE[vendor ? 'vendor' : 'admin'] ?? [];
    const updates = Object.fromEntries(Object.entries(data.updates).filter(([k]) => allowed.includes(k)));
    if (!Object.keys(updates).length) return { ok: false as const, error: 'Không có trường hợp lệ để cập nhật.' };
    try {
      const res = await fetch(data.webhook, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify({ ID_Key: data.ID_Key, updates, vendor: vendor ?? 'ADMIN' }), redirect: 'follow' });
      const text = await res.text();
      if (!res.ok) { console.error(`Webhook failed [${res.status}]: ${text}`); return { ok: false as const, error: `Webhook lỗi [${res.status}]` }; }
      let body: { ok?: boolean; error?: string } = {};
      try { body = JSON.parse(text); } catch { return { ok: false as const, error: 'Webhook trả về dữ liệu không hợp lệ.' }; }
      if (!body.ok) return { ok: false as const, error: body.error ?? 'Webhook từ chối cập nhật.' };
      return { ok: true as const, updates };
    } catch (e) {
      console.error('Webhook error', e);
      return { ok: false as const, error: 'Không kết nối được Webhook.' };
    }
  });
