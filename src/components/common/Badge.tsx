import { Badge as AntBadge } from 'antd';

type BadgeStatus = 'success' | 'processing' | 'error' | 'default' | 'warning';

interface BadgeProps {
  status?: BadgeStatus;
  text?: string;
  count?: number;
  className?: string;
}

export const Badge = ({ status = 'default', text, count, className = '' }: BadgeProps) => {
  if (count !== undefined) {
    return (
      <AntBadge count={count} className={className} />
    );
  }

  return (
    <AntBadge status={status} text={text} className={className} />
  );
};

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'vacant' | 'occupied' | 'maintenance' | 'completed' | 'overdue';
  className?: string;
}

const statusConfig: Record<string, { color: string; text: string }> = {
  pending: { color: 'orange', text: '待审核' },
  approved: { color: 'green', text: '已通过' },
  rejected: { color: 'red', text: '已拒绝' },
  vacant: { color: 'blue', text: '空闲' },
  occupied: { color: 'green', text: '已占用' },
  maintenance: { color: 'orange', text: '维护中' },
  completed: { color: 'green', text: '已完成' },
  overdue: { color: 'red', text: '已逾期' },
};

export const StatusBadge = ({ status, className = '' }: StatusBadgeProps) => {
  const config = statusConfig[status] || { color: 'default', text: status };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{
        backgroundColor: `${config.color === 'green' ? '#dcfce7' : config.color === 'orange' ? '#fef3c7' : config.color === 'red' ? '#fee2e2' : '#e5e7eb'}`,
        color: `${config.color === 'green' ? '#166534' : config.color === 'orange' ? '#92400e' : config.color === 'red' ? '#991b1b' : '#374151'}`,
      }}
    >
      {config.text}
    </span>
  );
};
