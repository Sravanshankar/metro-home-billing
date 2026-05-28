import React, { useState } from 'react';
import { db } from '../database/db';
import type { Product } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, Plus, Edit3, Trash2, ShieldAlert, Camera } from 'lucide-react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

const CATEGORIES = [
  'Grains & Pulses',
  'Flours & Grains',
  'Oils & Ghee',
  'Personal Care',
  'Household',
  'Dairy',
  'Chocolates & Snacks',
  'Beverages',
  'Spices & Condiments',
  'General Groceries'
];

const GST_SLABS = [0, 5, 12, 18, 28];

export function InventoryManager() {
  // Live query products list
  const products = useLiveQuery(() => db.products.toArray()) || [];

  // Search and Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockStatus, setStockStatus] = useState<'All' | 'Low Stock'>('All');

  // Modal / Drawer States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [hsn, setHsn] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [costPrice, setCostPrice] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('0');
  const [gstRate, setGstRate] = useState(18);
  const [stock, setStock] = useState('0');
  const [lowStockLimit, setLowStockLimit] = useState('10');

  const [formError, setFormError] = useState('');

  // Handle Edit Trigger
  const handleEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setHsn(prod.hsn);
    setCategory(prod.category);
    setCostPrice(prod.costPrice.toString());
    setSellingPrice(prod.sellingPrice.toString());
    setGstRate(prod.gstRate);
    setStock(prod.stock.toString());
    setLowStockLimit(prod.lowStockLimit.toString());
    
    setFormError('');
    setIsModalOpen(true);
  };

  // Handle Add Trigger
  const handleAddNew = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setHsn('');
    setCategory(CATEGORIES[0]);
    setCostPrice('0');
    setSellingPrice('0');
    setGstRate(18);
    setStock('0');
    setLowStockLimit('10');

    setFormError('');
    setIsModalOpen(true);
  };

  // Delete Product
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you absolutely sure you want to delete this product from the inventory? This action cannot be undone.')) {
      try {
        await db.products.delete(id);
      } catch (err) {
        console.error(err);
        alert('Failed to delete product.');
      }
    }
  };

  // Submit Product Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validations
    if (!name.trim() || !sku.trim() || !hsn.trim()) {
      setFormError('Please fill in Name, SKU/Barcode, and HSN Code.');
      return;
    }

    const costVal = parseFloat(costPrice);
    const sellVal = parseFloat(sellingPrice);
    const stockVal = parseInt(stock);
    const limitVal = parseInt(lowStockLimit);

    if (isNaN(costVal) || costVal < 0 || isNaN(sellVal) || sellVal < 0) {
      setFormError('Cost Price and Selling Price must be positive numbers.');
      return;
    }

    if (sellVal < costVal) {
      if (!window.confirm('Warning: Selling price is less than cost price. Do you want to save anyway?')) {
        return;
      }
    }

    if (isNaN(stockVal) || stockVal < 0 || isNaN(limitVal) || limitVal < 0) {
      setFormError('Stock and Low Stock threshold must be positive integers.');
      return;
    }

    const payload: Product = {
      name: name.trim(),
      sku: sku.trim(),
      hsn: hsn.trim(),
      category,
      costPrice: costVal,
      sellingPrice: sellVal,
      gstRate,
      stock: stockVal,
      lowStockLimit: limitVal
    };

    try {
      if (editingProduct?.id) {
        // Edit existing
        await db.products.update(editingProduct.id, payload);
      } else {
        // Add new
        // Double check SKU uniqueness
        const existing = await db.products.where('sku').equals(payload.sku).first();
        if (existing) {
          setFormError(`Product with Barcode/SKU "${payload.sku}" already exists! (${existing.name})`);
          return;
        }
        await db.products.add(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Database storage error. Please verify input fields.');
    }
  };

  // Filtered list
  const filteredProducts = products.filter(prod => {
    const matchesSearch = 
      prod.name.toLowerCase().includes(search.toLowerCase()) ||
      prod.sku.includes(search) ||
      prod.hsn.includes(search);

    const matchesCategory = selectedCategory === 'All' || prod.category === selectedCategory;
    const matchesStock = stockStatus === 'All' || prod.stock <= prod.lowStockLimit;

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-dark-700 gap-4">
        <div>
          <h1 className="font-outfit font-bold text-2xl text-slate-100">Inventory Catalog Manager</h1>
          <p className="text-sm text-slate-400">Add barcodes, adjust stock levels, verify HSN and GST slabs.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="flex items-center justify-center space-x-2 py-2.5 px-4 bg-brand-cyan hover:bg-brand-cyan/95 text-dark-900 font-bold rounded-xl shadow-lg shadow-brand-cyan/20 transition-all duration-200 transform hover:scale-[1.02] active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Name, SKU, or HSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan focus:shadow-neon-cyan/25 transition-all text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-2 px-3 bg-dark-900 border border-dark-700 text-slate-300 rounded-xl outline-none text-xs cursor-pointer focus:border-brand-cyan"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <div className="flex rounded-xl bg-dark-900 border border-dark-700 p-0.5">
            <button
              onClick={() => setStockStatus('All')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${stockStatus === 'All' ? 'bg-brand-cyan text-dark-900' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All Items
            </button>
            <button
              onClick={() => setStockStatus('Low Stock')}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1 ${stockStatus === 'Low Stock' ? 'bg-brand-rose text-slate-100' : 'text-slate-400 hover:text-brand-rose'}`}
            >
              <span>Low Stock</span>
              {products.filter(p => p.stock <= p.lowStockLimit).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-brand-rose animate-ping"></span>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Product Grid Table */}
      <div className="glass-panel overflow-hidden border border-dark-700/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="bg-dark-900 border-b border-dark-700 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Product Details</th>
                <th className="py-3.5 px-4">Barcode / SKU</th>
                <th className="py-3.5 px-4">HSN</th>
                <th className="py-3.5 px-4 text-right">Cost Price (₹)</th>
                <th className="py-3.5 px-4 text-right">Selling (₹)</th>
                <th className="py-3.5 px-4 text-center">GST</th>
                <th className="py-3.5 px-4 text-center">Stock Status</th>
                <th className="py-3.5 px-4 text-right">Profit Margin</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500 font-medium">
                    No products matching filter criteria found in database.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => {
                  const isLow = prod.stock <= prod.lowStockLimit;
                  // Calculate markup margin %
                  const profit = prod.sellingPrice - prod.costPrice;
                  const marginPercent = prod.sellingPrice > 0 ? (profit / prod.sellingPrice) * 100 : 0;

                  return (
                    <tr 
                      key={prod.id} 
                      className="border-b border-dark-700/50 hover:bg-dark-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{prod.name}</div>
                        <div className="text-[10px] text-brand-cyan">{prod.category}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">{prod.sku}</td>
                      <td className="py-3.5 px-4 font-mono text-xs">{prod.hsn}</td>
                      <td className="py-3.5 px-4 text-right font-mono">₹{prod.costPrice.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">₹{prod.sellingPrice.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-300">{prod.gstRate}%</td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold font-mono ${isLow ? 'bg-brand-rose/15 text-brand-rose' : 'bg-brand-emerald/15 text-brand-emerald'}`}>
                            {prod.stock} Units
                          </span>
                          {isLow && (
                            <span className="text-[8px] text-brand-amber font-semibold mt-1 flex items-center space-x-0.5">
                              <ShieldAlert className="w-2.5 h-2.5 inline" />
                              <span>Safety Refill Limit: {prod.lowStockLimit}</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`font-semibold text-xs ${marginPercent > 20 ? 'text-brand-emerald' : marginPercent > 10 ? 'text-brand-indigo' : 'text-brand-amber'}`}>
                          {marginPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => handleEdit(prod)}
                            className="p-1.5 bg-dark-700 hover:bg-dark-600 text-slate-300 rounded-lg hover:text-brand-cyan transition-colors"
                            title="Edit details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => prod.id && handleDelete(prod.id)}
                            className="p-1.5 bg-dark-700 hover:bg-dark-600 text-slate-300 rounded-lg hover:text-brand-rose transition-colors"
                            title="Remove product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Add/Edit Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl glass-panel border border-brand-cyan/20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-900/60">
              <h2 className="font-outfit font-bold text-lg text-slate-100">
                {editingProduct ? 'Modify Product Specifications' : 'Onboard New Product'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-dark-700 rounded-lg"
              >
                Cancel
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs text-brand-rose bg-brand-rose/10 border border-brand-rose/25 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Product Title / Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fortune Sunflower Oil 1L"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full py-2 px-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300">Barcode / SKU Barcode *</label>
                    <button
                      type="button"
                      onClick={() => setShowScannerModal(true)}
                      className="text-[9px] uppercase font-bold text-brand-cyan hover:text-brand-cyan/85 transition-colors flex items-center space-x-1 border border-brand-cyan/35 px-1.5 py-0.5 rounded bg-brand-cyan/5 active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Scan Barcode</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 890123400012"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full py-2 px-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">HSN Tariff Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1512"
                    value={hsn}
                    onChange={(e) => setHsn(e.target.value)}
                    className="w-full py-2 px-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Product Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full py-2 px-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Purchase Cost Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full py-2 px-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Retail Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full py-2 px-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">GST Slab Rate (%)</label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(parseInt(e.target.value))}
                    className="w-full py-2 px-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan cursor-pointer"
                  >
                    {GST_SLABS.map(rate => (
                      <option key={rate} value={rate}>{rate}% Slab</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Current Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full py-2 px-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Low-Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    value={lowStockLimit}
                    onChange={(e) => setLowStockLimit(e.target.value)}
                    className="w-full py-2 px-3 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan font-mono"
                  />
                </div>

              </div>

              {/* Profit preview */}
              <div className="p-3 bg-dark-900/80 rounded-xl border border-dark-700 flex justify-between items-center text-xs">
                <span className="text-slate-400">Profit Margin Projection:</span>
                <span className="font-bold text-brand-emerald font-mono">
                  {parseFloat(sellingPrice) > 0 
                    ? `+₹${(parseFloat(sellingPrice) - parseFloat(costPrice)).toFixed(2)} (${(((parseFloat(sellingPrice) - parseFloat(costPrice)) / parseFloat(sellingPrice)) * 100).toFixed(1)}%)`
                    : '₹0.00 (0.0%)'
                  }
                </span>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-dark-700/50 flex space-x-3 justify-end bg-dark-900/30 -mx-6 -mb-6 p-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-4 bg-dark-700 hover:bg-dark-600 text-slate-200 font-medium rounded-xl border border-dark-600 transition-colors"
                >
                  Cancel / Return
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-brand-cyan hover:bg-brand-cyan/95 text-dark-900 font-bold rounded-xl shadow-lg shadow-brand-cyan/20 transition-all cursor-pointer"
                >
                  {editingProduct ? 'Apply Modifications' : 'Onboard Product'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
      {/* Camera-based Barcode Scanner Modal for SKU field */}
      {showScannerModal && (
        <BarcodeScannerModal
          onScanSuccess={(scannedSku) => {
            setSku(scannedSku);
            setShowScannerModal(false);
          }}
          onClose={() => setShowScannerModal(false)}
        />
      )}

    </div>
  );
}
