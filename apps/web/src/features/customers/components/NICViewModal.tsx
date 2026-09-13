import { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Loader2, ZoomIn, ZoomOut, RotateCw, RotateCcw, RefreshCw } from 'lucide-react';
import { useNicSignedUrl } from '../api';

export function NICViewModal({ 
  customerId, 
  side, 
  imageUrl,
  title,
  onClose 
}: { 
  customerId?: string; 
  side?: 'front' | 'back'; 
  imageUrl?: string;
  title?: string;
  onClose: () => void;
}) {
  const { data: fetchedUrl, isLoading: isFetching, isError: isFetchError } = useNicSignedUrl(customerId || '', side || 'front', !!customerId && !!side && !imageUrl);
  const url = imageUrl || fetchedUrl;
  const isLoading = !imageUrl && isFetching;
  const isError = !imageUrl && isFetchError;
  const [imageLoaded, setImageLoaded] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleZoomIn = () => setZoom(prev => Math.min(4, +(prev + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom(prev => Math.max(0.5, +(prev - 0.25).toFixed(2)));
  const handleRotateCw = () => setRotation(prev => (prev + 90) % 360);
  const handleRotateCcw = () => setRotation(prev => (prev - 90 + 360) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(4, +(prev + 0.25).toFixed(2)));
      } else if (e.key === '-' || e.key === '_') {
        setZoom(prev => Math.max(0.5, +(prev - 0.25).toFixed(2)));
      } else if (e.key.toLowerCase() === 'r') {
        setRotation(prev => (prev + 90) % 360);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120, padding: '24px' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '880px', background: 'var(--bg-primary)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
        
        {/* Modal Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={20} color="var(--brand-primary)" />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title || `Customer NIC - ${side === 'front' ? 'Front Side' : 'Back Side'}`}
            </h2>
          </div>

          {/* Interactive Controls Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={handleZoomOut} 
              disabled={zoom <= 0.5}
              title="Zoom Out (-)"
              style={{ background: 'transparent', border: 'none', color: zoom <= 0.5 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: zoom <= 0.5 ? 'not-allowed' : 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <ZoomOut size={18} />
            </button>

            <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '42px', textAlign: 'center', color: 'var(--brand-primary)', fontFamily: 'monospace' }}>
              {Math.round(zoom * 100)}%
            </span>

            <button 
              onClick={handleZoomIn} 
              disabled={zoom >= 4}
              title="Zoom In (+)"
              style={{ background: 'transparent', border: 'none', color: zoom >= 4 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: zoom >= 4 ? 'not-allowed' : 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <ZoomIn size={18} />
            </button>

            <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />

            <button 
              onClick={handleRotateCcw} 
              title="Rotate Left (-90°)"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <RotateCcw size={18} />
            </button>

            <button 
              onClick={handleRotateCw} 
              title="Rotate Right (+90°) [Key: R]"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <RotateCw size={18} />
            </button>

            <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 4px' }} />

            <button 
              onClick={handleReset} 
              title="Reset Zoom & Rotation"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
            >
              <RefreshCw size={16} />
            </button>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={24} />
          </button>
        </div>

        {/* Viewer Viewport */}
        <div 
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            padding: '24px', 
            height: '65vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            background: 'var(--bg-tertiary)',
            overflow: 'hidden',
            position: 'relative',
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none'
          }}
        >
          {isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
              <Loader2 size={32} className="animate-spin" />
              <p style={{ margin: 0, fontSize: '14px' }}>Fetching secure link...</p>
            </div>
          )}
          
          {isError && (
            <div style={{ color: 'var(--status-error)', textAlign: 'center' }}>
              <p style={{ margin: 0 }}>Failed to load image. The file may not exist or access was denied.</p>
            </div>
          )}

          {url && (
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!imageLoaded && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <Loader2 size={32} className="animate-spin" />
                </div>
              )}
              <img 
                src={url} 
                alt={`NIC ${side}`} 
                onLoad={() => setImageLoaded(true)}
                draggable={false}
                style={{ 
                  maxWidth: '90%', 
                  maxHeight: '90%', 
                  objectFit: 'contain', 
                  borderRadius: '8px', 
                  boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
                  opacity: imageLoaded ? 1 : 0,
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out, opacity 0.3s ease',
                  transformOrigin: 'center center'
                }} 
              />
            </div>
          )}
        </div>

        {/* Instructions Footer */}
        <div style={{ padding: '10px 24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Scroll mouse wheel to Zoom • Click & Drag when zoomed in to Pan</span>
          <span>Key Shortcuts: <strong>+ / -</strong> Zoom • <strong>R</strong> Rotate • <strong>Esc</strong> Close</span>
        </div>
      </div>
    </div>
  );
}
