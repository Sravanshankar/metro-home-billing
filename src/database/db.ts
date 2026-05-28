import Dexie, { type Table } from 'dexie';
import type { Product, Customer, Order, StoreSettings } from '../types';

export class MetroHomeDatabase extends Dexie {
  products!: Table<Product>;
  customers!: Table<Customer>;
  orders!: Table<Order>;
  settings!: Table<StoreSettings & { id: number }>;

  constructor() {
    super('MetroHomeDatabase');
    this.version(1).stores({
      products: '++id, &sku, name, category, stock',
      customers: '++id, &phone, name',
      orders: '++id, invoiceNumber, date, customerPhone',
      settings: 'id'
    });
  }
}

export const db = new MetroHomeDatabase();

// Default Seed Data
const DEFAULT_PRODUCTS: Product[] = [
  {
    name: 'Basmati Rice Premium 5kg',
    sku: '8901234000012',
    hsn: '1006',
    costPrice: 580,
    sellingPrice: 720,
    gstRate: 5,
    stock: 120,
    lowStockLimit: 25,
    category: 'Grains & Pulses'
  },
  {
    name: 'Aashirvaad Shudh Chakki Atta 10kg',
    sku: '8901725181222',
    hsn: '1101',
    costPrice: 380,
    sellingPrice: 460,
    gstRate: 5,
    stock: 45,
    lowStockLimit: 15,
    category: 'Flours & Grains'
  },
  {
    name: 'Fortune Sunflower Oil 1L',
    sku: '8906007281923',
    hsn: '1512',
    costPrice: 130,
    sellingPrice: 165,
    gstRate: 5,
    stock: 8, // Triggers low stock alert immediately (limit is 12)
    lowStockLimit: 12,
    category: 'Oils & Ghee'
  },
  {
    name: 'Colgate MaxFresh Toothpaste 150g',
    sku: '8901138836070',
    hsn: '3306',
    costPrice: 72,
    sellingPrice: 95,
    gstRate: 18,
    stock: 80,
    lowStockLimit: 15,
    category: 'Personal Care'
  },
  {
    name: 'Surf Excel Easy Wash Powder 1kg',
    sku: '8901030753444',
    hsn: '3402',
    costPrice: 110,
    sellingPrice: 145,
    gstRate: 18,
    stock: 35,
    lowStockLimit: 10,
    category: 'Household'
  },
  {
    name: 'Amul Gold Milk 1L (Tetra Pack)',
    sku: '8901262010045',
    hsn: '0401',
    costPrice: 58,
    sellingPrice: 68,
    gstRate: 0, // 0% GST (Exempt)
    stock: 50,
    lowStockLimit: 15,
    category: 'Dairy'
  },
  {
    name: 'Ferrero Rocher Premium Chocolates (16 Pcs)',
    sku: '8000500203875',
    hsn: '1806',
    costPrice: 375,
    sellingPrice: 499,
    gstRate: 28, // 28% Luxury GST
    stock: 18,
    lowStockLimit: 5,
    category: 'Chocolates & Snacks'
  },
  {
    name: 'Lays Classic Salted Potato Chips 50g',
    sku: '8901491101831',
    hsn: '2005',
    costPrice: 14,
    sellingPrice: 20,
    gstRate: 12,
    stock: 150,
    lowStockLimit: 30,
    category: 'Chocolates & Snacks'
  },
  {
    name: 'Lipton Honey Lemon Green Tea 25 Bags',
    sku: '8901030743629',
    hsn: '0902',
    costPrice: 125,
    sellingPrice: 160,
    gstRate: 5,
    stock: 4, // Triggers low stock alert immediately (limit is 10)
    lowStockLimit: 10,
    category: 'Beverages'
  },
  {
    name: 'Tata Salt Compressed 1kg',
    sku: '8901058002319',
    hsn: '2501',
    costPrice: 19,
    sellingPrice: 28,
    gstRate: 0,
    stock: 95,
    lowStockLimit: 20,
    category: 'Spices & Condiments'
  }
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    phone: '9876543210',
    name: 'Rajesh Kumar',
    loyaltyPoints: 340,
    visitCount: 12
  },
  {
    phone: '9123456789',
    name: 'Priya Sharma',
    loyaltyPoints: 120,
    visitCount: 4
  },
  {
    phone: '8888888888', // VIP customer for portfolio reference
    name: 'Sravan Shankar P',
    loyaltyPoints: 1250,
    visitCount: 35
  }
];

const DEFAULT_SETTINGS: StoreSettings & { id: number } = {
  id: 1,
  storeName: 'METRO HOME SUPERMARKET',
  gstin: '29AAAAA1234A1Z1',
  address: 'Plot No. 42, 100 Feet Ring Road, JP Nagar 2nd Phase, Bengaluru, Karnataka - 560078',
  phone: '+91 9988776655',
  upiId: 'sankarsravan6-1@oksbi',
  state: 'Karnataka',
  stateCode: '29',
  receiptFooter: 'Thank you for shopping at Metro Home! Please visit us again.'
};

// Seed Database Function
export async function seedDatabase() {
  const productCount = await db.products.count();
  if (productCount === 0) {
    await db.products.bulkAdd(DEFAULT_PRODUCTS);
    console.log('Seeded initial products');
  }

  const customerCount = await db.customers.count();
  if (customerCount === 0) {
    await db.customers.bulkAdd(DEFAULT_CUSTOMERS);
    console.log('Seeded initial customers');
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add(DEFAULT_SETTINGS);
    console.log('Seeded default settings');
  }
}
