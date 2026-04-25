import type { ItemCategory } from "@/types";

/**
 * Default shelf-life (days) per category, used as a fallback when a barcode
 * lookup doesn't provide a best-before date.
 */
export const DEFAULT_EXPIRY_DAYS: Record<ItemCategory, number> = {
  produce: 7,
  dairy: 10,
  meat: 3,
  seafood: 2,
  bakery: 4,
  frozen: 90,
  canned: 365,
  dry_goods: 180,
  beverages: 30,
  condiments: 180,
  snacks: 60,
  other: 14,
};

/**
 * Heuristic mapping of Open Food Facts `categories_tags` (array of tag strings
 * like `en:dairies` or `en:breakfast-cereals`) to our internal ItemCategory enum.
 *
 * Order matters: more specific matches come first so e.g. "frozen-fish" wins
 * against plain "fish".
 */
export function mapCategoryTags(
  tags: string[] | undefined | null,
): ItemCategory {
  if (!tags || tags.length === 0) return "other";
  const joined = tags.join(" ").toLowerCase();

  if (/\bfrozen\b/.test(joined)) return "frozen";
  if (/\b(canned|tinned)\b/.test(joined)) return "canned";
  if (/\b(dairy|dairies|milk|cheese|yogurt|yoghurt)\b/.test(joined))
    return "dairy";
  if (/\b(seafood|fish|shellfish)\b/.test(joined)) return "seafood";
  if (/\b(meat|beef|pork|chicken|poultry|sausage|ham)\b/.test(joined))
    return "meat";
  if (/\b(bakery|bread|pastries|pastry)\b/.test(joined)) return "bakery";
  if (/\b(fruit|fruits|vegetable|vegetables|produce)\b/.test(joined))
    return "produce";
  if (
    /\b(beverage|beverages|drink|drinks|juice|juices|water|waters|soda)\b/.test(
      joined,
    )
  )
    return "beverages";
  if (/\b(condiment|condiments|sauce|sauces|dressing|dressings)\b/.test(joined))
    return "condiments";
  if (
    /\b(snack|snacks|biscuit|biscuits|chocolate|confection|confectioneries|candy)\b/.test(
      joined,
    )
  )
    return "snacks";
  if (/\b(cereal|cereals|pasta|pastas|rice|grain|grains|dry)\b/.test(joined))
    return "dry_goods";

  return "other";
}
