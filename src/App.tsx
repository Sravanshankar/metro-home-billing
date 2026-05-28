import { useEffect, useState } from 'react';
import { db, seedDatabase } from './database/db';
import type { StoreSettings } from './types';
import { BillingCounter } from './components/BillingCounter';
import { InventoryManager } from './components/InventoryManager';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { StoreSettingsPanel } from './components/StoreSettingsPanel';
import { 
  ShoppingCart, Package, BarChart3, Settings, 
  Store, Calendar, MapPin, Loader2, Sparkles
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'pos' | 'inventory' | 'analytics' | 'settings'>('pos');
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1. Initialize IndexedDB & Seed Data
  useEffect(() => {
    async function initApp() {
      try {
        await seedDatabase();
        let activeSettings = await db.settings.get(1);
        if (activeSettings) {
          // Dynamic migration/override to map User's requested UPI VPA instantly
          if (activeSettings.upiId === 'metrohome@upi') {
            activeSettings.upiId = 'sankarsravan6-1@oksbi';
            await db.settings.put({ ...activeSettings, id: 1 });
            console.log('Migrated UPI VPA to user requested ID');
          }
          setSettings(activeSettings);
        }
        setDbReady(true);
      } catch (err) {
        console.error('Failed to initialize local IndexedDB', err);
      }
    }
    initApp();
  }, []);

  // 2. Real-time header clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSettingsUpdated = (newSettings: StoreSettings) => {
    setSettings(newSettings);
  };

  if (!dbReady || !settings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-900 text-brand-cyan">
        <Loader2 className="w-10 h-10 animate-spin text-brand-cyan" />
        <span className="mt-4 font-outfit font-semibold text-lg text-slate-300">Initializing METRO HOME billing database...</span>
        <span className="text-xs text-slate-500 mt-1 font-mono">Securing local IndexedDB transaction logs</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-dark-900 relative">
      
      {/* 1. SIDEBAR NAVIGATION DRAWER */}
      <aside className="w-full md:w-64 bg-dark-800 border-b md:border-b-0 md:border-r border-dark-700/60 p-4 flex flex-col justify-between flex-shrink-0 z-30 no-print">
        
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="flex items-center space-x-3 px-2">
            <div className="p-2.5 bg-brand-cyan/15 text-brand-cyan rounded-2xl shadow-neon-cyan/15">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="font-outfit font-black text-sm tracking-wider text-slate-100 flex items-center gap-1">
                <span>METRO HOME</span>
                <Sparkles className="w-3.5 h-3.5 text-brand-cyan animate-pulse" />
              </div>
              <span className="text-[10px] text-slate-400 font-mono tracking-widest block uppercase">POS & INVENTORY</span>
            </div>
          </div>

          <div className="border-t border-dark-700/50 my-2"></div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('pos')}
              className={`w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer
                ${activeTab === 'pos' 
                  ? 'bg-brand-cyan text-dark-900 shadow-lg shadow-brand-cyan/10 font-bold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/40'}`}
            >
              <ShoppingCart className="w-5 h-5 flex-shrink-0" />
              <span>Fast Billing POS</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer
                ${activeTab === 'inventory' 
                  ? 'bg-brand-cyan text-dark-900 shadow-lg shadow-brand-cyan/10 font-bold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/40'}`}
            >
              <Package className="w-5 h-5 flex-shrink-0" />
              <span>Stock Catalog</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer
                ${activeTab === 'analytics' 
                  ? 'bg-brand-cyan text-dark-900 shadow-lg shadow-brand-cyan/10 font-bold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/40'}`}
            >
              <BarChart3 className="w-5 h-5 flex-shrink-0" />
              <span>Sales Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer
                ${activeTab === 'settings' 
                  ? 'bg-brand-cyan text-dark-900 shadow-lg shadow-brand-cyan/10 font-bold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/40'}`}
            >
              <Settings className="w-5 h-5 flex-shrink-0" />
              <span>Configurations</span>
            </button>
          </nav>
        </div>

        {/* Footer profile metadata */}
        <div className="pt-4 border-t border-dark-700/50 hidden md:block">
          <div className="p-3 bg-dark-900/60 rounded-2xl border border-dark-700 flex items-center space-x-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-brand-emerald animate-pulse"></div>
            <div>
              <div className="text-[10px] text-slate-300 font-bold leading-tight font-sans truncate max-w-[120px]">{settings.storeName}</div>
              <div className="text-[8px] text-slate-500 font-mono tracking-tighter uppercase mt-0.5">Operator #01 (Admin)</div>
            </div>
          </div>
        </div>

      </aside>

      {/* 2. MAIN CORE CONTENT WRAPPER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header Details Panel */}
        <header className="bg-dark-800 border-b border-dark-700/60 py-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 flex-shrink-0 z-20 no-print">
          
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 font-mono">
            <Store className="w-4 h-4 text-brand-cyan" />
            <span className="text-slate-200 font-sans font-bold">{settings.storeName}</span>
            <span className="text-slate-600">|</span>
            <MapPin className="w-3.5 h-3.5 text-brand-rose" />
            <span>GST Base: {settings.state} ({settings.stateCode})</span>
          </div>

          <div className="flex items-center space-x-4 text-xs font-semibold text-slate-400 font-mono">
            <div className="flex items-center space-x-1.5 bg-dark-900 border border-dark-700 py-1 px-3 rounded-lg text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-brand-cyan" />
              <span>
                {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })} 
                {' '}-{' '}
                {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

        </header>

        {/* Tab Panel Body */}
        <div className="flex-1 p-6 overflow-y-auto z-10">
          <div className="max-w-[1600px] mx-auto h-full">
            {activeTab === 'pos' && <BillingCounter settings={settings} />}
            {activeTab === 'inventory' && <InventoryManager />}
            {activeTab === 'analytics' && <DashboardAnalytics />}
            {activeTab === 'settings' && (
              <StoreSettingsPanel onSettingsUpdated={handleSettingsUpdated} />
            )}
          </div>
        </div>

      </main>
      
    </div>
  );
}
