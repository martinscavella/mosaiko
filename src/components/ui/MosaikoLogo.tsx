import React from 'react';

interface MosaikoLogoProps {
  size?: number;
  className?: string;
}

export const MosaikoLogo: React.FC<MosaikoLogoProps> = ({ 
  size = 80, 
  className = '' 
}) => {
  const baseClasses = 'transition-all duration-300 hover:scale-105';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={`${baseClasses} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mosaikoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="30%" stopColor="#6366f1" />
          <stop offset="60%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
        <radialGradient id="mosaikoRadial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.1" />
        </radialGradient>
      </defs>
      
      {/* Supercerchio (Squircle) principale */}
      <path
        d="M 60 15
           C 75 15, 85 15, 95 25
           C 105 35, 105 45, 105 60
           C 105 75, 105 85, 95 95
           C 85 105, 75 105, 60 105
           C 45 105, 35 105, 25 95
           C 15 85, 15 75, 15 60
           C 15 45, 15 35, 25 25
           C 35 15, 45 15, 60 15 Z"
        fill="url(#mosaikoGradient)"
      />
      
      {/* Lettera M centrale ingrandita */}
      <text 
        x="60" 
        y="78" 
        textAnchor="middle" 
        fill="white" 
        fontSize="48" 
        fontFamily="serif" 
        fontWeight="bold"
        style={{ textShadow: '0 3px 6px rgba(0,0,0,0.4)' }}
      >
        M
      </text>
    </svg>
  );
};
