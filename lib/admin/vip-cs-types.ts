/** Supabase `vip_orders` 행 — CS 카드 UI용 */
export type VipCsOrderRow = {
  id: string;
  user_name: string;
  phone_number: string | null;
  created_at: string;
  amount: number;
  imp_uid: string;
  report_url: string | null;
  status: string | null;
};
