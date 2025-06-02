// Gradient configurations for different themes
export const gradients = {
  primary: 'bg-gradient-to-br from-blue-500/20 to-blue-600/20',
  success: 'bg-gradient-to-br from-green-500/20 to-green-600/20',
  warning: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20',
  danger: 'bg-gradient-to-br from-red-500/20 to-red-600/20',
  purple: 'bg-gradient-to-br from-purple-500/20 to-purple-600/20',
  orange: 'bg-gradient-to-br from-orange-500/20 to-orange-600/20',
  dark: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
}

export const borders = {
  primary: 'border-blue-500/30',
  success: 'border-green-500/30',
  warning: 'border-yellow-500/30',
  danger: 'border-red-500/30',
  purple: 'border-purple-500/30',
  orange: 'border-orange-500/30',
  glass: 'border-white/20'
}

export const textColors = {
  primary: 'text-blue-300',
  success: 'text-green-300',
  warning: 'text-yellow-300',
  danger: 'text-red-300',
  purple: 'text-purple-300',
  orange: 'text-orange-300',
  white: 'text-white',
  gray: 'text-gray-300'
}

export const backgroundColors = {
  primary: 'bg-blue-500/30',
  success: 'bg-green-500/30',
  warning: 'bg-yellow-500/30',
  danger: 'bg-red-500/30',
  purple: 'bg-purple-500/30',
  orange: 'bg-orange-500/30',
  glass: 'bg-white/10',
  dark: 'bg-black/20'
}

// Utility function to get time-based greeting
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

// Utility function to format currency
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

// Utility function to format large numbers
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}
