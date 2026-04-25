import type { ItemCategory } from "@/types";
import { DEFAULT_EXPIRY_DAYS, mapCategoryTags } from "@/utils/categoryMapping";

export interface ProductInfo {
  name: string;
  category: ItemCategory;
  imageUrl?: string;
  defaultExpiryDays: number;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: {
    product_name?: string;
    product_name_en?: string;
    generic_name?: string;
    brands?: string;
    image_front_url?: string;
    image_url?: string;
    categories_tags?: string[];
  };
}

/**
 * Look up a product by barcode via the Open Food Facts public API.
 *
 * Returns `null` when the product is not found (OFF responds with `status: 0`).
 * Throws on network / parse errors so callers can show a retry UI.
 */
export async function lookupBarcode(
  barcode: string,
): Promise<ProductInfo | null> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Open Food Facts request failed: ${res.status}`);
  }
  const data = (await res.json()) as OpenFoodFactsResponse;
  if (data.status !== 1 || !data.product) {
    return null;
  }

  const p = data.product;
  const name =
    (p.product_name_en && p.product_name_en.trim()) ||
    (p.product_name && p.product_name.trim()) ||
    (p.generic_name && p.generic_name.trim()) ||
    (p.brands && p.brands.trim()) ||
    "";

  const category = mapCategoryTags(p.categories_tags);
  const imageUrl = p.image_front_url || p.image_url || undefined;

  return {
    name,
    category,
    imageUrl,
    defaultExpiryDays: DEFAULT_EXPIRY_DAYS[category],
  };
}
