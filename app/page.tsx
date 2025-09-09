'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect after 3 seconds
    setTimeout(() => {
      router.replace('/login')
    }, 3000)
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center" style={{background: 'linear-gradient(to bottom right, #f8fafc, #e2e8f0)'}}>
      <div className="text-center">
        <LoadingSpinner className="h-8 w-8 mx-auto mb-4" />
        <p className="text-gray-600 mb-4">Taking you to Rapid Steno...</p>
        
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
          <h3 className="font-bold text-lg mb-2" style={{color: '#002E2C'}}>Welcome to Rapid Steno</h3>
          <p className="text-gray-600 text-sm">
            Your comprehensive steno examination platform
          </p>
        </div>
      </div>
    </div>
  )
}