import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility per animazioni con delay personalizzato
export function staggerDelay(index: number, baseDelay: number = 100) {
  return `${baseDelay + (index * 100)}ms`
}

// Utility per generare colori gradiente dinamici
export function generateGradient(colors: string[], direction: string = 'to right') {
  return `linear-gradient(${direction}, ${colors.join(', ')})`
}

// Utility per effetti glassmorphism
export function glassEffect(opacity: number = 0.1, blur: number = 10) {
  return {
    backgroundColor: `rgba(255, 255, 255, ${opacity})`,
    backdropFilter: `blur(${blur}px)`,
    border: '1px solid rgba(255, 255, 255, 0.2)'
  }
}

// Utility per ombre personalizzate
export function customShadow(color: string, size: 'sm' | 'md' | 'lg' | 'xl' = 'md') {
  const shadows = {
    sm: `0 1px 2px 0 ${color}`,
    md: `0 4px 6px -1px ${color}`,
    lg: `0 10px 15px -3px ${color}`,
    xl: `0 20px 25px -5px ${color}, 0 10px 10px -5px ${color}`
  }
  return shadows[size]
}
