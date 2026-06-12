import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Application, ApplicationStatus } from '../types';
import { mockApplications } from '../data/mockData';

interface ApplicationState {
  applications: Application[];
  getByStatus: (status: ApplicationStatus) => Application[];
  submitApplication: (application: Omit<Application, 'id' | 'status' | 'createTime'>) => void;
  approveApplication: (id: string, assignedSpot: string) => void;
  rejectApplication: (id: string, reason: string) => void;
}

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set, get) => ({
      applications: mockApplications,
      getByStatus: (status) => {
        const { applications } = get();
        return applications.filter((app) => app.status === status);
      },
      submitApplication: (application) =>
        set((state) => ({
          applications: [
            ...state.applications,
            {
              ...application,
              id: `app-${String(state.applications.length + 1).padStart(3, '0')}`,
              status: 'pending' as ApplicationStatus,
              createTime: new Date().toISOString(),
            },
          ],
        })),
      approveApplication: (id, assignedSpot) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? { ...app, status: 'approved' as ApplicationStatus, assignedSpot }
              : app
          ),
        })),
      rejectApplication: (id, reason) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? { ...app, status: 'rejected' as ApplicationStatus, rejectReason: reason }
              : app
          ),
        })),
    }),
    {
      name: 'application-storage',
    }
  )
);
