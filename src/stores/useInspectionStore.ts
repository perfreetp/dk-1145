import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Inspection, IssueType, Severity, RectStatus } from '../types';
import { mockInspections } from '../data/mockData';

interface InspectionState {
  inspections: Inspection[];
  addInspection: (inspection: Omit<Inspection, 'id' | 'createTime'>) => void;
  updateRectStatus: (id: string, status: RectStatus) => void;
  getBySpot: (spotId: string) => Inspection[];
  getByDateRange: (startDate: string, endDate: string) => Inspection[];
  getStatistics: () => {
    total: number;
    pending: number;
    completed: number;
    overdue: number;
  };
}

export const useInspectionStore = create<InspectionState>()(
  persist(
    (set, get) => ({
      inspections: mockInspections,
      addInspection: (inspection) =>
        set((state) => ({
          inspections: [
            ...state.inspections,
            {
              ...inspection,
              id: `ins-${String(state.inspections.length + 1).padStart(3, '0')}`,
              createTime: new Date().toISOString(),
            },
          ],
        })),
      updateRectStatus: (id, status) =>
        set((state) => ({
          inspections: state.inspections.map((ins) =>
            ins.id === id ? { ...ins, rectStatus: status } : ins
          ),
        })),
      getBySpot: (spotId) => {
        const { inspections } = get();
        return inspections.filter((ins) => ins.spotId === spotId);
      },
      getByDateRange: (startDate, endDate) => {
        const { inspections } = get();
        return inspections.filter((ins) => {
          const createTime = new Date(ins.createTime);
          return createTime >= new Date(startDate) && createTime <= new Date(endDate);
        });
      },
      getStatistics: () => {
        const { inspections } = get();
        return {
          total: inspections.length,
          pending: inspections.filter((ins) => ins.rectStatus === 'pending').length,
          completed: inspections.filter((ins) => ins.rectStatus === 'completed').length,
          overdue: inspections.filter((ins) => ins.rectStatus === 'overdue').length,
        };
      },
    }),
    {
      name: 'inspection-storage',
    }
  )
);
