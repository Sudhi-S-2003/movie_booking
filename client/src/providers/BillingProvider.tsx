import { useCallback, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '../services/api/platform.api.js';
import { http } from '../services/api/http.js';
import { useAuthStore } from '../store/authStore.js';
import type { BillingSummary } from '../types/platform.js';
import { BillingContext } from './billingContext.js';

interface GuestConfig { signature: string; expiresAt: string; conversationId: string }

const SUMMARY_KEY = ['billing', 'summary'] as const;

export const BillingProvider = ({ children, guest }: { children: ReactNode; guest?: GuestConfig }) => {
  const token = useAuthStore((s) => s.token);
  const qc = useQueryClient();

  const member = useQuery({
    queryKey: SUMMARY_KEY,
    queryFn: billingApi.summary,
    enabled: !guest && !!token,
    staleTime: 30_000,
  });
  const guestQuery = useQuery({
    queryKey: ['billing', 'guest', guest?.conversationId, guest?.signature, guest?.expiresAt],
    queryFn: async () => (await http.get<{ data: { canSend: boolean } }>(
      `/public/chat/conversation/${guest!.conversationId}/subscription`,
      { params: { signature: guest!.signature, expiresAt: guest!.expiresAt } },
    )).data,
    enabled: !!guest,
    staleTime: 30_000,
  });

  const refresh = useCallback(async () => {
    await (guest ? guestQuery.refetch() : member.refetch());
  }, [guest, guestQuery, member]);

  const applyCharge = useCallback((billing: { balance: number | null } | null | undefined) => {
    if (!billing || billing.balance === null) return;
    qc.setQueryData<BillingSummary>(SUMMARY_KEY, (prev) =>
      prev ? { ...prev, account: { ...prev.account, balance: billing.balance as number } } : prev);
  }, [qc]);

  const value = useMemo(() => ({
    account: member.data?.account ?? null,
    loading: guest ? guestQuery.isLoading : member.isLoading,
    isGuest: !!guest,
    canSend: guestQuery.data?.canSend ?? true,
    refresh,
    applyCharge,
  }), [member.data, member.isLoading, guest, guestQuery.isLoading, guestQuery.data, refresh, applyCharge]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
};
