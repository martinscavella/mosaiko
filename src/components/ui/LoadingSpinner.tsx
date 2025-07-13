import React from 'react';

/**
 * Componente di caricamento generico con spinner centrato.
 * Può essere usato ovunque nell'app per una UX uniforme.
 * Props opzionali: size (dimensione spinner), className (stile extra), color (colore bordo)
 */
export default function LoadingSpinner({ size = 48, className = '', color = 'border-blue-500' }) {
  return (
    <div className={`flex items-center justify-center w-full h-full min-h-[120px] ${className}`}>
      <div
        className={`animate-spin rounded-full border-t-4 ${color} border-solid`}
        style={{ width: size, height: size }}
      />
    </div>
  );
}
