import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from './ToastProvider';

interface AvatarUploadProps {
  currentAvatar?: string | null;
  onUploadComplete: (newUrl: string) => void;
}

// Compress image to max 400x400 and convert to data URL
function compressImage(file: File, maxSize: number = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxSize) { height *= maxSize / width; width = maxSize; }
      } else {
        if (height > maxSize) { width *= maxSize / height; height = maxSize; }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Compress to JPEG at 80% quality, max 150KB
      let quality = 0.8;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Reduce quality if too large
      while (dataUrl.length > 200000 && quality > 0.3) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function AvatarUpload({ currentAvatar, onUploadComplete }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { trader } = useAuth();
  const { showToast } = useToast();

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file (JPG, PNG, GIF)', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error');
      return;
    }

    try {
      const compressed = await compressImage(file);
      setPreview(compressed);
    } catch {
      showToast('Failed to process image', 'error');
    }
  };

  const handleUpload = async () => {
    if (!preview || !trader) return;
    setUploading(true);

    try {
      // Method 1: Try Supabase Storage first
      const blob = await (await fetch(preview)).blob();
      const fileName = `avatars/${trader.id}-${Date.now()}.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('trader-assets')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      if (!uploadError) {
        // Storage upload succeeded
        const { data: urlData } = supabase.storage.from('trader-assets').getPublicUrl(fileName);
        await updateAvatar(urlData.publicUrl);
        return;
      }

      // Method 2: Fallback - store as data URL directly in the database
      console.log('Storage bucket not available, using database fallback');
      await updateAvatar(preview);
    } catch {
      // Method 2 fallback on any error
      await updateAvatar(preview);
    } finally {
      setUploading(false);
    }
  };

  async function updateAvatar(url: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('traders')
      .update({ avatar_url: url })
      .eq('id', trader!.id);

    if (error) {
      showToast('Failed to save avatar', 'error');
    } else {
      onUploadComplete(url);
      setPreview(null);
    }
  }

  const handleCancel = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  return (
    <div className="relative">
      <div
        className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-md overflow-hidden transition-all ${
          dragOver ? 'ring-4 ring-hkdv-pink ring-offset-2' : ''
        } ${preview || currentAvatar ? 'bg-white' : 'bg-gradient-to-br from-pink-200 to-purple-200'}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : currentAvatar ? (
          <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span>🎀</span>
        )}
      </div>

      {preview ? (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            onClick={handleUpload}
            disabled={uploading}
            className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          </motion.button>
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            onClick={handleCancel}
            disabled={uploading}
            className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
          >
            <X size={14} />
          </motion.button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-hkdv-pink text-white flex items-center justify-center shadow-md hover:bg-hkdv-pink-dark transition-colors"
        >
          <Camera size={14} />
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
        className="hidden"
      />

      {dragOver && (
        <div className="absolute inset-0 bg-hkdv-pink/20 rounded-2xl flex items-center justify-center pointer-events-none">
          <span className="text-xs font-bold text-hkdv-pink">Drop image here</span>
        </div>
      )}
    </div>
  );
}
