import { useState } from 'react';
import { db } from '../database/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { TrendingUp, AlertTriangle, IndianRupee, Layers, ShoppingBag, PlusCircle } from 'lucide-react';

export function DashboardAnalytics() {
  // Live queries for real-time dashboard updates
  const orders = useLiveQuery(() => db.orders.reverse().toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];

  const [refillLoading, setRefillLoading] = useState<number | null>(null);

  // 1. Calculations for Core Metric Cards
  const totalRevenue = orders.reduce((acc, o) => acc + o.grandTotal, 0);
  const totalGst = orders.reduce((acc, o) => acc + o.totalGst, 0);
  
  // Calculate total margins
  let totalCostOfGoodsSold = 0;
  orders.forEach(order => {
    order.items.forEach(item => {
      totalCostOfGoodsSold += (item.product.costPrice || 0) * item.quantity;
    });
  });
  const totalTaxable = orders.reduce((acc, o) => acc + o.subTotal, 0);
  const totalProfit = totalTaxable - totalCostOfGoodsSold;
  const profitMarginPercent = totalTaxable > 0 ? (totalProfit / totalTaxable) * 100 : 0;

  const lowStockItems = products.filter(p => p.stock <= p.lowStockLimit);

  // 2. GST Slabs Breakdown
  const initialSlabBreakdown = {
    '0%': { taxable: 0, tax: 0 },
    '5%': { taxable: 0, tax: 0 },
    '12%': { taxable: 0, tax: 0 },
    '18%': { taxable: 0, tax: 0 },
    '28%': { taxable: 0, tax: 0 },
  };

  const gstSlabs = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      const rateKey = `${item.gstRate}%` as keyof typeof initialSlabBreakdown;
      if (acc[rateKey]) {
        acc[rateKey].taxable += item.taxableValue;
        acc[rateKey].tax += item.cgst + item.sgst + item.igst;
      }
    });
    return acc;
  }, { ...initialSlabBreakdown } as Record<string, { taxable: number; tax: number }>);

  // 3. Top Bestselling Items Leaderboard
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach(order => {
    order.items.forEach(item => {
      const id = item.product.id?.toString() || item.product.sku;
      if (!productSalesMap[id]) {
        productSalesMap[id] = { name: item.product.name, qty: 0, revenue: 0 };
      }
      productSalesMap[id].qty += item.quantity;
      productSalesMap[id].revenue += item.total;
    });
  });

  const bestSellers = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // 4. Custom SVG Revenue Chart Data
  // Group sales by past 7 days
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const salesByDay = past7Days.map(dateStr => {
    const dayOrders = orders.filter(o => o.date.startsWith(dateStr));
    const total = dayOrders.reduce((acc, o) => acc + o.grandTotal, 0);
    
    // Format label (e.g. "28 May")
    const d = new Date(dateStr);
    const label = `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`;
    return { label, total };
  });

  const maxDailySales = Math.max(...salesByDay.map(s => s.total), 5000);

  // Handlers for instant stock adjustments from dashboard
  const handleRestock = async (productId: number, qtyToAdd: number) => {
    setRefillLoading(productId);
    try {
      const prod = await db.products.get(productId);
      if (prod) {
        await db.products.update(productId, {
          stock: prod.stock + qtyToAdd
        });
      }
    } catch (err) {
      console.error('Failed to restock item', err);
    } finally {
      setRefillLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="flex items-center justify-between pb-2 border-b border-dark-700">
        <div>
          <h1 className="font-outfit font-bold text-2xl text-slate-100">Supermarket Analytics & Stock Board</h1>
          <p className="text-sm text-slate-400">Monthly financial statements, GST slab audits, and dynamic inventory warnings.</p>
        </div>
        <div className="text-xs text-brand-cyan bg-brand-cyan/10 border border-brand-cyan/25 py-1 px-3 rounded-full font-semibold select-none flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-pulse"></span>
          <span>Live Stock Deductions Synced</span>
        </div>
      </div>

      {/* 1. Core Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Revenue</span>
            <div className="text-2xl font-outfit font-bold text-slate-100">₹{totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
            <p className="text-[10px] text-brand-emerald flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 inline" />
              <span>Includes ₹{totalGst.toLocaleString('en-IN', { maximumFractionDigits: 1 })} total GST</span>
            </p>
          </div>
          <div className="p-3 bg-brand-cyan/15 rounded-2xl text-brand-cyan shadow-neon-cyan/10">
            <IndianRupee className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taxes Collected</span>
            <div className="text-2xl font-outfit font-bold text-slate-100">₹{totalGst.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</div>
            <p className="text-[10px] text-slate-400">Breakdown verified by slabs</p>
          </div>
          <div className="p-3 bg-brand-emerald/15 rounded-2xl text-brand-emerald shadow-neon-emerald/10">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Profit Margin</span>
            <div className="text-2xl font-outfit font-bold text-slate-100">{profitMarginPercent.toFixed(1)}%</div>
            <p className="text-[10px] text-brand-emerald">₹{totalProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })} net margin</p>
          </div>
          <div className="p-3 bg-brand-indigo/15 rounded-2xl text-brand-indigo">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="glass-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Warnings</span>
            <div className={`text-2xl font-outfit font-bold ${lowStockItems.length > 0 ? 'text-brand-rose' : 'text-brand-emerald'}`}>
              {lowStockItems.length} Products
            </div>
            <p className="text-[10px] text-slate-400">Require immediate restocking</p>
          </div>
          <div className={`p-3 rounded-2xl ${lowStockItems.length > 0 ? 'bg-brand-rose/15 text-brand-rose animate-bounce' : 'bg-brand-emerald/15 text-brand-emerald'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. Interactive Charts & Restock Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Revenue Chart */}
        <div className="glass-panel p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-outfit font-semibold text-lg text-slate-100">Revenue Trend (Past 7 Days)</h2>
            <span className="text-xs text-slate-400 font-mono">Gross Earnings In INR</span>
          </div>

          {/* Premium Vector SVG Chart */}
          <div className="h-64 relative pt-4 flex flex-col justify-end">
            <svg className="w-full h-[80%] overflow-visible" viewBox="0 0 600 180">
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                const yVal = 160 - ratio * 140;
                return (
                  <line 
                    key={index} 
                    x1="0" 
                    y1={yVal} 
                    x2="580" 
                    y2={yVal} 
                    stroke="#1F1F2E" 
                    strokeDasharray="4 4" 
                  />
                );
              })}

              {/* Bar and trend logic */}
              {salesByDay.map((day, idx) => {
                const xVal = 40 + idx * 80;
                const barHeight = day.total > 0 ? (day.total / maxDailySales) * 130 : 5;
                const yVal = 160 - barHeight;

                return (
                  <g key={idx} className="group">
                    {/* Background hover highlights */}
                    <rect 
                      x={xVal - 25} 
                      y="10" 
                      width="50" 
                      height="160" 
                      fill="transparent" 
                      className="hover:fill-slate-800/10 cursor-pointer transition-colors"
                    />

                    {/* Gradient Bar */}
                    <defs>
                      <linearGradient id={`barGrad-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#06B6D4" />
                        <stop offset="100%" stopColor="#6366F1" />
                      </linearGradient>
                    </defs>

                    <rect
                      x={xVal - 12}
                      y={yVal}
                      width="24"
                      height={barHeight}
                      rx="6"
                      fill={`url(#barGrad-${idx})`}
                      className="transition-all duration-500 ease-out origin-bottom scale-y-100 hover:opacity-90"
                    />

                    {/* Tooltip on hover */}
                    <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                      <rect 
                        x={xVal - 40} 
                        y={yVal - 30} 
                        width="80" 
                        height="22" 
                        rx="4" 
                        fill="#1F1F2E" 
                        stroke="#06B6D4"
                        strokeWidth="1"
                      />
                      <text 
                        x={xVal} 
                        y={yVal - 15} 
                        textAnchor="middle" 
                        fill="#06B6D4" 
                        fontSize="9" 
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        ₹{day.total.toFixed(0)}
                      </text>
                    </g>

                    {/* Label */}
                    <text
                      x={xVal}
                      y="178"
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="9"
                      fontWeight="600"
                    >
                      {day.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Real-time Restock Center */}
        <div className="glass-panel p-5 space-y-4 flex flex-col max-h-[20.5rem] overflow-hidden">
          <div className="flex items-center justify-between border-b border-dark-700/50 pb-2 flex-shrink-0">
            <h2 className="font-outfit font-semibold text-lg text-slate-100 flex items-center space-x-1.5">
              <AlertTriangle className="w-5 h-5 text-brand-amber" />
              <span>Stock Shortages</span>
            </h2>
            <span className="text-[10px] bg-brand-rose/10 border border-brand-rose/25 text-brand-rose py-0.5 px-2 rounded-full font-bold">
              {lowStockItems.length} Low
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {lowStockItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <ShoppingBag className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs">All products satisfy store safety stock thresholds.</p>
              </div>
            ) : (
              lowStockItems.map((prod) => (
                <div key={prod.id} className="p-3 bg-dark-900/60 rounded-xl border border-brand-amber/15 flex items-center justify-between hover:border-brand-amber/35 transition-all">
                  <div className="space-y-0.5 max-w-[55%]">
                    <div className="text-xs font-semibold text-slate-200 truncate">{prod.name}</div>
                    <div className="text-[9px] font-mono text-slate-500">Stock: <strong className="text-brand-rose">{prod.stock}</strong> / Min: {prod.lowStockLimit}</div>
                  </div>

                  <div className="flex space-x-1.5">
                    <button
                      disabled={refillLoading === prod.id}
                      onClick={() => prod.id && handleRestock(prod.id, 10)}
                      className="py-1 px-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 hover:border-brand-cyan/40 text-slate-200 rounded-lg text-[10px] font-semibold transition-all flex items-center space-x-1 active:scale-95 disabled:opacity-50"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>+10</span>
                    </button>
                    <button
                      disabled={refillLoading === prod.id}
                      onClick={() => prod.id && handleRestock(prod.id, 50)}
                      className="py-1 px-2 bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 rounded-lg text-[10px] font-bold transition-all flex items-center space-x-1 active:scale-95 disabled:opacity-50"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-dark-900" />
                      <span>+50</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 3. GST Slab Audit & Bestsellers Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* GST Slab Audit */}
        <div className="glass-panel p-5 space-y-4">
          <div className="border-b border-dark-700/50 pb-2 flex justify-between items-center">
            <h2 className="font-outfit font-semibold text-lg text-slate-100">Indian GST Slab Summary</h2>
            <span className="text-[10px] text-slate-400 font-mono">Tax split compliance auditor</span>
          </div>

          <div className="space-y-3">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-dark-700 font-semibold text-slate-400 text-left">
                  <th className="pb-2">GST Slab</th>
                  <th className="pb-2 text-right">Taxable Sales (₹)</th>
                  <th className="pb-2 text-right">Tax Collected (₹)</th>
                  <th className="pb-2 text-right">Total Net (₹)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(gstSlabs).map(([slab, data]) => (
                  <tr key={slab} className="border-b border-dark-700/30 hover:bg-dark-800/30 transition-colors">
                    <td className="py-2.5 font-bold text-brand-cyan">{slab}</td>
                    <td className="py-2.5 text-right font-mono">₹{data.taxable.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-mono text-brand-amber">₹{data.tax.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-mono text-slate-200">₹{(data.taxable + data.tax).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bestsellers Leaderboard */}
        <div className="glass-panel p-5 space-y-4">
          <div className="border-b border-dark-700/50 pb-2 flex justify-between items-center">
            <h2 className="font-outfit font-semibold text-lg text-slate-100">Top 5 Bestselling Products</h2>
            <span className="text-[10px] text-slate-400 font-mono">Sorted by quantity sold</span>
          </div>

          <div className="space-y-2 h-full overflow-hidden">
            {bestSellers.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500">
                <ShoppingBag className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs">No transactions compiled yet. Complete checkouts to view leaderboard.</p>
              </div>
            ) : (
              bestSellers.map((item, idx) => (
                <div key={idx} className="p-3 bg-dark-900/40 rounded-xl border border-dark-700/50 flex items-center justify-between hover:bg-dark-900 transition-all">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 flex items-center justify-center bg-brand-cyan/15 text-brand-cyan rounded-lg text-xs font-bold font-mono">
                      #{idx + 1}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{item.name}</div>
                      <div className="text-[10px] text-slate-500">Quantity Sold: <strong>{item.qty} units</strong></div>
                    </div>
                  </div>
                  <div className="text-xs font-bold font-mono text-brand-emerald">
                    ₹{item.revenue.toFixed(0)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
