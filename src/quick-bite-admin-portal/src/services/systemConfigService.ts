import axiosClient from './axiosClient';
import { unwrapData } from '../utils/apiHelper';

export interface ConfigResponse {
  key?: string;
  value: string;
  success?: boolean;
}

export const systemConfigService = {
  /**
   * Fetch a single configuration value by key from API Gateway
   * @param key Config key name (e.g. ORDER_URL)
   */
  async getConfig(key: string): Promise<string> {
    const res: any = await axiosClient.get(`/config/${key}`);
    const unwrapped = unwrapData<ConfigResponse>(res) || res;
    if (typeof unwrapped === 'string') {
      return unwrapped;
    }
    return unwrapped?.value !== undefined ? String(unwrapped.value) : '';
  },

  /**
   * Update a configuration value by key in API Gateway
   * @param key Config key name (e.g. ORDER_URL)
   * @param value New configuration string value
   */
  async updateConfig(key: string, value: string): Promise<ConfigResponse> {
    const res: any = await axiosClient.post(`/config/${key}`, { value });
    return unwrapData<ConfigResponse>(res) || res;
  },

  /**
   * Fetch multiple configurations concurrently using Promise.all
   * @param keys Array of configuration keys
   */
  async getAllConfigs(keys: string[]): Promise<Record<string, string>> {
    const values = await Promise.all(
      keys.map(async (key) => {
        try {
          const val = await this.getConfig(key);
          return [key, val] as [string, string];
        } catch (err) {
          console.error(`Failed to fetch config for ${key}:`, err);
          return [key, ''] as [string, string];
        }
      })
    );
    return Object.fromEntries(values);
  },
};
