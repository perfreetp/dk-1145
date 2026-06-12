import { Empty as AntEmpty } from 'antd';
import { InboxOutlined } from '@ant-design/icons';

interface EmptyProps {
  description?: string;
  className?: string;
}

export const Empty = ({ description = '暂无数据', className = '' }: EmptyProps) => {
  return (
    <AntEmpty
      image={InboxOutlined}
      description={description}
      className={className}
    />
  );
};
