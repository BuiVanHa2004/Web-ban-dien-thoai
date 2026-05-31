export type CartItemDto = {
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  productColorId?: number | null;
  productVariantId?: number | null;
  ramGb?: number | null;
  storageGb?: number | null;
  colorName?: string | null;
  imageUrl?: string | null;
};

