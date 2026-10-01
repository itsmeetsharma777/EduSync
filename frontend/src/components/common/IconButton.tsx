import type { ReactNode } from 'react';

function IconButton({
  children,
  label,
  onClick,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`icon-button ${className}`} aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}
