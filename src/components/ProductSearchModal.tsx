import { useState, useEffect } from 'react';
import { db } from '../database/db';
import type { Product } from '../types';
import { Search, X, Package, Layers, PlusCircle, Check } from 'lucide-react';

interface ProductSearchModalProps {
  onAddProduct: (product: Product) => void;
  onClose: () => void;
  currentCartItems: { product: Product; quantity: number }[];
  initialQuery?: string;
}

const CATEGORIES = [
  'All',
  'Grains & Pulses',
  'Flours & Grains',
  'Oils & Ghee',
  'Personal Care',
  'Household',
  'Dairy',
  'Chocolates & Snacks',
  'Beverages',
  'Spices & Condiments'
];

export function ProductSearchModal({ onAddProduct, onClose, currentCartItems, initialQuery = '' }: ProductSearchModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Load all products on mount
  useEffect(() => {
    async function loadProducts() {
      const allProds = await db.products.toArray();
      setProducts(allProds);
    }
    loadProducts();
  }, []);

  // Filter products by search query and category
  const filteredProducts = products.filter((prod) => {
    const matchesSearch = 
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.sku.includes(searchQuery) ||
      prod.hsn.includes(searchQuery);

    const matchesCategory = selectedCategory === 'All' || prod.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Check if a product is already in the cart and return its quantity
  const getCartQuantity = (prodId?: number) => {
    if (!prodId) return 0;
    const found = currentCartItems.find((item) => item.product.id === prodId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[85vh] glass-panel border border-brand-cyan/25 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-900/60">
          <div className="flex items-center space-x-2 text-brand-cyan">
            <Package className="w-5 h-5" />
            <span className="font-outfit font-semibold text-lg text-slate-100">Browse & Search Products</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-dark-700 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Search */}
        <div className="p-4 border-b border-dark-700 space-y-3 bg-dark-800/40">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Search product name, barcode SKU, or HSN code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan focus:shadow-neon-cyan/25 transition-all text-sm font-sans"
            />
          </div>

          {/* Category Scroller */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer
                  ${selectedCategory === cat 
                    ? 'bg-brand-cyan text-dark-900 font-bold shadow-sm' 
                    : 'bg-dark-900 text-slate-400 hover:text-slate-200 border border-dark-700'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid list */}
        <div className="flex-1 p-6 overflow-y-auto bg-dark-900/10">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-8">
              <Package className="w-12 h-12 mb-3 text-slate-600 animate-pulse" />
              <p className="font-semibold text-sm">No Products Found</p>
              <p className="text-xs text-slate-400 mt-1">Try modifying your search query or selected category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => {
                const cartQty = getCartQuantity(prod.id);
                const isLowStock = prod.stock <= prod.lowStockLimit;
                const isOutOfStock = prod.stock <= 0;
                
                return (
                  <div 
                    key={prod.id} 
                    className={`glass-card p-4 flex flex-col justify-between space-y-4 relative overflow-hidden group
                      ${cartQty > 0 ? 'border-brand-cyan/40 bg-brand-cyan/5' : ''}`}
                  >
                    
                    {/* Corner badge for cart qty */}
                    {cartQty > 0 && (
                      <div className="absolute top-0 right-0 bg-brand-cyan text-dark-900 font-bold font-mono text-[10px] px-2 py-0.5 rounded-bl flex items-center space-x-0.5">
                        <Check className="w-3 h-3" />
                        <span>{cartQty} in Cart</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center space-x-1">
                        <Layers className="w-3 h-3 text-brand-cyan inline" />
                        <span>{prod.category}</span>
                      </div>
                      <h4 className="font-semibold text-slate-200 text-sm leading-snug tracking-tight font-sans line-clamp-2">
                        {prod.name}
                      </h4>
                      <div className="text-[10px] text-slate-400 font-mono">
                        HSN: <strong className="text-slate-300">{prod.hsn}</strong> | SKU: <strong className="text-slate-300">{prod.sku}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dark-700/40">
                      
                      {/* Price & Stock info */}
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-400 font-mono leading-none">MRP</span>
                        <span className="text-base font-extrabold text-slate-100 font-mono mt-0.5">₹{prod.sellingPrice.toFixed(0)}</span>
                        
                        <span className={`text-[9px] font-mono font-bold mt-1.5 px-1.5 py-0.5 rounded self-start
                          ${isOutOfStock ? 'bg-brand-rose/15 text-brand-rose' :
                            isLowStock ? 'bg-brand-amber/15 text-brand-amber' : 
                            'bg-brand-emerald/15 text-brand-emerald'}`}
                        >
                          {isOutOfStock ? 'OUT OF STOCK' : `${prod.stock} Units Available`}
                        </span>
                      </div>

                      {/* Add Button */}
                      <button
                        disabled={isOutOfStock || cartQty >= prod.stock}
                        onClick={() => onAddProduct(prod)}
                        className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center space-x-1 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed
                          ${cartQty > 0 
                            ? 'bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900' 
                            : 'bg-dark-900 border border-dark-700 hover:border-brand-cyan text-brand-cyan hover:bg-brand-cyan/5'}`}
                      >
                        <PlusCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-xs font-bold px-0.5">{cartQty > 0 ? 'Add More' : 'Add Item'}</span>
                      </button>

                    </div>
                    
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
