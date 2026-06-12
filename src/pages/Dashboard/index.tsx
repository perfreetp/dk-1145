import { useMemo, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Progress, Modal, Timeline, Descriptions, Image, Button, Input, Select, Space, Collapse } from 'antd';
import {
  Store,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  AlertTriangle,
  ChevronRight,
  Search,
  Filter,
  User,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { useVendorStore, useInspectionStore, useApplicationStore, useAreaStore } from '../../stores';
import { StatusBadge } from '../../components/common';
import { Inspection, Area as AreaType, Vendor } from '../../types';

const COLORS = ['#10B981', '#F97316', '#EF4444', '#3B82F6'];

const issueTypeLabels: Record<string, { label: string; color: string }> = {
  road_occupation: { label: '占道经营', color: 'orange' },
  hygiene: { label: '卫生问题', color: 'red' },
  noise: { label: '噪音扰民', color: 'purple' },
  other: { label: '其他', color: 'default' },
};

const severityLabels: Record<string, { label: string; color: string }> = {
  minor: { label: '轻微', color: 'green' },
  moderate: { label: '一般', color: 'orange' },
  severe: { label: '严重', color: 'red' },
};

export const Dashboard = () => {
  const { vendors } = useVendorStore();
  const { inspections, updateRectStatus } = useInspectionStore();
  const { applications } = useApplicationStore();
  const { areas } = useAreaStore();
  const [selectedAreaDetail, setSelectedAreaDetail] = useState<any>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [followUpFilter, setFollowUpFilter] = useState<{
    areaId?: string;
    responsible?: string;
    maxDays?: number;
    search?: string;
  }>({});

  const statistics = useMemo(() => {
    const vendorStats = {
      total: vendors.length,
      vacant: vendors.filter((v) => v.status === 'vacant').length,
      occupied: vendors.filter((v) => v.status === 'occupied').length,
      maintenance: vendors.filter((v) => v.status === 'maintenance').length,
    };

    const inspectionStats = {
      total: inspections.length,
      pending: inspections.filter((ins) => ins.rectStatus === 'pending').length,
      completed: inspections.filter((ins) => ins.rectStatus === 'completed').length,
      overdue: inspections.filter((ins) => ins.rectStatus === 'overdue').length,
    };

    const appStats = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      approved: applications.filter((a) => a.status === 'approved').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
    };

    return { vendorStats, inspectionStats, appStats };
  }, [vendors, inspections, applications]);

  const trendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      const dayInspections = inspections.filter((ins) => ins.createTime.startsWith(dateStr));
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        巡查次数: dayInspections.length,
        违规次数: dayInspections.filter((ins) => ins.rectStatus !== 'completed').length,
      };
    });
    return last7Days;
  }, [inspections]);

  const vendorStatusData = useMemo(() => {
    return [
      { name: '空闲', value: statistics.vendorStats.vacant },
      { name: '已占用', value: statistics.vendorStats.occupied },
      { name: '维护中', value: statistics.vendorStats.maintenance },
    ];
  }, [statistics]);

  const areaViolationData = useMemo(() => {
    return areas.map((area) => {
      const areaVendors = vendors.filter((v) => v.areaId === area.id);
      const areaVendorIds = areaVendors.map((v) => v.id);
      const areaInspections = inspections.filter((ins) => areaVendorIds.includes(ins.spotId));
      const unresolvedInspections = areaInspections.filter((ins) => ins.rectStatus !== 'completed');
      
      const issueTypeBreakdown = {
        road_occupation: areaInspections.filter(ins => ins.issueType === 'road_occupation').length,
        hygiene: areaInspections.filter(ins => ins.issueType === 'hygiene').length,
        noise: areaInspections.filter(ins => ins.issueType === 'noise').length,
        other: areaInspections.filter(ins => ins.issueType === 'other').length,
      };
      
      return {
        ...area,
        total: areaInspections.length,
        unresolved: unresolvedInspections.length,
        rate: areaInspections.length > 0 
          ? Math.round((unresolvedInspections.length / areaInspections.length) * 100) 
          : 0,
        issueTypeBreakdown,
        areaVendors,
        unresolvedInspections,
      };
    });
  }, [areas, vendors, inspections]);

  const issueTypeDistribution = useMemo(() => {
    const typeCount = { road_occupation: 0, hygiene: 0, noise: 0, other: 0 };
    inspections.forEach((ins) => { typeCount[ins.issueType]++; });
    return [
      { name: '占道经营', value: typeCount.road_occupation },
      { name: '卫生问题', value: typeCount.hygiene },
      { name: '噪音扰民', value: typeCount.noise },
      { name: '其他问题', value: typeCount.other },
    ].filter(item => item.value > 0);
  }, [inspections]);

  const hotZones = useMemo(() => {
    const top3 = areaViolationData.slice(0, 3);
    const maxUnresolved = top3[0]?.unresolved || 1;
    return top3.map((zone, index) => ({
      ...zone,
      intensity: Math.round((zone.unresolved / maxUnresolved) * 100),
      rank: index + 1,
    }));
  }, [areaViolationData]);

  const expiringVendors = useMemo(() => {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return vendors.filter((v) => {
      if (!v.expireDate) return false;
      const expireDate = new Date(v.expireDate);
      return expireDate <= in7Days && expireDate >= now;
    });
  }, [vendors]);

  const overdueRectifications = useMemo(() => {
    return inspections.filter((ins) => ins.rectStatus === 'overdue');
  }, [inspections]);

  const pendingRectifications = useMemo(() => {
    let filtered = inspections.filter((ins) => ins.rectStatus === 'pending');
    
    if (followUpFilter.areaId) {
      const areaVendorIds = vendors.filter(v => v.areaId === followUpFilter.areaId).map(v => v.id);
      filtered = filtered.filter(ins => areaVendorIds.includes(ins.spotId));
    }
    
    if (followUpFilter.responsible) {
      const responsibleVendorIds = vendors
        .filter(v => v.responsible.name.includes(followUpFilter.responsible!))
        .map(v => v.id);
      filtered = filtered.filter(ins => responsibleVendorIds.includes(ins.spotId));
    }
    
    if (followUpFilter.maxDays) {
      const now = new Date();
      filtered = filtered.filter(ins => {
        if (!ins.rectDeadline) return false;
        const deadline = new Date(ins.rectDeadline);
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft <= followUpFilter.maxDays!;
      });
    }
    
    if (followUpFilter.search) {
      const search = followUpFilter.search.toLowerCase();
      filtered = filtered.filter(ins => {
        const vendor = vendors.find(v => v.id === ins.spotId);
        const area = areas.find(a => a.id === vendor?.areaId);
        return (
          vendor?.number.toLowerCase().includes(search) ||
          vendor?.responsible.name.toLowerCase().includes(search) ||
          area?.name.toLowerCase().includes(search) ||
          ins.description.toLowerCase().includes(search)
        );
      });
    }
    
    return filtered.sort((a, b) => {
      if (!a.rectDeadline) return 1;
      if (!b.rectDeadline) return -1;
      return new Date(a.rectDeadline).getTime() - new Date(b.rectDeadline).getTime();
    });
  }, [inspections, vendors, areas, followUpFilter]);

  const handleAreaClick = (area: AreaType) => {
    const areaData = areaViolationData.find(a => a.id === area.id);
    setSelectedAreaDetail(areaData || area);
    setDetailModalVisible(true);
  };

  const handleCompleteRect = (insId: string) => {
    updateRectStatus(insId, 'completed');
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 80) return 'bg-red-500';
    if (intensity >= 50) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const columns = [
    { title: '摊位编号', dataIndex: 'number', key: 'number' },
    { title: '负责人', dataIndex: 'name', key: 'name', render: (_: any, record: any) => record.responsible?.name || '-' },
    { title: '到期日期', dataIndex: 'expireDate', key: 'expireDate' },
    {
      title: '剩余天数',
      key: 'daysLeft',
      render: (_: any, record: any) => {
        const now = new Date();
        const expire = new Date(record.expireDate);
        const daysLeft = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return <Tag color={daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'orange' : 'green'}>{daysLeft}天</Tag>;
      },
    },
  ];

  const areaDetailColumns = [
    {
      title: '摊位编号',
      dataIndex: 'number',
      key: 'number',
      render: (number: string) => <span className="font-mono">{number}</span>,
    },
    {
      title: '问题描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '问题类型',
      dataIndex: 'issueType',
      key: 'issueType',
      render: (type: string) => <Tag color={issueTypeLabels[type]?.color}>{issueTypeLabels[type]?.label}</Tag>,
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => <Tag color={severityLabels[severity]?.color}>{severityLabels[severity]?.label}</Tag>,
    },
    {
      title: '整改状态',
      dataIndex: 'rectStatus',
      key: 'rectStatus',
      render: (status: string) => <StatusBadge status={status as any} />,
    },
    {
      title: '巡查时间',
      dataIndex: 'createTime',
      key: 'createTime',
      render: (time: string) => new Date(time).toLocaleDateString('zh-CN'),
    },
  ];

  const followUpColumns = [
    {
      title: '摊位',
      key: 'vendor',
      render: (_: any, record: Inspection) => {
        const vendor = vendors.find(v => v.id === record.spotId);
        const area = areas.find(a => a.id === vendor?.areaId);
        return (
          <div>
            <div className="font-mono font-medium">{vendor?.number || '-'}</div>
            <div className="text-xs text-gray-500">{area?.name}</div>
          </div>
        );
      },
    },
    {
      title: '负责人',
      key: 'responsible',
      render: (_: any, record: Inspection) => {
        const vendor = vendors.find(v => v.id === record.spotId);
        return vendor?.responsible.name || '-';
      },
    },
    {
      title: '问题类型',
      dataIndex: 'issueType',
      key: 'issueType',
      render: (type: string) => <Tag color={issueTypeLabels[type]?.color}>{issueTypeLabels[type]?.label}</Tag>,
    },
    {
      title: '问题描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '整改期限',
      dataIndex: 'rectDeadline',
      key: 'rectDeadline',
      render: (deadline: string) => {
        if (!deadline) return '-';
        const now = new Date();
        const deadlineDate = new Date(deadline);
        const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <div>
            <div>{new Date(deadline).toLocaleDateString('zh-CN')}</div>
            <Tag color={daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'orange' : 'blue'}>{daysLeft}天</Tag>
          </div>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Inspection) => (
        <Button size="small" type="primary" className="bg-success" onClick={() => handleCompleteRect(record.id)}>
          完成整改
        </Button>
      ),
    },
  ];

  const expandedRowRender = (record: Inspection) => {
    const vendor = vendors.find(v => v.id === record.spotId);
    const area = areas.find(a => a.id === vendor?.areaId);
    
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-sm text-gray-500">摊位编号</div>
            <div className="font-mono font-medium">{vendor?.number}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">所属区域</div>
            <div>{area?.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">负责人</div>
            <div>{vendor?.responsible.name || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">联系电话</div>
            <div>{vendor?.responsible.phone || '-'}</div>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-2">巡查照片</div>
          {record.photos && record.photos.length > 0 ? (
            <div className="flex gap-2">
              {record.photos.map((photo, idx) => (
                <img key={idx} src={photo} alt={`巡查照片${idx + 1}`} className="w-24 h-24 rounded object-cover" />
              ))}
            </div>
          ) : (
            <span className="text-gray-400">暂无照片</span>
          )}
        </div>
        
        <div className="text-sm text-gray-500 mb-2">巡查信息</div>
        <div className="bg-white p-3 rounded">
          <div>巡查员：{record.inspector}</div>
          <div>巡查时间：{new Date(record.createTime).toLocaleString('zh-CN')}</div>
          <div>严重程度：<Tag color={severityLabels[record.severity]?.color}>{severityLabels[record.severity]?.label}</Tag></div>
        </div>
      </div>
    );
  };

  const selectedAreaInspections = useMemo(() => {
    if (!selectedAreaDetail) return [];
    const areaVendorIds = vendors.filter(v => v.areaId === selectedAreaDetail.id).map(v => v.id);
    return inspections
      .filter(ins => areaVendorIds.includes(ins.spotId))
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  }, [selectedAreaDetail, vendors, inspections]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">数据看板</h1>
          <p className="text-gray-500 mt-1">实时监控摆摊区域运营状况</p>
        </div>
        <div className="flex gap-2">
          <Button icon={<AlertTriangle size={16} />} onClick={() => setFollowUpVisible(true)}>
            整改跟进
            {pendingRectifications.length > 0 && (
              <Tag color="red" className="ml-2">{pendingRectifications.length}</Tag>
            )}
          </Button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={16} />
            <span>{new Date().toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic title="总摊位数" value={statistics.vendorStats.total} prefix={<Store className="text-primary" size={24} />} styles={{ content: { color: '#1E3A5F' } }} />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-success" /><span className="text-success">+5</span><span className="text-gray-400">较上月</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic title="空闲摊位" value={statistics.vendorStats.vacant} prefix={<CheckCircle className="text-success" size={24} />} styles={{ content: { color: '#10B981' } }} />
            <div className="mt-2"><Progress percent={Math.round((statistics.vendorStats.vacant / statistics.vendorStats.total) * 100)} showInfo={false} strokeColor="#10B981" /></div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic title="待处理整改" value={statistics.inspectionStats.pending + statistics.inspectionStats.overdue} prefix={<AlertCircle className="text-warning" size={24} />} styles={{ content: { color: '#EF4444' } }} />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <TrendingDown size={16} className="text-success" /><span className="text-success">-3</span><span className="text-gray-400">较上周</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic title="待审核申请" value={statistics.appStats.pending} prefix={<Clock className="text-accent" size={24} />} styles={{ content: { color: '#F97316' } }} />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-accent" /><span className="text-accent">+2</span><span className="text-gray-400">新申请</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="巡查趋势" className="h-full">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="巡查次数" stroke="#1E3A5F" fill="#1E3A5F" fillOpacity={0.1} />
                <Area type="monotone" dataKey="违规次数" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="摊位状态分布" className="h-full">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={vendorStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {vendorStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {vendorStatusData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-sm text-gray-600">{item.name}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<div className="flex items-center gap-2"><AlertTriangle size={20} className="text-red-500" /><span>违规热区分布</span><Tag color="red">问题最集中区域</Tag></div>}>
            <div className="space-y-4">
              {hotZones.map((zone) => (
                <div key={zone.id} className="p-4 rounded-lg border-2 border-gray-200 hover:border-red-300 transition-colors cursor-pointer" onClick={() => handleAreaClick(zone)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${getIntensityColor(zone.intensity)} text-white flex items-center justify-center font-bold`}>{zone.rank}</div>
                      <div>
                        <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-400" /><span className="font-medium text-gray-900">{zone.name}</span><ChevronRight size={16} className="text-gray-400" /></div>
                        <div className="text-sm text-gray-500 mt-1">共 {zone.total} 次巡查，{zone.unresolved} 次未整改</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-500">{zone.unresolved}</div>
                      <div className="text-xs text-gray-400">未整改次数</div>
                    </div>
                  </div>
                  <Progress percent={zone.intensity} strokeColor={zone.intensity >= 80 ? '#ef4444' : zone.intensity >= 50 ? '#f97316' : '#eab308'} showInfo={false} />
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-400">违规强度: {zone.intensity}%</div>
                    <Button type="link" size="small" className="text-accent p-0 h-auto">查看详情 →</Button>
                  </div>
                </div>
              ))}
              {hotZones.length === 0 && <div className="text-center text-gray-400 py-8">暂无违规数据</div>}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<div className="flex items-center gap-2"><AlertCircle size={20} className="text-orange-500" /><span>各区域违规统计</span></div>}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={areaViolationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis type="category" dataKey="name" stroke="#6b7280" width={80} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} formatter={(value: number, name: string) => [value, name === 'unresolved' ? '未整改次数' : '总巡查次数']} />
                <Bar dataKey="total" fill="#1E3A5F" name="总巡查次数" radius={[0, 4, 4, 0]} />
                <Bar dataKey="unresolved" fill="#EF4444" name="未整改次数" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#1E3A5F]"></div><span className="text-sm text-gray-600">总巡查次数</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[#EF4444]"></div><span className="text-sm text-gray-600">未整改次数</span></div>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="问题类型分布">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={issueTypeDistribution} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {issueTypeDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={['#f97316', '#ef4444', '#8b5cf6', '#6b7280'][index % 4]} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<div className="flex items-center gap-2"><AlertCircle size={20} className="text-warning" /><span>即将到期提醒</span><Tag color="red">{expiringVendors.length}个</Tag></div>}>
            <Table columns={columns} dataSource={expiringVendors} rowKey="id" pagination={false} size="small" />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={<div className="flex items-center gap-2"><Clock size={20} className="text-warning" /><span>逾期未整改</span><Tag color="red">{overdueRectifications.length}条</Tag></div>}>
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {overdueRectifications.slice(0, 5).map((ins) => {
                const vendor = vendors.find((v) => v.id === ins.spotId);
                const area = areas.find((a) => a.id === vendor?.areaId);
                return (
                  <div key={ins.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle size={20} className="text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{area?.name || '未知区域'}</span><span className="text-gray-400">-</span><span className="font-mono text-sm">{vendor?.number || ins.spotId}</span></div>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-1">{ins.description}</div>
                      <div className="text-xs text-gray-400 mt-1">巡查时间: {new Date(ins.createTime).toLocaleDateString('zh-CN')}</div>
                    </div>
                  </div>
                );
              })}
              {overdueRectifications.length === 0 && <div className="text-center text-gray-400 py-8">暂无逾期记录</div>}
            </div>
          </Card>
        </Col>
      </Row>

      <Modal title={<div className="flex items-center gap-2"><MapPin size={20} className="text-accent" /><span>{selectedAreaDetail?.name} - 区域风险详情</span></div>} open={detailModalVisible} onCancel={() => setDetailModalVisible(false)} footer={null} width={900}>
        {selectedAreaDetail && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-blue-600">{vendors.filter(v => v.areaId === selectedAreaDetail.id).length}</div><div className="text-sm text-gray-600">摊位总数</div></div>
              <div className="bg-orange-50 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-orange-600">{selectedAreaInspections.length}</div><div className="text-sm text-gray-600">巡查总次数</div></div>
              <div className="bg-red-50 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-red-600">{selectedAreaInspections.filter(ins => ins.rectStatus !== 'completed').length}</div><div className="text-sm text-gray-600">未整改次数</div></div>
              <div className="bg-green-50 p-4 rounded-lg text-center"><div className="text-2xl font-bold text-green-600">{selectedAreaInspections.filter(ins => ins.rectStatus === 'completed').length}</div><div className="text-sm text-gray-600">已完成整改</div></div>
            </div>
            <div>
              <h4 className="font-medium mb-3">违规类型分布</h4>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(issueTypeLabels).map(([key, { label, color }]) => {
                  const count = selectedAreaInspections.filter(ins => ins.issueType === key).length;
                  return (<div key={key} className="bg-gray-50 p-3 rounded-lg text-center"><Tag color={color} className="mb-2">{label}</Tag><div className="text-xl font-bold">{count}</div><div className="text-xs text-gray-500">次</div></div>);
                })}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">未整改记录（点击展开查看详情）</h4>
              <Table
                columns={areaDetailColumns}
                dataSource={selectedAreaInspections.filter(ins => ins.rectStatus !== 'completed')}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                size="small"
                expandable={{
                  expandedRowRender,
                  expandedRowKeys: expandedRow ? [expandedRow] : [],
                  onExpand: (expanded, record) => {
                    setExpandedRow(expanded ? record.id : null);
                  },
                }}
              />
            </div>
            <div>
              <h4 className="font-medium mb-3">相关摊位</h4>
              <div className="flex flex-wrap gap-2">
                {vendors.filter(v => v.areaId === selectedAreaDetail.id).map(vendor => {
                  const vendorInspections = inspections.filter(ins => ins.spotId === vendor.id && ins.rectStatus !== 'completed');
                  return (<Tag key={vendor.id} color={vendorInspections.length > 0 ? 'red' : 'green'} className="px-3 py-1">{vendor.number} {vendorInspections.length > 0 && ` (${vendorInspections.length}次违规)`}</Tag>);
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal title={<div className="flex items-center gap-2"><AlertTriangle size={20} className="text-orange-500" /><span>整改跟进视图</span></div>} open={followUpVisible} onCancel={() => setFollowUpVisible(false)} footer={null} width={1100}>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2"><Filter size={16} className="text-gray-400" /><span className="text-sm font-medium">筛选条件：</span></div>
            <Space wrap>
              <Input placeholder="搜索摊位/负责人/区域" prefix={<Search size={14} />} value={followUpFilter.search || ''} onChange={(e) => setFollowUpFilter({ ...followUpFilter, search: e.target.value })} className="w-48" allowClear />
              <Select placeholder="所属区域" value={followUpFilter.areaId || ''} onChange={(v) => setFollowUpFilter({ ...followUpFilter, areaId: v || undefined })} options={[{ label: '全部区域', value: '' }, ...areas.map(a => ({ label: a.name, value: a.id }))]} className="w-36" allowClear />
              <Select placeholder="超期天数" value={followUpFilter.maxDays || undefined} onChange={(v) => setFollowUpFilter({ ...followUpFilter, maxDays: v || undefined })} options={[{ label: '不限', value: undefined as any }, { label: '3天内', value: 3 }, { label: '7天内', value: 7 }, { label: '15天内', value: 15 }]} className="w-28" allowClear />
              <Button onClick={() => setFollowUpFilter({})}>重置</Button>
            </Space>
          </div>
          <div className="mt-2 text-sm text-gray-500">共 {pendingRectifications.length} 条待整改记录</div>
        </div>
        <Table columns={followUpColumns} dataSource={pendingRectifications} rowKey="id" pagination={{ pageSize: 10 }} size="small" expandable={{ expandedRowRender, expandedRowKeys: expandedRow ? [expandedRow] : [], onExpand: (expanded, record) => { setExpandedRow(expanded ? record.id : null); } }} />
      </Modal>
    </div>
  );
};
