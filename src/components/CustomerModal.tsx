import React, { useState } from 'react';
import { db } from '../database/db';
import type { Customer } from '../types';
import { UserPlus, X } from 'lucide-react';

interface CustomerModalProps {
  phone: string;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

export function CustomerModal({ phone, onClose, onSave }: CustomerModalProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Customer name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const newCustomer: Customer = {
        phone,
        name: name.trim(),
        loyaltyPoints: 0,
        visitCount: 1,
      };

      const id = await db.customers.add(newCustomer);
      newCustomer.id = id;

      onSave(newCustomer);
    } catch (err) {
      console.error('Failed to add customer', err);
      setError('Customer phone number already exists or is invalid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md glass-panel border border-brand-indigo/35 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center space-x-2 text-brand-indigo">
            <UserPlus className="w-5 h-5 text-brand-cyan" />
            <span className="font-outfit font-semibold text-lg text-slate-100">Add New Customer</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-brand-rose bg-brand-rose/10 border border-brand-rose/25 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile Number</label>
            <input
              type="text"
              disabled
              value={phone}
              className="w-full py-2.5 px-4 bg-dark-900 border border-dark-700 text-slate-400 rounded-xl outline-none cursor-not-allowed"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Customer Name *</label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Ramesh Patil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full py-2.5 px-4 bg-dark-900 border border-dark-700 text-slate-100 rounded-xl outline-none focus:border-brand-cyan focus:shadow-neon-cyan transition-all"
            />
          </div>

          <div className="pt-2 flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-dark-700 hover:bg-dark-600 text-slate-200 font-medium rounded-xl border border-dark-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 bg-brand-cyan hover:bg-brand-cyan/95 text-dark-900 font-bold rounded-xl shadow-lg shadow-brand-cyan/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
