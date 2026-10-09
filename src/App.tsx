import { useState, useEffect, FormEvent } from 'react';
import { 
  Calculator, 
  Trash2, 
  Loader2, 
  Edit3, 
  Check, 
  Printer, 
  Package, 
  Percent, 
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { WritingPad } from './components/WritingPad';
import { recognizeHandwriting, initRecognizer } from './utils/recognition';
import { Stroke, BillItem, InventoryItem, StoreProfile } from './types';
import { formatIndianCurrency, parseShopkeeperInput } from './utils/calculator';
import { InventoryManager, DEFAULT_INVENTORY } from './components/InventoryManager';
import { BillPrintModal } from './components/BillPrintModal';

const DEFAULT_STORE: StoreProfile = {
  name: 'Shree Ganesh Kirana & General Store',
  tagline: 'Retail Grocery & Provisions - Fresh & Pure',
  phone: '+91 98765 43210',
  address: 'Shop No. 12, Main Market Road',
  gstin: '07AAAAA0000A1Z5'
};

export default function App() {
  // Store Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('writecalc_inventory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_INVENTORY;
  });

  // Store Profile State
  const [store, setStore] = useState<StoreProfile>(() => {
    const saved = localStorage.getItem('writecalc_store');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_STORE;
  });

  // Bill items state
  const [billItems, setBillItems] = useState<BillItem[]>(() => {
    const saved = localStorage.getItem('writecalc_bill');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      {
        id: 'sample-1',
        type: 'item',
        name: 'Rice',
        quantity: 5,
        unit: 'kg',
        unitPrice: 120,
        amount: 600,
        expression: '5 kg × ₹120/kg',
        matchedInventory: true
      }
    ];
  });

  // Discount & Tax States
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxPercent, setTaxPercent] = useState<number>(0); // 0%, 5%, 12%, 18%

  // Manual input and status
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pad' | 'bill'>('pad');

  // Modals state
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Confidence / correction state
  const [pendingCorrection, setPendingCorrection] = useState<{
    id: string;
    text: string;
    item: BillItem;
    confidence: number;
  } | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('writecalc_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('writecalc_store', JSON.stringify(store));
  }, [store]);

  useEffect(() => {
    localStorage.setItem('writecalc_bill', JSON.stringify(billItems));
  }, [billItems]);

  // Pre-warm recognizer
  useEffect(() => {
    initRecognizer();
  }, []);

  // Calculate bill totals
  const subtotal = billItems.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxableAmount * (taxPercent / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  // Handler for handwriting recognition on pad
  const handleCalculateFromPad = async (strokes: Stroke[]) => {
    if (strokes.length === 0) return;
    
    setIsProcessing(true);

    try {
      const result = await recognizeHandwriting(strokes, inventory);

      if (result.error) {
        console.error("Recognition Error:", result.error);
        alert(`Gemini Recognition Notice: ${result.error}`);
        setIsProcessing(false);
        return;
      }

      if (result.items && result.items.length > 0) {
        const newItems: BillItem[] = result.items.map(recItem => ({
          id: crypto.randomUUID(),
          type: recItem.type,
          name: recItem.name,
          quantity: recItem.quantity,
          unit: recItem.unit,
          unitPrice: recItem.unitPrice,
          amount: recItem.amount,
          expression: recItem.expression,
          matchedInventory: recItem.matchedInventory
        }));

        // If low confidence (< 75%), ask for confirmation
        if (result.confidence < 0.75 && newItems.length === 1) {
          setPendingCorrection({
            id: newItems[0].id,
            text: result.rawText,
            item: newItems[0],
            confidence: result.confidence
          });
        } else {
          setBillItems(prev => [...prev, ...newItems]);
        }
      } else if (result.rawText) {
        // Fallback: parse raw text with local helper
        const parsed = parseShopkeeperInput(result.rawText, inventory);
        if (parsed && parsed.amount !== undefined) {
          setBillItems(prev => [...prev, {
            id: crypto.randomUUID(),
            type: parsed.type || 'item',
            name: parsed.name || result.rawText,
            quantity: parsed.quantity || 1,
            unit: parsed.unit || 'pcs',
            unitPrice: parsed.unitPrice || parsed.amount,
            amount: parsed.amount,
            expression: parsed.expression || result.rawText,
            matchedInventory: parsed.matchedInventory || false
          }]);
        }
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for typed input
  const handleAddManualEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const parsed = parseShopkeeperInput(inputValue, inventory);
    if (parsed && parsed.amount !== undefined) {
      setBillItems(prev => [...prev, {
        id: crypto.randomUUID(),
        type: parsed.type || 'item',
        name: parsed.name || inputValue,
        quantity: parsed.quantity || 1,
        unit: parsed.unit || 'pcs',
        unitPrice: parsed.unitPrice || parsed.amount,
        amount: parsed.amount,
        expression: parsed.expression || inputValue,
        matchedInventory: parsed.matchedInventory || false
      }]);
      setInputValue('');
    } else {
      // Direct numeric entry
      const num = parseFloat(inputValue);
      if (!isNaN(num) && num > 0) {
        setBillItems(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'calculation',
          name: 'Manual Amount',
          quantity: 1,
          unit: 'entry',
          unitPrice: num,
          amount: num,
          expression: `${num}`,
          matchedInventory: false
        }]);
        setInputValue('');
      } else {
        alert('Could not parse item. Try "5kg rice", "500g sugar", or "120 * 4"');
      }
    }
  };

  // Quick add from inventory chip
  const handleQuickAdd = (item: InventoryItem) => {
    const qtyStr = prompt(`Enter quantity for ${item.name} (${item.unit}):`, '1');
    if (!qtyStr) return;
    const qty = parseFloat(qtyStr);
    if (isNaN(qty) || qty <= 0) return;

    const amount = Math.round(qty * item.price * 100) / 100;
    setBillItems(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'item',
      name: item.name,
      quantity: qty,
      unit: item.unit,
      unitPrice: item.price,
      amount,
      expression: `${qty} ${item.unit} × ₹${item.price}/${item.unit}`,
      matchedInventory: true
    }]);
  };

  const removeBillItem = (id: string) => {
    setBillItems(prev => prev.filter(item => item.id !== id));
  };

  const clearBill = () => {
    if (billItems.length === 0) return;
    if (window.confirm('Clear all items from this bill?')) {
      setBillItems([]);
      setDiscountPercent(0);
      setTaxPercent(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-100 flex flex-col font-sans overflow-hidden">
      
      {/* Top Header */}
      <header className="bg-neutral-900 text-white px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight">WriteCalc AI</h1>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                GEMINI 3.8 FLASH
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 truncate max-w-[220px] sm:max-w-xs">{store.name}</p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Inventory Manager Button */}
          <button
            onClick={() => setIsInventoryOpen(true)}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-neutral-700"
            title="Manage store inventory catalog and rates"
          >
            <Package className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Store Inventory</span>
            <span className="text-[10px] bg-neutral-900 px-1.5 py-0.2 rounded font-bold text-neutral-400">
              {inventory.length}
            </span>
          </button>

          {/* Print & PDF Button */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={billItems.length === 0}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
        </div>
      </header>

      {/* Quick Inventory Bar: Shopkeeper Catalog Rates */}
      <div className="bg-white border-b border-neutral-200 px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 z-10 text-xs">
        <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Package className="w-3.5 h-3.5 text-emerald-600" />
          Catalog:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          {inventory.slice(0, 8).map(item => (
            <button
              key={item.id}
              onClick={() => handleQuickAdd(item)}
              className="px-2.5 py-1 bg-neutral-100 hover:bg-emerald-50 hover:border-emerald-300 border border-neutral-200 rounded-lg text-[11px] font-medium text-neutral-800 whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shrink-0"
              title={`Click to add ${item.name} @ ₹${item.price}/${item.unit}`}
            >
              <span>{item.icon || '📦'}</span>
              <span>{item.name}</span>
              <span className="font-bold text-emerald-700">₹{item.price}/{item.unit}</span>
            </button>
          ))}
          <button
            onClick={() => setIsInventoryOpen(true)}
            className="px-2 py-1 text-emerald-700 hover:underline font-medium text-[11px] whitespace-nowrap cursor-pointer shrink-0"
          >
            + All {inventory.length} items
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex bg-neutral-200 p-1 border-b border-neutral-300 shrink-0">
        <button
          onClick={() => setActiveTab('pad')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'pad'
              ? 'bg-white text-neutral-900 shadow-xs font-semibold'
              : 'text-neutral-600'
          }`}
        >
          ✍️ Writing Pad
        </button>
        <button
          onClick={() => setActiveTab('bill')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'bill'
              ? 'bg-white text-neutral-900 shadow-xs font-semibold'
              : 'text-neutral-600'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Bill Items ({billItems.length})</span>
          <span className="text-emerald-700 font-bold ml-1">{formatIndianCurrency(grandTotal)}</span>
        </button>
      </div>

      {/* Main Workspace (Split View on Large Screens) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* LEFT PANE: Smart Writing Pad & Manual Entry */}
        <div className={`flex-1 flex-col bg-white border-r border-neutral-200 relative ${
          activeTab === 'pad' ? 'flex' : 'hidden lg:flex'
        }`}>
          
          {/* Pad Area */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {isProcessing && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-30 flex items-center justify-center animate-in fade-in">
                <div className="bg-neutral-900 text-white shadow-2xl rounded-2xl px-5 py-3.5 flex items-center gap-3 border border-neutral-800">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <div className="text-left">
                    <p className="font-semibold text-xs">Gemini AI is reading...</p>
                    <p className="text-[11px] text-neutral-400">Detecting items, quantities &amp; inventory rates</p>
                  </div>
                </div>
              </div>
            )}
            <WritingPad 
              onCalculate={handleCalculateFromPad}
              isProcessing={isProcessing}
            />
          </div>

          {/* Manual Input Bar */}
          <div className="p-2.5 bg-neutral-50 border-t border-neutral-200 shrink-0">
            <form onSubmit={handleAddManualEntry} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type e.g. &ldquo;5kg rice&rdquo;, &ldquo;2 sugar&rdquo;, or &ldquo;120 * 4&rdquo;..."
                className="flex-1 px-3 py-2 bg-white border border-neutral-300 rounded-xl text-xs font-medium text-neutral-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-neutral-400"
              />
              <button
                type="submit"
                className="px-3.5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <span>Add</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT PANE: Live Bill / Invoice Table & Operations */}
        <div className={`w-full lg:w-96 xl:w-[420px] flex-col bg-white shrink-0 shadow-lg lg:shadow-none z-10 ${
          activeTab === 'bill' ? 'flex flex-1' : 'hidden lg:flex'
        }`}>
          
          {/* Bill Header */}
          <div className="px-4 py-3 bg-neutral-100 border-b border-neutral-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wide">
                Digital Invoice ({billItems.length} items)
              </h2>
            </div>
            {billItems.length > 0 && (
              <button
                onClick={clearBill}
                className="text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset bill"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Pending Low-Confidence Alert */}
          {pendingCorrection && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs shrink-0 animate-in slide-in-from-top-2">
              <div className="font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Recognized: &ldquo;{pendingCorrection.text}&rdquo;?</span>
              </div>
              <p className="text-[11px] text-amber-900 mb-2">
                Identified as <strong>{pendingCorrection.item.name}</strong> ({pendingCorrection.item.expression}) = {formatIndianCurrency(pendingCorrection.item.amount)}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setBillItems(prev => [...prev, pendingCorrection.item]);
                    setPendingCorrection(null);
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Add Item
                </button>
                <button
                  onClick={() => setPendingCorrection(null)}
                  className="px-2.5 py-1 bg-white border border-amber-300 text-amber-700 rounded text-[11px] font-medium hover:bg-amber-100 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Scrollable Items Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-2">
            {billItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-400 select-none">
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-300 mb-3">
                  <Calculator className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium text-neutral-600">Bill is empty</p>
                <p className="text-[11px] text-neutral-400 mt-1 max-w-[200px]">
                  Write an item on the pad like <span className="font-semibold text-neutral-600">&ldquo;5kg rice&rdquo;</span> or tap a catalog item above.
                </p>
              </div>
            ) : (
              billItems.map((item, index) => (
                <div 
                  key={item.id} 
                  className="p-2.5 flex items-center justify-between hover:bg-neutral-50 rounded-xl transition-colors group"
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-neutral-400">{index + 1}.</span>
                      <span className="text-xs font-bold text-neutral-900">{item.name}</span>
                      {item.matchedInventory && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.2 rounded-full">
                          Catalog Matched
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5 font-medium">
                      {item.expression}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-sm font-bold text-neutral-900">
                        {formatIndianCurrency(item.amount)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeBillItem(item.id)}
                      className="p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer group-hover:text-neutral-500"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Mathematical Operations & Adjustments */}
          <div className="p-3 bg-neutral-50 border-t border-neutral-200 shrink-0 space-y-2">
            
            {/* Quick Operations Bar (Discount, Tax, Rate) */}
            <div className="flex items-center justify-between gap-1 text-[11px]">
              
              {/* Discount Selector */}
              <div className="flex items-center gap-1">
                <span className="text-neutral-500 font-medium flex items-center gap-0.5">
                  <Percent className="w-3 h-3 text-red-500" />
                  Disc:
                </span>
                {[0, 5, 10].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setDiscountPercent(pct)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                      discountPercent === pct
                        ? 'bg-red-600 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {pct === 0 ? 'None' : `${pct}%`}
                  </button>
                ))}
              </div>

              {/* Tax / GST Selector */}
              <div className="flex items-center gap-1">
                <span className="text-neutral-500 font-medium">GST:</span>
                {[0, 5, 12, 18].map(tax => (
                  <button
                    key={tax}
                    onClick={() => setTaxPercent(tax)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                      taxPercent === tax
                        ? 'bg-neutral-800 text-white'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    {tax === 0 ? '0%' : `${tax}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-2 border-t border-neutral-200 text-xs space-y-1">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatIndianCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>Discount ({discountPercent}%):</span>
                  <span>- {formatIndianCurrency(discountAmount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-neutral-600 font-medium">
                  <span>GST / Tax ({taxPercent}%):</span>
                  <span>+ {formatIndianCurrency(taxAmount)}</span>
                </div>
              )}
            </div>

            {/* Grand Total Area */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-baseline justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">
                  GRAND TOTAL
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {billItems.length} items included
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatIndianCurrency(grandTotal)}
              </div>
            </div>

            {/* Print & PDF Trigger Button */}
            <button
              onClick={() => setIsPrintModalOpen(true)}
              disabled={billItems.length === 0}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-200 text-white disabled:text-neutral-400 font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill / Download PDF</span>
            </button>

          </div>

        </div>

      </div>

      {/* Store Inventory Modal */}
      <InventoryManager
        inventory={inventory}
        onUpdateInventory={setInventory}
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
      />

      {/* Print & PDF Modal */}
      <BillPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        items={billItems}
        subtotal={subtotal}
        discountPercent={discountPercent}
        discountAmount={discountAmount}
        taxPercent={taxPercent}
        taxAmount={taxAmount}
        grandTotal={grandTotal}
        store={store}
        onUpdateStore={setStore}
      />

    </div>
  );
}
