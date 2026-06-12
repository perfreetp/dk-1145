import { useState, useMemo, useCallback } from 'react';
import { Card, Table, Button, Input, Select, Tag, Modal, Form, DatePicker, Upload, message, Popconfirm, Image } from 'antd';
import { Plus, Search, Camera, AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useInspectionStore, useVendorStore } from '../../stores';
import { Inspection, IssueType, Severity, RectStatus } from '../../types';
import { StatusBadge } from '../../components/common';
import type { UploadProps, UploadFile } from 'antd';

const issueTypeOptions = [
  { label: '全部类型', value: '' },
  { label: '占道经营', value: 'road_occupation' },
  { label: '卫生问题', value: 'hygiene' },
  { label: '噪音扰民', value: 'noise' },
  { label: '其他问题', value: 'other' },
];

const issueTypeLabels: Record<IssueType, { label: string; color: string }> = {
  road_occupation: { label: '占道经营', color: 'orange' },
  hygiene: { label: '卫生问题', color: 'red' },
  noise: { label: '噪音扰民', color: 'purple' },
  other: { label: '其他', color: 'default' },
};

const severityLabels: Record<Severity, { label: string; color: string }> = {
  minor: { label: '轻微', color: 'green' },
  moderate: { label: '一般', color: 'orange' },
  severe: { label: '严重', color: 'red' },
};

const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const Inspections = () => {
  const { inspections, addInspection, updateRectStatus } = useInspectionStore();
  const { vendors } = useVendorStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [filter, setFilter] = useState<{
    search?: string;
    issueType?: IssueType;
    rectStatus?: RectStatus;
  }>({});
  const [form] = Form.useForm();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const filteredInspections = useMemo(() => {
    return inspections.filter((ins) => {
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const matchSpot = ins.spotId.toLowerCase().includes(searchLower);
        const matchInspector = ins.inspector.toLowerCase().includes(searchLower);
        const matchDesc = ins.description.toLowerCase().includes(searchLower);
        if (!matchSpot && !matchInspector && !matchDesc) return false;
      }
      if (filter.issueType && ins.issueType !== filter.issueType) return false;
      if (filter.rectStatus && ins.rectStatus !== filter.rectStatus) return false;
      return true;
    });
  }, [inspections, filter]);

  const statistics = useMemo(() => {
    return {
      total: inspections.length,
      pending: inspections.filter((ins) => ins.rectStatus === 'pending').length,
      completed: inspections.filter((ins) => ins.rectStatus === 'completed').length,
      overdue: inspections.filter((ins) => ins.rectStatus === 'overdue').length,
    };
  }, [inspections]);

  const handleAdd = () => {
    form.resetFields();
    setUploadedPhotos([]);
    setModalVisible(true);
  };

  const handleViewDetail = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setDetailVisible(true);
  };

  const handleFinish = async (values: any) => {
    const photoUrls = await Promise.all(
      uploadedPhotos.map(async (photo) => {
        if (photo.startsWith('data:') || photo.startsWith('http')) {
          return photo;
        }
        return photo;
      })
    );

    addInspection({
      spotId: values.spotId,
      inspector: values.inspector,
      issueType: values.issueType,
      severity: values.severity,
      description: values.description,
      photos: photoUrls,
      rectDeadline: values.rectDeadline,
      rectStatus: 'pending',
    });
    message.success('巡查记录已添加');
    setModalVisible(false);
    form.resetFields();
    setUploadedPhotos([]);
  };

  const handleUpdateRectStatus = (id: string, status: RectStatus) => {
    updateRectStatus(id, status);
    message.success('整改状态已更新');
  };

  const uploadProps: UploadProps = {
    beforeUpload: async (file) => {
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

      try {
        const base64 = await convertFileToBase64(file);
        setUploadedPhotos((prev) => [...prev, base64]);
        message.success('图片已上传');
      } catch (error) {
        message.error('图片处理失败');
      }
      return false;
    },
    listType: 'picture-card',
    showUploadList: false,
    multiple: true,
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const columns = [
    {
      title: '巡查时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 120,
      render: (time: string) => new Date(time).toLocaleDateString('zh-CN'),
    },
    {
      title: '摊位编号',
      dataIndex: 'spotId',
      key: 'spotId',
      width: 120,
      render: (spotId: string) => {
        const vendor = vendors.find((v) => v.id === spotId);
        return (
          <span className="font-mono font-medium text-primary">
            {vendor?.number || spotId}
          </span>
        );
      },
    },
    {
      title: '问题类型',
      dataIndex: 'issueType',
      key: 'issueType',
      width: 100,
      render: (type: IssueType) => (
        <Tag color={issueTypeLabels[type].color}>
          {issueTypeLabels[type].label}
        </Tag>
      ),
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 80,
      render: (severity: Severity) => (
        <Tag color={severityLabels[severity].color}>
          {severityLabels[severity].label}
        </Tag>
      ),
    },
    {
      title: '问题描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '整改状态',
      dataIndex: 'rectStatus',
      key: 'rectStatus',
      width: 100,
      render: (status: RectStatus) => <StatusBadge status={status} />,
    },
    {
      title: '巡查人员',
      dataIndex: 'inspector',
      key: 'inspector',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: Inspection) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleViewDetail(record)}>
            详情
          </Button>
          {record.rectStatus === 'pending' && (
            <Popconfirm
              title="确认整改完成"
              onConfirm={() => handleUpdateRectStatus(record.id, 'completed')}
            >
              <Button size="small" type="primary" className="bg-success hover:!bg-green-600">
                完成整改
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">巡查记录</h1>
          <p className="text-gray-500 mt-1">记录巡查问题并跟踪整改进度</p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleAdd}
          className="bg-accent hover:!bg-accent-600"
        >
          新增巡查
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock size={24} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{statistics.total}</div>
              <div className="text-sm text-gray-500">总记录数</div>
            </div>
          </div>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={24} className="text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{statistics.pending}</div>
              <div className="text-sm text-gray-500">待整改</div>
            </div>
          </div>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{statistics.completed}</div>
              <div className="text-sm text-gray-500">已完成</div>
            </div>
          </div>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle size={24} className="text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{statistics.overdue}</div>
              <div className="text-sm text-gray-500">已逾期</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="搜索摊位或巡查人员..."
            prefix={<Search size={16} className="text-gray-400" />}
            value={filter.search || ''}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-64"
          />
          <Select
            value={filter.issueType || ''}
            onChange={(value) => setFilter({ ...filter, issueType: (value || undefined) as IssueType | undefined })}
            options={issueTypeOptions}
            className="w-32"
          />
          <Select
            value={filter.rectStatus || ''}
            onChange={(value) => setFilter({ ...filter, rectStatus: (value || undefined) as RectStatus | undefined })}
            options={[
              { label: '全部状态', value: '' },
              { label: '待整改', value: 'pending' },
              { label: '已完成', value: 'completed' },
              { label: '已逾期', value: 'overdue' },
            ]}
            className="w-32"
          />
        </div>

        <Table
          columns={columns}
          dataSource={filteredInspections}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title="新增巡查记录"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setUploadedPhotos([]);
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="巡查摊位"
              name="spotId"
              rules={[{ required: true, message: '请选择摊位' }]}
            >
              <Select placeholder="请选择摊位">
                {vendors.map((vendor) => (
                  <Select.Option key={vendor.id} value={vendor.id}>
                    {vendor.number} - {vendor.responsible.name || '未分配'}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              label="巡查人员"
              name="inspector"
              rules={[{ required: true, message: '请输入巡查人员' }]}
            >
              <Input placeholder="请输入巡查人员姓名" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="问题类型"
              name="issueType"
              rules={[{ required: true, message: '请选择问题类型' }]}
            >
              <Select placeholder="请选择问题类型">
                <Select.Option value="road_occupation">占道经营</Select.Option>
                <Select.Option value="hygiene">卫生问题</Select.Option>
                <Select.Option value="noise">噪音扰民</Select.Option>
                <Select.Option value="other">其他问题</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item
              label="严重程度"
              name="severity"
              rules={[{ required: true, message: '请选择严重程度' }]}
            >
              <Select placeholder="请选择严重程度">
                <Select.Option value="minor">轻微</Select.Option>
                <Select.Option value="moderate">一般</Select.Option>
                <Select.Option value="severe">严重</Select.Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            label="问题描述"
            name="description"
            rules={[{ required: true, message: '请输入问题描述' }]}
          >
            <Input.TextArea rows={3} placeholder="请详细描述发现的问题" />
          </Form.Item>

          <Form.Item
            label="整改期限"
            name="rectDeadline"
            rules={[{ required: true, message: '请设置整改期限' }]}
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item label="问题照片">
            <div className="space-y-3">
              <Upload {...uploadProps}>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-accent transition-colors">
                  <div className="flex flex-col items-center">
                    <Camera size={24} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">点击上传照片</span>
                    <span className="text-xs text-gray-400 mt-1">支持 JPG、PNG 格式，每张不超过 5MB</span>
                  </div>
                </div>
              </Upload>
              
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {uploadedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`上传照片 ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Form.Item>

          <Form.Item className="mb-0">
            <div className="flex gap-2 justify-end">
              <Button onClick={() => {
                setModalVisible(false);
                setUploadedPhotos([]);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" className="bg-accent">
                提交
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="巡查详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={600}
      >
        {selectedInspection && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">摊位编号</div>
                <div className="font-mono font-medium">
                  {vendors.find((v) => v.id === selectedInspection.spotId)?.number || selectedInspection.spotId}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">巡查人员</div>
                <div>{selectedInspection.inspector}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">问题类型</div>
                <Tag color={issueTypeLabels[selectedInspection.issueType].color}>
                  {issueTypeLabels[selectedInspection.issueType].label}
                </Tag>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">严重程度</div>
                <Tag color={severityLabels[selectedInspection.severity].color}>
                  {severityLabels[selectedInspection.severity].label}
                </Tag>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">问题描述</div>
              <div className="bg-gray-50 p-3 rounded-lg">{selectedInspection.description}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">巡查时间</div>
                <div>{new Date(selectedInspection.createTime).toLocaleString('zh-CN')}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">整改期限</div>
                <div>{selectedInspection.rectDeadline ? new Date(selectedInspection.rectDeadline).toLocaleDateString('zh-CN') : '-'}</div>
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500 mb-1">整改状态</div>
              <StatusBadge status={selectedInspection.rectStatus} />
            </div>

            {selectedInspection.photos && selectedInspection.photos.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-2">问题照片</div>
                <Image.PreviewGroup>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedInspection.photos.map((photo, index) => (
                      <Image
                        key={index}
                        src={photo}
                        alt={`问题照片 ${index + 1}`}
                        width="100%"
                        height={100}
                        className="rounded-lg object-cover"
                        style={{ objectFit: 'cover' }}
                      />
                    ))}
                  </div>
                </Image.PreviewGroup>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
