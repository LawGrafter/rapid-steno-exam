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
      // Check if this is a demo user
      if ((user as any).user_type === 'demo') {
        // Load demo result from localStorage
        const demoResultStr = localStorage.getItem('demo_test_result')
        if (demoResultStr) {
          const demoResult = JSON.parse(demoResultStr)
          setTestResult(demoResult)
        } else {
          // No demo result found, redirect to tests
          router.push('/tests?demo=true')
        }
        setLoading(false)
        return
      }

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
        .single()

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

    const data = testResult;
    const totalQuestions = data.answers.length
    const correctAnswers = data.answers.filter((a: any) => a.is_correct && a.chosen_option_id).length
    const incorrectAnswers = data.answers.filter((a: any) => !a.is_correct && a.chosen_option_id).length
    const unanswered = data.answers.filter((a: any) => !a.chosen_option_id).length
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
        <p style="margin-top: 5px;">${new Date().getFullYear()} Rapid Steno Exam - All Rights Reserved</p>
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
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
  
  // Fix: Only count answers that were actually chosen by the user
  const answeredQuestions = testResult.answers.filter(a => a.chosen_option_id !== null)
  const correctAnswers = answeredQuestions.filter(a => a.is_correct).length
  const incorrectAnswers = answeredQuestions.filter(a => !a.is_correct).length
  const unanswered = testResult.answers.filter(a => !a.chosen_option_id).length
  
  const percentage = Math.round((testResult.total_score / totalQuestions) * 100)
  const grade = percentage >= 90 ? 'Excellent' : percentage >= 75 ? 'Good' : percentage >= 60 ? 'Average' : 'Needs Improvement'
  const gradeColor = percentage >= 90 ? 'text-green-600' : percentage >= 75 ? 'text-blue-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-3">
      <div className="max-w-2xl mx-auto">
        {/* Modern Header - Single Card with All Info */}
        <Card className="mb-4 overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Test Completed!</h1>
                <p className="text-emerald-100 text-sm opacity-90">{testResult.test.title}</p>
              </div>
            </div>
          </div>
          
          {/* Integrated Results in Header */}
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-gray-600">{totalQuestions}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-emerald-600">{correctAnswers}</div>
                <div className="text-xs text-gray-500">Correct</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-red-600">{incorrectAnswers}</div>
                <div className="text-xs text-gray-500">Incorrect</div>
              </div>
              <div>
                <div className={`text-xl sm:text-2xl font-bold ${gradeColor}`}>{percentage}%</div>
                <div className="text-xs text-gray-500">Grade</div>
              </div>
            </div>
            
            {/* Performance Bar */}
            <div className="mt-4 mb-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Performance</span>
                <span className={gradeColor}>{grade}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-col sm:flex-row sm:justify-between items-center text-xs text-gray-600 pt-2 border-t border-gray-100 gap-1 sm:gap-0">
              <span>Submitted: {new Date(testResult.submitted_at).toLocaleDateString()}</span>
              <span>Duration: {testResult.test.duration_minutes} min</span>
              <span className="text-red-500">{incorrectAnswers} incorrect</span>
            </div>
          </div>
        </Card>

        {/* Action Buttons - Modern Style */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => router.push((user as any).user_type === 'demo' ? '/tests?demo=true' : '/tests')}
            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-md"
          >
            Back to Tests
          </Button>
          
          {/* Show Buy Gold Pass button for demo users */}
          {(user as any).user_type === 'demo' ? (
            <Button
              onClick={() => window.open('https://rapidsteno.com/how-to-pay', '_blank')}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-md font-semibold"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Buy Gold Pass
            </Button>
          ) : (
            <Button
              onClick={() => window.open('https://t.me/rapidsteno', '_blank')}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-md"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Telegram Channel
            </Button>
          )}
        </div>

        {/* Detailed Questions Review */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Question Review
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {testResult.answers.map((answer, index) => (
                <div 
                  key={answer.question_id} 
                  className={`p-4 rounded-lg border-2 ${
                    answer.is_correct && answer.chosen_option_id
                      ? 'bg-green-50 border-green-200' 
                      : answer.chosen_option_id 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">
                      Question {index + 1}
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      answer.is_correct && answer.chosen_option_id
                        ? 'bg-green-100 text-green-800' 
                        : answer.chosen_option_id 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {answer.is_correct && answer.chosen_option_id ? '✓ Correct' : 
                       answer.chosen_option_id ? '✗ Incorrect' : '— Unanswered'}
                    </div>
                  </div>

                  {/* Question Text */}
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {answer.question.text}
                  </p>

                  {/* Options */}
                  <div className="space-y-2">
                    {answer.question.options.map((option) => (
                      <div 
                        key={option.id}
                        className={`p-3 rounded-md border ${
                          option.is_correct 
                            ? 'bg-green-100 border-green-300 text-green-800' 
                            : option.id === answer.chosen_option_id 
                              ? 'bg-red-100 border-red-300 text-red-800' 
                              : 'bg-white border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex-1">{option.label}</span>
                          <div className="flex items-center gap-2">
                            {option.is_correct && (
                              <span className="text-green-600 font-medium text-xs">
                                ✓ Correct Answer
                              </span>
                            )}
                            {option.id === answer.chosen_option_id && !option.is_correct && (
                              <span className="text-red-600 font-medium text-xs">
                                Your Answer
                              </span>
                            )}
                            {option.id === answer.chosen_option_id && option.is_correct && (
                              <span className="text-green-600 font-medium text-xs">
                                Your Answer ✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Points */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <span className="text-sm text-gray-600">
                      Points: <span className="font-medium">{answer.question.points}</span>
                      {answer.chosen_option_id && (
                        <span className="ml-4">
                          Score: <span className={`font-medium ${answer.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                            {answer.is_correct ? answer.question.points : 0}
                          </span>
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}