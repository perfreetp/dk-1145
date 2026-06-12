import { Card as AntCard } from 'antd';

interface CardProps {
  title?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card = ({ title, extra, children, className = '', onClick, hoverable = false }: CardProps) => {
  return (
    <AntCard
      title={title}
      extra={extra}
      className={`shadow-sm hover:shadow-md transition-shadow ${className}`}
      onClick={onClick}
      hoverable={hoverable}
    >
      {children}
    </AntCard>
  );
};
