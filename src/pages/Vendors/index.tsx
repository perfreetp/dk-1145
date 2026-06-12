import { useState, useMemo } from 'react';
import { Card, Table, Button, Input, Select, Tag, Space, Modal, Form, message, Popconfirm, Drawer, Descriptions, Image, Timeline, Empty } from 'antd';
import { Plus, Search, Edit2, Trash2, Clock, Phone, User, Eye, FileText, AlertTriangle, CheckCircle, XCircle, RefreshCw, MapPin } from 'lucide-react';
import { useVendorStore, useAreaStore, useApplicationStore, useInspectionStore } from '../../stores';
import { Vendor, VendorStatus, Application, Inspection } from '../../types';
import { StatusBadge } from '../../components/common';

const statusOptions = [
  { label: '全部状态', value: '' },
  { label: '空闲', value: 'vacant' },
  { label: '已占用', value: 'occupied' },
  { label: '维护中', value: 'maintenance' },
];

const categoryOptions = [
  { label: '全部品类', value: '' },
  { label: '餐饮', value: '餐饮' },
  { label: '服装', value: '服装' },
  { label: '饰品', value: '饰品' },
  { label: '玩具', value: '玩具' },
  { label: '水果', value: '水果' },
  { label: '蔬菜', value: '蔬菜' },
  { label: '小吃', value: '小吃' },
  { label: '手工艺品', value: '手工艺品' },
];

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

export const Vendors = () => {
  const { vendors, addVendor, updateVendor, deleteVendor, filter, setFilter } = useVendorStore();
  const { areas } = useAreaStore();
  const { applications } = useApplicationStore();
  const { inspections } = useInspectionStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form] = Form.useForm();
  const [timelineFilter, setTimelineFilter] = useState<string[]>([]);

  const filteredVendors = useMemo(() => {
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
  }, [vendors, filter]);

  const getVendorDetail = (vendor: Vendor) => {
    const relatedApplication = applications.find(app => app.id === vendor.applicationId);
    const vendorInspections = inspections.filter(ins => ins.spotId === vendor.id);
    return { relatedApplication, vendorInspections };
  };

  const handleAdd = () => {
    setEditingVendor(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    form.setFieldsValue({
      number: vendor.number,
      areaId: vendor.areaId,
      status: vendor.status,
      category: vendor.category,
      businessHours: vendor.businessHours,
      responsible: vendor.responsible,
      expireDate: vendor.expireDate,
    });
    setModalVisible(true);
  };

  const handleViewDetail = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setDetailDrawerVisible(true);
  };

  const handleDelete = (id: string) => {
    deleteVendor(id);
    message.success('摊位已删除');
  };

  const handleFinish = (values: any) => {
    if (editingVendor) {
      updateVendor(editingVendor.id, values);
      message.success('摊位已更新');
    } else {
      addVendor({
        number: values.number,
        areaId: values.areaId,
        status: values.status || 'vacant',
        category: values.category || [],
        businessHours: values.businessHours || { start: '08:00', end: '22:00' },
        responsible: values.responsible || { name: '', phone: '', idCard: '' },
        expireDate: values.expireDate,
      });
      message.success('摊位已添加');
    }
    setModalVisible(false);
    form.resetFields();
  };

  const columns = [
    {
      title: '摊位编号',
      dataIndex: 'number',
      key: 'number',
      width: 120,
      render: (text: string, record: Vendor) => (
        <Button type="link" onClick={() => handleViewDetail(record)} className="font-mono font-medium text-primary p-0">
          {text}
        </Button>
      ),
    },
    {
      title: '区域',
      dataIndex: 'areaId',
      key: 'areaId',
      width: 120,
      render: (areaId: string) => {
        const area = areas.find((a) => a.id === areaId);
        return area?.name || '-';
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: VendorStatus) => <StatusBadge status={status} />,
    },
    {
      title: '经营品类',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (categories: string[]) => (
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <Tag key={cat} color="blue">{cat}</Tag>
          ))}
        </div>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'responsible',
      key: 'responsible',
      width: 180,
      render: (responsible: { name: string; phone: string }, record: Vendor) => (
        <div>
          {responsible.name ? (
            <Button type="link" onClick={() => handleViewDetail(record)} className="p-0 h-auto">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm">
                  <User size={14} className="text-gray-400" />
                  <span>{responsible.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone size={14} />
                  <span>{responsible.phone}</span>
                </div>
              </div>
            </Button>
          ) : (
            <span className="text-gray-400">未分配</span>
          )}
        </div>
      ),
    },
    {
      title: '申请来源',
      dataIndex: 'applicationId',
      key: 'applicationId',
      width: 120,
      render: (applicationId: string, record: Vendor) => {
        if (!applicationId) return <span className="text-gray-400">-</span>;
        const relatedApp = applications.find(app => app.id === applicationId);
        return (
          <Tag color="green" icon={<FileText size={12} />}>
            {relatedApp?.vendorName || applicationId}
          </Tag>
        );
      },
    },
    {
      title: '到期日期',
      dataIndex: 'expireDate',
      key: 'expireDate',
      width: 120,
      render: (date: string) => {
        if (!date) return '-';
        const now = new Date();
        const expire = new Date(date);
        const daysLeft = Math.ceil((expire.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return (
          <Tag color={daysLeft <= 3 ? 'red' : daysLeft <= 7 ? 'orange' : 'green'}>
            {date}
          </Tag>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: Vendor) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleViewDetail(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<Edit2 size={14} />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，确定要删除吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const { relatedApplication, vendorInspections } = editingVendor ? getVendorDetail(editingVendor) : { relatedApplication: null, vendorInspections: [] };

  const generateTimelineData = () => {
    if (!editingVendor) return [];

    const timeline: any[] = [];

    if (relatedApplication) {
      timeline.push({
        id: `app-submit-${relatedApplication.id}`,
        type: 'application',
        title: '提交入驻申请',
        description: `${relatedApplication.vendorName} 提交了入驻申请`,
        time: new Date(relatedApplication.createTime),
        color: 'blue',
        icon: <FileText size={16} />,
        details: {
          category: relatedApplication.category,
          businessDesc: relatedApplication.businessDesc,
          photos: relatedApplication.idCardPhoto,
        },
      });

      if (relatedApplication.status === 'approved') {
        timeline.push({
          id: `app-approve-${relatedApplication.id}`,
          type: 'approve',
          title: '审核通过',
          description: `申请已通过，分配摊位 ${relatedApplication.assignedSpot || ''}`,
          time: new Date(new Date(relatedApplication.createTime).getTime() + 2 * 24 * 60 * 60 * 1000),
          color: 'green',
          icon: <CheckCircle size={16} />,
          details: {
            spotNumber: relatedApplication.assignedSpot,
            spotId: relatedApplication.assignedSpotId,
          },
        });
      } else if (relatedApplication.status === 'rejected') {
        timeline.push({
          id: `app-reject-${relatedApplication.id}`,
          type: 'reject',
          title: '审核拒绝',
          description: relatedApplication.rejectReason || '申请未通过审核',
          time: new Date(new Date(relatedApplication.createTime).getTime() + 2 * 24 * 60 * 60 * 1000),
          color: 'red',
          icon: <XCircle size={16} />,
          details: {
            reason: relatedApplication.rejectReason,
          },
        });
      }
    }

    vendorInspections
      .sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime())
      .forEach((ins) => {
        timeline.push({
          id: `inspection-${ins.id}`,
          type: 'inspection',
          title: '巡查记录',
          description: `${issueTypeLabels[ins.issueType]?.label || ins.issueType} - ${ins.description}`,
          time: new Date(ins.createTime),
          color: ins.rectStatus === 'completed' ? 'green' : ins.rectStatus === 'overdue' ? 'red' : 'orange',
          icon: <AlertTriangle size={16} />,
          details: {
            issueType: ins.issueType,
            severity: ins.severity,
            rectDeadline: ins.rectDeadline,
            rectStatus: ins.rectStatus,
            inspector: ins.inspector,
            photos: ins.photos,
          },
        });

        if (ins.rectStatus === 'completed') {
          const rectTime = ins.rectDeadline
            ? new Date(new Date(ins.rectDeadline).getTime() - 1 * 24 * 60 * 60 * 1000)
            : new Date(new Date(ins.createTime).getTime() + 3 * 24 * 60 * 60 * 1000);

          timeline.push({
            id: `rect-complete-${ins.id}`,
            type: 'rectification',
            title: '整改完成',
            description: '已完成问题整改',
            time: rectTime,
            color: 'green',
            icon: <CheckCircle size={16} />,
            details: {
              originalInspectionId: ins.id,
            },
          });
        }
      });

    return timeline.sort((a, b) => a.time.getTime() - b.time.getTime());
  };

  const timelineData = editingVendor ? generateTimelineData() : [];

  const filteredTimelineData = useMemo(() => {
    if (timelineFilter.length === 0) return timelineData;
    return timelineData.filter(item => timelineFilter.includes(item.type));
  }, [timelineData, timelineFilter]);

  const renderTimelineItem = (item: any) => {
    return (
      <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="flex items-start gap-3">
          <div className="mt-1">{item.icon}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-900">{item.title}</span>
              <span className="text-xs text-gray-400">
                {item.time.toLocaleDateString('zh-CN')}
              </span>
            </div>
            <div className="text-sm text-gray-600 mb-2">{item.description}</div>

            {item.details && (
              <div className="bg-white p-3 rounded border border-gray-200">
                {item.type === 'application' && (
                  <>
                    <div className="text-sm mb-1">
                      <span className="text-gray-500">申请品类：</span>
                      <Tag color="blue">{item.details.category}</Tag>
                    </div>
                    {item.details.photos && item.details.photos.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">证件照片：</span>
                        <Image.PreviewGroup>
                          <div className="flex gap-1 mt-1">
                            {item.details.photos.map((photo: string, idx: number) => (
                              <Image
                                key={idx}
                                src={photo}
                                width={60}
                                height={60}
                                className="rounded object-cover"
                                style={{ objectFit: 'cover' }}
                              />
                            ))}
                          </div>
                        </Image.PreviewGroup>
                      </div>
                    )}
                  </>
                )}

                {item.type === 'approve' && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-green-500" />
                    <span className="text-sm font-mono">{item.details.spotNumber}</span>
                  </div>
                )}

                {item.type === 'reject' && item.details.reason && (
                  <div className="text-sm text-red-600">{item.details.reason}</div>
                )}

                {item.type === 'inspection' && (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">问题类型：</span>
                        <Tag color={issueTypeLabels[item.details.issueType]?.color}>
                          {issueTypeLabels[item.details.issueType]?.label}
                        </Tag>
                      </div>
                      <div>
                        <span className="text-gray-500">严重程度：</span>
                        <Tag color={severityLabels[item.details.severity]?.color}>
                          {severityLabels[item.details.severity]?.label}
                        </Tag>
                      </div>
                    </div>
                    {item.details.rectDeadline && (
                      <div className="text-sm mt-1">
                        <span className="text-gray-500">整改期限：</span>
                        <span className="font-mono">{item.details.rectDeadline}</span>
                      </div>
                    )}
                    <div className="text-sm mt-1">
                      <span className="text-gray-500">巡查员：</span>
                      {item.details.inspector}
                    </div>
                    {item.details.photos && item.details.photos.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500">巡查照片：</span>
                        <div className="flex gap-1 mt-1">
                          {item.details.photos.map((photo: string, idx: number) => (
                            <img
                              key={idx}
                              src={photo}
                              alt={`巡查照片 ${idx + 1}`}
                              className="w-16 h-16 rounded object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {item.type === 'rectification' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle size={14} />
                    <span className="text-sm">已完成整改</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">摊位列表</h1>
          <p className="text-gray-500 mt-1">管理所有摊位信息和状态</p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleAdd}
          className="bg-accent hover:!bg-accent-600"
        >
          新增摊位
        </Button>
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="搜索摊位编号或负责人..."
            prefix={<Search size={16} className="text-gray-400" />}
            value={filter.search || ''}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-64"
          />
          <Select
            value={filter.status || ''}
            onChange={(value) => setFilter({ ...filter, status: (value || undefined) as VendorStatus | undefined })}
            options={statusOptions}
            className="w-32"
          />
          <Select
            value={filter.areaId || ''}
            onChange={(value) => setFilter({ ...filter, areaId: value || undefined })}
            options={[
              { label: '全部区域', value: '' },
              ...areas.map((area) => ({ label: area.name, value: area.id })),
            ]}
            className="w-40"
          />
          <Select
            value={filter.category || ''}
            onChange={(value) => setFilter({ ...filter, category: value || undefined })}
            options={categoryOptions}
            className="w-32"
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredVendors}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={editingVendor ? '编辑摊位' : '新增摊位'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="摊位编号"
              name="number"
              rules={[{ required: true, message: '请输入摊位编号' }]}
            >
              <Input placeholder="例如: 001-01" />
            </Form.Item>
            <Form.Item
              label="所属区域"
              name="areaId"
              rules={[{ required: true, message: '请选择所属区域' }]}
            >
              <Select placeholder="请选择区域">
                {areas.map((area) => (
                  <Select.Option key={area.id} value={area.id}>
                    {area.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="状态" name="status" initialValue="vacant">
              <Select>
                <Select.Option value="vacant">空闲</Select.Option>
                <Select.Option value="occupied">已占用</Select.Option>
                <Select.Option value="maintenance">维护中</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="经营品类" name="category">
              <Select mode="multiple" placeholder="请选择品类">
                {categoryOptions.slice(1).map((opt) => (
                  <Select.Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="开始时间" name={['businessHours', 'start']} initialValue="08:00">
              <Input type="time" />
            </Form.Item>
            <Form.Item label="结束时间" name={['businessHours', 'end']} initialValue="22:00">
              <Input type="time" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item label="负责人姓名" name={['responsible', 'name']}>
              <Input placeholder="姓名" />
            </Form.Item>
            <Form.Item label="联系电话" name={['responsible', 'phone']}>
              <Input placeholder="手机号" />
            </Form.Item>
            <Form.Item label="身份证号" name={['responsible', 'idCard']}>
              <Input placeholder="身份证号" />
            </Form.Item>
          </div>

          <Form.Item label="到期日期" name="expireDate">
            <Input type="date" />
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex gap-2 justify-end">
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit" className="bg-accent">
                {editingVendor ? '保存' : '创建'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={<div className="flex items-center gap-2">摊位详情 <span className="font-mono text-accent">{editingVendor?.number}</span></div>}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
        width={700}
      >
        {editingVendor && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">基本信息</h3>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="摊位编号">
                  <span className="font-mono font-medium">{editingVendor.number}</span>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <StatusBadge status={editingVendor.status} />
                </Descriptions.Item>
                <Descriptions.Item label="所属区域">
                  {areas.find(a => a.id === editingVendor.areaId)?.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="经营品类">
                  {editingVendor.category.map(cat => (
                    <Tag key={cat} color="blue" className="mr-1">{cat}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="经营时段">
                  {editingVendor.businessHours.start} - {editingVendor.businessHours.end}
                </Descriptions.Item>
                <Descriptions.Item label="到期日期">
                  {editingVendor.expireDate || '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">负责人信息</h3>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="姓名">
                  {editingVendor.responsible.name || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="联系电话">
                  {editingVendor.responsible.phone || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="身份证号" span={2}>
                  {editingVendor.responsible.idCard || '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">申请来源</h3>
              {relatedApplication ? (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <User size={20} className="text-blue-600" />
                    <div>
                      <div className="font-medium">{relatedApplication.vendorName}</div>
                      <div className="text-sm text-gray-500">{relatedApplication.vendorPhone}</div>
                    </div>
                    <StatusBadge status={relatedApplication.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">申请品类：</span>
                      <Tag color="blue">{relatedApplication.category}</Tag>
                    </div>
                    <div>
                      <span className="text-gray-500">申请时间：</span>
                      {new Date(relatedApplication.createTime).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="text-gray-500">经营说明：</span>
                    <div className="mt-1 text-gray-700">{relatedApplication.businessDesc}</div>
                  </div>
                  {relatedApplication.idCardPhoto && relatedApplication.idCardPhoto.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-500 text-sm">证件照片：</span>
                      <Image.PreviewGroup>
                        <div className="flex gap-2 mt-1">
                          {relatedApplication.idCardPhoto.map((photo, index) => (
                            <Image key={index} src={photo} width={80} height={80} className="rounded object-cover" style={{ objectFit: 'cover' }} />
                          ))}
                        </div>
                      </Image.PreviewGroup>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">暂无申请来源信息</div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">巡查记录</h3>
              {vendorInspections.length > 0 ? (
                <Timeline
                  items={vendorInspections.slice(0, 5).map((ins) => ({
                    color: ins.rectStatus === 'completed' ? 'green' : ins.rectStatus === 'overdue' ? 'red' : 'blue',
                    children: (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag color={issueTypeLabels[ins.issueType]?.color}>{issueTypeLabels[ins.issueType]?.label}</Tag>
                          <Tag color={severityLabels[ins.severity]?.color}>{severityLabels[ins.severity]?.label}</Tag>
                          <StatusBadge status={ins.rectStatus} />
                        </div>
                        <div className="text-sm text-gray-600">{ins.description}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          巡查时间：{new Date(ins.createTime).toLocaleDateString('zh-CN')} | 巡查员：{ins.inspector}
                        </div>
                        {ins.photos && ins.photos.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {ins.photos.map((photo, idx) => (
                              <img key={idx} src={photo} alt={`巡查照片 ${idx + 1}`} className="w-16 h-16 rounded object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              ) : (
                <div className="text-gray-400 text-center py-8">暂无巡查记录</div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                历史时间线
                <span className="text-sm text-gray-400 font-normal ml-2">
                  ({filteredTimelineData.length}条记录)
                </span>
              </h3>
              <div className="mb-3 flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500">筛选：</span>
                <Button
                  size="small"
                  type={timelineFilter.includes('application') ? 'primary' : 'default'}
                  onClick={() => {
                    setTimelineFilter(prev =>
                      prev.includes('application')
                        ? prev.filter(t => t !== 'application')
                        : [...prev, 'application']
                    );
                  }}
                  className={timelineFilter.includes('application') ? 'bg-blue-500' : ''}
                >
                  <FileText size={12} className="mr-1" />
                  申请
                </Button>
                <Button
                  size="small"
                  type={timelineFilter.includes('approve') || timelineFilter.includes('reject') ? 'primary' : 'default'}
                  onClick={() => {
                    setTimelineFilter(prev => {
                      const hasApprove = prev.includes('approve');
                      const hasReject = prev.includes('reject');
                      let newFilter = [...prev];
                      if (hasApprove) newFilter = newFilter.filter(t => t !== 'approve');
                      if (hasReject) newFilter = newFilter.filter(t => t !== 'reject');
                      if (!hasApprove && !hasReject) {
                        newFilter = [...newFilter, 'approve', 'reject'];
                      }
                      return newFilter;
                    });
                  }}
                  className={timelineFilter.includes('approve') || timelineFilter.includes('reject') ? 'bg-green-500' : ''}
                >
                  审核
                </Button>
                <Button
                  size="small"
                  type={timelineFilter.includes('inspection') ? 'primary' : 'default'}
                  onClick={() => {
                    setTimelineFilter(prev =>
                      prev.includes('inspection')
                        ? prev.filter(t => t !== 'inspection')
                        : [...prev, 'inspection']
                    );
                  }}
                  className={timelineFilter.includes('inspection') ? 'bg-orange-500' : ''}
                >
                  <AlertTriangle size={12} className="mr-1" />
                  巡查
                </Button>
                <Button
                  size="small"
                  type={timelineFilter.includes('rectification') ? 'primary' : 'default'}
                  onClick={() => {
                    setTimelineFilter(prev =>
                      prev.includes('rectification')
                        ? prev.filter(t => t !== 'rectification')
                        : [...prev, 'rectification']
                    );
                  }}
                  className={timelineFilter.includes('rectification') ? 'bg-green-500' : ''}
                >
                  <CheckCircle size={12} className="mr-1" />
                  整改
                </Button>
                {timelineFilter.length > 0 && (
                  <Button size="small" onClick={() => setTimelineFilter([])}>
                    清除筛选
                  </Button>
                )}
              </div>
              {filteredTimelineData.length > 0 ? (
                <div className="space-y-3">
                  {filteredTimelineData.map((item, index) => (
                    <div key={item.id} className="relative pl-6 pb-4 border-l-2 border-gray-200 last:border-l-transparent">
                      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full border-2 border-white" style={{ backgroundColor: ['#1890ff', '#52c41a', '#faad14', '#ff4d4f'][index % 4] }} />
                      {renderTimelineItem(item)}
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="暂无符合条件的记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
