import { Empty as AntEmpty } from 'antd';

interface EmptyProps {
  description?: string;
  className?: string;
}

export const Empty = ({ description = '暂无数据', className = '' }: EmptyProps) => {
  return (
    <AntEmpty
      description={description}
      className={className}
    />
  );
};
