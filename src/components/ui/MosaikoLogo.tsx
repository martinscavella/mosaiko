import React from 'react';
import Image from 'next/image';

interface MosaikoLogoProps {
  size?: number;
  className?: string;
  /** Percorso o URL dell'immagine raster (png/jpg). Se presente usato al posto della SVG */
  src?: string;
  alt?: string;
}

export const MosaikoLogo: React.FC<MosaikoLogoProps> = ({
  size = 80,
  className = '',
  src = '/icons/icon-192x192.png',
  alt = 'Mosaiko logo',
}) => {
  const baseClasses = 'transition-all duration-300 hover:scale-105';

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`${baseClasses} ${className}`}
      style={{ width: size, height: size, display: 'block' }}
    />
  );
};
