'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, BookOpen, CheckCircle, XCircle, Clock, FileText, Trophy, Target } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface TestResult {
  id: string
  test_id: string
  user_id: string
  total_score: number
  status: string
  submitted_at: string
  test: {
    title: string
    description: string
    duration_minutes: number
    questions: Array<{
      id: string
    }>
  }
  answers: Array<{
    question_id: string
    chosen_option_id: string | null
    is_correct: boolean
    score: number
    question: {
      text: string
      points: number
      options: Array<{
        id: string
        label: string
        is_correct: boolean
      }>
    }
  }>
}

export default function RevisionPage() {
  const router = useRouter()
  const params = useParams()
  const user = getCurrentUser()
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    // Check if user is demo and block access
    if ((user as any).user_type === 'demo') {
      setError('Mock Revision is not available for demo users. Please upgrade to access this feature.')
      setLoading(false)
      return
    }
    
    fetchTestResult()
  }, [user, router, params.id])

  const fetchTestResult = async () => {
    if (!user || !params.id) return
    
    try {
      const { data, error } = await supabase
        .from('attempts')
        .select(`
          *,
          test:tests(
            title, 
            description, 
            duration_minutes,
            questions(id)
          ),
          answers(
            question_id,
            chosen_option_id,
            is_correct,
            score,
            question:questions(
              text,
              points,
              options(id, label, is_correct)
            )
          )
        `)
        .eq('id', params.id)
        .eq('user_id', user.id)
        .eq('status', 'submitted')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Test result not found or you do not have permission to view it.')
        } else {
          throw error
        }
        return
      }
      
      setTestResult(data)
    } catch (error) {
      console.error('Error fetching test result:', error)
      setError('Failed to load test result. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <LoadingSpinner className="h-12 w-12 mx-auto mb-4" />
          <p className="text-gray-600">Loading revision materials...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => router.push('/tests')} className="w-full">
                Back to Tests
              </Button>
              <Button onClick={() => router.push('/account')} variant="outline" className="w-full">
                My Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!testResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Test Not Found</h2>
            <p className="text-gray-600 mb-4">The requested test result could not be found.</p>
            <Button onClick={() => router.push('/tests')} className="w-full">
              Back to Tests
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalQuestions = testResult.test.questions?.length || testResult.answers.length
  const correctAnswers = testResult.answers.filter(a => a.is_correct && a.chosen_option_id).length
  const incorrectAnswers = testResult.answers.filter(a => !a.is_correct && a.chosen_option_id).length
  const unanswered = testResult.answers.filter(a => !a.chosen_option_id).length
  const percentage = Math.round((testResult.total_score / totalQuestions) * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-3 py-4 sm:p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/tests')}
            variant="outline"
            className="mb-4 border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Button>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <div className="p-4 sm:p-6 text-white" style={{ background: 'linear-gradient(to right, #01342F, #078F65)' }}>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2 sm:p-3 bg-white/20 rounded-full flex-shrink-0">
                  <BookOpen className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold">Mock Revision</h1>
                  <p className="text-white/80 text-sm sm:text-base truncate">{testResult.test.title}</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center">
                <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-gray-700">{totalQuestions}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Total Questions</div>
                </div>
                <div className="p-2 sm:p-3 bg-green-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-green-600">{correctAnswers}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Correct</div>
                </div>
                <div className="p-2 sm:p-3 bg-red-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-red-600">{incorrectAnswers}</div>
                  <div className="text-xs sm:text-sm text-gray-500">Incorrect</div>
                </div>
                <div className="p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">{percentage}%</div>
                  <div className="text-xs sm:text-sm text-gray-500">Score</div>
                </div>
              </div>
              
              <div className="mt-4 text-center text-sm text-gray-600">
                <p>Review all questions and their correct answers to improve your understanding</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Questions Review */}
        <div className="space-y-4 sm:space-y-6">
          {testResult.answers.map((answer, index) => (
            <Card key={answer.question_id} className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                  <CardTitle className="text-base sm:text-lg text-gray-900">
                    Question {index + 1}
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant={answer.is_correct && answer.chosen_option_id ? "default" : answer.chosen_option_id ? "destructive" : "secondary"}
                      className={`${
                        answer.is_correct && answer.chosen_option_id 
                          ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                          : answer.chosen_option_id 
                            ? 'bg-red-100 text-red-800 hover:bg-red-100' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      {answer.is_correct && answer.chosen_option_id ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Correct
                        </>
                      ) : answer.chosen_option_id ? (
                        <>
                          <XCircle className="h-3 w-3 mr-1" />
                          Incorrect
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Unanswered
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {answer.question.points} pts
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 sm:p-6 pt-0">
                {/* Question Text */}
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm sm:text-base text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {answer.question.text}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-2 sm:space-y-3">
                  {answer.question.options.map((option) => (
                    <div 
                      key={option.id}
                      className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                        option.is_correct 
                          ? 'bg-green-50 border-green-300 shadow-sm' 
                          : option.id === answer.chosen_option_id 
                            ? 'bg-red-50 border-red-300 shadow-sm' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="flex-1 text-sm sm:text-base text-gray-800">{option.label}</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {option.is_correct && (
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Correct Answer
                            </Badge>
                          )}
                          {option.id === answer.chosen_option_id && !option.is_correct && (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Your Answer
                            </Badge>
                          )}
                          {option.id === answer.chosen_option_id && option.is_correct && (
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Your Answer ✓
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Explanation or Additional Info */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Points: <span className="font-medium">{answer.question.points}</span></span>
                    {answer.chosen_option_id && (
                      <span>
                        Your Score: <span className={`font-medium ${answer.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                          {answer.is_correct ? answer.question.points : 0} / {answer.question.points}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 mb-6">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => router.push('/tests')}
                  className="text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  style={{
                    background: 'linear-gradient(to right, #01342F, #078F65)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, #012b26, #066b4f)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, #01342F, #078F65)'
                  }}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Take More Tests
                </Button>
                <Button
                  onClick={() => router.push('/account')}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  View All Results
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Keep practicing to improve your performance!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
