'use client'

import { useState, useCallback } from 'react'

interface LoadingStep {
  id: string
  label: string
  completed: boolean
}

export function useLoadingProgress() {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [steps, setSteps] = useState<LoadingStep[]>([])

  const initializeSteps = useCallback((stepDefinitions: Omit<LoadingStep, 'completed'>[]) => {
    setSteps(stepDefinitions.map(step => ({ ...step, completed: false })))
    setProgress(0)
    setCurrentStep(0)
    setIsLoading(true)
  }, [])

  const completeStep = useCallback((stepId: string) => {
    setSteps(prevSteps => {
      const updatedSteps = prevSteps.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      )
      
      const completedCount = updatedSteps.filter(step => step.completed).length
      const newProgress = (completedCount / updatedSteps.length) * 100
      
      setProgress(newProgress)
      
      if (completedCount < updatedSteps.length) {
        // Find next incomplete step
        const nextStepIndex = updatedSteps.findIndex(step => !step.completed)
        setCurrentStep(nextStepIndex)
      } else {
        // All steps completed
        setIsLoading(false)
        setCurrentStep(-1)
      }
      
      return updatedSteps
    })
  }, [])

  const reset = useCallback(() => {
    setProgress(0)
    setCurrentStep(0)
    setIsLoading(false)
    setSteps([])
  }, [])

  return {
    progress,
    currentStep,
    isLoading,
    steps,
    initializeSteps,
    completeStep,
    reset
  }
}
