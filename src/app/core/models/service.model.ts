export interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  durationMinutes: number | null;
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
}
