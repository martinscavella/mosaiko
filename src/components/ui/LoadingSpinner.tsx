import React from 'react';
import clsx from 'clsx';

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

/**
 * Spinner di caricamento semplice e pulito.
 */
export default function LoadingSpinner({ size = 32, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div
        className="animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
