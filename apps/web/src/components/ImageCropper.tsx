import React, { useState, useRef } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { canvasPreview } from '../utils/canvasPreview';
import { X, Check, RotateCw } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  aspect?: number;
}

// Helper to center the crop by default
function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel, aspect }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current) {
      alert('Please select a crop area');
      return;
    }

    try {
      setIsProcessing(true);
      const canvas = document.createElement('canvas');
      await canvasPreview(imgRef.current, canvas, completedCrop, 1, rotation);

      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Canvas is empty');
        }
        const croppedFile = new File([blob], 'cropped.png', { type: 'image/png' });
        onCropComplete(croppedFile);
      }, 'image/png');
    } catch (e) {
      console.error(e);
      alert('Failed to crop image.');
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 999,
      display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ 
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between', 
        alignItems: 'center', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' 
      }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px' }}>Crop Photo</h3>
        <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={24} />
        </button>
      </div>
      
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '24px' }}>
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop me"
            crossOrigin="anonymous"
            onLoad={onImageLoad}
            style={{ 
              transform: `rotate(${rotation}deg)`,
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              transition: 'transform 0.2s'
            }}
          />
        </ReactCrop>
      </div>

      <div style={{ 
        padding: '24px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <button 
          onClick={handleRotate}
          style={{
            padding: '10px 16px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', 
            border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <RotateCw size={18} /> Rotate 90°
        </button>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={onCancel}
            style={{
              padding: '10px 20px', background: 'transparent', color: 'var(--text-primary)', 
              border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={isProcessing}
            style={{
              padding: '10px 20px', background: 'var(--brand-primary)', color: 'var(--bg-primary)', 
              border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <Check size={18} />
            {isProcessing ? 'Saving...' : 'Apply Crop'}
          </button>
        </div>
      </div>
    </div>
  );
}
