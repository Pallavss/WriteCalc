import { Stroke, InventoryItem, RecognitionResult, RecognitionItem } from '../types';
import { getGroupBounds } from './geometry';

export function initRecognizer() {
  // Pre-warm function
}

/**
 * Renders strokes onto an offscreen canvas and returns a base64 PNG
 */
export function createStrokeImage(strokes: Stroke[]): string {
  const bounds = getGroupBounds(strokes);
  if (bounds.width === 0 || bounds.height === 0) return "";
  
  const padding = 24;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(bounds.width + (padding * 2), 120);
  canvas.height = Math.max(bounds.height + (padding * 2), 60);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("No 2D context");

  // Fill white background for clear OCR
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw strokes in crisp dark ink
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#111827';

  strokes.forEach(stroke => {
    if (stroke.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(
      stroke[0].x - bounds.minX + padding,
      stroke[0].y - bounds.minY + padding
    );
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(
        stroke[i].x - bounds.minX + padding,
        stroke[i].y - bounds.minY + padding
      );
    }
    ctx.stroke();
  });

  return canvas.toDataURL('image/png');
}

/**
 * Processes handwritten strokes via the server Gemini API endpoint
 */
export async function recognizeHandwriting(
  strokes: Stroke[],
  inventory: InventoryItem[] = []
): Promise<RecognitionResult> {
  const imageBase64 = createStrokeImage(strokes);
  if (!imageBase64) {
    return { rawText: '', confidence: 0, items: [] };
  }

  try {
    const response = await fetch('/api/recognize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageBase64,
        inventory: inventory.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          unit: i.unit
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    
    const items: RecognitionItem[] = Array.isArray(data.items) ? data.items : [];

    return {
      rawText: data.rawText || '',
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.95,
      items
    };
  } catch (e: any) {
    console.error("Recognition failed:", e);
    return {
      rawText: '',
      confidence: 0,
      items: [],
      error: e.message || String(e)
    };
  }
}

