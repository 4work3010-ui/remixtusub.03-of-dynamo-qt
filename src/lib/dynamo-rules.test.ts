import { describe, expect, it } from 'vitest';
import { items } from './dynamo-data';
import { isDueSoon, isOverdue, logisticsOf, onTimeRate, qcOf } from './dynamo-rules';

const now = new Date('2026-10-10T09:00:00');
const base = { ...items[0], TrangThai: 'Đang tại Vendor' as const, han_tra: '2026-10-05' };

describe('dynamo rules', () => {
  it('legacy Kiểm tra QC maps to logistics at vendor and QC in progress', () => {
    const r = { ...base, TrangThai: 'Kiểm tra QC' as const };
    expect(logisticsOf(r)).toBe('Đang tại Vendor');
    expect(qcOf(r)).toBe('Đang kiểm tra');
  });
  it('estimated due date never counts as overdue', () => {
    expect(isOverdue(base, now)).toBe(true);
    expect(isOverdue({ ...base, han_tra_est: true }, now)).toBe(false);
  });
  it('due soon means within 48h of an official due date', () => {
    expect(isDueSoon({ ...base, han_tra: '2026-10-12' }, now)).toBe(true);
    expect(isDueSoon({ ...base, han_tra: '2026-10-13' }, now)).toBe(false);
  });
  it('on-time rate excludes lots missing receive date or official due', () => {
    const done = { ...base, TrangThai: 'Đã nhập kho' as const };
    const r = onTimeRate([{ ...done, ngay_nhan: '2026-10-04' }, { ...done, ngay_nhan: '2026-10-07' }, { ...done, ngay_nhan: undefined }, { ...done, ngay_nhan: '2026-10-01', han_tra_est: true }]);
    expect(r).toEqual({ onTime: 1, denominator: 2, excluded: 2, rate: 0.5 });
  });
});
