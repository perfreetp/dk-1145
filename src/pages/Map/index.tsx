import { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import { Card, List, Button, Tag, Drawer, Form, Input, InputNumber, Select, message } from 'antd';
import { Plus, Edit2, Trash2, MapPin, Layers } from 'lucide-react';
import { useAreaStore, useVendorStore } from '../../stores';
import { Area } from '../../types';
import L from 'leaflet';

const center: [number, number] = [31.2304, 121.4737];

const vendorIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div style="width: 30px; height: 30px; background-color: #F97316; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">📍</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export const MapPage = () => {
  const { areas, addArea, updateArea, deleteArea, selectedAreaId, setSelectedArea } = useAreaStore();
  const { vendors, getFilteredVendors } = useVendorStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [form] = Form.useForm();

  const selectedArea = useMemo(() => {
    return areas.find((a) => a.id === selectedAreaId);
  }, [areas, selectedAreaId]);

  const selectedAreaVendors = useMemo(() => {
    if (!selectedAreaId) return [];
    return vendors.filter((v) => v.areaId === selectedAreaId);
  }, [vendors, selectedAreaId]);

  const handleAddArea = () => {
    setEditingArea(null);
    form.resetFields();
    setDrawerVisible(true);
  };

  const handleEditArea = (area: Area) => {
    setEditingArea(area);
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

  const handleFinish = (values: any) => {
    if (editingArea) {
      updateArea(editingArea.id, values);
      message.success('区域已更新');
    } else {
      const newArea: Area = {
        id: `area-${String(areas.length + 1).padStart(3, '0')}`,
        boundary: [
          [31.23 + Math.random() * 0.01, 121.47 + Math.random() * 0.01],
          [31.23 + Math.random() * 0.01, 121.48 + Math.random() * 0.01],
          [31.22 + Math.random() * 0.01, 121.48 + Math.random() * 0.01],
          [31.22 + Math.random() * 0.01, 121.47 + Math.random() * 0.01],
        ],
        ...values,
      };
      addArea(newArea);
      message.success('区域已添加');
    }
    setDrawerVisible(false);
    form.resetFields();
  };

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
        <Card className="flex-1 h-full overflow-hidden" bodyStyle={{ height: '100%', padding: 0 }}>
          <MapContainer
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
                      <p>状态: <Tag color={area.status === 'active' ? 'green' : 'red'}>{area.status === 'active' ? '启用' : '停用'}</Tag></p>
                    </div>
                  </div>
                </Popup>
              </Polygon>
            ))}
            {selectedAreaVendors.map((vendor) => (
              <Marker
                key={vendor.id}
                position={[
                  31.22 + Math.random() * 0.01,
                  121.47 + Math.random() * 0.01,
                ]}
                icon={vendorIcon}
              >
                <Popup>
                  <div className="min-w-[150px]">
                    <h3 className="font-bold">摊位 {vendor.number}</h3>
                    <p className="text-sm mt-1">状态: {vendor.status === 'vacant' ? '空闲' : vendor.status === 'occupied' ? '已占用' : '维护中'}</p>
                    {vendor.responsible.name && (
                      <p className="text-sm">负责人: {vendor.responsible.name}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
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
                        {vendors.filter((v) => v.areaId === area.id).length} / {area.totalSpots} 摊位
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
        onClose={() => setDrawerVisible(false)}
        width={400}
      >
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
          <Form.Item className="mb-0">
            <div className="flex gap-2">
              <Button type="primary" htmlType="submit" className="flex-1 bg-accent">
                {editingArea ? '保存' : '创建'}
              </Button>
              <Button onClick={() => setDrawerVisible(false)}>取消</Button>
            </div>
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};
