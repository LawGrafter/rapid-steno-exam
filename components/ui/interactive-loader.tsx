'use client'

import { useState, useEffect } from 'react'
import { FileText, Database, Users, CheckCircle, Loader2 } from 'lucide-react'

interface LoadingStep {
  id: string
  label: string
  icon: React.ReactNode
  completed: boolean
}

interface InteractiveLoaderProps {
  title?: string
  subtitle?: string
  className?: string
  onComplete?: () => void
  // Props for controlled loading
  progress?: number
  currentStep?: number
  steps?: LoadingStep[]
  isControlled?: boolean
}

export function InteractiveLoader({ 
  title = "Loading Categories", 
  subtitle = "Please wait while we fetch the test categories...",
  className = "",
  onComplete,
  progress: controlledProgress,
  currentStep: controlledCurrentStep,
  steps: controlledSteps,
  isControlled = false
}: InteractiveLoaderProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [steps, setSteps] = useState<LoadingStep[]>([
    {
      id: 'database',
      label: 'Connecting to database',
      icon: <Database className="h-4 w-4" />,
      completed: false
    },
    {
      id: 'categories',
      label: 'Fetching categories',
      icon: <FileText className="h-4 w-4" />,
      completed: false
    },
    {
      id: 'topics',
      label: 'Loading topics and tests',
      icon: <Users className="h-4 w-4" />,
      completed: false
    },
    {
      id: 'finalizing',
      label: 'Finalizing data',
      icon: <CheckCircle className="h-4 w-4" />,
      completed: false
    }
  ])

  // Use controlled values if provided
  const actualProgress = isControlled ? (controlledProgress ?? 0) : progress
  const actualCurrentStep = isControlled ? (controlledCurrentStep ?? 0) : currentStep
  const actualSteps = isControlled ? (controlledSteps ?? steps) : steps

  useEffect(() => {
    if (isControlled) return // Don't run automatic animation if controlled

    let progressInterval: NodeJS.Timeout
    let stepTimeout: NodeJS.Timeout

    const startLoading = () => {
      // Progress animation
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval)
            onComplete?.()
            return 100
          }
          return prev + 2 // Faster progress
        })
      }, 100)

      // Step progression
      const processSteps = async () => {
        for (let i = 0; i < steps.length; i++) {
          setCurrentStep(i)
          
          // Wait for step duration (reduced for faster loading)
          await new Promise(resolve => {
            stepTimeout = setTimeout(resolve, 1200 + (i * 300))
          })
          
          // Mark step as completed
          setSteps(prevSteps => 
            prevSteps.map((step, index) => 
              index === i ? { ...step, completed: true } : step
            )
          )
        }
      }

      processSteps()
    }

    startLoading()

    return () => {
      clearInterval(progressInterval)
      clearTimeout(stepTimeout)
    }
  }, [onComplete, steps, isControlled])

  // Call onComplete when controlled progress reaches 100
  useEffect(() => {
    if (isControlled && actualProgress >= 100) {
      onComplete?.()
    }
  }, [actualProgress, isControlled, onComplete])

  const getStepStatus = (index: number) => {
    if (actualSteps[index]?.completed) return 'completed'
    if (index === actualCurrentStep) return 'active'
    return 'pending'
  }

  return (
    <div className={`text-center py-16 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-[#002E2C]/10 ${className}`}>
      {/* Title and Subtitle */}
      <h3 className="text-xl font-semibold text-[#002E2C] mb-3">{title}</h3>
      <p className="text-gray-600 mb-8">{subtitle}</p>

      {/* Progress Bar */}
      <div className="max-w-md mx-auto">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Loading...</span>
          <span>{Math.round(actualProgress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-3 bg-gradient-to-r from-[#002E2C] to-emerald-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${actualProgress}%` }}
          >
            <div className="h-full bg-white/20 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Estimated time remaining */}
      <div className="mt-4 text-sm text-gray-500">
        Estimated time remaining: {Math.max(0, Math.ceil((100 - actualProgress) * 0.05))} seconds
      </div>
    </div>
  )
}
