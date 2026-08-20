import { useState, useEffect, useRef } from 'react';
import { Tag, CheckCircle, Edit3 } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { adminCategoryService } from '../../services/adminCategoryService';
import type { AdminCategory } from '../../services/adminCategoryService';
import { toast } from '../../stores/toastStore';

export const CategoryModerationPage = () => {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCategories = async (search: string = '') => {
    setIsLoading(true);
    try {
      const res = await adminCategoryService.getCategories(search);
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setCategories(list);
    } catch (error) {
      toast.error('Không thể tải danh sách danh mục');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchCategories(term);
    }, 500);
  };

  const handleRenameClick = (category: AdminCategory) => {
    setEditingCategory(category);
    setNewName(category.name);
    setIsModalOpen(true);
  };

  const submitRename = async () => {
    if (!editingCategory) return;
    if (!newName.trim()) {
      toast.error('Tên danh mục không được để trống');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await adminCategoryService.renameCategory(editingCategory.id, newName);
      toast.success('Đổi tên danh mục thành công');
      setIsModalOpen(false);
      fetchCategories(searchTerm);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Lỗi khi đổi tên danh mục');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<AdminCategory>[] = [
    {
      header: 'ID Danh Mục',
      cell: (row) => (
        <span className="text-slate-400 font-mono text-[11px] bg-slate-800/50 px-2 py-1 rounded">
          {row.id.substring(0, 8)}...
        </span>
      ),
    },
    {
      header: 'Tên Danh Mục',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-slate-100">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Nhà Hàng',
      cell: (row) => (
        <span className="text-slate-300">
          {row.restaurant?.name || 'Không xác định'}
        </span>
      ),
    },
    {
      header: 'Ngày Tạo',
      cell: (row) => (
        <span className="text-slate-400 font-mono text-[11px]">
          {new Date(row.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
    {
      header: 'Thao Tác',
      cell: (row) => (
        <button
          onClick={() => handleRenameClick(row)}
          title="Đổi Tên"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 transition-all cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Đổi Tên</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 flex items-center gap-2">
            <Tag className="w-6 h-6 text-cyan-400" />
            Kiểm duyệt Danh mục Món ăn
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý và đổi tên các danh mục vi phạm quy chuẩn từ hệ thống nhà hàng.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-inner">
            <CheckCircle className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-[10px] text-slate-400 font-medium block leading-none">Tổng Danh Mục</span>
              <strong className="text-sm font-extrabold text-cyan-400 font-mono">{categories.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        data={categories}
        columns={columns}
        searchPlaceholder="Tìm theo tên danh mục..."
        onSearchChange={handleSearch}
        isLoading={isLoading}
        pageSize={10}
      />

      {/* Rename Modal */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                Đổi Tên Danh Mục
              </h3>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tên cũ</label>
                <input 
                  type="text" 
                  value={editingCategory.name} 
                  disabled 
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tên mới <span className="text-red-400">*</span></label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nhập tên mới..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={submitRename}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? 'Đang Lưu...' : 'Xác Nhận Đổi Tên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
