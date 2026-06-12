import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Area } from '../types';
import { mockAreas } from '../data/mockData';

interface AreaState {
  areas: Area[];
  selectedAreaId: string | null;
  addArea: (area: Omit<Area, 'id'>) => void;
  updateArea: (id: string, updates: Partial<Area>) => void;
  deleteArea: (id: string) => void;
  setSelectedArea: (id: string | null) => void;
}

export const useAreaStore = create<AreaState>()(
  persist(
    (set) => ({
      areas: mockAreas,
      selectedAreaId: null,
      addArea: (area) =>
        set((state) => ({
          areas: [
            ...state.areas,
            {
              ...area,
              id: `area-${String(state.areas.length + 1).padStart(3, '0')}`,
            },
          ],
        })),
      updateArea: (id, updates) =>
        set((state) => ({
          areas: state.areas.map((area) =>
            area.id === id ? { ...area, ...updates } : area
          ),
        })),
      deleteArea: (id) =>
        set((state) => ({
          areas: state.areas.filter((area) => area.id !== id),
          selectedAreaId: state.selectedAreaId === id ? null : state.selectedAreaId,
        })),
      setSelectedArea: (id) => set({ selectedAreaId: id }),
    }),
    {
      name: 'area-storage',
    }
  )
);
