import { Area, Vendor, Application, Inspection } from '../types';

export const mockAreas: Area[] = [
  {
    id: 'area-001',
    name: '东门步行街',
    boundary: [
      [31.2304, 121.4737],
      [31.2304, 121.4757],
      [31.2284, 121.4757],
      [31.2284, 121.4737],
    ],
    totalSpots: 15,
    status: 'active',
  },
  {
    id: 'area-002',
    name: '西市广场',
    boundary: [
      [31.2350, 121.4800],
      [31.2350, 121.4820],
      [31.2330, 121.4820],
      [31.2330, 121.4800],
    ],
    totalSpots: 12,
    status: 'active',
  },
  {
    id: 'area-003',
    name: '南湖夜市',
    boundary: [
      [31.2200, 121.4900],
      [31.2200, 121.4925],
      [31.2175, 121.4925],
      [31.2175, 121.4900],
    ],
    totalSpots: 20,
    status: 'active',
  },
  {
    id: 'area-004',
    name: '北街文创区',
    boundary: [
      [31.2420, 121.4680],
      [31.2420, 121.4700],
      [31.2400, 121.4700],
      [31.2400, 121.4680],
    ],
    totalSpots: 8,
    status: 'active',
  },
  {
    id: 'area-005',
    name: '中心公园',
    boundary: [
      [31.2280, 121.4850],
      [31.2280, 121.4875],
      [31.2255, 121.4875],
      [31.2255, 121.4850],
    ],
    totalSpots: 10,
    status: 'inactive',
  },
];

const categories = ['餐饮', '服装', '饰品', '玩具', '水果', '蔬菜', '小吃', '手工艺品'];
const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十', '郑十一', '陈十二'];

const areaPositionRanges: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  'area-001': { latMin: 31.2284, latMax: 31.2304, lngMin: 121.4737, lngMax: 121.4757 },
  'area-002': { latMin: 31.2330, latMax: 31.2350, lngMin: 121.4800, lngMax: 121.4820 },
  'area-003': { latMin: 31.2175, latMax: 31.2200, lngMin: 121.4900, lngMax: 121.4925 },
  'area-004': { latMin: 31.2400, latMax: 31.2420, lngMin: 121.4680, lngMax: 121.4700 },
  'area-005': { latMin: 31.2255, latMax: 31.2280, lngMin: 121.4850, lngMax: 121.4875 },
};

const generateFixedPosition = (areaId: string, index: number, total: number): { lat: number; lng: number } => {
  const range = areaPositionRanges[areaId];
  if (!range) {
    return { lat: 31.23 + Math.random() * 0.01, lng: 121.47 + Math.random() * 0.01 };
  }
  
  const cols = Math.ceil(Math.sqrt(total));
  const row = Math.floor(index / cols);
  const col = index % cols;
  
  const latStep = (range.latMax - range.latMin) / (Math.ceil(Math.sqrt(total)) + 1);
  const lngStep = (range.lngMax - range.lngMin) / (cols + 1);
  
  return {
    lat: range.latMin + latStep * (row + 1) + (Math.random() - 0.5) * latStep * 0.3,
    lng: range.lngMin + lngStep * (col + 1) + (Math.random() - 0.5) * lngStep * 0.3,
  };
};

export const mockVendors: Vendor[] = Array.from({ length: 50 }, (_, i) => {
  const areaIndex = i % 5;
  const area = mockAreas[areaIndex];
  const status = i % 4 === 0 ? 'vacant' : i % 4 === 1 ? 'occupied' : 'maintenance';
  const hasResponsible = status !== 'vacant';
  const position = generateFixedPosition(area.id, i, area.totalSpots);
  
  return {
    id: `vendor-${String(i + 1).padStart(3, '0')}`,
    number: `${area.id.split('-')[1]}-${String(i + 1).padStart(2, '0')}`,
    areaId: area.id,
    status,
    category: [categories[i % categories.length]],
    businessHours: {
      start: '08:00',
      end: '22:00',
    },
    responsible: hasResponsible ? {
      name: names[i % names.length],
      phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      idCard: `${Math.floor(Math.random() * 900000 + 100000)}${String(Math.floor(Math.random() * 900000 + 100000)).padStart(6, '0')}${Math.floor(Math.random() * 900 + 100)}`,
    } : {
      name: '',
      phone: '',
      idCard: '',
    },
    vendorId: hasResponsible ? `vendor-person-${i}` : undefined,
    expireDate: hasResponsible ? new Date(Date.now() + Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
    applicationId: hasResponsible ? `app-${String(i % 15 + 1).padStart(3, '0')}` : undefined,
    position,
  };
});

export const mockApplications: Application[] = Array.from({ length: 20 }, (_, i) => {
  const statuses: ('pending' | 'approved' | 'rejected')[] = ['pending', 'approved', 'rejected'];
  const status = statuses[i % 3];
  
  const vacantVendor = mockVendors.find(v => v.status === 'vacant');
  const approvedVendor = status === 'approved' ? vacantVendor : undefined;
  
  if (approvedVendor && !approvedVendor.applicationId) {
    approvedVendor.applicationId = `app-${String(i + 1).padStart(3, '0')}`;
    approvedVendor.status = 'occupied';
    approvedVendor.responsible = {
      name: names[i % names.length],
      phone: `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      idCard: `${Math.floor(Math.random() * 900000 + 100000)}${String(Math.floor(Math.random() * 900000 + 100000)).padStart(6, '0')}${Math.floor(Math.random() * 900 + 100)}`,
    };
  }
  
  return {
    id: `app-${String(i + 1).padStart(3, '0')}`,
    vendorName: names[i % names.length],
    vendorPhone: `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
    idCard: `${Math.floor(Math.random() * 900000 + 100000)}${String(Math.floor(Math.random() * 900000 + 100000)).padStart(6, '0')}${Math.floor(Math.random() * 900 + 100)}`,
    idCardPhoto: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=400',
    ],
    businessDesc: `申请经营${categories[i % categories.length]}类商品，已有3年相关经营经验`,
    category: categories[i % categories.length],
    status,
    assignedSpot: status === 'approved' && approvedVendor ? approvedVendor.number : undefined,
    assignedSpotId: status === 'approved' && approvedVendor ? approvedVendor.id : undefined,
    rejectReason: status === 'rejected' ? '申请材料不完整，请补充相关证件' : undefined,
    createTime: new Date(Date.now() - (20 - i) * 24 * 60 * 60 * 1000).toISOString(),
  };
});

export const mockInspections: Inspection[] = Array.from({ length: 100 }, (_, i) => {
  const issueTypes: ('road_occupation' | 'hygiene' | 'noise' | 'other')[] = ['road_occupation', 'hygiene', 'noise', 'other'];
  const severities: ('minor' | 'moderate' | 'severe')[] = ['minor', 'moderate', 'severe'];
  const rectStatuses: ('pending' | 'completed' | 'overdue')[] = ['pending', 'completed', 'overdue'];
  const issueType = issueTypes[i % 4];
  const severity = severities[i % 3];
  const rectStatus = rectStatuses[i % 3];
  
  const descriptions: Record<string, string[]> = {
    road_occupation: [
      '摊位超出规定范围，占用盲道',
      '货物摆放超出边界线',
      '桌椅占用公共通道',
    ],
    hygiene: [
      '地面有油污未及时清理',
      '垃圾未分类投放',
      '食材存放不符合卫生标准',
    ],
    noise: [
      '音响音量过大，影响周边居民',
      '叫卖声噪音超标',
      '设备运行噪音扰民',
    ],
    other: [
      '未按规定悬挂营业执照',
      '消防通道被阻塞',
      '超时经营',
    ],
  };
  
  return {
    id: `ins-${String(i + 1).padStart(3, '0')}`,
    spotId: mockVendors[i % mockVendors.length].id,
    inspector: names[i % names.length],
    issueType,
    severity,
    description: descriptions[issueType][i % 3],
    photos: [
      'https://images.unsplash.com/photo-1519155824345-14b5a44c?w=400',
      'https://images.unsplash.com/photo-1519155824346-14b5a44c?w=400',
    ],
    rectDeadline: rectStatus !== 'completed' ? new Date(Date.now() + (7 - i % 7) * 24 * 60 * 60 * 1000).toISOString() : undefined,
    rectStatus,
    createTime: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000).toISOString(),
  };
});
