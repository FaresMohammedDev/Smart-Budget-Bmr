import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MenuPage from '@/app/menu/page';
import ReceiptPage from '@/app/receipt/[id]/page';
import CashierPage from '@/app/cashier/page';
import { usePlannerStore } from '@/features/planner/store/planner.store';
import * as database from '@/lib/data/repository';

const navigation = vi.hoisted(() => ({ push: vi.fn(), params: { id: '' } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: navigation.push }), useParams: () => navigation.params }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/components/layout/KioskHeader', () => ({ KioskHeader: () => null }));
vi.mock('react-to-print', () => ({ useReactToPrint: () => vi.fn() }));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_DATA_MODE', 'local');
  localStorage.clear(); sessionStorage.clear();
  usePlannerStore.getState().resetKiosk();
  navigation.push.mockClear(); navigation.params.id = '';
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('Checkout, receipt and cashier screens', () => {
  it('keeps the basket and shows an error when checkout cannot persist', async () => {
    render(<MenuPage />);
    const buttons = await screen.findAllByRole('button', { name: 'إضافة' });
    fireEvent.click(buttons[0]);
    vi.spyOn(database, 'createOrder').mockRejectedValueOnce(new Error('تعذر حفظ الطلب'));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الطلب' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر حفظ الطلب');
    expect(usePlannerStore.getState().cart).toHaveLength(1);
    expect(navigation.push).not.toHaveBeenCalled();
    expect(await database.listOrders()).toHaveLength(0);
  });
  it('can open a saved receipt after checkout clears the basket and the store is reset', async () => {
    const view = render(<MenuPage />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'إضافة' }))[0]);
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الطلب' }));
    await waitFor(() => expect(navigation.push).toHaveBeenCalled());
    const id = navigation.push.mock.calls[0][0].split('/').pop();
    expect(usePlannerStore.getState().cart).toHaveLength(0);
    view.unmount();
    usePlannerStore.getState().resetKiosk();
    navigation.params.id = id;
    render(<ReceiptPage />);
    expect(await screen.findByRole('heading', { name: 'تم الطلب' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'طباعة البون' })).toBeEnabled();
    expect(screen.queryByText('نصيب كل فرد من الوجبة:')).not.toBeInTheDocument();
    expect((await database.listOrders())[0].id).toBe(id);
  });
  it('does not show success or enable printing for an unknown order', async () => {
    navigation.params.id = crypto.randomUUID();
    render(<ReceiptPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('الطلب غير موجود');
    expect(screen.queryByRole('heading', { name: 'تم الطلب' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'طباعة البون' })).toBeDisabled();
  });
  it('shows cashier failures without marking an unpaid order as paid', async () => {
    const [meal] = await database.listMeals(true);
    const id = await database.createOrder({ requestId: crypto.randomUUID(), mode: 'quick_menu', items: [{ meal_id: meal.id, quantity: 1 }] });
    vi.spyOn(database, 'markOrderPaid').mockRejectedValueOnce(new Error('فشل تأكيد الدفع'));
    render(<CashierPage />);
    const button = await screen.findByRole('button', { name: /تأكيد.*الدفع|تأكيد.*دفع/ });
    fireEvent.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('فشل تأكيد الدفع');
    expect((await database.getOrder(id)).order.status).toBe('pending');
  });
});
