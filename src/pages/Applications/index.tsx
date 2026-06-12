import { useState, useMemo, useEffect } from 'react';
import { Card, Tabs, Button, Empty, Modal, Form, Input, Select, Tag, message, Image, Upload, DatePicker, Space, Drawer } from 'antd';
import { Check, X, Eye, User, Phone, IdCard, FileText, Plus, Camera, Filter, RefreshCw } from 'lucide-react';
import { useApplicationStore, useVendorStore } from '../../stores';
import { Application, ApplicationStatus } from '../../types';
import { StatusBadge } from '../../components/common';
import type { UploadProps } from 'antd';
import dayjs from 'dayjs';

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

export const Applications = () => {
  const { applications, approveApplication, rejectApplication, submitApplication } = useApplicationStore();
  const { vendors, updateVendor } = useVendorStore();
  const [detailVisible, setDetailVisible] = useState(false);
  const [rejectVisible, setRejectVisible] = useState(false);
  const [approveVisible, setApproveVisible] = useState(false);
  const [submitVisible, setSubmitVisible] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [form] = Form.useForm();
  const [submitForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>('pending');
  const [filterForm] = Form.useForm();

  const [filter, setFilter] = useState<{
    category?: string;
    search?: string;
    dateRange?: [string, string];
  }>({});

  const filteredApplications = useMemo(() => {
    let filtered = [...applications];
    
    if (filter.category) {
      filtered = filtered.filter(app => app.category === filter.category);
    }
    
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(app => 
        app.vendorName.toLowerCase().includes(searchLower) ||
        app.vendorPhone.includes(searchLower)
      );
    }
    
    if (filter.dateRange && filter.dateRange[0] && filter.dateRange[1]) {
      const startDate = new Date(filter.dateRange[0]);
      const endDate = new Date(filter.dateRange[1]);
      filtered = filtered.filter(app => {
        const appDate = new Date(app.createTime);
        return appDate >= startDate && appDate <= endDate;
      });
    }
    
    if (activeTab !== 'all') {
      filtered = filtered.filter(app => app.status === activeTab);
    }
    
    return filtered.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  }, [applications, filter, activeTab]);

  const groupedApplications = useMemo(() => {
    return {
      pending: filteredApplications.filter((app) => app.status === 'pending'),
      approved: filteredApplications.filter((app) => app.status === 'approved'),
      rejected: filteredApplications.filter((app) => app.status === 'rejected'),
    };
  }, [filteredApplications]);

  const vacantVendors = useMemo(() => {
    return vendors.filter((v) => v.status === 'vacant');
  }, [vendors]);

  const handleViewDetail = (app: Application) => {
    setSelectedApp(app);
    setDetailVisible(true);
  };

  const handleApprove = (app: Application) => {
    setSelectedApp(app);
    form.setFieldsValue({ assignedSpot: undefined });
    if (vacantVendors.length === 0) {
      message.error('没有可分配的空闲摊位');
      return;
    }
    setApproveVisible(true);
  };

  const handleReject = (app: Application) => {
    setSelectedApp(app);
    setRejectVisible(true);
  };

  const handleApproveConfirm = () => {
    form.validateFields().then((values) => {
      if (selectedApp) {
        const selectedVendor = vendors.find((v) => v.number === values.assignedSpot);
        
        updateVendor(selectedVendor!.id, {
          status: 'occupied',
          responsible: {
            name: selectedApp.vendorName,
            phone: selectedApp.vendorPhone,
            idCard: selectedApp.idCard,
          },
          category: [selectedApp.category],
          applicationId: selectedApp.id,
        });

        approveApplication(selectedApp.id, values.assignedSpot);
        message.success('申请已通过，已自动分配摊位并更新摊位状态');
        setApproveVisible(false);
        form.resetFields();
      }
    });
  };

  const handleRejectConfirm = () => {
    form.validateFields().then((values) => {
      if (selectedApp) {
        rejectApplication(selectedApp.id, values.rejectReason);
        message.success('申请已拒绝');
        setRejectVisible(false);
        form.resetFields();
      }
    });
  };

  const handleSubmitApplication = () => {
    submitForm.validateFields().then((values) => {
      const photoFiles = submitForm.getFieldValue('idCardPhoto') || [];
      
      if (photoFiles.length === 0) {
        message.error('请上传至少一张证件照片');
        return;
      }
      
      const photoUrls = photoFiles.map((file: any) => {
        if (file.response?.url) return file.response.url;
        if (file.url) return file.url;
        if (file.originFileObj) {
          return URL.createObjectURL(file.originFileObj);
        }
        return file;
      }).filter((url: string) => url);

      if (photoUrls.length === 0) {
        message.error('请上传至少一张证件照片');
        return;
      }

      submitApplication({
        vendorName: values.vendorName,
        vendorPhone: values.vendorPhone,
        idCard: values.idCard,
        idCardPhoto: photoUrls,
        businessDesc: values.businessDesc,
        category: values.category,
      });

      message.success('申请已提交，请等待审核');
      setSubmitVisible(false);
      submitForm.resetFields();
    });
  };

  const handleResetFilter = () => {
    setFilter({});
    filterForm.resetFields();
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件');
        return false;
      }
      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片大小不能超过5MB');
        return false;
      }
      return true;
    },
    listType: 'picture-card',
    maxCount: 3,
  };

  const renderApplicationCard = (app: Application, showActions = false) => (
    <Card
      key={app.id}
      className="mb-4 hover:shadow-lg transition-shadow animate-slide-up cursor-pointer"
      bodyStyle={{ padding: '16px' }}
      onClick={() => handleViewDetail(app)}
    >
      <div className="flex gap-4">
        <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <User size={32} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-gray-900 m-0">{app.vendorName}</h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Phone size={14} />
                  {app.vendorPhone}
                </span>
                <Tag color="blue">{app.category}</Tag>
              </div>
            </div>
            <div className="text-right">
              <StatusBadge status={app.status} />
              <div className="text-xs text-gray-400 mt-1">
                {new Date(app.createTime).toLocaleDateString('zh-CN')}
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{app.businessDesc}</p>
          {showActions && app.status === 'pending' && (
            <div className="flex gap-2 mt-3 justify-end" onClick={(e) => e.stopPropagation()}>
              <Button
                size="small"
                type="primary"
                icon={<Check size={14} />}
                onClick={() => handleApprove(app)}
                className="bg-success hover:!bg-green-600"
              >
                通过
              </Button>
              <Button
                size="small"
                danger
                icon={<X size={14} />}
                onClick={() => handleReject(app)}
              >
                拒绝
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const tabItems = [
    {
      key: 'pending',
      label: (
        <span className="flex items-center gap-2">
          待审核
          {groupedApplications.pending.length > 0 && (
            <Tag color="orange">{groupedApplications.pending.length}</Tag>
          )}
        </span>
      ),
      children: (
        <div>
          {groupedApplications.pending.length > 0 ? (
            groupedApplications.pending.map((app) => renderApplicationCard(app, true))
          ) : (
            <Empty description="暂无待审核申请" />
          )}
        </div>
      ),
    },
    {
      key: 'approved',
      label: (
        <span className="flex items-center gap-2">
          已通过
          <Tag color="green">{groupedApplications.approved.length}</Tag>
        </span>
      ),
      children: (
        <div>
          {groupedApplications.approved.length > 0 ? (
            groupedApplications.approved.map((app) => renderApplicationCard(app, false))
          ) : (
            <Empty description="暂无已通过申请" />
          )}
        </div>
      ),
    },
    {
      key: 'rejected',
      label: (
        <span className="flex items-center gap-2">
          已拒绝
          <Tag color="red">{groupedApplications.rejected.length}</Tag>
        </span>
      ),
      children: (
        <div>
          {groupedApplications.rejected.length > 0 ? (
            groupedApplications.rejected.map((app) => renderApplicationCard(app, false))
          ) : (
            <Empty description="暂无已拒绝申请" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">申请审核</h1>
          <p className="text-gray-500 mt-1">管理摊主入驻申请</p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={() => setSubmitVisible(true)}
          className="bg-accent hover:!bg-accent-600"
        >
          提交申请
        </Button>
      </div>

      <Card>
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium">筛选条件：</span>
            </div>
            <Space wrap>
              <Input
                placeholder="搜索申请人/电话"
                prefix={<User size={14} className="text-gray-400" />}
                value={filter.search || ''}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="w-48"
                allowClear
              />
              <Select
                placeholder="经营品类"
                value={filter.category || ''}
                onChange={(value) => setFilter({ ...filter, category: value || undefined })}
                options={categoryOptions}
                className="w-32"
                allowClear
              />
              <DatePicker.RangePicker
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setFilter({
                      ...filter,
                      dateRange: [
                        dates[0].startOf('day').toISOString(),
                        dates[1].endOf('day').toISOString(),
                      ],
                    });
                  } else {
                    setFilter({ ...filter, dateRange: undefined });
                  }
                }}
                className="w-64"
              />
              <Button
                icon={<RefreshCw size={14} />}
                onClick={handleResetFilter}
              >
                重置
              </Button>
            </Space>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            共找到 {filteredApplications.length} 条申请记录
          </div>
        </div>

        <Tabs 
          items={tabItems} 
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      </Card>

      <Modal
        title="申请详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={
          selectedApp?.status === 'pending' ? (
            <div className="flex justify-between">
              <Button danger icon={<X size={14} />} onClick={() => {
                setDetailVisible(false);
                handleReject(selectedApp);
              }}>
                拒绝
              </Button>
              <Button type="primary" icon={<Check size={14} />} className="bg-success" onClick={() => {
                setDetailVisible(false);
                handleApprove(selectedApp);
              }}>
                通过
              </Button>
            </div>
          ) : null
        }
        width={700}
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">申请人姓名</div>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span className="font-medium">{selectedApp.vendorName}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">联系电话</div>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <span>{selectedApp.vendorPhone}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">身份证号</div>
                <div className="flex items-center gap-2">
                  <IdCard size={16} className="text-gray-400" />
                  <span className="font-mono">{selectedApp.idCard}</span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">申请状态</div>
                <StatusBadge status={selectedApp.status} />
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">申请品类</div>
              <Tag color="blue" className="text-base">{selectedApp.category}</Tag>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">证件照片（点击查看大图）</div>
              {selectedApp.idCardPhoto && selectedApp.idCardPhoto.length > 0 ? (
                <Image.PreviewGroup>
                  <div className="flex gap-2 flex-wrap">
                    {selectedApp.idCardPhoto.map((photo, index) => (
                      <div key={index} className="relative group">
                        <Image 
                          src={photo} 
                          width={120} 
                          height={120}
                          className="rounded object-cover" 
                          style={{ objectFit: 'cover' }}
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <Eye size={24} className="text-white opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                </Image.PreviewGroup>
              ) : (
                <span className="text-gray-400">暂无照片</span>
              )}
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">经营说明</div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-gray-400 mt-0.5" />
                  <span>{selectedApp.businessDesc}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">申请时间</div>
                <div>{new Date(selectedApp.createTime).toLocaleString('zh-CN')}</div>
              </div>
              {selectedApp.assignedSpot && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">分配摊位</div>
                  <div className="font-mono font-medium">{selectedApp.assignedSpot}</div>
                </div>
              )}
            </div>

            {selectedApp.status === 'rejected' && selectedApp.rejectReason && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="text-sm text-red-600 font-medium mb-1">拒绝原因</div>
                <div className="text-red-700">{selectedApp.rejectReason}</div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="通过申请"
        open={approveVisible}
        onCancel={() => setApproveVisible(false)}
        onOk={handleApproveConfirm}
        okText="确认通过"
        okButtonProps={{ className: 'bg-success' }}
      >
        <Form form={form} layout="vertical">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <User size={16} className="inline mr-1" />
              <strong>申请人：</strong>{selectedApp?.vendorName}
            </div>
            <div className="text-sm text-blue-800 mt-1">
              <Phone size={16} className="inline mr-1" />
              <strong>电话：</strong>{selectedApp?.vendorPhone}
            </div>
            <div className="text-sm text-blue-800 mt-1">
              <Tag color="blue">{selectedApp?.category}</Tag>
            </div>
          </div>
          <Form.Item
            label="分配摊位"
            name="assignedSpot"
            rules={[{ required: true, message: '请选择分配摊位' }]}
          >
            <Select placeholder="请选择空闲摊位">
              {vacantVendors.map((vendor) => (
                <Select.Option key={vendor.id} value={vendor.number}>
                  {vendor.number} - {vendor.category.join(', ')}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="拒绝申请"
        open={rejectVisible}
        onCancel={() => setRejectVisible(false)}
        onOk={handleRejectConfirm}
        okText="确认拒绝"
        okButtonProps={{ danger: true }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="拒绝原因"
            name="rejectReason"
            rules={[{ required: true, message: '请输入拒绝原因' }]}
          >
            <Input.TextArea rows={4} placeholder="请输入拒绝原因" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title="提交入驻申请"
        open={submitVisible}
        onClose={() => setSubmitVisible(false)}
        width={500}
        footer={
          <div className="flex justify-end gap-2">
            <Button onClick={() => setSubmitVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSubmitApplication} className="bg-accent">
              提交申请
            </Button>
          </div>
        }
      >
        <Form form={submitForm} layout="vertical">
          <Form.Item
            label="申请人姓名"
            name="vendorName"
            rules={[{ required: true, message: '请输入申请人姓名' }]}
          >
            <Input placeholder="请输入真实姓名" />
          </Form.Item>

          <Form.Item
            label="联系电话"
            name="vendorPhone"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码' },
            ]}
          >
            <Input placeholder="请输入手机号码" />
          </Form.Item>

          <Form.Item
            label="身份证号"
            name="idCard"
            rules={[
              { required: true, message: '请输入身份证号' },
              { pattern: /^\d{17}[\dXx]$/, message: '请输入有效的身份证号' },
            ]}
          >
            <Input placeholder="请输入18位身份证号" maxLength={18} />
          </Form.Item>

          <Form.Item
            label="经营品类"
            name="category"
            rules={[{ required: true, message: '请选择经营品类' }]}
          >
            <Select placeholder="请选择主要经营品类">
              {categoryOptions.slice(1).map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="经营说明"
            name="businessDesc"
            rules={[{ required: true, message: '请输入经营说明' }]}
          >
            <Input.TextArea
              rows={4}
              placeholder="请简要描述您的经营内容、经验和计划"
            />
          </Form.Item>

          <Form.Item
            label="证件照片"
            name="idCardPhoto"
            valuePropName="fileList"
            getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}
            rules={[
              { required: true, message: '请上传至少一张证件照片' },
              {
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject(new Error('请上传至少一张证件照片'));
                  }
                  return Promise.resolve();
                }
              }
            ]}
            extra="请上传清晰的身份证照片，至少1张，最多3张"
          >
            <Upload {...uploadProps} beforeUpload={() => false}>
              <div>
                <Camera size={24} className="mx-auto mb-2" />
                <span className="text-sm">上传证件照片</span>
                <div className="text-xs text-gray-400 mt-1">每张不超过5MB</div>
              </div>
            </Upload>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};
