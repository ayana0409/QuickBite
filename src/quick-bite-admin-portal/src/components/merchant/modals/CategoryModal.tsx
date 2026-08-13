import React from 'react';
import { FolderPlus } from 'lucide-react';
import type { Category } from '../../../services/menuService';

export interface CategoryModalProps {
  isOpen: boolean;
  editingCat: Category | null;
  catName: string;
  setCatName: (val: string) => void;
  catDesc: string;
  setCatDesc: (val: string) => void;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  editingCat,
  catName,
  setCatName,
  catDesc,
  setCatDesc,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-cyan-400" />
            {editingCat ? 'Chỉnh Sửa Danh Mục' : 'Tạo Danh Mục Mới'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-slate-300">Tên Danh Mục *</label>
            <input
              type="text"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Ví dụ: Cơm Tấm, Đồ Uống, Món Thêm..."
              required
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-bold text-slate-300">Mô Tả Nhóm Món</label>
            <textarea
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              rows={3}
              placeholder="Mô tả ngắn gọn về nhóm món ăn này..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-black rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {editingCat ? 'Cập Nhật' : 'Tạo Danh Mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
