import { InventoryItem, BillItem } from '../types';

/**
 * Evaluates a mathematical expression string and returns the numerical result.
 * Supports +, -, *, /, ×, ÷, %, decimals, and negative numbers.
 * Examples: "5 * 120", "500 - 10%", "600 + 5%", "1200 / 4"
 */
export function evaluateExpression(expression: string): number {
  if (!expression || expression.trim() === '') return 0;
  
  try {
    let sanitized = expression.trim()
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/x/gi, '*'); // Support 'x' as multiplication like 5x120

    // Handle percentage patterns like "500 - 10%" -> 500 - (500 * 0.1) = 450
    const percentMinusMatch = sanitized.match(/^([0-9.]+)\s*-\s*([0-9.]+)%$/);
    if (percentMinusMatch) {
      const base = parseFloat(percentMinusMatch[1]);
      const pct = parseFloat(percentMinusMatch[2]);
      return base - (base * (pct / 100));
    }

    // Handle percentage patterns like "500 + 10%" -> 500 + (500 * 0.1) = 550
    const percentPlusMatch = sanitized.match(/^([0-9.]+)\s*\+\s*([0-9.]+)%$/);
    if (percentPlusMatch) {
      const base = parseFloat(percentPlusMatch[1]);
      const pct = parseFloat(percentPlusMatch[2]);
      return base + (base * (pct / 100));
    }

    // Handle standalone percentage like "10% * 500" or "500 * 10%"
    sanitized = sanitized.replace(/([0-9.]+)%/g, '($1/100)');
      
    // Allow digits, spaces, +, -, *, /, ., and parentheses
    if (/[^0-9\s+\-*/.()]/g.test(sanitized)) {
      throw new Error('Invalid characters in expression');
    }

    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${sanitized}`)();
    
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Invalid result');
    }
    
    return Math.round(result * 100) / 100;
  } catch (error) {
    return NaN;
  }
}

/**
 * Attempts to parse an item expression string against the inventory catalog.
 * Examples:
 * - "5kg rice" -> Rice, 5 kg, 120/kg -> 600
 * - "rice 5kg" -> Rice, 5 kg, 120/kg -> 600
 * - "500g sugar" -> Sugar, 0.5 kg, 45/kg -> 22.5
 * - "2L oil" -> Mustard Oil, 2 L, 150/L -> 300
 * - "5 * 120" -> Math calc -> 600
 */
export function parseShopkeeperInput(
  input: string,
  inventory: InventoryItem[]
): Partial<BillItem> | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. Check if it matches an inventory item pattern
  // Matches e.g. "5kg rice", "5 kg rice", "rice 5kg", "500g dal", "2 L oil", "2pkt biscuit"
  for (const item of inventory) {
    const itemNameLower = item.name.toLowerCase();
    const inputLower = trimmed.toLowerCase();

    // Check if item name is mentioned in input
    if (inputLower.includes(itemNameLower) || itemNameLower.split(' ').some(w => w.length > 2 && inputLower.includes(w))) {
      // Extract quantity and possible unit
      // Pattern: digits (optional decimal), optional space, optional unit
      const qtyMatch = inputLower.match(/([0-9]+(?:\.[0-9]+)?)\s*(kg|kilo|kilos|g|gm|gms|gram|grams|l|ltr|litre|litres|ml|pcs|piece|pieces|pkt|packet|packets|doz|dozen)?/i);
      
      let quantity = 1;
      let unit = item.unit;

      if (qtyMatch) {
        let parsedNum = parseFloat(qtyMatch[1]);
        const parsedUnit = qtyMatch[2] ? qtyMatch[2].toLowerCase() : '';

        // Unit conversion logic:
        if ((parsedUnit === 'g' || parsedUnit === 'gm' || parsedUnit === 'gms' || parsedUnit === 'gram' || parsedUnit === 'grams') && item.unit === 'kg') {
          quantity = parsedNum / 1000;
          unit = 'kg';
        } else if (parsedUnit === 'ml' && item.unit === 'L') {
          quantity = parsedNum / 1000;
          unit = 'L';
        } else {
          quantity = parsedNum;
        }
      }

      const amount = Math.round(quantity * item.price * 100) / 100;
      return {
        type: 'item',
        name: item.name,
        quantity,
        unit: item.unit,
        unitPrice: item.price,
        amount,
        expression: `${quantity} ${item.unit} × ₹${item.price}/${item.unit}`,
        matchedInventory: true
      };
    }
  }

  // 2. Pure math expression (e.g. "5 * 120", "150 + 200", "500 - 10%")
  const evaluated = evaluateExpression(trimmed);
  if (!Number.isNaN(evaluated)) {
    return {
      type: 'calculation',
      name: trimmed.includes('*') || trimmed.includes('x') 
        ? 'Rate Calculation' 
        : trimmed.includes('%') 
          ? 'Percentage Calc' 
          : 'Calculation',
      quantity: 1,
      unit: 'calc',
      unitPrice: evaluated,
      amount: evaluated,
      expression: trimmed,
      matchedInventory: false
    };
  }

  return null;
}

/**
 * Formats a number to Indian currency format (e.g., ₹1,00,000)
 */
export function formatIndianCurrency(amount: number): string {
  if (Number.isNaN(amount) || !Number.isFinite(amount)) return '₹0';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * Runs basic tests in console on boot
 */
export function runCalculatorTests(): void {
  try {
    const val = evaluateExpression('5 * 120');
    console.log('WriteCalc Engine Loaded. Test 5 * 120 =', val);
  } catch (e) {
    console.error(e);
  }
}
