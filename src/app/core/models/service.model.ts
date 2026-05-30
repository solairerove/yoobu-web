export interface ProductVariant {
  id: number;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
  sortOrder: number;
  imageUrl: string | null;
  imageUrls: string[];
}

export interface ServiceItem {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  unit: string | null;
  durationMinutes: number | null;
  sortOrder: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED';
  variants: ProductVariant[];
}
