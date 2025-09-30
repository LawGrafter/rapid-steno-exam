'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  PieChart, 
  LineChart, 
  ArrowLeft,
  Calendar,
  Target,
  TrendingUp,
  Award,
  Eye,
  X
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { useUser } from '@/lib/hooks'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import * as RechartsPrimitive from 'recharts'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog'

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
    category_id: string
    questions: Array<{
      id: string
    }>
    test_categories: {
      id: string
      name: string
    }
  }
  answers: Array<{
    is_correct: boolean
    chosen_option_id: string | null
  }>
}

interface CategoryData {
  category: string
  totalTests: number
  averageScore: number
  bestScore: number
  attempts: TestAttempt[]
}

export default function AnalyticsPage() {
  const router = useRouter()
  const user = getCurrentUser()
  const [attempts, setAttempts] = useState<TestAttempt[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [filteredCategoryData, setFilteredCategoryData] = useState<CategoryData[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTest, setSelectedTest] = useState<TestAttempt | null>(null)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    // Block demo users from accessing analytics page
    if ((user as any).user_type === 'demo') {
      router.push('/tests?demo=true')
      return
    }
    
    if (!isInitialized) {
      fetchUserData()
      setIsInitialized(true)
    }
  }, [isInitialized, user]) // Only depend on isInitialized and user

  const fetchUserData = async () => {
    setLoading(true)
    if (!user) return

    try {
      // Fetch all user attempts with category names
      const { data: attemptData, error } = await supabase
        .from('attempts')
        .select(`
          *,
          test:tests(
            title, 
            description, 
            duration_minutes,
            category_id,
            questions(id),
            test_categories(id, name)
          ),
          answers(is_correct, chosen_option_id)
        `)
        .eq('user_id', user.id)
        .eq('status', 'submitted')
        .order('started_at', { ascending: false })

      if (error) throw error

      setAttempts(attemptData || [])

      // Process data by categories
      const categories: { [key: string]: TestAttempt[] } = {}
      
      attemptData?.forEach((attempt: TestAttempt) => {
        const categoryName = attempt.test.test_categories?.name || 'Uncategorized'
        
        if (!categories[categoryName]) {
          categories[categoryName] = []
        }
        
        categories[categoryName].push(attempt)
      })
      
      // Calculate statistics for each category
      const categoryStats: CategoryData[] = Object.keys(categories).map(category => {
        const categoryAttempts = categories[category]
        const totalTests = categoryAttempts.length
        
        // Calculate average score
        const totalPercentages = categoryAttempts.reduce((sum, attempt) => {
          const totalQuestions = attempt.test.questions?.length || attempt.answers.length
          const percentage = totalQuestions > 0 ? (attempt.total_score / totalQuestions) * 100 : 0
          return sum + percentage
        }, 0)
        
        const averageScore = totalTests > 0 ? Math.round(totalPercentages / totalTests) : 0
        
        // Calculate best score
        const bestScore = categoryAttempts.length > 0 
          ? Math.max(...categoryAttempts.map(attempt => {
              const totalQuestions = attempt.test.questions?.length || attempt.answers.length
              return totalQuestions > 0 ? Math.round((attempt.total_score / totalQuestions) * 100) : 0
            }))
          : 0
        
        return {
          category,
          totalTests,
          averageScore,
          bestScore,
          attempts: categoryAttempts
        }
      })
      
      // Sort categories by number of attempts (descending)
      categoryStats.sort((a, b) => b.totalTests - a.totalTests)
      
      setCategoryData(categoryStats)
    } catch (error) {
      console.error('Error fetching user data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get colors for charts
  const getCategoryColor = (index: number) => {
    const colors = [
      'rgba(0, 46, 44, 0.8)',      // #002E2C (dark teal)
      'rgba(0, 74, 71, 0.8)',      // #004A47 (medium teal)
      'rgba(16, 185, 129, 0.8)',   // emerald-600
      'rgba(5, 150, 105, 0.8)',    // emerald-700
      'rgba(4, 120, 87, 0.8)',     // emerald-800
      'rgba(6, 95, 70, 0.8)',      // emerald-900
      'rgba(20, 184, 166, 0.8)',   // teal-500
      'rgba(13, 148, 136, 0.8)',   // teal-600
    ]
    return colors[index % colors.length]
  }

  // Prepare time-series data for each category
  const prepareTimeSeriesData = (category: CategoryData) => {
    // Sort attempts by date (oldest to newest)
    const sortedAttempts = [...category.attempts].sort((a, b) => 
      new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
    );
    
    // Create data points for the line chart
    return sortedAttempts.map(attempt => {
      // Get the actual number of questions from the test
      const totalQuestions = attempt.test.questions?.length || attempt.answers.length;
      
      // Get the number of correct answers directly from the score
      const correctAnswers = attempt.total_score;
      
      // Calculate wrong answers as the number of answered questions minus correct answers
      // This ensures we only count questions that were actually answered
      const answeredQuestions = attempt.answers.length;
      const wrongAnswers = answeredQuestions - correctAnswers;
      
      const score = totalQuestions > 0 ? Math.round((attempt.total_score / totalQuestions) * 100) : 0;
      
      // Calculate grade based on score
      let grade = "F";
      if (score >= 90) grade = "A";
      else if (score >= 80) grade = "B";
      else if (score >= 70) grade = "C";
      else if (score >= 60) grade = "D";
      
      return {
        date: new Date(attempt.submitted_at).toLocaleDateString(),
        score: score,
        name: attempt.test.title,
        totalQuestions: totalQuestions,
        correctAnswers: correctAnswers,
        wrongAnswers: wrongAnswers,
        grade: grade,
        rawScore: `${correctAnswers}/${totalQuestions}`
      };
    });
  };

  // Filter data based on date range
  useEffect(() => {
    if (categoryData.length > 0) {
      if (!startDate && !endDate) {
        setFilteredCategoryData(categoryData);
        return;
      }
      
      const filtered = categoryData.map(category => {
        // Filter attempts based on date range
        const filteredAttempts = category.attempts.filter(attempt => {
          const attemptDate = new Date(attempt.submitted_at);
          const start = startDate ? new Date(startDate) : new Date(0);
          const end = endDate ? new Date(endDate) : new Date(8640000000000000); // Max date
          
          return attemptDate >= start && attemptDate <= end;
        });
        
        // Recalculate stats based on filtered attempts
        const totalTests = filteredAttempts.length;
        
        let totalScore = 0;
        let bestScore = 0;
        
        filteredAttempts.forEach(attempt => {
          const totalQuestions = attempt.test.questions?.length || attempt.answers.length;
          const score = totalQuestions > 0 ? Math.round((attempt.total_score / totalQuestions) * 100) : 0;
          
          totalScore += score;
          if (score > bestScore) bestScore = score;
        });
        
        const averageScore = totalTests > 0 ? Math.round(totalScore / totalTests) : 0;
        
        return {
          ...category,
          attempts: filteredAttempts,
          totalTests,
          averageScore,
          bestScore
        };
      });
      
      setFilteredCategoryData(filtered);
    }
  }, [categoryData, startDate, endDate]);

  // Generate chart data
  const generateChartData = () => {
    return filteredCategoryData.map((category, index) => {
      const color = getCategoryColor(index);
      const width = Math.min(100, Math.max(20, category.averageScore)) + '%';
      const timeSeriesData = prepareTimeSeriesData(category);
      
      return (
        <div key={category.category} className="mb-8 p-4 border rounded-lg">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">{category.category}</span>
            <span className="text-sm font-medium">{category.averageScore}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div 
              className="h-4 rounded-full" 
              style={{ width, backgroundColor: color }}
            ></div>
          </div>
          
          {/* Score Growth Chart */}
          {timeSeriesData.length > 1 ? (
            <div className="mt-4 h-40">
              <p className="text-sm font-medium mb-2">Score Growth</p>
              <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
                <RechartsPrimitive.LineChart data={timeSeriesData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                  <RechartsPrimitive.XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <RechartsPrimitive.YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <RechartsPrimitive.Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-md shadow-md">
                            <p className="font-bold mb-1">Date: {data.date}</p>
                            <p className="mb-1">{data.name}</p>
                            <p className="mb-1">Score: {data.rawScore} ({data.score}%)</p>
                            <p className="mb-1" style={{ color: '#16a34a' }}>Total Right: {data.correctAnswers}</p>
                            <p className="mb-1" style={{ color: '#dc2626' }}>Total Wrong: {data.wrongAnswers}</p>
                            <p className="font-bold">Grade: {data.grade}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <RechartsPrimitive.Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke={color} 
                    strokeWidth={2}
                    dot={{ r: 4, fill: color }}
                    activeDot={{ r: 6 }}
                  />
                </RechartsPrimitive.LineChart>
              </RechartsPrimitive.ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 text-center text-sm text-gray-500">
              Complete more tests in this category to see score growth
            </div>
          )}
          
          <div className="flex justify-between text-xs text-gray-500 mt-4">
            <span>Tests: {category.totalTests}</span>
            <span>Best: {category.bestScore}%</span>
          </div>
        </div>
      )
    })
  }

  // Generate recent performance data
  const generatePerformanceData = () => {
    // Get the 10 most recent attempts
    const recentAttempts = [...attempts].slice(0, 10)
    
    // Create pairs of attempts for 2 per row
    const rows = [];
    for (let i = 0; i < recentAttempts.length; i += 2) {
      const rowAttempts = recentAttempts.slice(i, i + 2);
      rows.push(rowAttempts);
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((row, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            {row.map((attempt) => {
              const totalQuestions = attempt.test.questions?.length || attempt.answers.length;
              const percentage = totalQuestions > 0 ? Math.round((attempt.total_score / totalQuestions) * 100) : 0;
              const color = percentage >= 70 ? 'bg-green-500' : percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500';
              
              return (
                <div key={attempt.id} className="p-4 border rounded-lg hover:bg-gray-50 flex flex-col h-full">
                  <div className="mb-2">
                    <h4 className="font-medium text-base mb-1">{attempt.test.title}</h4>
                    <p className="text-sm text-gray-600">{attempt.test.test_categories?.name || 'Uncategorized'}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center">
                      <Button 
                        className="bg-gradient-to-r from-[#002E2C] to-emerald-600 text-white hover:from-[#003d3a] hover:to-emerald-700"
                        size="sm"
                        onClick={() => {
                          setSelectedTest(attempt);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </Button>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(attempt.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    );
  }
  
  // Get grade based on percentage
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    if (percentage >= 50) return 'E';
    return 'F';
  }
  
  // Get motivational message based on percentage
  const getMotivationalMessage = (percentage: number) => {
    if (percentage >= 90) return "Outstanding work! You've mastered this material!";
    if (percentage >= 80) return "Great job! You're showing excellent progress!";
    if (percentage >= 70) return "Good work! Keep building on this foundation!";
    if (percentage >= 60) return "You're on the right track! A bit more practice will help you excel!";
    if (percentage >= 50) return "You're making progress! Keep studying and you'll improve!";
    return "Don't give up! Every challenge is an opportunity to grow stronger!";
  }

  if (!user) return null

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Test Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedTest?.test.title}</DialogTitle>
              <DialogDescription>
                {selectedTest?.test.description || 'Test details'}
              </DialogDescription>
            </DialogHeader>
            
            {selectedTest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{new Date(selectedTest.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-500">Category</p>
                    <p className="font-medium">{selectedTest.test.test_categories?.name || 'Uncategorized'}</p>
                  </div>
                </div>
                
                {(() => {
                  const totalQuestions = selectedTest.test.questions?.length || selectedTest.answers.length;
                  const correctAnswers = selectedTest.total_score;
                  const answeredQuestions = selectedTest.answers.filter(a => a.chosen_option_id).length;
                  const wrongAnswers = answeredQuestions - correctAnswers;
                  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
                  const grade = getGrade(percentage);
                  
                  return (
                    <>
                      <div className="bg-white border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-bold">Performance Summary</h3>
                          <span className="text-lg font-bold">{percentage}%</span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Score:</span>
                            <span className="font-medium">{correctAnswers}/{totalQuestions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Right:</span>
                            <span className="font-medium text-green-600">{correctAnswers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Wrong:</span>
                            <span className="font-medium text-red-600">{wrongAnswers}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Grade:</span>
                            <span className="font-bold">{grade}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <h3 className="font-medium text-blue-800 mb-2">Short Note</h3>
                        <p className="text-blue-700">{getMotivationalMessage(percentage)}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            
            <DialogFooter className="sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-full">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle className="text-xl sm:text-2xl text-gray-900">Performance Analytics</CardTitle>
              </div>
              <Button variant="outline" onClick={() => router.push('/account')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Account
              </Button>
            </div>
          </CardHeader>
        </Card>

        {attempts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">No Test Data Available</h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                Complete some tests to see your performance analytics. Your test results will be displayed here.
              </p>
              <Button onClick={() => router.push('/tests')}>
                Browse Tests
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mx-auto mb-1" />
                  <div className="text-lg sm:text-xl font-bold text-blue-600">{attempts.length}</div>
                  <p className="text-xs text-gray-600">Tests Completed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 mx-auto mb-1" />
                  <div className="text-lg sm:text-xl font-bold text-green-600">
                    {Math.round(
                      attempts.reduce((sum, attempt) => {
                        const totalQuestions = attempt.test.questions?.length || attempt.answers.length
                        return sum + (totalQuestions > 0 ? (attempt.total_score / totalQuestions) * 100 : 0)
                      }, 0) / attempts.length
                    )}%
                  </div>
                  <p className="text-xs text-gray-600">Average Score</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Award className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 mx-auto mb-1" />
                  <div className="text-lg sm:text-xl font-bold text-yellow-600">
                    {Math.max(
                      ...attempts.map(attempt => {
                        const totalQuestions = attempt.test.questions?.length || attempt.answers.length
                        return totalQuestions > 0 ? Math.round((attempt.total_score / totalQuestions) * 100) : 0
                      })
                    )}%
                  </div>
                  <p className="text-xs text-gray-600">Best Score</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 mx-auto mb-1" />
                  <div className="text-lg sm:text-xl font-bold text-purple-600">{categoryData.length}</div>
                  <p className="text-xs text-gray-600">Categories</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="category" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="category" className="text-xs sm:text-sm">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Category</span> Performance
                </TabsTrigger>
                <TabsTrigger value="recent" className="text-xs sm:text-sm">
                  <LineChart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Recent Performance
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="category">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <CardTitle>Performance by Category</CardTitle>
                        <p className="text-sm text-red-500 mt-1">Keep pushing! Every test brings you closer to mastery.</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <label htmlFor="start-date" className="text-xs sm:text-sm font-medium">From:</label>
                          <input 
                            type="date" 
                            id="start-date"
                            className="border rounded-md p-1 text-xs sm:text-sm w-[120px] sm:w-auto"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2">
                          <label htmlFor="end-date" className="text-xs sm:text-sm font-medium">To:</label>
                          <input 
                            type="date" 
                            id="end-date"
                            className="border rounded-md p-1 text-xs sm:text-sm w-[120px] sm:w-auto"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {categoryData.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No category data available
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {generateChartData()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="recent">
                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Recent Test Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6">
                    <div className="space-y-4">
                      {generatePerformanceData()}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  )
}