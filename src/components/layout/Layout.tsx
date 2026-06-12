import { Layout as AntLayout, Menu, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Map,
  Store,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  Menu as MenuIcon,
  X,
} from 'lucide-react';
import { useUIStore } from '../../stores';

const { Sider, Header, Content } = AntLayout;

const menuItems = [
  { key: '/map', icon: <Map size={20} />, label: '区域地图' },
  { key: '/vendors', icon: <Store size={20} />, label: '摊位列表' },
  { key: '/applications', icon: <ClipboardCheck size={20} />, label: '申请审核' },
  { key: '/inspections', icon: <ClipboardList size={20} />, label: '巡查记录' },
  { key: '/dashboard', icon: <BarChart3 size={20} />, label: '统计看板' },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <AntLayout className="min-h-screen">
      <Sider
        trigger={null}
        collapsible
        collapsed={sidebarCollapsed}
        className="bg-primary !fixed left-0 top-0 h-screen overflow-y-auto"
        width={260}
        collapsedWidth={80}
      >
        <div className="h-16 flex items-center justify-center border-b border-primary-400">
          {!sidebarCollapsed ? (
            <h1 className="text-white text-lg font-bold m-0">摆摊管理系统</h1>
          ) : (
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <Store size={20} className="text-white" />
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="bg-primary border-r-0 mt-2"
        />
      </Sider>
      <AntLayout className={sidebarCollapsed ? '!ml-20' : '!ml-[260px]'}>
        <Header className="bg-white shadow-sm px-6 flex items-center justify-between fixed top-0 right-0 z-10"
          style={{ left: sidebarCollapsed ? '80px' : '260px' }}
        >
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuIcon size={20} /> : <X size={20} />}
            onClick={toggleSidebar}
            className="text-gray-600 hover:text-primary"
          />
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">管</span>
            </div>
            <span className="text-gray-700 font-medium">街区运营人员</span>
          </div>
        </Header>
        <Content className="mt-16 p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
          {children}
        </Content>
      </AntLayout>
    </AntLayout>
  );
};
