'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function HomePage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Animate progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval)
          return 100
        }
        return prev + 2
      })
    }, 60)

    // Redirect after 3 seconds
    setTimeout(() => {
      router.replace('/login')
    }, 3000)

    return () => clearInterval(progressInterval)
  }, [router])

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-r from-emerald-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-6">
        {/* Loading Spinner */}
        <div className="mb-6">
          <LoadingSpinner className="h-8 w-8 mx-auto text-[#002E2C]" />
        </div>

        {/* Loading Text */}
        <p className="text-slate-600 mb-8 text-lg font-medium animate-pulse">
          Taking you to Rapid Steno...
        </p>

        {/* Progress Bar */}
        <div className="w-80 max-w-full mx-auto mb-8">
          <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#002E2C] to-emerald-500 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">{progress}% Complete</p>
        </div>
        
        {/* Welcome Card */}
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-slate-200/50 max-w-md mx-auto border border-white/20">
          <div className="mb-4">
            <h1 className="font-bold text-2xl mb-2 bg-gradient-to-r from-[#002E2C] to-emerald-600 bg-clip-text text-transparent">
              Welcome to Rapid Steno
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-[#002E2C] to-emerald-500 rounded-full mx-auto"></div>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Your comprehensive steno examination platform designed for excellence and precision
          </p>
        </div>
      </div>
    </div>
  )
}