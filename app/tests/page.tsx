'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, logout } from '@/lib/auth'
import { Clock, Calendar, FileText, LogOut, Search, Building, Cpu, Shirt, Lock, AlertTriangle, X } from 'lucide-react'

type Test = {
  id: string
  title: string
  description: string
  duration_minutes: number
  status: 'draft' | 'published' | 'coming_soon'
  question_count?: number
  category?: string
}

type Category = {
  id: string
  name: string
  description: string
  testCount: number
}

type Attempt = {
  id: string
  test_id: string
  status: 'active' | 'submitted'
  created_at?: string
}

export default function TestsPage() {
  const [tests, setTests] = useState<Test[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [showTestConfirmation, setShowTestConfirmation] = useState(false)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

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

  useEffect(() => {
    if (!user || !isClient) return
    
    fetchTests()
    fetchAttempts()
  }, [user, isClient])

  // Filter categories based on search and filter
  useEffect(() => {
    if (!categories.length) return

    let filtered = categories

    if (searchQuery) {
      filtered = filtered.filter(category => 
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedFilter !== 'all') {
      // Add filter logic if needed
    }

    setFilteredCategories(filtered)
  }, [categories, searchQuery, selectedFilter])

  // Handle URL parameters for direct category access
  useEffect(() => {
    const category = searchParams.get('category')
    if (category && categories.length > 0) {
      const foundCategory = categories.find(cat => 
        cat.name.toLowerCase() === category.toLowerCase()
      )
      if (foundCategory) {
        setSelectedCategory(foundCategory.id)
      }
    }
  }, [searchParams, categories])

  const fetchTests = async () => {
    try {
      // Get all tests except drafts
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('*')
        .neq('status', 'draft')
        .order('category', { ascending: true })

      if (testsError) throw testsError
      
      // Then get question counts for each test using separate queries
      const testsWithCount = await Promise.all(
        (testsData || []).map(async (test) => {
          const { data: questionsData, error: countError } = await supabase
            .from('questions')
            .select('id')
            .eq('test_id', test.id)
          
          if (countError) {
            console.error('Error counting questions for test', test.id, countError)
            return { ...test, question_count: 0 }
          }
          
          return { ...test, question_count: questionsData?.length || 0 }
        })
      )
      
      console.log('Tests with question counts:', testsWithCount)
      setTests(testsWithCount)
      
      // Create categories with test counts
      const categoryMap = new Map<string, { name: string; description: string; count: number }>()
      
      testsWithCount.forEach((test) => {
        const categoryName = test.category || 'General'
        const existing = categoryMap.get(categoryName)
        if (existing) {
          existing.count += 1
        } else {
          categoryMap.set(categoryName, {
            name: categoryName,
            description: `Tests related to ${categoryName}`,
            count: 1
          })
        }
      })
      
      const categoriesArray: Category[] = Array.from(categoryMap.entries()).map(([name, data]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name: data.name,
        description: data.description,
        testCount: data.count
      }))
      
      setCategories(categoriesArray)
      setFilteredCategories(categoriesArray)
    } catch (error) {
      console.error('Error fetching tests:', error)
      setTests([])
      setCategories([])
      setFilteredCategories([])
    }
  }

  const fetchAttempts = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('attempts')
        .select('id, test_id, status, created_at')
        .eq('user_id', user.id)

      if (error) throw error
      setAttempts(data || [])
    } catch (error) {
      console.error('Error fetching attempts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTestStatus = (test: Test) => {
    // Get all attempts for this test
    const testAttempts = attempts.filter(a => a.test_id === test.id)
    
    if (test.status === 'draft') {
      return { label: 'Not Available', color: 'bg-gray-500', canStart: false }
    }
    
    if (test.status === 'coming_soon') {
      return { label: 'Coming Soon', color: 'bg-blue-500', canStart: false }
    }
    
    // Check if there's any submitted attempt (completed test)
    const hasSubmittedAttempt = testAttempts.some(a => a.status === 'submitted')
    if (hasSubmittedAttempt) {
      return { label: 'Test Submitted', color: 'bg-green-500', canStart: false }
    }
    
    // Check if there's an active attempt (in progress)
    const hasActiveAttempt = testAttempts.some(a => a.status === 'active')
    if (hasActiveAttempt) {
      return { label: 'Resume Test', color: 'bg-orange-500', canStart: true }
    }
    
    return { label: 'Start Test', color: 'bg-[#002E2C]', canStart: true }
  }

  const handleStartTest = (testId: string) => {
    setSelectedTestId(testId)
    setShowTestConfirmation(true)
  }

  const handleConfirmStartTest = () => {
    if (selectedTestId) {
      router.push(`/test/${selectedTestId}`)
    }
    setShowTestConfirmation(false)
    setSelectedTestId(null)
  }

  const handleCancelStartTest = () => {
    setShowTestConfirmation(false)
    setSelectedTestId(null)
  }

  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'computer awareness':
        return <Cpu className="h-6 w-6" />
      case 'general knowledge':
        return <Building className="h-6 w-6" />
      case 'reasoning':
        return <Search className="h-6 w-6" />
      default:
        return <FileText className="h-6 w-6" />
    }
  }

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId)
  }

  const handleBackToCategories = () => {
    setSelectedCategory(null)
  }

  const getTestsForCategory = (categoryId: string) => {
    const categoryTests = tests.filter(test => test.category === categories.find(c => c.id === categoryId)?.name)
    
    if (!searchQuery) return categoryTests
    
    return categoryTests.filter(test => 
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const getFilteredCategories = () => {
    if (!searchQuery) return filteredCategories
    
    return filteredCategories.filter(category =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-emerald-50 font-lexend">
      <header className="bg-white/95 backdrop-blur-lg shadow-lg border-b border-[#002E2C]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#002E2C] mb-1 sm:mb-2 truncate">
                {selectedCategory ? 'Tests' : 'Test Categories'}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 truncate">
                {selectedCategory 
                  ? `Showing tests for ${categories.find(c => c.id === selectedCategory)?.name}` 
                  : `Welcome, ${user.full_name}`
                }
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={selectedCategory ? "Search tests..." : "Search categories..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#002E2C] focus:border-transparent bg-white/80 backdrop-blur-sm text-sm placeholder-gray-500"
                />
              </div>
              
              {selectedCategory && (
                <Button
                  onClick={handleBackToCategories}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 sm:gap-2 border-[#002E2C] text-[#002E2C] hover:bg-[#002E2C] hover:text-white transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <span className="hidden sm:inline">← Back to Categories</span>
                  <span className="sm:hidden">← Back</span>
                </Button>
              )}
              <Button
                disabled
                variant="outline"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 cursor-not-allowed relative overflow-hidden text-xs sm:text-sm px-2 sm:px-3"
                title="Coming Soon - Materials feature will be available soon!"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/10 to-orange-200/10 animate-pulse"></div>
                <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-black relative z-10" />
                <span className="relative z-10 font-bold text-black">Materials</span>
                <Badge className="ml-1 text-xs bg-yellow-600 text-white border-0 relative z-10 animate-bounce hidden sm:inline-flex">
                  Coming Soon
                </Badge>
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 sm:gap-2 border-[#002E2C] text-[#002E2C] hover:bg-[#002E2C] hover:text-white transition-all duration-200 text-xs sm:text-sm px-2 sm:px-3"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedCategory ? (
          // Categories View
          <>
            {/* Search and Filter Bar */}
            <div className="mb-8 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-[#002E2C]/10 p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 border-2 border-gray-200 focus:border-[#002E2C] focus:ring-[#002E2C]/20 transition-all duration-200"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                    <SelectTrigger className="w-48 border-2 border-gray-200 focus:border-[#002E2C]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      setSearchQuery('')
                      setSelectedFilter('all')
                    }}
                    variant="outline"
                    className="whitespace-nowrap border-[#002E2C] text-[#002E2C] hover:bg-[#002E2C] hover:text-white transition-all duration-200"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>

            {/* Categories Count */}
            <div className="mb-6">
              <p className="text-sm text-gray-600">Showing {getFilteredCategories().length} categories</p>
            </div>

            {/* Categories Grid */}
            {getFilteredCategories().length === 0 ? (
              <div className="text-center py-16 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-[#002E2C]/10">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-[#002E2C] mb-3">No categories found</h3>
                <p className="text-gray-600">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {getFilteredCategories().map((category) => (
                  <Card key={category.id} className="bg-white/95 backdrop-blur-lg border-2 border-[#002E2C]/10 hover:border-[#002E2C]/30 hover:shadow-2xl transition-all duration-300 cursor-pointer group transform hover:scale-105">
                    <CardHeader className="text-center pb-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative z-10">
                        <div className="mx-auto mb-6 p-4 bg-gradient-to-br from-[#002E2C] to-[#004A47] rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300 w-16 h-16 flex items-center justify-center">
                          <div className="text-white">
                            {getCategoryIcon(category.name)}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 mb-3 bg-[#002E2C]/5 rounded-full px-4 py-2 mx-auto w-fit">
                          <FileText className="h-4 w-4 text-[#002E2C]" />
                          <span className="text-sm font-semibold text-[#002E2C]">{category.testCount} Tests Available</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center relative z-10">
                      <CardTitle className="text-xl mb-6 text-[#002E2C] font-bold">{category.name}</CardTitle>
                      <Button
                        onClick={() => handleCategoryClick(category.id)}
                        className="w-full bg-gradient-to-r from-[#002E2C] to-[#004A47] hover:from-[#004A47] hover:to-[#002E2C] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                      >
                        Explore Tests
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : (
          // Tests View for Selected Category
          <>
            {(() => {
              const categoryTests = getTestsForCategory(selectedCategory)
              return (
                <>
                  {categoryTests.length === 0 ? (
                    <div className="text-center py-16 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-[#002E2C]/10">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                      <h3 className="text-xl font-semibold text-[#002E2C] mb-3">No tests available</h3>
                      <p className="text-gray-600">There are no tests in this category at the moment.</p>
                    </div>
                  ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                      {categoryTests.map((test) => {
                        const status = getTestStatus(test)
                        
                        return (
                          <div key={test.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/20">
                            {/* Header Section */}
                            <div className="mb-8">
                              <h3 className="font-bold text-2xl text-gray-900 leading-tight mb-4">{test.title}</h3>
                              <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-emerald-50 border border-blue-200">
                                <span className="text-sm font-medium text-[#002E2C]">{test.category}</span>
                              </div>
                            </div>

                            {/* Description */}
                            <div className="mb-6">
                              <p className="text-gray-700 text-base leading-relaxed">{test.description}</p>
                            </div>
                            
                            {/* Test Details */}
                            <div className="flex items-center gap-6 mb-6 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                  <Clock className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide">Duration</p>
                                  <p className="font-semibold text-gray-900">{test.duration_minutes} min</p>
                                </div>
                              </div>
                              <div className="w-px h-8 bg-gray-300"></div>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                  <FileText className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 uppercase tracking-wide">Questions</p>
                                  <p className="font-semibold text-gray-900">{test.question_count || 0}</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Button */}
                            <button
                              onClick={() => getTestStatus(test).canStart && handleStartTest(test.id)}
                              disabled={!getTestStatus(test).canStart}
                              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                                getTestStatus(test).canStart
                                  ? 'bg-gradient-to-r from-[#002E2C] to-emerald-600 hover:from-[#003d3a] hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              {getTestStatus(test).label}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}
          </>
        )}
      </main>

      {/* Test Confirmation Modal */}
      {showTestConfirmation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg">⚠️ Important Instructions</h3>
                <button
                  onClick={handleCancelStartTest}
                  className="ml-auto w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-800 text-sm">Timer will start immediately and cannot be paused.</p>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-800 text-sm">Do not refresh or close the window during the test.</p>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-gray-800 text-sm">Test will auto-submit when time ends.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCancelStartTest}
                  variant="outline"
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmStartTest}
                  className="flex-1 bg-gradient-to-r from-[#002E2C] to-emerald-600 hover:from-[#003d3a] hover:to-emerald-700 text-white"
                >
                  I Agree - Start Test
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}