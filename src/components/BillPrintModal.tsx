import { useState } from 'react';
import { BillItem, StoreProfile } from '../types';
import { FileDown, Printer, X, Store, User, Phone, MapPin } from 'lucide-react';
import { generateBillPDF } from '../utils/pdfGenerator';
import { formatIndianCurrency } from '../utils/calculator';

interface BillPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: BillItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  store: StoreProfile;
  onUpdateStore: (store: StoreProfile) => void;
}

export function BillPrintModal({
  isOpen,
  onClose,
  items,
  subtotal,
  discountPercent,
  discountAmount,
  taxPercent,
  taxAmount,
  grandTotal,
  store,
  onUpdateStore
}: BillPrintModalProps) {
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [storeName, setStoreName] = useState(store.name);
  const [storePhone, setStorePhone] = useState(store.phone);
  const [storeAddress, setStoreAddress] = useState(store.address);

  if (!isOpen) return null;

  const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
  const currentDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const handleDownloadPDF = () => {
    generateBillPDF({
      store: {
        ...store,
        name: storeName,
        phone: storePhone,
        address: storeAddress
      },
      invoiceNo,
      date: currentDate,
      customerName,
      customerPhone,
      items,
      subtotal,
      discountPercent,
      discountAmount,
      taxPercent,
      taxAmount,
      grandTotal
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveStore = () => {
    onUpdateStore({
      ...store,
      name: storeName,
      phone: storePhone,
      address: storeAddress
    });
    setIsEditingStore(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200">
        
        {/* Header */}
        <div className="p-4 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-semibold">Print &amp; Download Bill</h2>
              <p className="text-xs text-neutral-400">Generate high-resolution PDF or print to thermal/desktop printer</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Settings */}
        <div className="p-3 bg-neutral-100 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer Name (optional)"
              className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-emerald-500 w-44"
            />
            <input
              type="text"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Mobile No."
              className="px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-emerald-500 w-32"
            />
            <button
              onClick={() => setIsEditingStore(!isEditingStore)}
              className="px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Edit Store Info</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Store Edit Drawer */}
        {isEditingStore && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1 flex-1 min-w-[150px]">
              <Store className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Store Name"
                className="w-full px-2 py-1 bg-white border border-emerald-300 rounded-md outline-none"
              />
            </div>
            <div className="flex items-center gap-1 w-36">
              <Phone className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="Store Phone"
                className="w-full px-2 py-1 bg-white border border-emerald-300 rounded-md outline-none"
              />
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-[150px]">
              <MapPin className="w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Address"
                className="w-full px-2 py-1 bg-white border border-emerald-300 rounded-md outline-none"
              />
            </div>
            <button
              onClick={handleSaveStore}
              className="px-3 py-1 bg-emerald-700 text-white rounded-md font-medium cursor-pointer"
            >
              Save Store
            </button>
          </div>
        )}

        {/* Bill Printable Preview Canvas / Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-200/60 flex justify-center">
          
          <div 
            id="printable-bill-area"
            className="w-full max-w-md bg-white rounded-lg shadow-sm border border-neutral-300 p-6 text-neutral-800 text-xs font-mono select-none"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b-2 border-dashed border-neutral-300">
              <h1 className="text-base font-bold tracking-tight text-neutral-900 font-sans uppercase">
                {storeName}
              </h1>
              <p className="text-[11px] text-neutral-500 mt-0.5">{store.tagline || 'Retail Grocery & Kirana'}</p>
              <p className="text-[10px] text-neutral-600 mt-0.5">{storeAddress}</p>
              <p className="text-[10px] text-neutral-600">Ph: {storePhone}</p>
              <div className="mt-2 inline-block px-2 py-0.5 bg-neutral-100 rounded text-[10px] font-semibold text-neutral-700">
                TAX INVOICE / CASH BILL
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="py-2.5 border-b border-dashed border-neutral-300 text-[11px] flex justify-between">
              <div>
                <div>Inv: <strong>{invoiceNo}</strong></div>
                <div>Date: {currentDate}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <User className="w-3 h-3 text-neutral-400" />
                  <span>{customerName}</span>
                </div>
                {customerPhone && <div>Mob: {customerPhone}</div>}
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-300 text-[10px] text-neutral-500 uppercase">
                    <th className="py-1">Item</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="text-[11px]">
                      <td className="py-1.5 pr-1 font-medium text-neutral-900">
                        {idx + 1}. {item.name}
                        {item.matchedInventory && (
                          <span className="block text-[9px] text-emerald-600 font-sans">
                            {item.expression}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-center text-neutral-600">
                        {item.type === 'item' ? `${item.quantity} ${item.unit}` : '1'}
                      </td>
                      <td className="py-1.5 px-1 text-right text-neutral-600">
                        {item.type === 'item' ? `₹${item.unitPrice}` : '-'}
                      </td>
                      <td className="py-1.5 pl-1 text-right font-semibold text-neutral-900">
                        {formatIndianCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-2 border-t-2 border-dashed border-neutral-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal ({items.length} items):</span>
                <span>{formatIndianCurrency(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span>- {formatIndianCurrency(discountAmount)}</span>
                </div>
              )}

              {taxAmount > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>GST / Tax ({taxPercent}%):</span>
                  <span>+ {formatIndianCurrency(taxAmount)}</span>
                </div>
              )}

              {/* Grand Total */}
              <div className="pt-2 border-t border-neutral-300 flex justify-between items-baseline text-sm font-bold text-neutral-900">
                <span>GRAND TOTAL:</span>
                <span className="text-base text-emerald-700">{formatIndianCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-dashed border-neutral-300 text-center text-[10px] text-neutral-500">
              <p>Thank you for shopping with us!</p>
              <p className="mt-0.5">Please visit again</p>
              <p className="mt-2 text-[9px] text-neutral-400">Generated by WriteCalc Smart POS</p>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <span>Ready to print or save</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
