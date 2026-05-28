export interface Product {
  id?: number; // Auto-incremented in Dexie
  name: string;
  sku: string; // Barcode / SKU code
  hsn: string; // Indian HSN code
  costPrice: number;
  sellingPrice: number;
  gstRate: number; // 0, 5, 12, 18, 28
  stock: number;
  lowStockLimit: number;
  category: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discountPercent: number; // e.g. 5 for 5%
  taxableValue: number;    // Price after discount, before tax
  cgst: number;           // Intra-state CGST amount
  sgst: number;           // Intra-state SGST amount
  igst: number;           // Inter-state IGST amount
  gstRate: number;        // Selected slab
  total: number;          // Total price including tax
}

export interface Customer {
  id?: number; // Auto-incremented
  phone: string; // 10 digit number
  name: string;
  loyaltyPoints: number;
  visitCount: number;
}

export interface Order {
  id?: string; // Invoice number (e.g. MH-YYYYMMDD-0001)
  invoiceNumber: string;
  date: string;
  customerPhone?: string;
  customerName?: string;
  items: CartItem[];
  subTotal: number;       // Sum of all taxableValues
  totalGst: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  discountTotal: number;
  grandTotal: number;
  paymentMode: 'Cash' | 'UPI' | 'Card';
  isInterState: boolean;  // Whether it was an IGST transaction
}

export interface StoreSettings {
  storeName: string;
  gstin: string;
  address: string;
  phone: string;
  upiId: string;
  state: string; // Store State (e.g. Karnataka)
  stateCode: string; // GST State Code (e.g. 29)
  receiptFooter: string;
}
