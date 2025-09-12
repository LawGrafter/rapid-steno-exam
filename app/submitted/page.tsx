'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, ExternalLink, Download, Trophy, Target, Clock, FileText } from 'lucide-react'
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
    chosen_option_id: string
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

export default function SubmittedPage() {
  const router = useRouter()
  const user = getCurrentUser()
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchLatestTestResult()
  }, [user, router])

  const fetchLatestTestResult = async () => {
    if (!user) return
    
    try {
      // First, let's check if there are any attempts at all
      const { data: allAttempts, error: allError } = await supabase
        .from('attempts')
        .select('*')
        .eq('user_id', user.id)

      console.log('All attempts for user:', allAttempts)

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
        .eq('user_id', user.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(1)

      if (error) throw error
      
      console.log('Fetched data:', data)
      
      // Handle both single result and array result
      if (Array.isArray(data)) {
        setTestResult(data.length > 0 ? data[0] : null)
      } else {
        setTestResult(data)
      }
    } catch (error) {
      console.error('Error fetching test result:', error)
      console.error('Error details:', error)
    } finally {
      setLoading(false)
    }
  }

  const downloadResultAsPDF = () => {
    if (!testResult) return

    const totalQuestions = testResult.answers.length
    const correctAnswers = testResult.answers.filter(a => a.is_correct).length
    const incorrectAnswers = testResult.answers.filter(a => !a.is_correct && a.chosen_option_id).length
    const unanswered = testResult.answers.filter(a => !a.chosen_option_id).length
    const percentage = Math.round((testResult.total_score / totalQuestions) * 100)
    const grade = percentage >= 90 ? 'Excellent' : percentage >= 75 ? 'Good' : percentage >= 60 ? 'Average' : 'Needs Improvement'

    // Create a hidden div with the PDF content
    const pdfContent = document.createElement('div')
    pdfContent.style.position = 'absolute'
    pdfContent.style.left = '-9999px'
    pdfContent.style.width = '210mm'
    pdfContent.style.padding = '20mm'
    pdfContent.style.fontFamily = 'Arial, sans-serif'
    pdfContent.style.fontSize = '12px'
    pdfContent.style.lineHeight = '1.5'
    pdfContent.style.backgroundColor = 'white'

    pdfContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #002E2C; padding-bottom: 20px;">
        <h1 style="color: #002E2C; font-size: 24px; margin: 0; font-weight: bold;">RAPID STENO EXAM</h1>
        <h2 style="color: #059669; font-size: 18px; margin: 10px 0 0 0;">Test Result Report</h2>
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="color: #002E2C; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Student Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 30%;">Student Name:</td>
            <td style="padding: 8px 0;">${user?.full_name || user?.email || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Test Title:</td>
            <td style="padding: 8px 0;">${testResult.test.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Category:</td>
            <td style="padding: 8px 0;">${testResult.test.description || 'General'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Submitted:</td>
            <td style="padding: 8px 0;">${new Date(testResult.submitted_at).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Duration:</td>
            <td style="padding: 8px 0;">${testResult.test.duration_minutes} minutes</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="color: #002E2C; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Score Summary</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px;">
          <div style="text-align: center; padding: 15px; background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #0ea5e9;">${testResult.total_score}/${totalQuestions}</div>
            <div style="color: #64748b; font-size: 14px;">Total Score</div>
          </div>
          <div style="text-align: center; padding: 15px; background-color: #fefce8; border: 2px solid #eab308; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: bold; color: #eab308;">${percentage}%</div>
            <div style="color: #64748b; font-size: 14px;">${grade}</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
          <div style="text-align: center; padding: 12px; background-color: #f0fdf4; border: 1px solid #22c55e; border-radius: 6px;">
            <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${correctAnswers}</div>
            <div style="color: #15803d; font-size: 12px;">Correct</div>
          </div>
          <div style="text-align: center; padding: 12px; background-color: #fef2f2; border: 1px solid #ef4444; border-radius: 6px;">
            <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${incorrectAnswers}</div>
            <div style="color: #dc2626; font-size: 12px;">Incorrect</div>
          </div>
          <div style="text-align: center; padding: 12px; background-color: #f9fafb; border: 1px solid #6b7280; border-radius: 6px;">
            <div style="font-size: 20px; font-weight: bold; color: #6b7280;">${unanswered}</div>
            <div style="color: #4b5563; font-size: 12px;">Unanswered</div>
          </div>
        </div>
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="color: #002E2C; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">Detailed Answer Analysis</h3>
        ${testResult.answers.map((answer, index) => `
          <div style="margin-bottom: 15px; padding: 12px; border: 1px solid #e5e7eb; border-radius: 6px; ${answer.is_correct ? 'background-color: #f0fdf4; border-color: #22c55e;' : answer.chosen_option_id ? 'background-color: #fef2f2; border-color: #ef4444;' : 'background-color: #f9fafb; border-color: #6b7280;'}">
            <div style="font-weight: bold; margin-bottom: 8px; color: #002E2C;">
              Question ${index + 1} 
              <span style="float: right; ${answer.is_correct ? 'color: #22c55e;' : answer.chosen_option_id ? 'color: #ef4444;' : 'color: #6b7280;'}">${answer.is_correct ? '✓ Correct' : answer.chosen_option_id ? '✗ Incorrect' : '— Unanswered'}</span>
            </div>
            <div style="margin-bottom: 8px; color: #374151;">${answer.question.text}</div>
            <div style="font-size: 11px; color: #6b7280;">
              <strong>Your Answer:</strong> ${answer.question.options.find(opt => opt.id === answer.chosen_option_id)?.label || 'Not answered'}<br>
              <strong>Correct Answer:</strong> ${answer.question.options.find(opt => opt.is_correct)?.label || 'N/A'}<br>
              <strong>Points:</strong> ${answer.question.points}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 30px; text-align: center; padding-top: 20px; border-top: 2px solid #e5e7eb; color: #6b7280; font-size: 10px;">
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p style="margin-top: 5px;">© ${new Date().getFullYear()} Rapid Steno Exam - All Rights Reserved</p>
      </div>
    `

    document.body.appendChild(pdfContent)

    // Use browser's print functionality to generate PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Result - ${testResult.test.title}</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { size: A4; margin: 0; }
            }
            body { font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          ${pdfContent.innerHTML}
        </body>
        </html>
      `)
      printWindow.document.close()
      
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
        document.body.removeChild(pdfContent)
      }, 500)
    } else {
      // Fallback: download as HTML if popup is blocked
      const blob = new Blob([`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Result - ${testResult.test.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
          </style>
        </head>
        <body>
          ${pdfContent.innerHTML}
        </body>
        </html>
      `], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${testResult.test.title.replace(/[^a-z0-9]/gi, '_')}_Result.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      document.body.removeChild(pdfContent)
    }
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <LoadingSpinner />
      </div>
    )
  }

  if (!testResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-8">
            <p className="text-gray-600 mb-4">No submitted test results found.</p>
            <p className="text-sm text-gray-500 mb-4">
              This could mean:
              <br />• You haven't completed any tests yet
              <br />• Your test is still in progress
              <br />• There was an issue loading your results
            </p>
            <div className="space-y-2">
              <Button onClick={() => router.push('/tests')} className="w-full">
                Back to Tests
              </Button>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="w-full"
              >
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalQuestions = testResult.test.questions?.length || testResult.answers.length
  const correctAnswers = testResult.answers.filter(a => a.is_correct).length
  const incorrectAnswers = testResult.answers.filter(a => !a.is_correct && a.chosen_option_id).length
  const unanswered = totalQuestions - testResult.answers.length
  
  const percentage = Math.round((testResult.total_score / totalQuestions) * 100)
  const grade = percentage >= 90 ? 'Excellent' : percentage >= 75 ? 'Good' : percentage >= 60 ? 'Average' : 'Needs Improvement'
  const gradeColor = percentage >= 90 ? 'text-green-600' : percentage >= 75 ? 'text-blue-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header Card - Compact */}
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-2">
              <Trophy className="h-12 w-12 text-yellow-500" />
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold text-green-900">
              Test Completed!
            </CardTitle>
            <p className="text-sm md:text-base text-gray-600 mt-1">{testResult.test.title}</p>
            <Badge variant="secondary" className="mt-1 text-xs">{testResult.test.description || 'General'}</Badge>
          </CardHeader>
        </Card>

        {/* Results Summary - Compact Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-blue-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-blue-600">{testResult.total_score}/{totalQuestions}</div>
              <p className="text-xs text-gray-600">Score</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
              <div className={`text-lg md:text-xl font-bold ${gradeColor}`}>{percentage}%</div>
              <p className="text-xs text-gray-600">{grade}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <div className="text-lg md:text-xl font-bold text-green-600">{correctAnswers}</div>
              <p className="text-xs text-gray-600">Correct</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-purple-500 mx-auto mb-1" />
              <div className="text-lg md:text-xl font-bold text-purple-600">{testResult.test.duration_minutes}</div>
              <p className="text-xs text-gray-600">Minutes</p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons - Moved Up */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={downloadResultAsPDF}
            className="bg-[#002E2C] hover:bg-[#002E2C]/90 text-white"
            size="default"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF Report
          </Button>
          
          <Button
            onClick={() => router.push('/tests')}
            variant="outline"
            size="default"
          >
            Back to Tests
          </Button>
        </div>

        {/* Detailed Breakdown - Compact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Results Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-xl md:text-2xl font-bold text-green-600">{correctAnswers}</div>
                <p className="text-xs text-green-700">Correct</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-xl md:text-2xl font-bold text-red-600">{incorrectAnswers}</div>
                <p className="text-xs text-red-700">Incorrect</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-xl md:text-2xl font-bold text-gray-600">{unanswered}</div>
                <p className="text-xs text-gray-700">Unanswered</p>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2 text-sm">Test Information</h3>
              <div className="space-y-1 text-xs">
                <div>
                  <span className="text-blue-700 font-medium">Submitted:</span>
                  <span className="ml-2">{new Date(testResult.submitted_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Duration:</span>
                  <span className="ml-2">{testResult.test.duration_minutes} minutes</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Telegram Section - Compact */}
        <Card>
          <CardContent className="p-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-blue-800 font-medium mb-2 text-sm">
                Join our Telegram channel:
              </p>
              <Button
                onClick={() => window.open('https://t.me/rapidsteno', '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <ExternalLink className="h-3 w-3 mr-2" />
                Join Channel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}