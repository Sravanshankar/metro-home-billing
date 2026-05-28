import React, { useState, useEffect, useRef } from 'react';
import { db } from '../database/db';
import type { Product, Customer, CartItem, Order, StoreSettings } from '../types';
import { useKeyPress } from '../hooks/useKeyPress';
import { CustomerModal } from './CustomerModal';
import { ThermalReceipt } from './ThermalReceipt';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ProductSearchModal } from './ProductSearchModal';
import { 
  Barcode, Search, User, CreditCard, Laptop, 
  Trash2, Plus, Minus, Keyboard, ShoppingCart, Percent, Camera
} from 'lucide-react';

interface BillingCounterProps {
  settings: StoreSettings;
}

export function BillingCounter({ settings }: BillingCounterProps) {
  // POS Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isInterState, setIsInterState] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'UPI' | 'Card'>('Cash');

  // Customer State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [expandedInvoiceNum, setExpandedInvoiceNum] = useState<string | null>(null);

  // Unified Scanner & Name Search Input States
  const [skuMatches, setSkuMatches] = useState<Product[]>([]);
  const [skuFocused, setSkuFocused] = useState(false);
  const [initialSearchQuery, setInitialSearchQuery] = useState('');

  // Search/Barcode Input
  const [skuSearch, setSkuSearch] = useState('');

  // Checkout modal
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Scanning & Searching modals
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Status Alerts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Camera Scan success handler
  const handleCameraScanSuccess = async (scannedSku: string) => {
    try {
      const product = await db.products.where('sku').equals(scannedSku.trim()).first();
      if (product) {
        if (product.stock <= 0) {
          showToast(`Warning: "${product.name}" is OUT OF STOCK!`, 'error');
        }
        addToCart(product);
        setShowScannerModal(false); // Auto close scanner on success
      } else {
        showToast(`SKU Barcode "${scannedSku}" not found in inventory!`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Database search error', 'error');
    }
  };

  // Refs for element focusing
  const skuInputRef = useRef<HTMLInputElement>(null);

  // Trigger temporary toast messages
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Keyboard Shortcuts:
  // F8 - Focus Search SKU
  useKeyPress('F8', () => {
    skuInputRef.current?.focus();
    skuInputRef.current?.select();
    showToast('Barcode scanner field focused', 'info');
  });

  // F4 - Clear Cart
  useKeyPress('F4', () => {
    if (cart.length > 0 && window.confirm('Clear all items from the current cart?')) {
      handleClearCart();
      showToast('Cart cleared', 'info');
    }
  });

  // F2 - Complete Checkout & Print
  useKeyPress('F2', () => {
    if (cart.length === 0) {
      showToast('Cannot checkout: Cart is empty!', 'error');
      return;
    }
    handleCheckout();
  });

  // Automatically adjust InterState tax calculation based on customer state vs store state
  useEffect(() => {
    if (customer) {
      // Basic heuristic: check if customer state/code matches store's base configurations
      // Real POS can allow toggling, but we default to matching settings
      setIsInterState(false); 
    }
  }, [customer]);

  // Fast Barcode scanning & Name Search simulation
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = skuSearch.trim();
    if (!query) return;

    try {
      // 1. Check for exact SKU barcode match
      let product = await db.products.where('sku').equals(query).first();
      
      // 2. If no SKU match, check for name matches
      if (!product) {
        const nameMatches = await db.products
          .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
          .toArray();

        if (nameMatches.length === 1) {
          product = nameMatches[0];
        } else if (nameMatches.length > 1) {
          // Open Catalog Modal pre-populated with this query
          setInitialSearchQuery(query);
          setShowSearchModal(true);
          setSkuSearch('');
          showToast('Multiple matches found. Opening catalog search...', 'info');
          return;
        }
      }

      if (product) {
        if (product.stock <= 0) {
          showToast(`Warning: "${product.name}" is OUT OF STOCK!`, 'error');
        }
        addToCart(product);
        setSkuSearch('');
        // Make sure scanner field remains focused
        skuInputRef.current?.focus();
      } else {
        showToast(`Barcode or product "${query}" not found in inventory!`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Database search error', 'error');
    }
  };

  // Autocomplete query watcher for SKU field
  useEffect(() => {
    const fetchSkuMatches = async () => {
      const query = skuSearch.trim();
      if (query.length > 1) {
        const matches = await db.products
          .filter(p => 
            p.name.toLowerCase().includes(query.toLowerCase()) || 
            p.sku.includes(query)
          )
          .limit(5)
          .toArray();
        setSkuMatches(matches);
      } else {
        setSkuMatches([]);
      }
    };
    fetchSkuMatches();
  }, [skuSearch]);

  // Customer Mobile Lookup (10 digits)
  useEffect(() => {
    const lookupCustomer = async () => {
      const cleanPhone = customerPhone.trim();
      if (cleanPhone.length === 10) {
        const found = await db.customers.where('phone').equals(cleanPhone).first();
        if (found) {
          setCustomer(found);
          showToast(`Welcome back, ${found.name}!`, 'success');
        } else {
          // Trigger modal
          setShowCustomerModal(true);
        }
      } else {
        setCustomer(null);
      }
    };
    lookupCustomer();
  }, [customerPhone]);

  // Load customer past purchase history
  useEffect(() => {
    const fetchPastOrders = async () => {
      if (customer) {
        try {
          const history = await db.orders
            .where('customerPhone')
            .equals(customer.phone)
            .reverse()
            .toArray();
          setPastOrders(history);
        } catch (err) {
          console.error('Failed to load past orders', err);
          setPastOrders([]);
        }
      } else {
        setPastOrders([]);
      }
    };
    fetchPastOrders();
  }, [customer]);

  // Core Cart Add Logic
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const currentQty = updatedCart[existingIndex].quantity;
      if (product.stock <= currentQty) {
        showToast(`Insufficient stock! Only ${product.stock} units available.`, 'error');
        return;
      }
      updatedCart[existingIndex].quantity += 1;
      recalculateCart(updatedCart);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        discountPercent: 0,
        taxableValue: product.sellingPrice,
        cgst: 0,
        sgst: 0,
        igst: 0,
        gstRate: product.gstRate,
        total: product.sellingPrice
      };
      recalculateCart([...cart, newItem]);
    }
    showToast(`Added ${product.name} to cart`);
  };

  // Adjust item quantity
  const updateQuantity = (idx: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[idx].quantity + delta;

    if (newQty <= 0) {
      updated.splice(idx, 1);
    } else {
      const stockAvailable = updated[idx].product.stock;
      if (newQty > stockAvailable) {
        showToast(`Insufficient stock! Limit: ${stockAvailable}`, 'error');
        return;
      }
      updated[idx].quantity = newQty;
    }
    recalculateCart(updated);
  };

  // Adjust line-item discount
  const updateDiscount = (idx: number, percentStr: string) => {
    const updated = [...cart];
    const percent = parseFloat(percentStr);
    
    if (isNaN(percent) || percent < 0 || percent > 100) {
      updated[idx].discountPercent = 0;
    } else {
      updated[idx].discountPercent = percent;
    }
    recalculateCart(updated);
  };

  const removeCartItem = (idx: number) => {
    const updated = [...cart];
    updated.splice(idx, 1);
    recalculateCart(updated);
    showToast('Item removed', 'info');
  };

  // Perform highly compliant Indian GST calculations
  const recalculateCart = (updatedCart: CartItem[]) => {
    const finalized = updatedCart.map(item => {
      const qty = item.quantity;
      const basePrice = item.product.sellingPrice;
      const rate = item.gstRate;

      // Selling price * quantity
      const sub = basePrice * qty;
      // Subtract discount from taxable base
      const discount = sub * (item.discountPercent / 100);
      const taxableValue = sub - discount;

      // GST Split:
      // TaxableValue is exclusive of GST?
      // Supermarkets usually have MRP (Maximum Retail Price) which is inclusive of all taxes.
      // So, let's reverse-compute the taxable value to be highly realistic to standard supermarket retail billing!
      // Formula: TaxableValue = TotalMRP / (1 + (GST_Rate / 100))
      // TotalTax = TotalMRP - TaxableValue
      
      const roundedTotal = taxableValue; // Our MRP inclusive total for this line
      const taxBase = roundedTotal / (1 + (rate / 100));
      const totalTax = roundedTotal - taxBase;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = totalTax;
      } else {
        cgst = totalTax / 2;
        sgst = totalTax / 2;
      }

      return {
        ...item,
        taxableValue: taxBase,
        cgst,
        sgst,
        igst,
        total: roundedTotal
      };
    });

    setCart(finalized);
  };

  // Trigger recalculation on tax-type toggle
  useEffect(() => {
    recalculateCart(cart);
  }, [isInterState]);

  // Core Financial Totals
  const subTotal = cart.reduce((acc, item) => acc + item.taxableValue, 0);
  const totalCgst = cart.reduce((acc, item) => acc + item.cgst, 0);
  const totalSgst = cart.reduce((acc, item) => acc + item.sgst, 0);
  const totalIgst = cart.reduce((acc, item) => acc + item.igst, 0);
  const totalGst = totalCgst + totalSgst + totalIgst;
  
  // Total retail MRP value without discount
  const grossMRP = cart.reduce((acc, item) => acc + (item.product.sellingPrice * item.quantity), 0);
  const discountTotal = grossMRP - cart.reduce((acc, item) => acc + item.total, 0);
  const rawTotal = subTotal + totalGst;
  const grandTotal = Math.round(rawTotal); // Indian standard round off

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
    setCustomerPhone('');
    setCustomer(null);
  };

  // Complete Order
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const orderCount = await db.orders.count();
      const invoiceNumber = `MH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${(orderCount + 1).toString().padStart(4, '0')}`;
      
      const payload: Order = {
        invoiceNumber,
        date: new Date().toISOString(),
        customerPhone: customer?.phone || undefined,
        customerName: customer?.name || undefined,
        items: cart,
        subTotal,
        totalGst,
        totalCgst,
        totalSgst,
        totalIgst,
        discountTotal,
        grandTotal,
        paymentMode,
        isInterState
      };

      // 1. Deduct Inventory levels
      for (const item of cart) {
        if (item.product.id) {
          const currentProd = await db.products.get(item.product.id);
          if (currentProd) {
            await db.products.update(item.product.id, {
              stock: Math.max(0, currentProd.stock - item.quantity)
            });
          }
        }
      }

      // 2. Accumulate Loyalty Points for customers (+1% of order value)
      if (customer?.id) {
        const addedPoints = Math.floor(grandTotal / 100);
        await db.customers.update(customer.id, {
          loyaltyPoints: customer.loyaltyPoints + addedPoints,
          visitCount: customer.visitCount + 1
        });
      }

      // 3. Write Order to database
      await db.orders.add(payload);

      // Open print thermal receipt dialog modal
      setCompletedOrder(payload);
      handleClearCart();
      showToast('Order completed & saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Checkout storage error', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[82vh]">
      
      {/* Dynamic Toast Status Bar */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 py-3 px-5 rounded-xl border shadow-lg text-xs font-bold font-outfit transition-all flex items-center space-x-2 animate-bounce
          ${toast.type === 'success' ? 'bg-brand-emerald/10 border-brand-emerald/20 text-brand-emerald' : 
            toast.type === 'error' ? 'bg-brand-rose/10 border-brand-rose/20 text-brand-rose' : 
            'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan'}`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* LEFT 2 COLUMNS: Product Scanner & Cart */}
      <div className="lg:col-span-2 flex flex-col space-y-4 h-full relative z-20">
        
        {/* Rapid Search Bar Group */}
        <div className="relative z-50">
          
          {/* Barcode scanner optimized input */}
          <form onSubmit={handleBarcodeSubmit} className="glass-panel p-3 border-brand-cyan/35 shadow-neon-cyan/5 relative z-50">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] uppercase tracking-widest font-semibold text-brand-cyan block">
                Barcode / SKU Scanner (F8 to focus)
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowSearchModal(true)}
                  className="text-[9px] uppercase font-bold text-slate-300 hover:text-slate-100 transition-colors flex items-center space-x-1 border border-dark-700 px-1.5 py-0.5 rounded bg-dark-900 active:scale-95 cursor-pointer"
                >
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>Search & Browse</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="text-[9px] uppercase font-bold text-brand-cyan hover:text-brand-cyan/85 transition-colors flex items-center space-x-1 border border-brand-cyan/35 px-1.5 py-0.5 rounded bg-brand-cyan/5 active:scale-95 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>Scan via Camera</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-cyan" />
              <input
                ref={skuInputRef}
                type="text"
                autoFocus
                placeholder="Scan barcode or type name..."
                value={skuSearch}
                onFocus={() => setSkuFocused(true)}
                onBlur={() => setTimeout(() => setSkuFocused(false), 200)}
                onChange={(e) => setSkuSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan focus:shadow-neon-cyan/25 transition-all text-xs font-sans"
              />

              {/* Dropdown Auto Search Results for Barcode/Name input */}
              {skuFocused && skuMatches.length > 0 && (
                <div className="absolute top-[102%] left-0 right-0 z-[100] bg-dark-800 border border-dark-700 rounded-xl shadow-glass overflow-hidden max-h-56 overflow-y-auto">
                  {skuMatches.map(prod => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        addToCart(prod);
                        setSkuSearch('');
                      }}
                      className="w-full text-left py-2.5 px-4 text-xs hover:bg-brand-cyan hover:text-dark-900 transition-colors flex items-center justify-between border-b border-dark-700/50"
                    >
                      <div>
                        <div className="font-semibold text-slate-100 hover:text-inherit">{prod.name}</div>
                        <div className="text-[10px] text-slate-400 hover:text-slate-900 font-mono">Barcode: {prod.sku}</div>
                      </div>
                      <div className="font-mono font-bold text-slate-200 hover:text-slate-900">₹{prod.sellingPrice.toFixed(2)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </form>

        </div>

        {/* Core Cart List Board */}
        <div className="glass-panel flex-1 flex flex-col overflow-hidden border-dark-700/50 relative z-10">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between flex-shrink-0 bg-dark-900/40">
            <h2 className="font-outfit font-semibold text-sm text-slate-100 flex items-center space-x-2">
              <ShoppingCart className="w-4 h-4 text-brand-cyan" />
              <span>Current Billing Cart ({cart.length} items)</span>
            </h2>
            <div className="text-xs font-mono font-bold text-slate-400">
              Tax splits calculated instantly
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[25vh]">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-3">
                <Laptop className="w-12 h-12 text-slate-600 animate-pulse" />
                <div>
                  <p className="font-semibold text-sm">POS Counter Ready</p>
                  <p className="text-xs text-slate-400 mt-1">Scan barcodes or use manual search keys to build the cart.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="bg-dark-900/60 border-b border-dark-700/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4 w-1/3">Item Specifications</th>
                    <th className="py-2.5 px-2 text-center">HSN</th>
                    <th className="py-2.5 px-2 text-center">Qty Controls</th>
                    <th className="py-2.5 px-2 text-right">MRP (₹)</th>
                    <th className="py-2.5 px-3 text-center">Disc (%)</th>
                    <th className="py-2.5 px-2 text-right">CGST+SGST</th>
                    <th className="py-2.5 px-4 text-right">Total (₹)</th>
                    <th className="py-2.5 px-4 text-center">Del</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const totalTax = item.cgst + item.sgst + item.igst;
                    return (
                      <tr 
                        key={idx} 
                        className="border-b border-dark-700/30 hover:bg-dark-800/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-200">{item.product.name}</div>
                          <div className="text-[9px] text-slate-500 font-mono">SKU: {item.product.sku}</div>
                        </td>
                        <td className="py-3 px-2 text-center font-mono">{item.product.hsn}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => updateQuantity(idx, -1)}
                              className="w-5 h-5 rounded bg-dark-700 hover:bg-dark-600 text-slate-300 flex items-center justify-center font-bold"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center font-mono font-bold text-slate-200">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(idx, 1)}
                              className="w-5 h-5 rounded bg-dark-700 hover:bg-dark-600 text-slate-300 flex items-center justify-center font-bold"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono">₹{item.product.sellingPrice.toFixed(2)}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="relative inline-block w-14">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent || ''}
                              onChange={(e) => updateDiscount(idx, e.target.value)}
                              placeholder="0"
                              className="w-full text-center py-0.5 pr-3 bg-dark-900 border border-dark-700 text-slate-100 rounded outline-none text-xs font-mono"
                            />
                            <Percent className="w-2.5 h-2.5 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2" />
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-[10px] text-brand-amber">
                          ₹{totalTax.toFixed(2)} <span className="text-[8px] block text-slate-500">({item.gstRate}%)</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-200">
                          ₹{item.total.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => removeCartItem(idx)}
                            className="p-1 hover:bg-brand-rose/10 hover:text-brand-rose text-slate-400 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT SIDEBAR: Customer and Bill Calculation Summary */}
      <div className="space-y-4 flex flex-col h-full justify-between">
        
        {/* Customer Database Lookup Panel */}
        <div className="glass-panel p-4 border-dark-700/50 bg-dark-800/60 flex-shrink-0">
          <h3 className="font-outfit font-semibold text-xs text-brand-indigo uppercase tracking-wider flex items-center space-x-1.5 mb-3">
            <User className="w-4 h-4 text-brand-cyan" />
            <span>Customer Lookup Counter</span>
          </h3>

          <div className="space-y-3">
            
            {/* Phone search field */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">10-Digit Mobile Number</label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                maxLength={10}
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full py-2 px-3.5 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan font-mono text-sm tracking-widest text-center"
              />
            </div>

            {/* Customer Details Display card if found */}
            {customer ? (
              <div className="p-3 bg-brand-indigo/10 border border-brand-indigo/25 rounded-xl space-y-2 animate-in fade-in duration-200">
                <div className="text-xs font-bold text-slate-200 flex justify-between">
                  <span>Name: {customer.name}</span>
                  <span className="text-[10px] text-brand-indigo uppercase tracking-wider font-bold">VIP Member</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                  <span>Loyalty Account Points:</span>
                  <strong className="text-brand-cyan text-xs">{customer.loyaltyPoints} Pts</strong>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">Total Store Visits: {customer.visitCount} visits</div>
                
                {/* Past Purchases / Invoice History */}
                <div className="border-t border-dark-700/60 pt-2 space-y-1.5">
                  <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">Past Invoices ({pastOrders.length})</span>
                  {pastOrders.length === 0 ? (
                    <span className="text-[9px] text-slate-500 italic block">No previous order history.</span>
                  ) : (
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                      {pastOrders.map((o) => {
                        const isExpanded = expandedInvoiceNum === o.invoiceNumber;
                        return (
                          <div 
                            key={o.id}
                            className="bg-dark-900/40 hover:bg-dark-900/80 border border-dark-700/40 rounded p-1.5 transition-all animate-in slide-in-from-bottom-1 duration-150"
                          >
                            {/* Header row toggles expand state */}
                            <div 
                              onClick={() => setExpandedInvoiceNum(isExpanded ? null : o.invoiceNumber)}
                              className="flex items-center justify-between text-[10px] cursor-pointer group"
                              title="Click to view item details"
                            >
                              <div className="font-mono font-semibold text-slate-300 group-hover:text-brand-cyan truncate max-w-[45%]">
                                {o.invoiceNumber.split('-').slice(2).join('-') || o.invoiceNumber}
                              </div>
                              <div className="text-[9px] text-slate-500 font-mono">
                                {new Date(o.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </div>
                              <div className="font-bold text-slate-200 font-mono group-hover:text-brand-cyan">
                                ₹{o.grandTotal}
                              </div>
                            </div>

                            {/* Collapsible item details drawer */}
                            {isExpanded && (
                              <div className="mt-1.5 p-2 bg-dark-900/90 border border-dark-700/60 rounded space-y-1 text-[9px] text-slate-400 font-mono animate-in slide-in-from-top-1 duration-150">
                                <div className="flex justify-between font-bold text-slate-300 border-b border-dark-700/50 pb-0.5 mb-1.5">
                                  <span>ITEMS DETAILS</span>
                                  <span>QTY / PRICE</span>
                                </div>
                                <div className="space-y-1 max-h-24 overflow-y-auto pr-0.5">
                                  {o.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-start gap-1">
                                      <span className="truncate text-slate-300 font-sans text-left flex-1">{item.product.name}</span>
                                      <span className="text-right whitespace-nowrap text-slate-400">{item.quantity} x ₹{item.total.toFixed(0)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-1.5 flex justify-between items-center border-t border-dark-700/50 mt-1.5">
                                  <span className="text-slate-500 text-[8px] font-sans">Mode: {o.paymentMode}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCompletedOrder(o);
                                    }}
                                    className="py-0.5 px-2 bg-brand-cyan hover:bg-brand-cyan/95 text-dark-900 text-[8px] font-bold rounded transition-colors"
                                  >
                                    Reprint Receipt
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              customerPhone.length === 10 && (
                <div className="text-center p-2 bg-brand-rose/10 border border-brand-rose/25 text-brand-rose rounded-xl text-[10px] font-semibold">
                  No account mapped to Mobile. Initializing popup...
                </div>
              )
            )}

          </div>
        </div>

        {/* GST Tax and Invoice Computations Panel */}
        <div className="glass-panel p-5 border-brand-cyan/20 bg-dark-800/80 flex-1 flex flex-col justify-between overflow-y-auto">
          
          <div className="space-y-3">
            <h3 className="font-outfit font-semibold text-xs text-brand-cyan uppercase tracking-wider border-b border-dark-700 pb-2 flex justify-between items-center">
              <span>Checkout Calculations Summary</span>
              <div className="flex rounded bg-dark-900 border border-dark-700 p-0.5 text-[9px] text-slate-400 capitalize">
                <button
                  onClick={() => setIsInterState(false)}
                  className={`py-0.5 px-2 rounded font-semibold transition-all ${!isInterState ? 'bg-brand-cyan text-dark-900' : 'hover:text-slate-200'}`}
                >
                  CGST+SGST
                </button>
                <button
                  onClick={() => setIsInterState(true)}
                  className={`py-0.5 px-2 rounded font-semibold transition-all ${isInterState ? 'bg-brand-rose text-slate-100' : 'hover:text-brand-rose'}`}
                >
                  IGST
                </button>
              </div>
            </h3>

            {/* Checkout Calculations */}
            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal (Taxable):</span>
                <span>₹{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Discounts:</span>
                <span className="text-brand-emerald">-₹{discountTotal.toFixed(2)}</span>
              </div>
              {!isInterState ? (
                <>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>CGST collected:</span>
                    <span>₹{totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>SGST collected:</span>
                    <span>₹{totalSgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>IGST collected:</span>
                  <span>₹{totalIgst.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-dark-700 pt-2 text-slate-400">
                <span>GST Tax Accumulator:</span>
                <span>₹{totalGst.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-dark-700">
            {/* Grand Total badge */}
            <div className="p-4 bg-dark-900 border border-brand-cyan/20 rounded-xl text-center shadow-neon-cyan/5">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Total Payable Net</div>
              <div className="text-3xl font-outfit font-black text-brand-cyan mt-1">₹{grandTotal.toFixed(0)}</div>
              <div className="text-[9px] text-slate-500 font-mono italic mt-1">Inclusive of Indian GST. Rounded off.</div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Payment Mode Selection</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentMode('Cash')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${paymentMode === 'Cash' ? 'bg-brand-cyan text-dark-900 border-brand-cyan shadow-neon-cyan/15' : 'bg-dark-900 text-slate-300 border-dark-700 hover:border-dark-600'}`}
                >
                  Cash
                </button>
                <button
                  onClick={() => setPaymentMode('UPI')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${paymentMode === 'UPI' ? 'bg-brand-cyan text-dark-900 border-brand-cyan shadow-neon-cyan/15' : 'bg-dark-900 text-slate-300 border-dark-700 hover:border-dark-600'}`}
                >
                  UPI (QR)
                </button>
                <button
                  onClick={() => setPaymentMode('Card')}
                  className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${paymentMode === 'Card' ? 'bg-brand-cyan text-dark-900 border-brand-cyan shadow-neon-cyan/15' : 'bg-dark-900 text-slate-300 border-dark-700 hover:border-dark-600'}`}
                >
                  Card
                </button>
              </div>
            </div>

            {/* HUD / Billing shortcuts cheatsheet */}
            <div className="p-2.5 bg-dark-900/60 border border-dark-700/60 rounded-xl text-[10px] font-semibold text-slate-400 flex items-center justify-between select-none">
              <div className="flex items-center space-x-1 text-brand-cyan">
                <Keyboard className="w-4 h-4 text-brand-cyan" />
                <span>Shortcuts</span>
              </div>
              <div className="space-x-2 font-mono text-[9px]">
                <span><strong className="text-slate-200">F8</strong> Search</span>
                <span><strong className="text-slate-200">F2</strong> Checkout</span>
                <span><strong className="text-slate-200">F4</strong> Clear</span>
              </div>
            </div>

            {/* Complete Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full flex items-center justify-center space-x-2 py-3.5 bg-brand-emerald hover:bg-brand-emerald/90 disabled:bg-dark-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none text-dark-900 font-extrabold text-sm rounded-xl shadow-lg shadow-brand-emerald/20 transition-all transform hover:scale-[1.01] active:scale-95 cursor-pointer"
            >
              <CreditCard className="w-5 h-5" />
              <span>Checkout Order & Print Bill (F2)</span>
            </button>

          </div>

        </div>

      </div>

      {/* --- MODAL DIALOGS --- */}
      
      {/* Inline customer onboard modal */}
      {showCustomerModal && (
        <CustomerModal
          phone={customerPhone}
          onClose={() => {
            setShowCustomerModal(false);
            setCustomerPhone('');
          }}
          onSave={(newCust) => {
            setCustomer(newCust);
            setShowCustomerModal(false);
            showToast(`Added customer: ${newCust.name}`);
          }}
        />
      )}

      {/* Camera-based Barcode Scanner Modal */}
      {showScannerModal && (
        <BarcodeScannerModal
          onScanSuccess={handleCameraScanSuccess}
          onClose={() => setShowScannerModal(false)}
        />
      )}

      {/* Catalog Grid Search Modal */}
      {showSearchModal && (
        <ProductSearchModal
          initialQuery={initialSearchQuery}
          onAddProduct={(prod) => {
            addToCart(prod);
          }}
          onClose={() => {
            setShowSearchModal(false);
            setInitialSearchQuery(''); // Reset query on close
          }}
          currentCartItems={cart}
        />
      )}

      {/* Thermal Invoice Print View overlay */}
      {completedOrder && (
        <ThermalReceipt
          order={completedOrder}
          settings={settings}
          onClose={() => setCompletedOrder(null)}
        />
      )}

    </div>
  );
}
