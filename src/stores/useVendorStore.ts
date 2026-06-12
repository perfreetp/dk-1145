import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Vendor, VendorStatus } from '../types';
import { mockVendors } from '../data/mockData';

interface VendorFilter {
  status?: VendorStatus;
  areaId?: string;
  category?: string;
  search?: string;
}

interface VendorState {
  vendors: Vendor[];
  filter: VendorFilter;
  setFilter: (filter: VendorFilter) => void;
  addVendor: (vendor: Omit<Vendor, 'id'>) => void;
  updateVendor: (id: string, updates: Partial<Vendor>) => void;
  deleteVendor: (id: string) => void;
  getFilteredVendors: () => Vendor[];
}

export const useVendorStore = create<VendorState>()(
  persist(
    (set, get) => ({
      vendors: mockVendors,
      filter: {},
      setFilter: (filter) => set({ filter }),
      addVendor: (vendor) =>
        set((state) => ({
          vendors: [
            ...state.vendors,
            {
              ...vendor,
              id: `vendor-${String(state.vendors.length + 1).padStart(3, '0')}`,
            },
          ],
        })),
      updateVendor: (id, updates) =>
        set((state) => ({
          vendors: state.vendors.map((vendor) =>
            vendor.id === id ? { ...vendor, ...updates } : vendor
          ),
        })),
      deleteVendor: (id) =>
        set((state) => ({
          vendors: state.vendors.filter((vendor) => vendor.id !== id),
        })),
      getFilteredVendors: () => {
        const { vendors, filter } = get();
        return vendors.filter((vendor) => {
          if (filter.status && vendor.status !== filter.status) return false;
          if (filter.areaId && vendor.areaId !== filter.areaId) return false;
          if (filter.category && !vendor.category.includes(filter.category)) return false;
          if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            const matchNumber = vendor.number.toLowerCase().includes(searchLower);
            const matchName = vendor.responsible.name.toLowerCase().includes(searchLower);
            if (!matchNumber && !matchName) return false;
          }
          return true;
        });
      },
    }),
    {
      name: 'vendor-storage',
    }
  )
);
