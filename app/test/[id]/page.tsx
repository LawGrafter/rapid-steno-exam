'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { Clock, ChevronLeft, ChevronRight, Flag, ArrowLeft, Send, CheckCircle, Sparkles } from 'lucide-react'

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
  const [showBackConfirmation, setShowBackConfirmation] = useState(false)
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [showConfetti, setShowConfetti] = useState(false)

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
      // Check if this is a demo user
      if ((user as any).user_type === 'demo') {
        return false
      }
      
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
      
      if ((user as any).user_type === 'demo') {
        // For demo users, create a local attempt ID without database interaction
        attemptId = `demo_attempt_${Date.now()}`
      } else {
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

  // Handle back button with confirmation
  const handleBackClick = () => {
    setShowBackConfirmation(true)
  }

  const handleConfirmBack = () => {
    router.push('/tests')
  }

  const handleCancelBack = () => {
    setShowBackConfirmation(false)
  }

  // Handle submit button with confirmation
  const handleSubmitClick = () => {
    setShowSubmitConfirmation(true)
  }

  const handleConfirmSubmit = () => {
    setShowSubmitConfirmation(false)
    handleSubmit()
  }

  // Countdown timer effect for success modal
  useEffect(() => {
    if (showSuccessModal && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (showSuccessModal && countdown === 0) {
      // Show confetti immediately with sound effect and then redirect
      setShowConfetti(true)
      
      // Play success sound effect
      try {
        const audio = new Audio('https://raw.githubusercontent.com/LawGrafter/rapid-steno-exam/master/Public/sounds/success-celebration.mp3')
        audio.volume = 0.5
        
        // Preload and handle user interaction requirement
        audio.load()
        
        // Modern browsers require user interaction before playing audio
        const playPromise = audio.play()
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Success sound played successfully')
            })
            .catch(error => {
              console.log('Audio play failed - this is normal on some browsers:', error)
              // Fallback: try to play after a small delay
              setTimeout(() => {
                audio.play().catch(e => console.log('Retry audio play failed:', e))
              }, 100)
            })
        }
      } catch (error) {
        console.log('Audio initialization failed:', error)
      }
      
      setTimeout(() => {
        router.push('/submitted')
      }, 3000) // Show confetti for 3 seconds
    }
  }, [showSuccessModal, countdown, router])

  const handleCancelSubmit = () => {
    setShowSubmitConfirmation(false)
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

      // Save all answers to database (skip for demo users)
      if ((user as any).user_type !== 'demo' && answersToSave.length > 0) {
        const { error: answersError } = await supabase
          .from('answers')
          .upsert(answersToSave)

        if (answersError) throw answersError
      }

      // Update attempt as submitted (skip for demo users)
      if ((user as any).user_type !== 'demo') {
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
      } else {
        // For demo users, store results in localStorage for the results page
        const demoResult = {
          test: test,
          answers: answers.map(answer => {
            const question = questions.find(q => q.id === answer.question_id)
            const selectedOption = question?.options.find(opt => opt.id === answer.chosen_option_id)
            return {
              question_id: answer.question_id,
              chosen_option_id: answer.chosen_option_id,
              is_correct: selectedOption?.is_correct || false,
              score: selectedOption?.is_correct ? (question?.points || 1) : 0,
              question: question
            }
          }),
          total_score: totalScore,
          submitted_at: new Date().toISOString(),
          time_remaining: timeRemaining
        }
        localStorage.setItem('demo_test_result', JSON.stringify(demoResult))
      }

      // Show success modal instead of direct redirect
      setShowSuccessModal(true)
      setCountdown(5)
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
              <div className="flex gap-2">
                <Button
                  onClick={handleBackClick}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSubmitClick}
                  size="sm"
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Send className="h-4 w-4" />
                  Submit Test
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Content - First on mobile, Left on desktop */}
          <div className="order-1 lg:order-1 lg:col-span-2">
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
                <div className="text-gray-900 text-base leading-relaxed whitespace-pre-wrap">
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

          {/* Question Navigation - Second on mobile, Right on desktop */}
          <div className="order-2 lg:order-2 lg:col-span-1">
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
                            ? 'bg-[#002E2C] text-white border-[#002E2C] hover:bg-[#002E2C]/90 hover:text-white' 
                            : hasAnswer 
                              ? 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200 hover:text-green-800' 
                              : 'hover:bg-gray-50 hover:text-gray-900'
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

      {/* Back Confirmation Modal */}
      {showBackConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <ArrowLeft className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg">⚠️ Leave Test?</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <p className="text-gray-800">Are you sure you want to go back? Your test progress will be lost and you will have to start the test again.</p>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-800 text-sm">All your answers and progress will be permanently lost.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCancelBack}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Stay in Test
                </Button>
                <Button
                  onClick={handleConfirmBack}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                >
                  Yes, Go Back
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Send className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg">🚀 Submit Test?</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <p className="text-gray-800">Are you ready to submit your test? This action cannot be undone.</p>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">Progress Summary:</span>
                  </div>
                  <div className="space-y-1 text-sm text-blue-700">
                    <div className="flex justify-between">
                      <span>Answered Questions:</span>
                      <span className="font-semibold">{answeredCount}/{questions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Remaining:</span>
                      <span className="font-semibold">{formatTime(timeRemaining)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-800 text-sm">Once submitted, you cannot make any changes to your answers.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleCancelSubmit}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Continue Test
                </Button>
                <Button
                  onClick={handleConfirmSubmit}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Test'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal with Countdown */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircle className="h-8 w-8" />
                </div>
              </div>
              <h3 className="font-bold text-2xl mb-2">🎉 Test Submitted Successfully!</h3>
              <p className="text-green-100">Your answers have been saved and processed.</p>
            </div>
            <div className="p-6 text-center">
              <div className="mb-6">
                <div className="text-6xl font-bold text-green-600 mb-2 animate-bounce">
                  {countdown}
                </div>
                <p className="text-gray-700 text-lg">
                  Your test results will be ready in <span className="font-semibold text-green-600">{countdown}</span> seconds...
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>Processing your results</span>
                <Sparkles className="h-4 w-4 animate-spin" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div className="confetti-container">
            {[...Array(100)].map((_, i) => (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'][Math.floor(Math.random() * 6)]
                }}
              />
            ))}
          </div>
          <style jsx>{`
            .confetti-container {
              position: relative;
              width: 100%;
              height: 100%;
            }
            .confetti {
              position: absolute;
              width: 10px;
              height: 10px;
              animation: confetti-fall 3s linear infinite;
            }
            @keyframes confetti-fall {
              0% {
                transform: translateY(-10vh) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(110vh) rotate(720deg);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}