import axiosClient from './axiosClient';
import type {
  CatalogRequest,
  PaginatedRequestsResponse,
  ProcessRequestPayload,
  RequestQueryParams,
} from '../types/request';

/**
 * Service for managing and processing catalog requests in Admin Portal
 */
export const adminRequestService = {
  /**
   * Get paginated catalog requests with optional filters
   */
  async getRequests(params?: RequestQueryParams): Promise<PaginatedRequestsResponse> {
    const response: any = await axiosClient.get('/requests', {
      params,
    });

    // Handle global wrapper { data: { data: [], meta: {} } } or direct { data: [], meta: {} }
    if (response?.data?.data && response?.data?.meta) {
      return response.data;
    }

    if (response?.data && response?.meta) {
      return {
        data: Array.isArray(response.data) ? response.data : [],
        meta: response.meta,
      };
    }

    if (Array.isArray(response?.data)) {
      return {
        data: response.data,
        meta: {
          total: response.data.length,
          page: params?.page || 1,
          limit: params?.limit || 10,
          totalPages: Math.ceil(response.data.length / (params?.limit || 10)),
        },
      };
    }

    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      },
    };
  },

  /**
   * Get single catalog request details by ID
   */
  async getRequestById(id: string): Promise<CatalogRequest> {
    const response: any = await axiosClient.get(`/requests/${id}`);
    return response?.data || response;
  },

  /**
   * Process a catalog request (APPROVE / REJECT)
   */
  async processRequest(
    id: string,
    payload: ProcessRequestPayload
  ): Promise<CatalogRequest> {
    const response: any = await axiosClient.patch(`/requests/${id}/process`, payload);
    return response?.data || response;
  },
};
