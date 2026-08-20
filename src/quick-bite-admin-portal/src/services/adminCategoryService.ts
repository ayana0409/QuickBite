import axiosClient from './axiosClient';

export interface AdminCategory {
  id: string;
  name: string;
  restaurantId: string;
  createdAt: string;
  restaurant?: {
    name: string;
  };
}

export const adminCategoryService = {
  getCategories: async (search: string = '', page: number = 1, limit: number = 100): Promise<{ data: AdminCategory[]; meta: any }> => {
    try {
      const response = await axiosClient.get('/catalog/admin/categories', {
        params: { search, page, limit }
      });
      return response.data;
    } catch (error: any) {
      console.error('Failed to get categories for admin', error);
      throw error;
    }
  },

  renameCategory: async (id: string, newName: string): Promise<AdminCategory> => {
    try {
      const response = await axiosClient.put(`/catalog/admin/categories/${id}/rename`, { newName });
      return response.data;
    } catch (error: any) {
      console.error('Failed to rename category', error);
      throw error;
    }
  }
};
