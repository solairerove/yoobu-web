export type TenantType = 'FOOD_ORDER' | 'APPOINTMENT' | 'CATALOG_REQUEST';

export interface TenantConfig {
  slug: string;
  name: string;
  type: TenantType;
  primaryColor: string | null;
  logoUrl: string | null;
  welcomeMessage: string | null;
  checkoutNameHint?: string | null;
  checkoutPhoneHint?: string | null;
  checkoutNoteHint?: string | null;
}
