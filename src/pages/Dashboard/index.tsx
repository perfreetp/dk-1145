import { useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Progress } from 'antd';
import {
  Store,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
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
} from 'recharts';
import { useVendorStore, useInspectionStore, useApplicationStore } from '../../stores';

const COLORS = ['#10B981', '#F97316', '#EF4444', '#3B82F6'];

export const Dashboard = () => {
  const { vendors, getFilteredVendors } = useVendorStore();
  const { inspections, getStatistics } = useInspectionStore();
  const { applications } = useApplicationStore();

  const statistics = useMemo(() => {
    const vendorStats = {
      total: vendors.length,
      vacant: vendors.filter((v) => v.status === 'vacant').length,
      occupied: vendors.filter((v) => v.status === 'occupied').length,
      maintenance: vendors.filter((v) => v.status === 'maintenance').length,
    };

    const inspectionStats = getStatistics();

    const appStats = {
      total: applications.length,
      pending: applications.filter((a) => a.status === 'pending').length,
      approved: applications.filter((a) => a.status === 'approved').length,
      rejected: applications.filter((a) => a.status === 'rejected').length,
    };

    return { vendorStats, inspectionStats, appStats };
  }, [vendors, inspections, applications, getStatistics]);

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

  const columns = [
    {
      title: '摊位编号',
      dataIndex: 'number',
      key: 'number',
    },
    {
      title: '负责人',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: any) => record.responsible?.name || '-',
    },
    {
      title: '到期日期',
      dataIndex: 'expireDate',
      key: 'expireDate',
    },
    {
      title: '剩余天数',
      key: 'daysLeft',
      render: (_: any, record: any) => {
        const now = new Date();
        const expire = new Date(record.expireDate);
        const daysLeft = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <Tag color={daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'orange' : 'green'}>
            {daysLeft}天
          </Tag>
        );
      },
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">数据看板</h1>
          <p className="text-gray-500 mt-1">实时监控摆摊区域运营状况</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar size={16} />
          <span>{new Date().toLocaleDateString('zh-CN')}</span>
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="总摊位数"
              value={statistics.vendorStats.total}
              prefix={<Store className="text-primary" size={24} />}
              valueStyle={{ color: '#1E3A5F' }}
            />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-success" />
              <span className="text-success">+5</span>
              <span className="text-gray-400">较上月</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="空闲摊位"
              value={statistics.vendorStats.vacant}
              prefix={<CheckCircle className="text-success" size={24} />}
              styles={{ content: { color: '#10B981' } }}
            />
            <div className="mt-2">
              <Progress
                percent={Math.round((statistics.vendorStats.vacant / statistics.vendorStats.total) * 100)}
                showInfo={false}
                strokeColor="#10B981"
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="待处理整改"
              value={statistics.inspectionStats.pending + statistics.inspectionStats.overdue}
              prefix={<AlertCircle className="text-warning" size={24} />}
              valueStyle={{ color: '#EF4444' }}
            />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <TrendingDown size={16} className="text-success" />
              <span className="text-success">-3</span>
              <span className="text-gray-400">较上周</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="hover:shadow-lg transition-shadow">
            <Statistic
              title="待审核申请"
              value={statistics.appStats.pending}
              prefix={<Clock className="text-accent" size={24} />}
              styles={{ content: { color: '#F97316' } }}
            />
            <div className="mt-2 flex items-center gap-2 text-sm">
              <TrendingUp size={16} className="text-accent" />
              <span className="text-accent">+2</span>
              <span className="text-gray-400">新申请</span>
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
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="巡查次数"
                  stroke="#1E3A5F"
                  fill="#1E3A5F"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="违规次数"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="摊位状态分布" className="h-full">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={vendorStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vendorStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {vendorStatusData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
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
          <Card
            title={
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-warning" />
                <span>即将到期提醒</span>
                <Tag color="red">{expiringVendors.length}个</Tag>
              </div>
            }
          >
            <Table
              columns={columns}
              dataSource={expiringVendors}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-warning" />
                <span>逾期未整改</span>
                <Tag color="red">{overdueRectifications.length}条</Tag>
              </div>
            }
          >
            <div className="space-y-3">
              {overdueRectifications.slice(0, 5).map((ins) => (
                <div
                  key={ins.id}
                  className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <AlertCircle size={20} className="text-warning mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      摊位 {ins.spotId}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{ins.description}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      巡查时间: {new Date(ins.createTime).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
