import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hover, gradient }) => {
  return (
    <div
      className={clsx(
        'rounded-2xl p-6 transition-all duration-300',
        gradient
          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
          : 'bg-white border border-gray-200 shadow-sm',
        hover && 'hover:shadow-xl hover:scale-[1.02] cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return <div className={clsx('mb-4', className)}>{children}</div>;
};

export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return <h3 className={clsx('text-xl font-semibold', className)}>{children}</h3>;
};

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return <div className={clsx(className)}>{children}</div>;
};

