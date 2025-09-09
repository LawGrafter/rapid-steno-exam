'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, TrendingUp, Users, FileText, Clock, Award, BarChart3 } from 'lucide-react'

type AnalyticsData = {
  totalAttempts: number
  completedAttempts: number
  activeAttempts: number
  totalStudents: number
  totalTests: number
  averageScore: number
  averageCompletionTime: number
  topPerformers: Array<{
    student_name: string
    test_title: string
    test_category: string
    score: number
    completion_time: number
  }>
  testPerformance: Array<{
    test_title: string
    total_attempts: number
    completed_attempts: number
    average_score: number
  }>
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalAttempts: 0,
    completedAttempts: 0,
    activeAttempts: 0,
    totalStudents: 0,
    totalTests: 0,
    averageScore: 0,
    averageCompletionTime: 0,
    topPerformers: [],
    testPerformance: []
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (!adminUser) {
      router.push('/admin/login')
      return
    }

    fetchAnalytics()
  }, [router])

  const fetchAnalytics = async () => {
    try {
      // Fetch basic counts
      const [
        attemptsResult,
        completedResult,
        activeResult,
        studentsResult,
        testsResult
      ] = await Promise.all([
        supabase.from('attempts').select('id', { count: 'exact' }),
        supabase.from('attempts').select('id', { count: 'exact' }).eq('status', 'submitted'),
        supabase.from('attempts').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('tests').select('id', { count: 'exact' })
      ])

      // Fetch average score for completed attempts
      const { data: scoreData } = await supabase
        .from('attempts')
        .select('total_score')
        .eq('status', 'submitted')

      const averageScore = scoreData && scoreData.length > 0
        ? scoreData.reduce((sum, attempt) => sum + attempt.total_score, 0) / scoreData.length
        : 0

      // Fetch top performers (last 10 completed attempts with highest scores)
      const { data: topPerformersData } = await supabase
        .from('attempts')
        .select(`
          total_score,
          started_at,
          submitted_at,
          users (full_name),
          tests (title, category)
        `)
        .eq('status', 'submitted')
        .order('total_score', { ascending: false })
        .limit(5)

      const topPerformers = (topPerformersData || []).map(attempt => ({
        student_name: (attempt.users as any)?.full_name || 'Unknown',
        test_title: (attempt.tests as any)?.title || 'Unknown Test',
        test_category: (attempt.tests as any)?.category || 'General',
        score: attempt.total_score,
        completion_time: attempt.submitted_at && attempt.started_at
          ? Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 60000)
          : 0
      }))

      // Fetch test performance data
      const { data: testPerformanceData } = await supabase
        .from('tests')
        .select(`
          id,
          title,
          attempts (
            id,
            status,
            total_score
          )
        `)

      const testPerformance = (testPerformanceData || []).map(test => {
        const attempts = test.attempts || []
        const completedAttempts = attempts.filter(a => a.status === 'submitted')
        const averageScore = completedAttempts.length > 0
          ? completedAttempts.reduce((sum, a) => sum + a.total_score, 0) / completedAttempts.length
          : 0

        return {
          test_title: test.title,
          total_attempts: attempts.length,
          completed_attempts: completedAttempts.length,
          average_score: Math.round(averageScore * 10) / 10
        }
      })

      // Calculate average completion time
      const completedAttempts = topPerformersData || []
      const averageCompletionTime = completedAttempts.length > 0
        ? completedAttempts.reduce((sum, attempt) => {
            if (attempt.submitted_at && attempt.started_at) {
              return sum + (new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / 60000
            }
            return sum
          }, 0) / completedAttempts.length
        : 0

      setAnalytics({
        totalAttempts: attemptsResult.count || 0,
        completedAttempts: completedResult.count || 0,
        activeAttempts: activeResult.count || 0,
        totalStudents: studentsResult.count || 0,
        totalTests: testsResult.count || 0,
        averageScore: Math.round(averageScore * 10) / 10,
        averageCompletionTime: Math.round(averageCompletionTime),
        topPerformers,
        testPerformance
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  const completionRate = analytics.totalAttempts > 0 
    ? Math.round((analytics.completedAttempts / analytics.totalAttempts) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-600">Comprehensive test performance analytics</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{color: '#002E2C'}}>{analytics.totalAttempts}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.completedAttempts} completed, {analytics.activeAttempts} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics.completedAttempts} of {analytics.totalAttempts} attempts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{analytics.averageScore}</div>
              <p className="text-xs text-muted-foreground">
                Across all completed tests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{analytics.averageCompletionTime}m</div>
              <p className="text-xs text-muted-foreground">
                Average completion time
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Performers
              </CardTitle>
              <CardDescription>
                Highest scoring students across all tests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.topPerformers.length === 0 ? (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No completed attempts yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-[#002E2C]'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{performer.student_name}</p>
                          <p className="text-sm text-gray-600">{performer.test_title}</p>
                          <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block mt-1">
                            {performer.test_category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-green-600">{performer.score}</p>
                        <p className="text-xs text-gray-500">{performer.completion_time}m</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Test Performance
              </CardTitle>
              <CardDescription>
                Performance breakdown by test
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.testPerformance.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No tests available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {analytics.testPerformance.map((test, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{test.test_title}</h4>
                        <span className="text-sm font-bold text-blue-600">
                          Avg: {test.average_score}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>{test.completed_attempts} completed</span>
                        <span>{test.total_attempts} total attempts</span>
                      </div>
                      <div className="mt-2 bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            backgroundColor: '#002E2C',
                            width: `${test.total_attempts > 0 ? (test.completed_attempts / test.total_attempts) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Students:</span>
                <span className="font-medium">{analytics.totalStudents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Tests:</span>
                <span className="font-medium">{analytics.totalTests}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Active Attempts:</span>
                <span className="font-medium text-yellow-600">{analytics.activeAttempts}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Completion Rate:</span>
                <span className="font-medium text-green-600">{completionRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Score:</span>
                <span className="font-medium text-purple-600">{analytics.averageScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Time:</span>
                <span className="font-medium text-orange-600">{analytics.averageCompletionTime}m</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/results">
                <Button className="w-full" variant="outline">
                  View All Results
                </Button>
              </Link>
              <Link href="/admin/tests">
                <Button className="w-full" variant="outline">
                  Manage Tests
                </Button>
              </Link>
              <Link href="/admin/dashboard">
                <Button className="w-full">
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
