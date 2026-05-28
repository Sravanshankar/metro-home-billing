import { createPortal } from 'react-dom';
import { QRCodeCanvas } from 'qrcode.react';
import type { Order, StoreSettings } from '../types';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface ThermalReceiptProps {
  order: Order;
  settings: StoreSettings;
  onClose: () => void;
}

export function ThermalReceipt({ order, settings, onClose }: ThermalReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  // Generate the Indian UPI Deep Link
  // Format: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=TXN_NOTE
  const upiUrl = `upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.storeName)}&am=${order.grandTotal.toFixed(2)}&cu=INR&tn=${order.invoiceNumber}`;

  // Helper to group items by HSN for the GST Analysis Table
  const gstAnalysis = order.items.reduce((acc, item) => {
    const hsn = item.product.hsn || 'N/A';
    if (!acc[hsn]) {
      acc[hsn] = {
        hsn,
        gstRate: item.gstRate,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
    }
    acc[hsn].taxableValue += item.taxableValue;
    acc[hsn].cgst += item.cgst;
    acc[hsn].sgst += item.sgst;
    acc[hsn].igst += item.igst;
    return acc;
  }, {} as Record<string, { hsn: string; gstRate: number; taxableValue: number; cgst: number; sgst: number; igst: number }>);

  const formattedDate = new Date(order.date).toLocaleString('en-IN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm no-print">
      <div className="flex flex-col w-full max-w-md h-[90vh] glass-panel border border-brand-cyan/20 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-700">
          <div className="flex items-center space-x-2 text-brand-emerald">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-outfit font-semibold text-lg text-slate-100">Checkout Complete</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Scrollable Body (Screen view) */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-900/40">
          <div className="p-5 mx-auto bg-white text-black shadow-lg rounded-sm w-[76mm] font-mono text-[11px] leading-relaxed">
            
            {/* Store details */}
            <div className="text-center">
              <div className="font-outfit font-bold text-sm tracking-tight uppercase">{settings.storeName}</div>
              <div className="text-[10px] mt-0.5">{settings.address}</div>
              <div className="text-[10px] font-bold">GSTIN: {settings.gstin}</div>
              <div className="text-[10px]">PH: {settings.phone}</div>
              <div className="border-t border-dashed border-black my-2"></div>
              <div className="font-bold text-[11px] tracking-widest">TAX INVOICE</div>
              <div className="border-t border-dashed border-black my-2"></div>
            </div>

            {/* Invoice metadata */}
            <div className="space-y-0.5 text-[10px]">
              <div><strong>INVOICE NO:</strong> {order.invoiceNumber}</div>
              <div><strong>DATE/TIME:</strong> {formattedDate}</div>
              {order.customerPhone && (
                <>
                  <div><strong>CUSTOMER:</strong> {order.customerName || 'Loyal Client'}</div>
                  <div><strong>PHONE:</strong> +91 {order.customerPhone}</div>
                </>
              )}
              <div><strong>TAX TYPE:</strong> {order.isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST+SGST)'}</div>
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Items Table */}
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-dashed border-black font-bold">
                  <th className="text-left w-1/2 pb-1">ITEM</th>
                  <th className="text-center pb-1">HSN</th>
                  <th className="text-center pb-1">QTY</th>
                  <th className="text-right pb-1">PRICE</th>
                  <th className="text-right pb-1">GST</th>
                  <th className="text-right pb-1">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="text-left py-1 pr-1 font-sans">{item.product.name}</td>
                    <td className="text-center py-1">{item.product.hsn}</td>
                    <td className="text-center py-1">{item.quantity}</td>
                    <td className="text-right py-1">{(item.taxableValue / item.quantity).toFixed(1)}</td>
                    <td className="text-right py-1">{item.gstRate}%</td>
                    <td className="text-right py-1">{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Calculations Breakdown */}
            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>SUBTOTAL (TAXABLE):</span>
                <span>₹{order.subTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>TOTAL DISCOUNTS:</span>
                <span>-₹{order.discountTotal.toFixed(2)}</span>
              </div>
              {!order.isInterState ? (
                <>
                  <div className="flex justify-between">
                    <span>CGST COLLECTED:</span>
                    <span>₹{order.totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST COLLECTED:</span>
                    <span>₹{order.totalSgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>IGST COLLECTED:</span>
                  <span>₹{order.totalIgst.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-dotted border-black my-1"></div>
              <div className="flex justify-between font-bold text-xs">
                <span>NET BILL AMOUNT:</span>
                <span>₹{order.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[9px] italic">
                <span>Round off adjustment:</span>
                <span>₹{(order.grandTotal - (order.subTotal + order.totalGst - order.discountTotal)).toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* GST Audit Breakdown (HSN Summary) */}
            <div className="text-[9px] mb-2 font-bold text-center">GST RATE ANALYSIS BREAKDOWN</div>
            <table className="w-full text-[9px] mb-2 border-t border-dashed border-black">
              <thead>
                <tr className="font-bold border-b border-dotted border-black">
                  <th className="text-left py-0.5">HSN</th>
                  <th className="text-right py-0.5">TAXABLE</th>
                  {!order.isInterState ? (
                    <>
                      <th className="text-right py-0.5">CGST</th>
                      <th className="text-right py-0.5">SGST</th>
                    </>
                  ) : (
                    <th className="text-right py-0.5">IGST</th>
                  )}
                  <th className="text-right py-0.5">TAX%</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(gstAnalysis).map((row, idx) => (
                  <tr key={idx}>
                    <td className="text-left py-0.5">{row.hsn}</td>
                    <td className="text-right py-0.5">₹{row.taxableValue.toFixed(2)}</td>
                    {!order.isInterState ? (
                      <>
                        <td className="text-right py-0.5">₹{row.cgst.toFixed(2)}</td>
                        <td className="text-right py-0.5">₹{row.sgst.toFixed(2)}</td>
                      </>
                    ) : (
                      <td className="text-right py-0.5">₹{row.igst.toFixed(2)}</td>
                    )}
                    <td className="text-right py-0.5">{row.gstRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Payment Details & UPI QR Code */}
            <div className="text-center space-y-1">
              <div>PAYMENT MODE: <strong>{order.paymentMode}</strong></div>
              
              {order.paymentMode === 'UPI' && (
                <div className="my-3 flex flex-col items-center justify-center">
                  <div className="p-1.5 border border-slate-300 rounded bg-white">
                    <QRCodeCanvas 
                      value={upiUrl} 
                      size={110} 
                      level="M" 
                      fgColor="#000000" 
                      bgColor="#ffffff"
                    />
                  </div>
                  <div className="text-[9px] mt-1 text-slate-600">Scan QR via any UPI App to Pay</div>
                  <div className="text-[10px] font-bold mt-0.5">₹{order.grandTotal.toFixed(2)}</div>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Footer */}
            <div className="text-center text-[9px] leading-relaxed uppercase">
              {settings.receiptFooter}
            </div>
            
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-dark-800 border-t border-dark-700 flex space-x-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 bg-brand-cyan hover:bg-brand-cyan/90 text-dark-900 font-medium rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand-cyan/20"
          >
            <Printer className="w-5 h-5" />
            <span>Print Thermal (80mm)</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-dark-700 hover:bg-dark-600 text-slate-100 font-medium rounded-xl transition-all border border-dark-600"
          >
            Done / Close
          </button>
        </div>
      </div>

      {/* --- PRINTER DIRECTLY TARGETS THIS CONTAINER --- */}
      {createPortal(
        <div className="hidden print:block print-area">
          <div className="text-center">
            <div className="receipt-header">{settings.storeName}</div>
            <div className="receipt-sub">{settings.address}</div>
            <div className="receipt-sub" style={{ fontWeight: 'bold' }}>GSTIN: {settings.gstin}</div>
            <div className="receipt-sub">PH: {settings.phone}</div>
            <div className="dotted-line"></div>
            <div style={{ fontWeight: 'bold', fontSize: '12px' }}>TAX INVOICE</div>
            <div className="dotted-line"></div>
          </div>

          <div style={{ fontSize: '10px', margin: '4px 0' }}>
            <div><strong>INV NO:</strong> {order.invoiceNumber}</div>
            <div><strong>DATE/TIME:</strong> {formattedDate}</div>
            {order.customerPhone && (
              <>
                <div><strong>CUSTOMER:</strong> {order.customerName || 'Loyal Client'}</div>
                <div><strong>PHONE:</strong> +91 {order.customerPhone}</div>
              </>
            )}
            <div><strong>TAX TYPE:</strong> {order.isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST+SGST)'}</div>
          </div>

          <div className="dotted-line"></div>

          <table>
            <thead>
              <tr>
                <th style={{ width: '45%' }}>ITEM</th>
                <th className="text-center" style={{ width: '10%' }}>HSN</th>
                <th className="text-center" style={{ width: '10%' }}>QTY</th>
                <th className="text-right" style={{ width: '15%' }}>RATE</th>
                <th className="text-right" style={{ width: '10%' }}>GST</th>
                <th className="text-right" style={{ width: '10%' }}>TOT</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.product.name}</td>
                  <td className="text-center">{item.product.hsn}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{(item.taxableValue / item.quantity).toFixed(1)}</td>
                  <td className="text-right">{item.gstRate}%</td>
                  <td className="text-right">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="dotted-line"></div>

          <div style={{ fontSize: '10px' }}>
            <div className="flex justify-between">
              <span>SUBTOTAL:</span>
              <span>₹{order.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>DISCOUNTS:</span>
              <span>-₹{order.discountTotal.toFixed(2)}</span>
            </div>
            {!order.isInterState ? (
              <>
                <div className="flex justify-between">
                  <span>CGST TOTAL:</span>
                  <span>₹{order.totalCgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST TOTAL:</span>
                  <span>₹{order.totalSgst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>IGST TOTAL:</span>
                <span>₹{order.totalIgst.toFixed(2)}</span>
              </div>
            )}
            <div className="dotted-line"></div>
            <div className="flex justify-between font-bold" style={{ fontSize: '12px' }}>
              <span>NET PAYABLE:</span>
              <span>₹{order.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="dotted-line"></div>

          <div style={{ fontSize: '9px', textAlign: 'center', fontWeight: 'bold' }}>GST SLAB BREAKDOWN SUMMARY</div>
          <table style={{ fontSize: '8px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <th>HSN</th>
                <th className="text-right">TAXABLE</th>
                {!order.isInterState ? (
                  <>
                    <th className="text-right">CGST</th>
                    <th className="text-right">SGST</th>
                  </>
                ) : (
                  <th className="text-right">IGST</th>
                )}
                <th className="text-right">RATE</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(gstAnalysis).map((row, idx) => (
                <tr key={idx}>
                  <td>{row.hsn}</td>
                  <td className="text-right">₹{row.taxableValue.toFixed(2)}</td>
                  {!order.isInterState ? (
                    <>
                      <td className="text-right">₹{row.cgst.toFixed(2)}</td>
                      <td className="text-right">₹{row.sgst.toFixed(2)}</td>
                    </>
                  ) : (
                    <td className="text-right">₹{row.igst.toFixed(2)}</td>
                  )}
                  <td className="text-right">{row.gstRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="dotted-line"></div>

          <div style={{ textAlign: 'center', fontSize: '9px' }}>
            <div>PAYMENT MODE: {order.paymentMode}</div>
            {order.paymentMode === 'UPI' && (
              <div className="receipt-qr">
                <QRCodeCanvas 
                  value={upiUrl} 
                  size={140} 
                  level="M" 
                  fgColor="#000000" 
                  bgColor="#ffffff"
                />
              </div>
            )}
          </div>

          <div className="dotted-line"></div>

          <div style={{ textAlign: 'center', fontSize: '8px', textTransform: 'uppercase' }}>
            {settings.receiptFooter}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
