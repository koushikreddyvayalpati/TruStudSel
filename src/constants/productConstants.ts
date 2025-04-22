// Define types directly in the constants file
export type ProductCategory = 'electronics' | 'furniture' | 'auto' | 'fashion' | 'sports' | 'stationery' | 'eventpass';

export interface ProductType {
  id: ProductCategory | string;
  name: string;
  icon: string;
  iconType: 'material' | 'fontawesome' | 'entypo';
  color: string;
  subcategories?: string[];
}

export interface ProductCondition {
  id: string;
  name: string;
  description: string;
}

// Updated product types with main categories matching ProductsScreen and using consistent icons
export const PRODUCT_TYPES: ProductType[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    icon: 'game-controller',
    iconType: 'entypo',
    color: '#f7b305',
    subcategories: ['Laptops', 'Phones', 'Tablets', 'Accessories', 'Audio', 'Other'],
  },
  {
    id: 'furniture',
    name: 'Furniture',
    icon: 'bed',
    iconType: 'fontawesome',
    color: '#f7b305',
    subcategories: ['Desks', 'Chairs', 'Storage', 'Lamps', 'Bedroom', 'Other'],
  },
  {
    id: 'auto',
    name: 'Auto',
    icon: 'directions-car',
    iconType: 'material',
    color: '#f7b305',
    subcategories: ['Parts', 'Accessories', 'Tools', 'Other'],
  },
  {
    id: 'fashion',
    name: 'Fashion',
    icon: 'shopping-bag',
    iconType: 'fontawesome',
    color: '#f7b305',
    subcategories: ['Tops', 'Bottoms', 'Outerwear', 'Shoes', 'Accessories', 'Other'],
  },
  {
    id: 'sports',
    name: 'Sports',
    icon: 'sports-cricket',
    iconType: 'material',
    color: '#f7b305',
    subcategories: ['Fitness', 'Team Sports', 'Outdoor', 'Other'],
  },
  {
    id: 'stationery',
    name: 'Stationery',
    icon: 'book',
    iconType: 'material',
    color: '#f7b305',
    subcategories: ['Notebooks', 'Writing Tools', 'Organization', 'Art Supplies', 'Other'],
  },
  {
    id: 'eventpass',
    name: 'Event Pass',
    icon: 'ticket',
    iconType: 'fontawesome',
    color: '#f7b305',
    subcategories: ['Sports', 'Concerts', 'Campus Events', 'Other'],
  },
  {
    id: 'textbooks',
    name: 'Textbooks',
    icon: 'book',
    iconType: 'material',
    color: '#f7b305',
    subcategories: ['Science & Math', 'Humanities', 'Business', 'Engineering', 'Other'],
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'question',
    iconType: 'fontawesome',
    color: '#f7b305',
  },
];

// Enhanced product conditions with descriptions for better user guidance
export const PRODUCT_CONDITIONS: ProductCondition[] = [
  {
    id: 'brand-new',
    name: 'Brand New',
    description: 'Unused, with original packaging or tags',
  },
  {
    id: 'like-new',
    name: 'Like New',
    description: 'Used once or twice, in perfect condition',
  },
  {
    id: 'very-good',
    name: 'Very Good',
    description: 'Light use with minor signs of wear',
  },
  {
    id: 'good',
    name: 'Good',
    description: 'Some signs of wear but functions perfectly',
  },
  {
    id: 'acceptable',
    name: 'Acceptable',
    description: 'Noticeable wear but fully functional',
  },
  {
    id: 'for-parts',
    name: 'For Parts',
    description: 'Not fully functional, for repair or parts only',
  },
]; 