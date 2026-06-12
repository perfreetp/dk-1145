import { useState, useMemo } from 'react';
import { Card, Table, Button, Input, Select, Tag, Space, Modal, Form, message, Popconfirm } from 'antd';
import { Plus, Search, Edit2, Trash2, Clock, Phone, User } from 'lucide-react';
import { useVendorStore, useAreaStore } from '../../stores';
import { Vendor, VendorStatus } from '../../types';
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

export const Vendors = () => {
  const { vendors, addVendor, updateVendor, deleteVendor, filter, setFilter } = useVendorStore();
  const { areas } = useAreaStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [form] = Form.useForm();

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
      render: (text: string) => (
        <span className="font-mono font-medium text-primary">{text}</span>
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
      title: '经营时段',
      dataIndex: 'businessHours',
      key: 'businessHours',
      width: 120,
      render: (hours: { start: string; end: string }) => (
        <span className="text-sm">
          {hours.start} - {hours.end}
        </span>
      ),
    },
    {
      title: '负责人',
      dataIndex: 'responsible',
      key: 'responsible',
      width: 180,
      render: (responsible: { name: string; phone: string }) => (
        <div className="space-y-1">
          {responsible.name && (
            <div className="flex items-center gap-2 text-sm">
              <User size={14} className="text-gray-400" />
              <span>{responsible.name}</span>
            </div>
          )}
          {responsible.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Phone size={14} />
              <span>{responsible.phone}</span>
            </div>
          )}
        </div>
      ),
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
            onChange={(value) => setFilter({ ...filter, status: value || undefined })}
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
    </div>
  );
};
