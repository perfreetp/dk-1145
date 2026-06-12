import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Application, ApplicationStatus } from '../types';
import { mockApplications } from '../data/mockData';

export interface SpotReassignment {
  id: string;
  applicationId: string;
  fromSpotNumber: string;
  fromSpotId: string;
  toSpotNumber: string;
  toSpotId: string;
  time: string;
}

interface ApplicationState {
  applications: Application[];
  spotReassignments: SpotReassignment[];
  getByStatus: (status: ApplicationStatus) => Application[];
  submitApplication: (application: Omit<Application, 'id' | 'status' | 'createTime'>) => void;
  approveApplication: (id: string, assignedSpot: string, assignedSpotId: string) => void;
  rejectApplication: (id: string, reason: string) => void;
  reassignSpot: (id: string, newSpotNumber: string, newSpotId: string, oldSpotNumber?: string, oldSpotId?: string) => void;
  getSpotReassignments: (applicationId: string) => SpotReassignment[];
}

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set, get) => ({
      applications: mockApplications,
      spotReassignments: [],
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
      approveApplication: (id, assignedSpot, assignedSpotId) =>
        set((state) => ({
          applications: state.applications.map((app) =>
            app.id === id
              ? { ...app, status: 'approved' as ApplicationStatus, assignedSpot, assignedSpotId }
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
      reassignSpot: (id, newSpotNumber, newSpotId, oldSpotNumber, oldSpotId) =>
        set((state) => {
          const newReassignment: SpotReassignment = {
            id: `reassign-${Date.now()}`,
            applicationId: id,
            fromSpotNumber: oldSpotNumber || '',
            fromSpotId: oldSpotId || '',
            toSpotNumber: newSpotNumber,
            toSpotId: newSpotId,
            time: new Date().toISOString(),
          };

          return {
            applications: state.applications.map((app) =>
              app.id === id
                ? { ...app, assignedSpot: newSpotNumber, assignedSpotId: newSpotId }
                : app
            ),
            spotReassignments: [...state.spotReassignments, newReassignment],
          };
        }),
      getSpotReassignments: (applicationId) => {
        const { spotReassignments } = get();
        return spotReassignments.filter((r) => r.applicationId === applicationId);
      },
    }),
    {
      name: 'application-storage',
    }
  )
);
