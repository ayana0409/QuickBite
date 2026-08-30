import React, { useRef, useEffect, useState } from 'react';
import {
  Upload,
  Trash2,
  RotateCcw,
  Image as ImageIcon,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react';
import { toast } from '../../stores/toastStore';

export interface ImageUploadPanelProps {
  existingImages: string[];
  markedForDeletion: Set<string>;
  onMarkDelete: (imageUrl: string) => void;
  newFiles: File[];
  onNewFilesChange: (files: File[]) => void;
  maxImages?: number;
  isLoading?: boolean;
}

interface NewFilePreview {
  file: File;
  previewUrl: string;
}

export const ImageUploadPanel: React.FC<ImageUploadPanelProps> = ({
  existingImages = [],
  markedForDeletion = new Set(),
  onMarkDelete,
  newFiles = [],
  onNewFilesChange,
  maxImages = 5,
  isLoading = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<NewFilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Synchronize local preview URLs with newFiles prop
  useEffect(() => {
    const nextPreviews = newFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPreviews(nextPreviews);

    // Clean up created object URLs on unmount or when newFiles changes
    return () => {
      nextPreviews.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, [newFiles]);

  // Calculate current effective count (excluding marked-for-deletion items)
  const remainingExistingCount = existingImages.filter(
    (img) => !markedForDeletion.has(img)
  ).length;
  const totalEffectiveCount = remainingExistingCount + newFiles.length;
  const isMaxReached = totalEffectiveCount >= maxImages;
  const remainingSlots = Math.max(0, maxImages - totalEffectiveCount);

  // Validate and handle new file selections
  const handleFilesSelected = (incomingFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit

    const fileArray = Array.from(incomingFiles);

    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        toast.error(`File "${file.name}" không hợp lệ. Chỉ chấp nhận ảnh JPG, PNG, WEBP!`);
        continue;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`Ảnh "${file.name}" vượt quá dung lượng 5MB!`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    if (validFiles.length > remainingSlots) {
      toast.warning(`Chỉ có thể chọn thêm tối đa ${remainingSlots} ảnh (giới hạn ${maxImages} ảnh/món).`);
    }

    const acceptedFiles = validFiles.slice(0, remainingSlots);
    onNewFilesChange([...newFiles, ...acceptedFiles]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
      e.target.value = ''; // Reset input to allow selecting the same file again if needed
    }
  };

  const handleRemoveNewFile = (index: number) => {
    const next = newFiles.filter((_, i) => i !== index);
    onNewFilesChange(next);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isMaxReached && !isLoading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isMaxReached || isLoading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/30">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-slate-100 text-xs sm:text-sm flex items-center gap-2">
              Bộ Sưu Tập Hình Ảnh Món Ăn
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-colors ${
                  isMaxReached
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {totalEffectiveCount}/{maxImages} ảnh
              </span>
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hỗ trợ tối đa {maxImages} ảnh (.jpg, .png, .webp &le; 5MB). Ảnh được nén tối ưu sang định dạng .webp.
            </p>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleInputChange}
          className="hidden"
          disabled={isMaxReached || isLoading}
        />

        {/* Add photo button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isMaxReached || isLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer shrink-0 ${
            isMaxReached || isLoading
              ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
              : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-emerald-600/20'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          {isMaxReached ? 'Đã Đạt Tối Đa' : 'Thêm Ảnh'}
        </button>
      </div>

      {/* Warning when max reached */}
      {isMaxReached && (
        <div className="flex items-center gap-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Đã đạt giới hạn tối đa {maxImages} ảnh cho món ăn này. Bạn có thể xóa bớt ảnh cũ hoặc bỏ chọn ảnh mới để tải thêm.
          </span>
        </div>
      )}

      {/* Images Grid Display */}
      {existingImages.length === 0 && newFiles.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isMaxReached && !isLoading && fileInputRef.current?.click()}
          className={`py-8 px-4 text-center border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
            isDragging
              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-800 hover:border-emerald-500/40 bg-slate-900/40 hover:bg-slate-900/60 text-slate-400'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="p-3 bg-slate-800 rounded-full text-slate-400">
              <Upload className="w-6 h-6" />
            </div>
            <div className="text-xs font-semibold text-slate-200">
              Kéo thả ảnh vào đây hoặc bấm để chọn từ máy tính
            </div>
            <div className="text-[11px] text-slate-500">
              Chấp nhận PNG, JPG, WEBP (tối đa 5MB mỗi ảnh)
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active Thumbnails Container */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {/* 1. Existing Server Images */}
            {existingImages.map((imgUrl, idx) => {
              const isDeleted = markedForDeletion.has(imgUrl);
              return (
                <div
                  key={`existing-${idx}`}
                  className={`group relative rounded-2xl overflow-hidden aspect-square border transition-all ${
                    isDeleted
                      ? 'border-red-500/60 bg-red-950/40 opacity-70'
                      : 'border-slate-800 hover:border-emerald-500/50 bg-slate-900'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Ảnh món ${idx + 1}`}
                    className={`w-full h-full object-cover transition-transform duration-300 ${
                      isDeleted ? 'grayscale scale-95' : 'group-hover:scale-105'
                    }`}
                  />

                  {/* Primary Image Badge (first active image) */}
                  {!isDeleted && idx === 0 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/40 rounded-lg text-[9px] font-black uppercase tracking-wider">
                      Ảnh Chính
                    </span>
                  )}

                  {/* Pending Delete Overlay */}
                  {isDeleted && (
                    <div className="absolute inset-0 bg-red-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center">
                      <span className="text-[10px] font-black text-red-300 uppercase tracking-wide">
                        Đã Đánh Dấu Xóa
                      </span>
                      <span className="text-[9px] text-red-400 mt-0.5">
                        (Sẽ xóa khi bấm Lưu)
                      </span>
                      <button
                        type="button"
                        onClick={() => onMarkDelete(imgUrl)}
                        className="mt-2 flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-cyan-400" />
                        Khôi Phục
                      </button>
                    </div>
                  )}

                  {/* Mark Delete Button */}
                  {!isDeleted && (
                    <div className="absolute top-2 right-2 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onMarkDelete(imgUrl)}
                        disabled={isLoading}
                        title="Đánh dấu xóa ảnh này"
                        className="w-7 h-7 flex items-center justify-center bg-slate-950/80 hover:bg-red-500/90 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700/80 hover:border-red-400 rounded-xl transition-all shadow-md cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. New Upload Previews */}
            {previews.map((preview, idx) => (
              <div
                key={`new-${idx}`}
                className="group relative rounded-2xl overflow-hidden aspect-square border border-emerald-500/50 bg-slate-900 shadow-lg shadow-emerald-500/5"
              >
                <img
                  src={preview.previewUrl}
                  alt={preview.file.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* New Tag */}
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-500 text-slate-950 font-black rounded-lg text-[9px] uppercase tracking-wider shadow">
                  Mới
                </span>

                {/* File size badge */}
                <span className="absolute bottom-2 left-2 right-2 px-1.5 py-0.5 bg-slate-950/80 backdrop-blur-md text-slate-300 rounded text-[9px] font-mono truncate text-center">
                  {formatFileSize(preview.file.size)}
                </span>

                {/* Remove from queue button */}
                <div className="absolute top-2 right-2 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleRemoveNewFile(idx)}
                    disabled={isLoading}
                    title="Bỏ chọn ảnh này"
                    className="w-7 h-7 flex items-center justify-center bg-slate-950/80 hover:bg-red-500/90 text-slate-300 hover:text-white backdrop-blur-md border border-slate-700/80 hover:border-red-400 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* 3. Drop/Add Placeholder Button inside Grid */}
            {!isMaxReached && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed aspect-square transition-all cursor-pointer ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                    : 'border-slate-800 hover:border-emerald-500/40 bg-slate-900/30 hover:bg-slate-900/60 text-slate-400 hover:text-emerald-300'
                }`}
              >
                <div className="p-2 bg-slate-800/80 rounded-xl">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-semibold">Thêm ảnh</span>
                <span className="text-[9px] text-slate-500 font-mono">
                  (Còn {remainingSlots})
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploadPanel;
