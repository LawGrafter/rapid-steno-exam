'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft, 
  XCircle, 
  CheckCircle, 
  FileText, 
  AlertTriangle,
  Target,
  BookOpen
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export default function MistakesPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [testData, setTestData] = useState<any>(null)
  const [mistakes, setMistakes] = useState<any[]>([])

  useEffect(() => {
    loadMistakes()
  }, [])

  const loadMistakes = async () => {
    try {
      console.log('Starting to load mistakes...')
      setLoading(true)
      setError('')

      const user = getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      if (!params?.id) {
        setError('No test ID provided')
        setLoading(false)
        return
      }

      console.log('Fetching attempt:', params.id)

      // Get basic attempt info
      const { data: attempt, error: attemptError } = await supabase
        .from('attempts')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user.id)
        .single()

      if (attemptError) {
        console.error('Attempt error:', attemptError)
        setError('Could not find test attempt')
        setLoading(false)
        return
      }

      console.log('Found attempt:', attempt)

      // Get test info
      const { data: test, error: testError } = await supabase
        .from('tests')
        .select('*')
        .eq('id', attempt.test_id)
        .single()

      if (testError) {
        console.error('Test error:', testError)
        setError('Could not load test details')
        setLoading(false)
        return
      }

      console.log('Found test:', test)

      // Get wrong answers only
      const { data: wrongAnswers, error: answersError } = await supabase
        .from('answers')
        .select(`
          *,
          questions(*)
        `)
        .eq('attempt_id', params.id)
        .eq('is_correct', false)
        .not('chosen_option_id', 'is', null)

      if (answersError) {
        console.error('Answers error:', answersError)
        setError('Could not load answers')
        setLoading(false)
        return
      }

      console.log('Found wrong answers:', wrongAnswers)

      // Get options for wrong answers
      if (wrongAnswers && wrongAnswers.length > 0) {
        const questionIds = wrongAnswers.map((a: any) => a.question_id)
        const { data: options, error: optionsError } = await supabase
          .from('options')
          .select('*')
          .in('question_id', questionIds)

        if (optionsError) {
          console.error('Options error:', optionsError)
          setError('Could not load options')
          setLoading(false)
          return
        }

        console.log('Found options:', options)

        // Combine data
        const mistakesWithOptions = wrongAnswers.map((answer: any) => ({
          ...answer,
          options: options?.filter((opt: any) => opt.question_id === answer.question_id) || []
        }))

        setMistakes(mistakesWithOptions)
      } else {
        setMistakes([])
      }

      setTestData({ ...attempt, test })
      setLoading(false)

    } catch (err) {
      console.error('Load mistakes error:', err)
      setError('Something went wrong loading mistakes')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your mistakes...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Mistakes</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => router.push('/account')} className="w-full">
                Back to Account
              </Button>
              <Button onClick={loadMistakes} variant="outline" className="w-full">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No test data found.</p>
            <Button onClick={() => router.push('/account')} className="w-full">
              Back to Account
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/account')}
                className="text-white hover:bg-white/20 p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-bold text-xl">Mistakes Review</h1>
                  <p className="text-red-100 opacity-90">{testData?.test?.title || 'Test'}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-red-600">{mistakes.length}</div>
                <div className="text-sm text-gray-500">Wrong Answers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {testData?.submitted_at ? new Date(testData.submitted_at).toLocaleDateString() : '-'}
                </div>
                <div className="text-sm text-gray-500">Test Date</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{testData?.test?.duration_minutes || '-'}</div>
                <div className="text-sm text-gray-500">Duration (min)</div>
              </div>
            </div>
          </div>
        </Card>

        {/* No Mistakes Message */}
        {mistakes.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Perfect Score!</h2>
              <p className="text-gray-600 mb-6">
                You didn't make any mistakes in this test. Congratulations!
              </p>
              <Button onClick={() => router.push('/account')}>
                Back to Account
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Mistakes List */}
        {mistakes.length > 0 && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-red-500" />
                Questions You Got Wrong ({mistakes.length})
              </CardTitle>
              <p className="text-sm text-gray-600">
                Review these questions to improve your understanding.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mistakes.map((mistake: any, index: number) => (
                  <div key={index} className="p-6 rounded-lg border-2 bg-red-50 border-red-200">
                    {/* Question Header */}
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        Question {index + 1}
                      </h3>
                      <Badge variant="destructive" className="bg-red-100 text-red-800">
                        ✗ Incorrect
                      </Badge>
                    </div>

                    {/* Question Text */}
                    <div className="mb-6 p-4 bg-white rounded-lg border">
                      <div className="flex items-start gap-2">
                        <BookOpen className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-800 leading-relaxed font-medium">
                          {mistake.questions?.text || 'Question text not available'}
                        </p>
                      </div>
                    </div>

                    {/* Answer Options */}
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-700 mb-3">Answer Options:</h4>
                      {(mistake.options || []).map((option: any, optionIndex: number) => (
                        <div 
                          key={optionIndex}
                          className={`p-4 rounded-lg border-2 ${
                            option.is_correct 
                              ? 'bg-green-100 border-green-300' 
                              : option.id === mistake.chosen_option_id 
                                ? 'bg-red-100 border-red-300' 
                                : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`flex-1 ${
                              option.is_correct 
                                ? 'text-green-800 font-medium' 
                                : option.id === mistake.chosen_option_id 
                                  ? 'text-red-800' 
                                  : 'text-gray-700'
                            }`}>
                              {option.label || 'Option not available'}
                            </span>
                            <div className="flex items-center gap-2">
                              {option.is_correct && (
                                <Badge className="bg-green-600 text-white">
                                  ✓ Correct Answer
                                </Badge>
                              )}
                              {option.id === mistake.chosen_option_id && !option.is_correct && (
                                <Badge variant="destructive">
                                  Your Answer
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Explanation Section */}
                    <div className="mt-6 pt-4 border-t border-red-200">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h5 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Correct Answer
                        </h5>
                        <p className="text-green-700">
                          <strong>{mistake.options?.find((opt: any) => opt.is_correct)?.label || 'Not available'}</strong>
                        </p>
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-600">
                        <span>Points for this question: </span>
                        <span className="font-medium">{mistake.questions?.points || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => router.push('/account')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Account
          </Button>
          <Button
            onClick={() => router.push('/tests')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Take More Tests
          </Button>
        </div>
      </div>
    </div>
  )
}
