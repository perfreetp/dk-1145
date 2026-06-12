import { useState, useMemo, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents, Polyline } from 'react-leaflet';
import { Card, Button, Tag, Drawer, Form, Input, InputNumber, Select, message, Space, Alert, Descriptions, Timeline, Image, Empty } from 'antd';
import { Plus, Edit2, Trash2, MapPin, MousePointer, Undo, Check, X, User, Phone, AlertTriangle, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useAreaStore, useVendorStore, useInspectionStore, useApplicationStore } from '../../stores';
import { Area, Vendor } from '../../types';
import { StatusBadge } from '../../components/common';
import L from 'leaflet';

const center: [number, number] = [31.2304, 121.4737];

const createVendorIcon = (status: string, number: string) => {
  const colors: Record<string, string> = {
    vacant: '#3B82F6',
    occupied: '#10B981',
    maintenance: '#F97316',
  };
  const color = colors[status] || '#6B7280';
  
  return new L.DivIcon({
    className: 'custom-vendor-marker',
    html: `<div style="
      width: 36px;
      height: 36px;
      background-color: ${color};
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 11px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s;
    " title="${number}">${number.split('-').pop()}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

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

interface DrawingLayerProps {
  isDrawing: boolean;
  points: [number, number][];
  onAddPoint: (point: [number, number]) => void;
}

const DrawingLayer = ({ isDrawing, points, onAddPoint }: DrawingLayerProps) => {
  useMapEvents({
    click: (e) => {
      if (isDrawing) {
        onAddPoint([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  return (
    <>
      {isDrawing && points.length > 0 && (
        <>
          <Polyline
            positions={points}
            pathOptions={{ color: '#F97316', weight: 3, dashArray: '5, 10' }}
          />
          {points.length >= 3 && (
            <Polyline
              positions={[points[points.length - 1], points[0]]}
              pathOptions={{ color: '#F97316', weight: 3, dashArray: '5, 10' }}
            />
          )}
        </>
      )}
    </>
  );
};

export const MapPage = () => {
  const { areas, addArea, updateArea, deleteArea, selectedAreaId, setSelectedArea } = useAreaStore();
  const { vendors } = useVendorStore();
  const { inspections } = useInspectionStore();
  const { applications } = useApplicationStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [vendorDetailVisible, setVendorDetailVisible] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [form] = Form.useForm();
  const [timelineFilter, setTimelineFilter] = useState<string[]>([]);
  const mapRef = useRef<L.Map | null>(null);

  const selectedAreaVendors = useMemo(() => {
    if (!selectedAreaId) return vendors.filter(v => v.status !== 'vacant');
    return vendors.filter((v) => v.areaId === selectedAreaId);
  }, [vendors, selectedAreaId]);

  const selectedVendorInspections = useMemo(() => {
    if (!selectedVendor) return [];
    return inspections
      .filter(ins => ins.spotId === selectedVendor.id)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .slice(0, 5);
  }, [inspections, selectedVendor]);

  const relatedApplication = useMemo(() => {
    if (!selectedVendor?.applicationId) return null;
    return applications.find(app => app.id === selectedVendor.applicationId);
  }, [applications, selectedVendor]);

  const generateTimelineData = () => {
    if (!selectedVendor) return [];

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

    selectedVendorInspections
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

  const timelineData = selectedVendor ? generateTimelineData() : [];

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

  const handleAddArea = () => {
    setEditingArea(null);
    setIsDrawing(true);
    setDrawingPoints([]);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleEditArea = (area: Area) => {
    setEditingArea(area);
    setIsDrawing(true);
    setDrawingPoints([...area.boundary]);
    form.setFieldsValue({
      name: area.name,
      totalSpots: area.totalSpots,
      status: area.status,
    });
    setDrawerVisible(true);
  };

  const handleDeleteArea = (id: string) => {
    deleteArea(id);
    message.success('区域已删除');
  };

  const handleAddPoint = (point: [number, number]) => {
    setDrawingPoints(prev => [...prev, point]);
  };

  const handleUndo = () => {
    setDrawingPoints(prev => prev.slice(0, -1));
  };

  const handleFinishDrawing = () => {
    if (drawingPoints.length < 3) {
      message.warning('请至少绘制3个顶点以形成区域');
      return;
    }
    setIsDrawing(false);
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    setDrawerVisible(false);
    form.resetFields();
  };

  const handleFinish = (values: any) => {
    if (drawingPoints.length < 3) {
      message.warning('请先在地图上绘制区域边界');
      return;
    }

    if (editingArea) {
      updateArea(editingArea.id, {
        ...values,
        boundary: drawingPoints,
      });
      message.success('区域已更新');
    } else {
      addArea({
        name: values.name,
        totalSpots: values.totalSpots,
        status: values.status || 'active',
        boundary: drawingPoints,
      });
      message.success('区域已添加');
    }
    setDrawerVisible(false);
    setIsDrawing(false);
    setDrawingPoints([]);
    form.resetFields();
  };

  const handleVendorClick = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setVendorDetailVisible(true);
  };

  useEffect(() => {
    if (mapRef.current && isDrawing && drawingPoints.length > 0) {
      const bounds = L.latLngBounds(drawingPoints.map(p => L.latLng(p[0], p[1])));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [drawingPoints, isDrawing]);

  return (
    <div className="h-full animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 m-0">区域地图</h1>
          <p className="text-gray-500 mt-1">管理摆摊区域边界和摊位分布</p>
        </div>
        <Button
          type="primary"
          icon={<Plus size={16} />}
          onClick={handleAddArea}
          className="bg-accent hover:!bg-accent-600"
        >
          新增区域
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-180px)]">
        <Card className="flex-1 h-full overflow-hidden relative" bodyStyle={{ height: '100%', padding: 0 }}>
          {isDrawing && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-lg shadow-lg">
              <div className="flex items-center gap-2 text-sm">
                <MousePointer size={16} className="text-accent" />
                <span className="font-medium">绘制中：点击地图添加顶点</span>
                <span className="text-gray-400">({drawingPoints.length}个顶点)</span>
              </div>
            </div>
          )}
          <MapContainer
            ref={mapRef}
            center={center}
            zoom={13}
            className="h-full w-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {areas.map((area) => (
              <Polygon
                key={area.id}
                positions={area.boundary}
                pathOptions={{
                  color: selectedAreaId === area.id ? '#F97316' : '#1E3A5F',
                  fillColor: selectedAreaId === area.id ? '#F97316' : '#1E3A5F',
                  fillOpacity: selectedAreaId === area.id ? 0.3 : 0.1,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelectedArea(area.id),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h3 className="font-bold text-lg mb-2">{area.name}</h3>
                    <div className="space-y-1 text-sm">
                      <p>总摊位数: {area.totalSpots}</p>
                      <p>已占用: {vendors.filter(v => v.areaId === area.id && v.status === 'occupied').length}</p>
                      <p>状态: <Tag color={area.status === 'active' ? 'green' : 'red'}>{area.status === 'active' ? '启用' : '停用'}</Tag></p>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            ))}
            {selectedAreaVendors.map((vendor) => (
              vendor.position && (
                <Marker
                  key={vendor.id}
                  position={[vendor.position.lat, vendor.position.lng]}
                  icon={createVendorIcon(vendor.status, vendor.number)}
                  eventHandlers={{
                    click: () => handleVendorClick(vendor),
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <h3 className="font-bold text-base mb-2">摊位 {vendor.number}</h3>
                      <div className="space-y-1 text-sm">
                        <p>状态: <Tag color={vendor.status === 'occupied' ? 'green' : vendor.status === 'maintenance' ? 'orange' : 'blue'}>{vendor.status === 'vacant' ? '空闲' : vendor.status === 'occupied' ? '已占用' : '维护中'}</Tag></p>
                        {vendor.responsible.name && (
                          <>
                            <p>负责人: {vendor.responsible.name}</p>
                            <p>电话: {vendor.responsible.phone}</p>
                          </>
                        )}
                        {vendor.category.length > 0 && (
                          <p>品类: {vendor.category.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
            <DrawingLayer
              isDrawing={isDrawing}
              points={drawingPoints}
              onAddPoint={handleAddPoint}
            />
          </MapContainer>
        </Card>

        <Card className="w-80 overflow-y-auto" title="区域列表">
          <div className="space-y-3">
            {areas.map((area) => (
              <div
                key={area.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedAreaId === area.id
                    ? 'border-accent bg-accent-50'
                    : 'border-gray-200 hover:border-primary'
                }`}
                onClick={() => setSelectedArea(area.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{area.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {vendors.filter((v) => v.areaId === area.id && v.status === 'occupied').length} / {area.totalSpots} 已占用
                      </span>
                    </div>
                    <div className="mt-2">
                      <Tag color={area.status === 'active' ? 'green' : 'red'}>
                        {area.status === 'active' ? '启用' : '停用'}
                      </Tag>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="text"
                      size="small"
                      icon={<Edit2 size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditArea(area);
                      }}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<Trash2 size={14} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteArea(area.id);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Drawer
        title={editingArea ? '编辑区域' : '新增区域'}
        open={drawerVisible}
        onClose={handleCancelDrawing}
        width={400}
        maskClosable={false}
        footer={
          isDrawing && (
            <div className="flex justify-between">
              <Space>
                <Button
                  icon={<Undo size={14} />}
                  onClick={handleUndo}
                  disabled={drawingPoints.length === 0}
                >
                  撤销
                </Button>
              </Space>
              <Space>
                <Button icon={<X size={14} />} onClick={handleCancelDrawing}>
                  取消
                </Button>
                <Button
                  type="primary"
                  icon={<Check size={14} />}
                  onClick={handleFinishDrawing}
                  disabled={drawingPoints.length < 3}
                  className="bg-success"
                >
                  完成绘制
                </Button>
              </Space>
            </div>
          )
        }
      >
        {isDrawing && (
          <Alert
            message="绘制提示"
            description="在地图上点击添加顶点，至少需要3个顶点形成闭合区域。完成后点击「完成绘制」继续填写信息。"
            type="info"
            showIcon
            className="mb-4"
          />
        )}

        {drawingPoints.length >= 3 && !isDrawing && (
          <Alert
            message="区域已绘制"
            description={`已绘制包含 ${drawingPoints.length} 个顶点的区域。如需修改，请点击「重新绘制」。`}
            type="success"
            showIcon
            className="mb-4"
            action={
              <Button size="small" onClick={() => setIsDrawing(true)}>
                重新绘制
              </Button>
            }
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item
            label="区域名称"
            name="name"
            rules={[{ required: true, message: '请输入区域名称' }]}
          >
            <Input placeholder="请输入区域名称" />
          </Form.Item>
          <Form.Item
            label="总摊位数"
            name="totalSpots"
            rules={[{ required: true, message: '请输入总摊位数' }]}
          >
            <InputNumber min={1} max={100} className="w-full" />
          </Form.Item>
          <Form.Item label="状态" name="status" initialValue="active">
            <Select>
              <Select.Option value="active">启用</Select.Option>
              <Select.Option value="inactive">停用</Select.Option>
            </Select>
          </Form.Item>
          {!isDrawing && drawingPoints.length >= 3 && (
            <Form.Item className="mb-0">
              <div className="flex gap-2">
                <Button type="primary" htmlType="submit" className="flex-1 bg-accent">
                  {editingArea ? '保存' : '创建'}
                </Button>
                <Button onClick={handleCancelDrawing}>取消</Button>
              </div>
            </Form.Item>
          )}
        </Form>
      </Drawer>

      <Drawer
        title={<div className="flex items-center gap-2">摊位详情 <span className="font-mono text-accent">{selectedVendor?.number}</span></div>}
        open={vendorDetailVisible}
        onClose={() => setVendorDetailVisible(false)}
        width={600}
      >
        {selectedVendor && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">基本信息</h3>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="摊位编号">
                  <span className="font-mono font-medium">{selectedVendor.number}</span>
                </Descriptions.Item>
                <Descriptions.Item label="状态">
                  <StatusBadge status={selectedVendor.status} />
                </Descriptions.Item>
                <Descriptions.Item label="经营品类" span={2}>
                  {selectedVendor.category.map(cat => (
                    <Tag key={cat} color="blue" className="mr-1">{cat}</Tag>
                  ))}
                </Descriptions.Item>
                <Descriptions.Item label="经营时段" span={2}>
                  {selectedVendor.businessHours.start} - {selectedVendor.businessHours.end}
                </Descriptions.Item>
                <Descriptions.Item label="到期日期" span={2}>
                  {selectedVendor.expireDate || '-'}
                </Descriptions.Item>
              </Descriptions>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3">负责人信息</h3>
              {selectedVendor.responsible.name ? (
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="姓名">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      {selectedVendor.responsible.name}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="联系电话">
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      {selectedVendor.responsible.phone}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="身份证号" span={2}>
                    <span className="font-mono">{selectedVendor.responsible.idCard}</span>
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <div className="text-gray-400 text-center py-4 bg-gray-50 rounded-lg">暂无负责人信息</div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <AlertTriangle size={18} className="text-orange-500" />
                最近巡查问题
              </h3>
              {selectedVendorInspections.length > 0 ? (
                <Timeline
                  items={selectedVendorInspections.map((ins) => ({
                    color: ins.rectStatus === 'completed' ? 'green' : ins.rectStatus === 'overdue' ? 'red' : 'blue',
                    children: (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag color={issueTypeLabels[ins.issueType]?.color}>{issueTypeLabels[ins.issueType]?.label}</Tag>
                          <StatusBadge status={ins.rectStatus} />
                        </div>
                        <div className="text-sm text-gray-600">{ins.description}</div>
                        <div className="text-xs text-gray-400 mt-2">
                          {new Date(ins.createTime).toLocaleDateString('zh-CN')} | {ins.inspector}
                        </div>
                        {ins.photos && ins.photos.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {ins.photos.map((photo, idx) => (
                              <img key={idx} src={photo} alt={`巡查照片 ${idx + 1}`} className="w-20 h-20 rounded object-cover" />
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  }))}
                />
              ) : (
                <div className="text-gray-400 text-center py-8 bg-gray-50 rounded-lg">暂无巡查记录</div>
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
