import { useState, useEffect } from 'react';
import { Store, CheckCircle, PauseCircle, Edit3, Power } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RestaurantModal } from '../../components/admin/RestaurantModal';
import { restaurantService } from '../../services/restaurantService';
import type { Restaurant } from '../../types';

export const RestaurantsPage = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const data = await restaurantService.getRestaurants();
      setRestaurants(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleCreateOrUpdate = async (values: any) => {
    if (editingRestaurant) {
      await restaurantService.updateRestaurant(editingRestaurant.id, values);
    } else {
      await restaurantService.createRestaurant(values);
    }
    await fetchRestaurants();
  };

  const handleToggleStatus = async (id: string) => {
    await restaurantService.toggleStatus(id);
    await fetchRestaurants();
  };

  const activeCount = restaurants.filter((r) => r.isActive).length;
  const inactiveCount = restaurants.length - activeCount;

  const columns: Column<Restaurant>[] = [
    {
      header: 'Nhà Hàng',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="font-bold text-slate-100 leading-tight">{row.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">Owner: {row.ownerId}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Địa Chỉ',
      accessorKey: 'address',
      cell: (row) => <span className="text-slate-300 max-w-xs block truncate">{row.address}</span>,
    },
    {
      header: 'Trạng Thái',
      cell: (row) => <StatusBadge status={row.isActive ? 'Active' : 'Inactive'} type="boolean" />,
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingRestaurant(row);
              setIsModalOpen(true);
            }}
            title="Chỉnh sửa"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg border border-slate-700 transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => handleToggleStatus(row.id)}
            title={row.isActive ? 'Tạm ngưng hoạt động' : 'Kích hoạt ngay'}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              row.isActive
                ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400 flex items-center gap-2">
            <Store className="w-6 h-6 text-amber-400" />
            Quản Lý Danh Sách Nhà Hàng
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý thông tin nhà hàng, đối tác merchant và trạng thái kinh doanh toàn hệ thống.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-inner">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 font-medium block leading-none">Hoạt Động</span>
              <strong className="text-sm font-extrabold text-emerald-400 font-mono">{activeCount}</strong>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3.5 py-2 rounded-xl flex items-center gap-2 shadow-inner">
            <PauseCircle className="w-4 h-4 text-red-400" />
            <div>
              <span className="text-[10px] text-slate-400 font-medium block leading-none">Tạm Ngưng</span>
              <strong className="text-sm font-extrabold text-red-400 font-mono">{inactiveCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        data={restaurants}
        columns={columns}
        searchPlaceholder="Tìm kiếm nhà hàng theo tên, địa chỉ hoặc Owner..."
        filterOptions={[
          { label: 'Hoạt Động (Active)', value: 'active' },
          { label: 'Tạm Ngưng (Inactive)', value: 'inactive' },
        ]}
        onAddNew={() => {
          setEditingRestaurant(null);
          setIsModalOpen(true);
        }}
        addNewLabel="Thêm Nhà Hàng"
        isLoading={isLoading}
      />

      {/* Restaurant Modal Form */}
      <RestaurantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateOrUpdate}
        initialData={editingRestaurant}
      />
    </div>
  );
};
