export type TenantType = 'FOOD_ORDER' | 'APPOINTMENT' | 'CATALOG_REQUEST';

export interface TenantConfig {
  slug: string;
  name: string;
  type: TenantType;
  currency?: string | null;
  paymentQrUrl?: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  bannerUrl?: string | null;
  welcomeMessage: string | null;
  checkoutNameHint?: string | null;
  checkoutPhoneHint?: string | null;
  checkoutDeliveryHint?: string | null;
  checkoutNoteHint?: string | null;
  cutoffHour?: number | null;
  cutoffMinute?: number | null;
  earliestDeliveryDate?: string | null;
}
