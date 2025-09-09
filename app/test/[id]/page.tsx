'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { Clock, ChevronLeft, ChevronRight, Flag } from 'lucide-react'

type Question = {
  id: string
  text: string
  points: number
  options: {
    id: string
    label: string
    is_correct: boolean
  }[]
}

type Answer = {
  question_id: string
  chosen_option_id: string | null
  attempt_id?: string
}

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const testId = params?.id as string
  
  const [test, setTest] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Answer[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)

  // Fix hydration mismatch - only get user on client side
  useEffect(() => {
    setIsClient(true)
    const currentUser = getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
    } else {
      router.push('/login')
    }
  }, [router])

  // Load test data after user is set
  useEffect(() => {
    if (!user || !testId || !isClient) return
    loadTest()
  }, [user, testId, isClient])

  // Check if user has already completed this test
  const checkExistingAttempt = async () => {
    try {
      const { data: existingAttempt } = await supabase
        .from('attempts')
        .select('id, status, submitted_at')
        .eq('user_id', user.id)
        .eq('test_id', testId)
        .eq('status', 'submitted')
        .single()

      if (existingAttempt) {
        router.push('/submitted')
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  const loadTest = async () => {
    try {
      setError('')
      
      // Check if user already completed this test
      const hasCompleted = await checkExistingAttempt()
      if (hasCompleted) return
      
      // Step 1: Load test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', testId)
        .single()

      if (testError) throw testError
      if (testData.status !== 'published') {
        router.push('/tests')
        return
      }
      setTest(testData)

      // Step 2: Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, text, points, options (id, label, is_correct)')
        .eq('test_id', testId)
        .order('order_index')

      if (questionsError) throw questionsError
      setQuestions(questionsData || [])

      // Step 3: Create or get existing attempt
      let attemptId: string
      const { data: existingAttempt } = await supabase
        .from('attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('test_id', testId)
        .eq('status', 'active')
        .single()

      if (existingAttempt) {
        attemptId = existingAttempt.id
      } else {
        const { data: newAttempt, error: attemptError } = await supabase
          .from('attempts')
          .insert({
            user_id: user.id,
            test_id: testId,
            status: 'active',
            time_remaining: testData.duration_minutes * 60
          })
          .select('id')
          .single()

        if (attemptError) throw attemptError
        attemptId = newAttempt.id
      }

      // Step 4: Initialize answers locally
      const initialAnswers = (questionsData || []).map(q => ({
        question_id: q.id,
        chosen_option_id: null,
        attempt_id: attemptId
      }))
      setAnswers(initialAnswers)

      // Step 5: Set timer
      setTimeRemaining(testData.duration_minutes * 60)

    } catch (error) {
      console.error('Error loading test:', error)
      setError('Failed to load test. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Timer with auto-submit
  useEffect(() => {
    if (timeRemaining <= 0) {
      // Auto-submit when timer reaches 0
      handleSubmit()
      return
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - 1)
        // Auto-submit when timer reaches 0
        if (newTime === 0) {
          setTimeout(() => handleSubmit(true), 100) // Small delay to ensure state is updated
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  // Handle answer selection
  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => {
      const newAnswers = prev.map(answer => {
        if (answer.question_id === questionId) {
          return { ...answer, chosen_option_id: optionId }
        }
        return answer
      })
      return newAnswers
    })
  }

  // Submit test with proper database saving
  const handleSubmit = async (isAutoSubmit = false) => {
    // Prevent multiple submissions
    if (isSubmitting) return
    setIsSubmitting(true)
    
    if (isAutoSubmit) {
      console.log('Auto-submitting test due to timer expiry')
    }
    try {
      // Get the current attempt ID
      const currentAttempt = answers[0]?.attempt_id
      if (!currentAttempt) {
        throw new Error('No active attempt found')
      }

      // Calculate score
      let totalScore = 0
      const answersToSave = []

      for (const answer of answers) {
        if (answer.chosen_option_id) {
          const question = questions.find(q => q.id === answer.question_id)
          const selectedOption = question?.options.find(opt => opt.id === answer.chosen_option_id)
          const isCorrect = selectedOption?.is_correct || false
          const score = isCorrect ? (question?.points || 1) : 0
          
          totalScore += score

          answersToSave.push({
            attempt_id: currentAttempt,
            question_id: answer.question_id,
            chosen_option_id: answer.chosen_option_id,
            is_correct: isCorrect,
            score: score
          })
        }
      }

      // Save all answers to database
      if (answersToSave.length > 0) {
        const { error: answersError } = await supabase
          .from('answers')
          .upsert(answersToSave)

        if (answersError) throw answersError
      }

      // Update attempt as submitted
      const { error: attemptError } = await supabase
        .from('attempts')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          total_score: totalScore,
          time_remaining: timeRemaining
        })
        .eq('id', currentAttempt)

      if (attemptError) throw attemptError

      // Redirect to submitted page
      router.push('/submitted')
    } catch (error) {
      console.error('Error submitting test:', error)
      setError('Failed to submit test. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Prevent hydration mismatch
  if (!isClient || !user) return null
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Test</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  if (!test || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Test not available</h2>
          <Button onClick={() => router.push('/tests')}>Back to Tests</Button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const currentAnswer = answers.find(a => a.question_id === currentQuestion?.id)
  const answeredCount = answers.filter(a => a.chosen_option_id).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{test.title}</h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 w-full sm:w-auto">
              <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-lg px-3 py-2 w-full sm:w-auto justify-center sm:justify-start">
                <Clock className="h-5 w-5 text-red-600" />
                <span className="text-xl font-bold text-red-700">{formatTime(timeRemaining)}</span>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-200 rounded-lg px-3 py-2 w-full sm:w-auto justify-center sm:justify-start">
                <span className="text-xl font-bold text-blue-700">{answeredCount}/{questions.length}</span>
                <span className="text-sm font-medium text-blue-600">answered</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Content - First on mobile */}
          <div className="order-1 lg:order-2 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {currentQuestionIndex + 1}
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({currentQuestion.points} marks)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-gray-900 text-base leading-relaxed">
                  {currentQuestion.text}
                </div>

                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <label
                      key={option.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                        currentAnswer?.chosen_option_id === option.id
                          ? 'border-[#002E2C] bg-[#002E2C]/10'
                          : 'border-gray-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.id}
                        checked={currentAnswer?.chosen_option_id === option.id}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleAnswerSelect(currentQuestion.id, option.id)
                          }
                        }}
                        className="h-4 w-4 focus:ring-[#002E2C]" style={{color: '#002E2C'}}
                      />
                      <span className="ml-3 text-gray-900">
                        {String.fromCharCode(65 + index)}. {option.label}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  <div className="flex gap-2">
                    {currentQuestionIndex === questions.length - 1 ? (
                      <Button
                        onClick={() => handleSubmit()}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Flag className="h-4 w-4 mr-1" />
                        Submit Test
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                        disabled={currentQuestionIndex === questions.length - 1}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Navigation - Second on mobile */}
          <div className="order-2 lg:order-1 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Question Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                  {questions.map((q, index) => {
                    const hasAnswer = answers.find(a => a.question_id === q.id)?.chosen_option_id
                    return (
                      <Button
                        key={q.id}
                        size="sm"
                        variant="outline"
                        className={`h-8 w-8 p-0 ${
                          index === currentQuestionIndex 
                            ? 'bg-[#002E2C] text-white border-[#002E2C] hover:bg-[#002E2C]/90' 
                            : hasAnswer 
                              ? 'bg-green-100 border-green-300 text-green-700' 
                              : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setCurrentQuestionIndex(index)}
                      >
                        {index + 1}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}