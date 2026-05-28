import React, { useEffect, useState } from 'react';
import { db } from '../database/db';
import type { StoreSettings } from '../types';
import { Settings, Save, CheckCircle } from 'lucide-react';

const INDIAN_STATES = [
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Delhi', code: '07' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' }
];

interface StoreSettingsPanelProps {
  onSettingsUpdated: (newSettings: StoreSettings) => void;
}

export function StoreSettingsPanel({ onSettingsUpdated }: StoreSettingsPanelProps) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const data = await db.settings.get(1);
      if (data) {
        setSettings(data);
      }
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!settings) return;
    const { name, value } = e.target;

    if (name === 'state') {
      const selectedState = INDIAN_STATES.find(s => s.name === value);
      setSettings({
        ...settings,
        state: value,
        stateCode: selectedState ? selectedState.code : '00'
      });
    } else {
      setSettings({
        ...settings,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    if (!settings.storeName.trim() || !settings.gstin.trim() || !settings.upiId.trim()) {
      setError('Please fill in all mandatory fields (Store Name, GSTIN, UPI ID).');
      return;
    }

    // Validate Indian GSTIN (15 characters)
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstinRegex.test(settings.gstin.toUpperCase().trim())) {
      setError('Invalid Indian GSTIN Format! Must be a 15-character standard tax ID.');
      return;
    }

    try {
      setError('');
      const updatedSettings = {
        ...settings,
        gstin: settings.gstin.toUpperCase().trim(),
        upiId: settings.upiId.trim()
      };
      
      await db.settings.put({ ...updatedSettings, id: 1 });
      setSettings(updatedSettings);
      onSettingsUpdated(updatedSettings);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to save settings. Please try again.');
    }
  };

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64 text-brand-cyan">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-cyan"></div>
        <span className="ml-3 font-medium">Loading Settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* Title */}
      <div className="flex items-center space-x-3 pb-2 border-b border-dark-700">
        <div className="p-2 bg-brand-cyan/15 rounded-xl text-brand-cyan">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-outfit font-bold text-2xl text-slate-100">Store Configurations</h1>
          <p className="text-sm text-slate-400">Configure Indian GST engine, billing details, and printer headers.</p>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center space-x-2 p-4 text-brand-emerald bg-brand-emerald/10 border border-brand-emerald/25 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">Configurations updated successfully! All invoice modules adjusted.</span>
        </div>
      )}

      {error && (
        <div className="p-4 text-sm text-brand-rose bg-brand-rose/10 border border-brand-rose/25 rounded-2xl">
          {error}
        </div>
      )}

      {/* Main Settings Card */}
      <form onSubmit={handleSubmit} className="glass-panel p-6 space-y-6">
        
        {/* Section 1: Store profile */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-cyan border-b border-dark-700/50 pb-2 mb-4">Retail Shop Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Shop / Supermarket Name *</label>
              <input
                type="text"
                name="storeName"
                value={settings.storeName}
                onChange={handleChange}
                className="w-full py-2.5 px-4 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Support Helpline Number</label>
              <input
                type="text"
                name="phone"
                value={settings.phone}
                onChange={handleChange}
                className="w-full py-2.5 px-4 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan transition-all"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-slate-300">Address (Printed on receipts)</label>
              <input
                type="text"
                name="address"
                value={settings.address}
                onChange={handleChange}
                className="w-full py-2.5 px-4 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan transition-all"
              />
            </div>

          </div>
        </div>

        {/* Section 2: GST & Taxes */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-cyan border-b border-dark-700/50 pb-2 mb-4">GST Compliance Engine Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Indian GSTIN ID *</label>
              <input
                type="text"
                name="gstin"
                value={settings.gstin}
                onChange={handleChange}
                placeholder="29AAAAA1234A1Z1"
                className="w-full py-2.5 px-4 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan transition-all uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Base State location</label>
              <select
                name="state"
                value={settings.state}
                onChange={handleChange}
                className="w-full py-2.5 px-4 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan transition-all cursor-pointer"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.name}>{st.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">GST State Code (Auto)</label>
              <input
                type="text"
                disabled
                value={settings.stateCode}
                className="w-full py-2.5 px-4 bg-dark-900/60 border border-dark-700 text-slate-400 rounded-xl outline-none cursor-not-allowed"
              />
            </div>

          </div>
        </div>

        {/* Section 3: UPI Payment */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-cyan border-b border-dark-700/50 pb-2 mb-4">UPI Digital Payments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Merchant UPI VPA * (For QR generation)</label>
              <input
                type="text"
                name="upiId"
                value={settings.upiId}
                onChange={handleChange}
                placeholder="shopname@upi"
                className="w-full py-2.5 px-4 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">UPI Integration Status</label>
              <div className="w-full py-2.5 px-4 bg-brand-emerald/10 border border-brand-emerald/25 text-brand-emerald font-semibold rounded-xl text-center select-none text-xs flex items-center justify-center space-x-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-emerald animate-pulse"></span>
                <span>Active (Automatic UPI Dynamic QR Enabled)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Section 4: Receipt Footer */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-cyan border-b border-dark-700/50 pb-2 mb-4">Thermal Print Customizations</h2>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Receipt Footer Slogan / T&C</label>
            <textarea
              name="receiptFooter"
              rows={2}
              value={settings.receiptFooter}
              onChange={handleChange}
              className="w-full py-2.5 px-4 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan transition-all resize-none"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-dark-700/50 flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 py-3 px-6 bg-brand-cyan hover:bg-brand-cyan/95 text-dark-900 font-bold rounded-xl shadow-lg shadow-brand-cyan/20 transition-all transform hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <Save className="w-5 h-5" />
            <span>Save System Configurations</span>
          </button>
        </div>

      </form>
    </div>
  );
}
