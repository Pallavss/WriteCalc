import { useState, FormEvent } from 'react';
import { InventoryItem } from '../types';
import { Package, Plus, Trash2, Edit2, Check, X, RotateCcw, Search } from 'lucide-react';
import { formatIndianCurrency } from '../utils/calculator';

export const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: 'inv-1', name: 'Rice', price: 120, unit: 'kg', category: 'Grains', icon: '🌾' },
  { id: 'inv-2', name: 'Sugar', price: 45, unit: 'kg', category: 'Grocery', icon: '🍬' },
  { id: 'inv-3', name: 'Wheat Flour (Atta)', price: 38, unit: 'kg', category: 'Grains', icon: '🌾' },
  { id: 'inv-4', name: 'Mustard Oil', price: 150, unit: 'L', category: 'Oils', icon: '🛢️' },
  { id: 'inv-5', name: 'Toor Dal', price: 160, unit: 'kg', category: 'Pulses', icon: '🍲' },
  { id: 'inv-6', name: 'Milk', price: 62, unit: 'L', category: 'Dairy', icon: '🥛' },
  { id: 'inv-7', name: 'Tea Powder', price: 280, unit: 'kg', category: 'Beverages', icon: '☕' },
  { id: 'inv-8', name: 'Salt', price: 25, unit: 'kg', category: 'Grocery', icon: '🧂' },
  { id: 'inv-9', name: 'Potato', price: 28, unit: 'kg', category: 'Vegetables', icon: '🥔' },
  { id: 'inv-10', name: 'Onion', price: 35, unit: 'kg', category: 'Vegetables', icon: '🧅' },
  { id: 'inv-11', name: 'Eggs', price: 84, unit: 'doz', category: 'Dairy/Poultry', icon: '🥚' },
  { id: 'inv-12', name: 'Soap', price: 45, unit: 'pcs', category: 'Personal Care', icon: '🧼' },
];

interface InventoryManagerProps {
  inventory: InventoryItem[];
  onUpdateInventory: (items: InventoryItem[]) => void;
  onSelectQuickItem?: (item: InventoryItem) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function InventoryManager({
  inventory,
  onUpdateInventory,
  isOpen,
  onClose
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editName, setEditName] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('kg');

  // New item form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newUnit, setNewUnit] = useState('kg');

  if (!isOpen) return null;

  const filteredItems = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.unit.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPrice(item.price);
    setEditUnit(item.unit);
  };

  const saveEdit = (id: string) => {
    if (!editName.trim() || editPrice <= 0) return;
    const updated = inventory.map(item =>
      item.id === id
        ? { ...item, name: editName.trim(), price: editPrice, unit: editUnit }
        : item
    );
    onUpdateInventory(updated);
    setEditingId(null);
  };

  const deleteItem = (id: string) => {
    const updated = inventory.filter(item => item.id !== id);
    onUpdateInventory(updated);
  };

  const handleAddItem = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPrice) return;
    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const newItem: InventoryItem = {
      id: `inv-${crypto.randomUUID().slice(0, 8)}`,
      name: newName.trim(),
      price: priceNum,
      unit: newUnit,
      icon: '📦'
    };

    onUpdateInventory([...inventory, newItem]);
    setNewName('');
    setNewPrice('');
    setNewUnit('kg');
    setShowAddForm(false);
  };

  const resetToDefault = () => {
    if (window.confirm('Reset store inventory to default catalog (Rice ₹120/kg, Sugar ₹45/kg, etc.)?')) {
      onUpdateInventory(DEFAULT_INVENTORY);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-neutral-200">
        
        {/* Modal Header */}
        <div className="p-4 bg-neutral-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Store Inventory & Rates</h2>
              <p className="text-xs text-neutral-400">Write items on pad (e.g. &ldquo;5kg rice&rdquo;) to auto-detect rates</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Action Bar */}
        <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items by name..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-neutral-200 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
          <button
            onClick={resetToDefault}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Reset to default items"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Add Item Form Collapsible */}
        {showAddForm && (
          <form onSubmit={handleAddItem} className="p-3 bg-emerald-50/70 border-b border-emerald-200 flex flex-wrap gap-2 items-center text-xs animate-in slide-in-from-top-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Item name (e.g. Basmati Rice)"
              className="flex-1 min-w-[130px] px-2.5 py-1.5 bg-white border border-neutral-300 rounded-md outline-none focus:border-emerald-600"
              required
            />
            <div className="flex items-center gap-1 w-28">
              <span className="text-neutral-500 font-medium">₹</span>
              <input
                type="number"
                step="any"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Rate"
                className="w-full px-2 py-1.5 bg-white border border-neutral-300 rounded-md outline-none focus:border-emerald-600"
                required
              />
            </div>
            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="px-2 py-1.5 bg-white border border-neutral-300 rounded-md outline-none focus:border-emerald-600 font-medium text-neutral-700"
            >
              <option value="kg">/ kg</option>
              <option value="g">/ g</option>
              <option value="L">/ L</option>
              <option value="ml">/ ml</option>
              <option value="pcs">/ pcs</option>
              <option value="pkt">/ pkt</option>
              <option value="doz">/ doz</option>
              <option value="box">/ box</option>
            </select>
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium rounded-md cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2 py-1.5 text-neutral-600 hover:bg-neutral-200 rounded-md cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Inventory Item List */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 p-2">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-neutral-400 text-xs">
              No inventory items found matching &ldquo;{searchTerm}&rdquo;
            </div>
          ) : (
            filteredItems.map(item => (
              <div 
                key={item.id} 
                className="p-2.5 flex items-center justify-between hover:bg-neutral-50/80 rounded-xl transition-colors group"
              >
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 bg-white border border-emerald-500 rounded text-xs outline-none"
                    />
                    <div className="flex items-center gap-1 w-24">
                      <span className="text-xs text-neutral-500">₹</span>
                      <input
                        type="number"
                        step="any"
                        value={editPrice}
                        onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-1.5 py-1 bg-white border border-emerald-500 rounded text-xs outline-none"
                      />
                    </div>
                    <select
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="px-1.5 py-1 bg-white border border-neutral-300 rounded text-xs"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="L">L</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                      <option value="pkt">pkt</option>
                      <option value="doz">doz</option>
                      <option value="box">box</option>
                    </select>
                    <button 
                      onClick={() => saveEdit(item.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                      title="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setEditingId(null)}
                      className="p-1 text-neutral-400 hover:bg-neutral-100 rounded cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg select-none">{item.icon || '📦'}</span>
                      <div>
                        <div className="text-xs font-semibold text-neutral-800">{item.name}</div>
                        <div className="text-[11px] text-neutral-500">
                          Unit: <span className="font-medium text-neutral-700">{item.unit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-700">
                          {formatIndianCurrency(item.price)}
                        </span>
                        <span className="text-[10px] text-neutral-400">/{item.unit}</span>
                      </div>

                      <div className="flex items-center gap-0.5 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded cursor-pointer"
                          title="Edit price or name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <span>Total items: <strong>{inventory.length}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
