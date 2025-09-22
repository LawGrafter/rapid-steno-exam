'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Trophy, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  Download,
  Eye,
  BarChart3,
  Award,
  FileText,
  CheckCircle,
  XCircle,
  Minus,
  AlertTriangle
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Head from 'next/head'

interface TestAttempt {
  id: string
  test_id: string
  status: string
  total_score: number
  submitted_at: string
  started_at: string
  test: {
    title: string
    description: string
    duration_minutes: number
    questions: Array<{
      id: string
    }>
  }
  answers: Array<{
    is_correct: boolean
    chosen_option_id: string | null
  }>
}

interface UserStats {
  totalTests: number
  completedTests: number
  averageScore: number
  totalTimeSpent: number
  bestScore: number
  recentActivity: TestAttempt[]
}

export default function MyAccountPage() {
  const router = useRouter()
  const user = getCurrentUser()
  const [attempts, setAttempts] = useState<TestAttempt[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    // Block demo users from accessing account page
    if ((user as any).user_type === 'demo') {
      router.push('/tests?demo=true')
      return
    }
    
    fetchUserData()
  }, [user, router])

  const fetchUserData = async () => {
    if (!user) return

    try {
      // Fetch all user attempts
      const { data: attemptData, error } = await supabase
        .from('attempts')
        .select(`
          *,
          test:tests(
            title, 
            description, 
            duration_minutes,
            questions(id)
          ),
          answers(is_correct, chosen_option_id)
        `)
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })

      if (error) throw error

      setAttempts(attemptData || [])

      // Calculate statistics
      const completedAttempts = attemptData?.filter((a: any) => a.status === 'submitted') || []
      const totalQuestions = completedAttempts.reduce((sum: number, attempt: any) => 
        sum + (attempt.test?.questions?.length || attempt.answers.length), 0
      )
      const totalCorrect = completedAttempts.reduce((sum: number, attempt: any) => 
        sum + attempt.total_score, 0
      )

      const userStats: UserStats = {
        totalTests: attemptData?.length || 0,
        completedTests: completedAttempts.length,
        averageScore: completedAttempts.length > 0 
          ? Math.round((totalCorrect / totalQuestions) * 100) || 0 
          : 0,
        totalTimeSpent: completedAttempts.reduce((sum, attempt) => 
          sum + (attempt.test?.duration_minutes || 0), 0
        ),
        bestScore: completedAttempts.length > 0 
          ? Math.max(...completedAttempts.map((a: any) => {
            const totalQs = a.test?.questions?.length || a.answers.length
            return totalQs > 0 ? Math.round((a.total_score / totalQs) * 100) : 0
          })) 
          : 0,
        recentActivity: attemptData?.slice(0, 5) || []
      }

      setStats(userStats)
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadTestReport = async (attemptId: string, testTitle: string) => {
    try {
      const { data, error } = await supabase
        .from('attempts')
        .select(`
          *,
          test:tests(title, description, duration_minutes),
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
        .eq('id', attemptId)
        .single()

      if (error) throw error

      // Generate PDF report (reuse the PDF generation logic from submitted page)
      const totalQuestions = data.answers.length
      const correctAnswers = data.answers.filter((a: any) => a.is_correct).length
      const incorrectAnswers = data.answers.filter((a: any) => !a.is_correct && a.chosen_option_id).length
      const unanswered = data.answers.filter((a: any) => !a.chosen_option_id).length
      const percentage = Math.round((data.total_score / totalQuestions) * 100)

      // Create PDF content (simplified version)
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Test Result - ${testTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { text-align: center; border-bottom: 2px solid #002E2C; padding-bottom: 20px; margin-bottom: 30px; }
              .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
              .stat-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="color: #002E2C;">RAPID STENO EXAM</h1>
              <h2 style="color: #059669;">Test Result Report</h2>
            </div>
            <div class="stats">
              <div class="stat-card">
                <h3>Score: ${data.total_score}/${totalQuestions}</h3>
                <p>Percentage: ${percentage}%</p>
              </div>
              <div class="stat-card">
                <h3>Breakdown</h3>
                <p>Correct: ${correctAnswers} | Incorrect: ${incorrectAnswers} | Unanswered: ${unanswered}</p>
              </div>
            </div>
            <p><strong>Test:</strong> ${testTitle}</p>
            <p><strong>Student:</strong> ${user?.full_name || user?.email}</p>
            <p><strong>Date:</strong> ${new Date(data.submitted_at).toLocaleString()}</p>
          </body>
          </html>
        `)
        printWindow.document.close()
        setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }
    } catch (error) {
      console.error('Error downloading report:', error)
    }
  }

  const getScoreDisplay = (attempt: TestAttempt) => {
    if (attempt.status !== 'submitted') return '-'
    
    const totalQuestions = attempt.test.questions?.length || attempt.answers.length
    const percentage = totalQuestions > 0 ? Math.round((attempt.total_score / totalQuestions) * 100) : 0
    
    return `${attempt.total_score}/${totalQuestions} (${percentage}%)`
  }

  const getDetailedStats = (attempt: TestAttempt) => {
    if (attempt.status !== 'submitted') return null
    
    const totalQuestions = attempt.test.questions?.length || attempt.answers.length
    const correctAnswers = attempt.total_score
    const wrongAnswers = attempt.answers.filter(a => !a.is_correct && a.chosen_option_id).length
    const unanswered = attempt.answers.filter(a => !a.chosen_option_id).length
    const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    
    return {
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      unanswered,
      percentage
    }
  }

  const getPerformanceRemark = (percentage: number) => {
    if (percentage >= 90) return { text: "Excellent! Outstanding performance!", color: "text-green-600", bg: "bg-green-50", border: "border-green-200" }
    if (percentage >= 80) return { text: "Great job! Very good performance!", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" }
    if (percentage >= 70) return { text: "Good work! Above average performance!", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200" }
    if (percentage >= 60) return { text: "Fair performance. Room for improvement!", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" }
    if (percentage >= 50) return { text: "Below average. More practice needed!", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" }
    return { text: "Needs significant improvement. Keep practicing!", color: "text-red-700", bg: "bg-red-100", border: "border-red-300" }
  }

  const getStatusBadge = (attempt: TestAttempt) => {
    if (attempt.status === 'submitted') {
      return <Badge className="bg-green-100 text-green-800">Completed</Badge>
    } else {
      return <Badge variant="secondary">In Progress</Badge>
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>My Account - Rapid Steno Exam</title>
      </Head>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-gray-900">My Account</CardTitle>
                  <p className="text-gray-600">{user.full_name || user.email}</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button onClick={() => router.push('/tests')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Browse Tests
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-blue-600">{stats?.totalTests || 0}</div>
                <p className="text-xs text-gray-600">Total Tests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-green-600">{stats?.completedTests || 0}</div>
                <p className="text-xs text-gray-600">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-yellow-600">{stats?.averageScore || 0}%</div>
                <p className="text-xs text-gray-600">Average Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-6 w-6 text-purple-500 mx-auto mb-1" />
                <div className="text-xl font-bold text-purple-600">{stats?.bestScore || 0}%</div>
                <p className="text-xs text-gray-600">Best Score</p>
              </CardContent>
            </Card>
          </div>

          {/* Test History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Test History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {attempts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No tests taken yet</p>
                  <Button 
                    onClick={() => router.push('/tests')} 
                    className="mt-4"
                  >
                    Browse Tests
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {attempts.map((attempt) => {
                    const stats = getDetailedStats(attempt)
                    const remark = stats ? getPerformanceRemark(stats.percentage) : null
                    
                    return (
                      <Card key={attempt.id} className="border-2 hover:shadow-md transition-shadow duration-200">
                        <CardContent className="p-6">
                          {/* Test Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <h3 className="font-bold text-lg text-gray-900 mb-1">{attempt.test.title}</h3>
                              <p className="text-sm text-gray-600 mb-2">{attempt.test.description || 'General Test'}</p>
                              
                              {/* Date and Duration */}
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(attempt.started_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {attempt.test.duration_minutes} min
                                </span>
                              </div>
                            </div>
                            
                            {/* Status Badge */}
                            <div className="self-start">
                              {getStatusBadge(attempt)}
                            </div>
                          </div>

                          {/* Score and Statistics */}
                          {attempt.status === 'submitted' && stats ? (
                            <div className="space-y-4">
                              {/* Score Overview */}
                              <div className="bg-gray-50 rounded-lg p-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                  <div>
                                    <div className="text-2xl font-bold text-blue-600">{stats.percentage}%</div>
                                    <div className="text-xs text-gray-500">Score</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold text-green-600">{stats.correctAnswers}</div>
                                    <div className="text-xs text-gray-500">Correct</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold text-red-600">{stats.wrongAnswers}</div>
                                    <div className="text-xs text-gray-500">Wrong</div>
                                  </div>
                                  <div>
                                    <div className="text-2xl font-bold text-gray-600">{stats.correctAnswers}/{stats.totalQuestions}</div>
                                    <div className="text-xs text-gray-500">Score</div>
                                  </div>
                                </div>
                              </div>

                              {/* Performance Remark */}
                              {remark && (
                                <div className={`p-3 rounded-lg border ${remark.bg} ${remark.border}`}>
                                  <div className="flex items-center gap-2">
                                    <Trophy className={`h-4 w-4 ${remark.color}`} />
                                    <span className={`text-sm font-medium ${remark.color}`}>
                                      {remark.text}
                                    </span>
                                  </div>
                                </div>
                              )}

                              {/* Progress Bar */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Progress</span>
                                  <span className="font-medium">{stats.correctAnswers}/{stats.totalQuestions}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                      stats.percentage >= 80 ? 'bg-green-500' :
                                      stats.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${stats.percentage}%` }}
                                  ></div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex gap-2 pt-2">
                                {stats.wrongAnswers > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.push(`/mistakes/${attempt.id}`)}
                                    className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                                  >
                                    <AlertTriangle className="h-3 w-3" />
                                    View {stats.wrongAnswers} Mistake{stats.wrongAnswers !== 1 ? 's' : ''}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            /* In Progress Test */
                            <div className="flex items-center justify-between pt-2">
                              <div className="text-sm text-gray-600">
                                Test in progress...
                              </div>
                              <Button
                                size="sm"
                                onClick={() => router.push(`/test/${attempt.test_id}`)}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Continue Test
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </>
  )
}
