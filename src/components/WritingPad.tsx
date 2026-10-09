import { Undo2, Redo2, Trash2, PenLine, Eraser, Sparkles, Loader2 } from 'lucide-react';
import React, { useRef, useState, useLayoutEffect } from 'react';
import { Point, Stroke } from '../types';
import { getBounds, isIntersecting } from '../utils/geometry';

interface WritingPadProps {
  onCalculate: (strokes: Stroke[]) => void;
  isProcessing?: boolean;
}

export function WritingPad({ onCalculate, isProcessing = false }: WritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [toastMessage, setToastMessage] = useState('');
  
  // Refs for tracking drawing state synchronously
  const currentStrokeRef = useRef<Point[]>([]);
  const isDrawingRef = useRef(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 1500);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Scale for high DPI displays to ensure crisp lines
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Styling the dark realistic handwriting ink
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = '#18181b'; // neutral-900
    
    strokes.forEach(stroke => {
      if (stroke.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    });
  };

  useLayoutEffect(() => {
    redrawCanvas();
    
    // Handle window resize so the canvas scales correctly without clearing
    const handleResize = () => redrawCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [strokes]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isProcessing) return;
    isDrawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (tool === 'eraser') {
      eraseAtPoint(point);
      return;
    }

    currentStrokeRef.current = [point];
    setRedoStack([]); // Clear redo stack on new action
    
    // Draw the initial dot immediately
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    }
  };

  const eraseAtPoint = (pt: Point) => {
    const eraserBox = {
      minX: pt.x - 12,
      maxX: pt.x + 12,
      minY: pt.y - 12,
      maxY: pt.y + 12,
      width: 24,
      height: 24
    };

    setStrokes(prev => prev.filter(stroke => {
      const sBounds = getBounds(stroke);
      return !isIntersecting(sBounds, eraserBox, 8);
    }));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isProcessing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    if (tool === 'eraser') {
      eraseAtPoint(point);
      return;
    }

    const prevPoint = currentStrokeRef.current[currentStrokeRef.current.length - 1];
    currentStrokeRef.current.push(point);
    
    // Draw the new segment immediately
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    
    if (tool === 'eraser') {
      return;
    }

    const newStroke = currentStrokeRef.current;
    currentStrokeRef.current = [];

    if (newStroke.length < 2) return;

    const bounds = getBounds(newStroke);

    // Heuristic: Is it a bottom calculation underline?
    // Wide horizontal line drawn below/outside existing numbers (width > 140 and 3x height)
    const isHorizontalLine = bounds.width > 140 && bounds.width > bounds.height * 3.5;
    
    if (isHorizontalLine && strokes.length > 0) {
      onCalculate(strokes);
      showToast('Processing calculation...');
      setStrokes([]);
      setRedoStack([]);
      return;
    }

    // Normal stroke: Commit it to state without any strike-through subtraction
    setStrokes(prev => [...prev, newStroke]);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const lastStroke = strokes[strokes.length - 1];
    setStrokes(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, lastStroke]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextStroke = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setStrokes(prev => [...prev, nextStroke]);
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    showToast('Pad cleared');
  };

  const triggerCalculate = () => {
    if (strokes.length === 0) {
      showToast('Write an item or calculation first');
      return;
    }
    onCalculate(strokes);
    setStrokes([]);
    setRedoStack([]);
  };

  return (
    <div className="flex flex-col h-full bg-white relative select-none">
      {/* Writing Pad Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200 bg-neutral-50/90 gap-2 shrink-0">
        
        {/* Tool switches: Pen vs Eraser */}
        <div className="flex items-center bg-neutral-200/80 p-0.5 rounded-lg">
          <button
            onClick={() => setTool('pen')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              tool === 'pen'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
            title="Pen (Write items, rates, calculations)"
          >
            <PenLine className="w-3.5 h-3.5" />
            <span>Pen</span>
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              tool === 'eraser'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
            title="Eraser (Erase unwanted strokes)"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Eraser</span>
          </button>
        </div>

        {/* Action Controls: Undo, Redo, Clear */}
        <div className="flex items-center gap-1">
          <button 
            onClick={handleUndo} 
            disabled={strokes.length === 0 || isProcessing} 
            className="p-1.5 text-neutral-600 disabled:text-neutral-300 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
            title="Undo stroke"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={redoStack.length === 0 || isProcessing} 
            className="p-1.5 text-neutral-600 disabled:text-neutral-300 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
            title="Redo stroke"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-neutral-200 mx-0.5"></div>
          <button 
            onClick={handleClear} 
            disabled={strokes.length === 0 || isProcessing} 
            className="p-1.5 text-neutral-600 disabled:text-neutral-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
            title="Clear writing pad"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Prominent Add to Bill AI Trigger */}
          <button
            onClick={triggerCalculate}
            disabled={strokes.length === 0 || isProcessing}
            className="ml-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-200 text-white disabled:text-neutral-400 font-medium text-xs rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            )}
            <span>Add to Bill</span>
          </button>
        </div>
      </div>
      
      {/* Canvas Area with subtle notepad grid */}
      <div 
        ref={containerRef} 
        className="flex-1 relative bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:20px_20px] bg-neutral-50/50 overflow-hidden"
      >
        {/* Placeholder hint when canvas is empty */}
        {strokes.length === 0 && !isProcessing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-neutral-300 select-none px-4 text-center">
            <span className="text-sm font-medium text-neutral-400">Write here with your mouse or stylus</span>
            <span className="text-xs text-neutral-400/80 mt-1">e.g. &ldquo;5kg rice&rdquo;, &ldquo;2 sugar&rdquo;, &ldquo;50 * 12&rdquo;, or &ldquo;500 - 10%&rdquo;</span>
            <span className="text-[11px] text-neutral-400/60 mt-2 bg-neutral-100 px-2 py-0.5 rounded-full">Draw horizontal line &mdash; or tap &ldquo;Add to Bill&rdquo;</span>
          </div>
        )}

        {toastMessage && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-neutral-900/90 backdrop-blur-xs text-white px-3.5 py-1.5 rounded-full shadow-md text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-150">
            {toastMessage}
          </div>
        )}

        <canvas
          ref={canvasRef}
          className={`absolute inset-0 touch-none w-full h-full ${
            tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerOut={handlePointerUp}
        />
      </div>
    </div>
  );
}
