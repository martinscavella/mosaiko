'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChartBarIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  PresentationChartLineIcon,
  ArrowRightIcon,
  PlusIcon,
  EyeIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline'



export default function HomePage() {
  const [showSampleDataCreator, setShowSampleDataCreator] = useState(false)
  

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        {/* Hero Section */}
        

        {/* Features Section */}

        {/* CTA Section */}
        
      </div>
    )
  }

  // User is logged in - show dashboard
  return (
    <div className="min-h-screen bg-gray-50">

    </div>
  )
}
