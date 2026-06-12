export type VendorStatus = 'vacant' | 'occupied' | 'maintenance';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type IssueType = 'road_occupation' | 'hygiene' | 'noise' | 'other';

export type Severity = 'minor' | 'moderate' | 'severe';

export type RectStatus = 'pending' | 'completed' | 'overdue';

export interface BusinessHours {
  start: string;
  end: string;
}

export interface Responsible {
  name: string;
  phone: string;
  idCard: string;
}

export interface Area {
  id: string;
  name: string;
  boundary: [number, number][];
  totalSpots: number;
  status: 'active' | 'inactive';
}

export interface VendorPosition {
  lat: number;
  lng: number;
}

export interface Vendor {
  id: string;
  number: string;
  areaId: string;
  status: VendorStatus;
  category: string[];
  businessHours: BusinessHours;
  responsible: Responsible;
  vendorId?: string;
  expireDate?: string;
  applicationId?: string;
  position?: VendorPosition;
}

export interface Application {
  id: string;
  vendorName: string;
  vendorPhone: string;
  idCard: string;
  idCardPhoto: string[];
  businessDesc: string;
  category: string;
  status: ApplicationStatus;
  assignedSpot?: string;
  assignedSpotId?: string;
  rejectReason?: string;
  createTime: string;
}

export interface Inspection {
  id: string;
  spotId: string;
  inspector: string;
  issueType: IssueType;
  severity: Severity;
  description: string;
  photos: string[];
  rectDeadline?: string;
  rectStatus: RectStatus;
  createTime: string;
}

export interface Statistics {
  totalVendors: number;
  vacantVendors: number;
  occupiedVendors: number;
  totalInspections: number;
  pendingRectifications: number;
  totalApplications: number;
  pendingApplications: number;
}
