'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, User, Clock, CheckCircle, XCircle, FileText } from 'lucide-react'

type AttemptDetail = {
  id: string
  user_id: string
  test_id: string
  started_at: string
  submitted_at: string | null
  total_score: number
  status: 'active' | 'submitted'
  time_remaining: number
  users: {
    full_name: string
  }
  tests: {
    title: string
    duration_minutes: number
  }
}

type AnswerDetail = {
  id: string
  question_id: string
  chosen_option_id: string | null
  is_correct: boolean
  score: number
  questions: {
    text: string
    points: number
    options: {
      id: string
      label: string
      is_correct: boolean
    }[]
  }
}

export default function AttemptDetailPage() {
  const router = useRouter()
  const params = useParams()
  const attemptId = params?.id as string

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null)
  const [answers, setAnswers] = useState<AnswerDetail[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (!adminUser) {
      router.push('/admin/login')
      return
    }

    if (attemptId) {
      fetchAttemptDetails()
    }
  }, [router, attemptId])

  const fetchAttemptDetails = async () => {
    try {
      // Fetch attempt details
      const { data: attemptData, error: attemptError } = await supabase
        .from('attempts')
        .select(`
          *,
          users (full_name),
          tests (title, duration_minutes)
        `)
        .eq('id', attemptId)
        .single()

      if (attemptError) throw attemptError
      setAttempt(attemptData)

      // Fetch ALL questions from the test (not just answered ones)
      const { data: allQuestionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          text,
          points,
          options (id, label, is_correct)
        `)
        .eq('test_id', attemptData.test_id)
        .order('created_at')

      if (questionsError) throw questionsError

      // Fetch answers for this attempt
      const { data: answersData, error: answersError } = await supabase
        .from('answers')
        .select('*')
        .eq('attempt_id', attemptId)

      if (answersError) throw answersError

      // Combine questions with answers to show complete picture
      const questionsWithAnswers = (allQuestionsData || []).map(question => {
        const answer = (answersData || []).find(a => a.question_id === question.id)
        return {
          id: answer?.id || `unanswered-${question.id}`,
          question_id: question.id,
          chosen_option_id: answer?.chosen_option_id || null,
          is_correct: answer?.is_correct || false,
          score: answer?.score || 0,
          questions: question
        }
      })

      setAnswers(questionsWithAnswers)
    } catch (error) {
      console.error('Error fetching attempt details:', error)
      setError('Failed to load attempt details')
    } finally {
      setIsLoading(false)
    }
  }

  const getCorrectAnswer = (question: any) => {
    return question.options.find((opt: any) => opt.is_correct)
  }

  const getChosenAnswer = (questionId: string) => {
    const answer = answers.find(a => a.question_id === questionId)
    if (!answer?.chosen_option_id) return null
    
    const question = answers.find(a => a.question_id === questionId)?.questions
    return question?.options.find(opt => opt.id === answer.chosen_option_id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || 'Attempt not found'}</p>
          <Link href="/admin/results">
            <Button>Back to Results</Button>
          </Link>
        </div>
      </div>
    )
  }

  const correctAnswers = answers.filter(a => a.is_correct).length
  const totalQuestions = answers.length
  const percentage = totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/results">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Results
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Attempt Details</h1>
                <p className="text-sm text-gray-600">{attempt.users.full_name} - {attempt.tests.title}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Student</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{attempt.users.full_name}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{color: '#002E2C'}}>{attempt.total_score}</div>
              <p className="text-xs text-muted-foreground">
                {correctAnswers}/{totalQuestions} correct ({percentage}%)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {attempt.submitted_at 
                  ? `${Math.floor((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 60000)} min`
                  : 'In Progress'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Allowed: {attempt.tests.duration_minutes} min
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={attempt.status === 'submitted' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}>
                {attempt.status === 'submitted' ? 'Completed' : 'In Progress'}
              </Badge>
              {attempt.submitted_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(attempt.submitted_at).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Answers */}
        <Card>
          <CardHeader>
            <CardTitle>Question-wise Analysis</CardTitle>
            <CardDescription>
              Detailed breakdown of answers for each question
            </CardDescription>
          </CardHeader>
          <CardContent>
            {answers.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No answers found</h3>
                <p className="text-gray-600">This attempt has no recorded answers.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {answers.map((answer, index) => {
                  const correctAnswer = getCorrectAnswer(answer.questions)
                  const chosenAnswer = getChosenAnswer(answer.question_id)
                  
                  return (
                    <div key={answer.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Question {index + 1} ({answer.questions.points} points)
                          </h4>
                          <p className="text-gray-700 mb-3">{answer.questions.text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {answer.is_correct ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          <Badge variant={answer.is_correct ? "default" : "destructive"}>
                            {answer.score} pts
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {answer.questions.options.map((option) => {
                          const isChosen = chosenAnswer?.id === option.id
                          const isCorrect = option.is_correct
                          
                          return (
                            <div
                              key={option.id}
                              className={`p-2 rounded border ${
                                isChosen && isCorrect
                                  ? 'bg-green-50 border-green-200'
                                  : isChosen && !isCorrect
                                  ? 'bg-red-50 border-red-200'
                                  : isCorrect
                                  ? 'bg-[#002E2C]/10 border-[#002E2C]'
                                  : 'bg-gray-50 border-gray-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">{option.label}</span>
                                <div className="flex items-center gap-2">
                                  {isChosen && (
                                    <Badge variant="outline" className="text-xs">
                                      Selected
                                    </Badge>
                                  )}
                                  {isCorrect && (
                                    <Badge variant="default" className="text-xs bg-green-600">
                                      Correct
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {!chosenAnswer && (
                        <p className="text-sm text-gray-500 mt-2 italic">No answer selected</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
