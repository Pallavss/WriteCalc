export type Point = { x: number; y: number };
export type Stroke = Point[];

export interface InventoryItem {
  id: string;
  name: string;
  price: number; // Unit price in INR
  unit: string;  // e.g. "kg", "g", "L", "ml", "pcs", "pkt", "doz", "box"
  category?: string;
  icon?: string;
}

export interface BillItem {
  id: string;
  type: 'item' | 'calculation' | 'discount' | 'tax';
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  expression: string;
  matchedInventory?: boolean;
  notes?: string;
}

export interface RecognitionItem {
  type: 'item' | 'calculation';
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  expression: string;
  matchedInventory: boolean;
}

export interface RecognitionResult {
  rawText: string;
  confidence: number;
  items: RecognitionItem[];
  error?: string;
}

export interface StoreProfile {
  name: string;
  tagline: string;
  phone: string;
  address: string;
  gstin?: string;
}
