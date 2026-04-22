import {
  Apple,
  Milk,
  Beef,
  Fish,
  Croissant,
  Snowflake,
  Package,
  Wheat,
  CupSoda,
  Droplet,
  Cookie,
  Package2,
  type LucideIcon,
} from 'lucide-react';
import type { ItemCategory } from '@/types';

const MAP: Record<ItemCategory, LucideIcon> = {
  produce: Apple,
  dairy: Milk,
  meat: Beef,
  seafood: Fish,
  bakery: Croissant,
  frozen: Snowflake,
  canned: Package,
  dry_goods: Wheat,
  beverages: CupSoda,
  condiments: Droplet,
  snacks: Cookie,
  other: Package2,
};

interface CategoryIconProps {
  category: ItemCategory;
  size?: number;
  className?: string;
}

export default function CategoryIcon({ category, size = 20, className }: CategoryIconProps) {
  const Icon = MAP[category] ?? Package2;
  return <Icon size={size} className={className} aria-hidden="true" />;
}
