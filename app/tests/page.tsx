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
import { AccessControl, UserAccess } from '@/lib/access-control'
import { Search, ArrowLeft, Lock, User, LogOut, Menu, X, Clock, Calendar, FileText, Building, Cpu, Shirt, AlertTriangle, Flame, Snowflake } from 'lucide-react'
import { UpgradeDialog } from '@/components/ui/upgrade-dialog'
import Head from 'next/head'

type Test = {
  id: string
  title: string
  description: string
  duration_minutes: number
  status: 'draft' | 'published' | 'coming_soon'
  question_count?: number
  topic_id: string
  category_id: string
  topic?: {
    id: string
    name: string
    description: string
  }
  category?: {
    id: string
    name: string
    description: string
  }
}

type Topic = {
  id: string
  name: string
  description: string
  display_order: number
  category_id: string
  test_count: number
  tests?: Test[]
}

type Category = {
  id: string
  name: string
  description: string
  display_order: number
  test_count: number
  topics?: Topic[]
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
  const [topics, setTopics] = useState<Topic[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [selectedTest, setSelectedTest] = useState<Test | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [showTestConfirmation, setShowTestConfirmation] = useState(false)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [upgradeMessage, setUpgradeMessage] = useState('')
  const [showCountdown, setShowCountdown] = useState(false)
  const [countdown, setCountdown] = useState(5)
  
  // Initialize AccessControl
  const accessControl = new AccessControl(supabase)
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

  // Filter categories based on selected filter
  useEffect(() => {
    if (categories.length === 0) return

    let filtered = categories

    // Hide Sample Test category for real users (non-demo)
    const isDemo = searchParams.get('demo') === 'true'
    if (!isDemo) {
      filtered = filtered.filter(category => 
        !category.name.toLowerCase().includes('sample')
      )
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(category => category.id === selectedFilter)
    }

    setFilteredCategories(filtered)
  }, [categories, selectedFilter, searchParams])

  // Handle URL parameters for direct category access and demo mode
  useEffect(() => {
    const category = searchParams.get('category')
    const isDemo = searchParams.get('demo')
    
    if (category && categories.length > 0) {
      const foundCategory = categories.find(cat => 
        cat.name.toLowerCase() === category.toLowerCase()
      )
      if (foundCategory) {
        setSelectedCategory(foundCategory.id)
      }
    }
    
    // If demo mode, filter to only show Sample Test category
    if (isDemo === 'true' && categories.length > 0) {
      const sampleCategory = categories.find(cat => 
        cat.name.toLowerCase().includes('sample')
      )
      if (sampleCategory) {
        setFilteredCategories([sampleCategory])
      }
    }
  }, [searchParams, categories])

  const fetchTests = async () => {
    try {
      setIsCategoriesLoading(true)
      
      // Fetch categories with nested topics and tests using the new API
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      
      const categoriesData: Category[] = await response.json()
      
      // Extract all tests from all topics for the tests state
      const allTests: Test[] = []
      categoriesData.forEach(category => {
        category.topics?.forEach(topic => {
          if (topic.tests) {
            topic.tests.forEach(test => {
              // Add question count
              allTests.push({
                ...test,
                topic: { id: topic.id, name: topic.name, description: topic.description },
                category: { id: category.id, name: category.name, description: category.description }
              })
            })
          }
        })
      })
      
      // Get question counts for each test
      const testsWithCount = await Promise.all(
        allTests.map(async (test) => {
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
      
      console.log('Categories with topics:', categoriesData)
      console.log('All tests:', testsWithCount)
      
      setCategories(categoriesData)
      setFilteredCategories(categoriesData)
      setTests(testsWithCount)
      
    } catch (error) {
      console.error('Error fetching data:', error)
      setTests([])
      setCategories([])
      setFilteredCategories([])
    } finally {
      setIsCategoriesLoading(false)
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
    setShowTestConfirmation(false)
    setShowCountdown(true)
    setCountdown(5)
    
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          setShowCountdown(false)
          if (selectedTestId) {
            router.push(`/test/${selectedTestId}`)
          }
          setSelectedTestId(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
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

  // Generate random user statistics for tests
  const generateUserStats = (testId: string) => {
    // Use test ID as seed for consistent random numbers
    const seed = testId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const random = (seed * 9301 + 49297) % 233280 / 233280
    
    // Generate user count between 3-15
    const userCount = Math.floor(random * 13) + 3
    
    // Determine if it's popular (fire) or less popular (ice) based on count
    const isPopular = userCount >= 9
    
    return {
      userCount,
      isPopular,
      icon: isPopular ? Flame : Snowflake,
      color: isPopular ? 'text-orange-500' : 'text-blue-400',
      bgColor: isPopular ? 'bg-orange-50' : 'bg-blue-50',
      borderColor: isPopular ? 'border-orange-200' : 'border-blue-200'
    }
  }

  const handleCategoryClick = async (categoryId: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    // Find the category name from the categoryId
    const category = categories.find(cat => cat.id === categoryId)
    const categoryName = category?.name || categoryId

    try {
      // Check user access for this category
      const userAccess = await accessControl.getUserAccess(user.id)
      
      console.log('Category access check:', {
        categoryName,
        userAccess,
        canAccess: accessControl.canAccessCategory(userAccess, categoryName)
      })
      
      if (!accessControl.canAccessCategory(userAccess, categoryName)) {
        setUpgradeMessage(accessControl.getUpgradeMessage(categoryName))
        setShowUpgradeDialog(true)
        return
      }

      setSelectedCategory(categoryId)
      setSelectedTopic(null) // Reset topic selection when selecting category
    } catch (error) {
      console.error('Error checking category access:', error)
      // Don't show upgrade dialog for errors - just allow access
      setSelectedCategory(categoryId)
      setSelectedTopic(null)
    }
  }

  const handleTopicClick = (topicId: string) => {
    setSelectedTopic(topicId)
  }

  const handleBackToCategories = () => {
    setSelectedCategory(null)
    setSelectedTopic(null)
  }

  const handleBackToTopics = () => {
    setSelectedTopic(null)
  }

  const getTopicsForCategory = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId)
    return category?.topics || []
  }

  const getTestsForTopic = (topicId: string) => {
    // Find the topic in categories data
    let topicTests: Test[] = []
    
    categories.forEach(category => {
      category.topics?.forEach(topic => {
        if (topic.id === topicId && topic.tests) {
          topicTests = topic.tests.map(test => ({
            ...test,
            topic: { id: topic.id, name: topic.name, description: topic.description },
            category: { id: category.id, name: category.name, description: category.description }
          }))
        }
      })
    })
    
    if (!searchQuery) return topicTests
    
    return topicTests.filter(test => 
      test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const getFilteredCategories = () => {
    return filteredCategories
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
    <>
      <Head>
        <title>{selectedCategory ? 'Tests' : 'Test Categories'} - Rapid Steno Exam</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-emerald-50 font-lexend">
      <header className="bg-white/95 backdrop-blur-lg border-b border-[#002E2C]/10 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Single Line Header */}
          <div className="flex items-center justify-between py-4">
            {/* Left Side - Title and Welcome */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {searchParams.get('demo') === 'true' ? 'Demo - Sample Tests' : 'Tests'}
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">
                  {searchParams.get('demo') === 'true' 
                    ? 'Try our software with sample tests' 
                    : selectedTopic
                      ? `${categories.find(c => c.id === selectedCategory)?.name} > ${categories.find(c => c.id === selectedCategory)?.topics?.find(t => t.id === selectedTopic)?.name}`
                      : selectedCategory 
                        ? `Showing topics for ${categories.find(c => c.id === selectedCategory)?.name}` 
                        : `Welcome, ${user.full_name}`
                  }
                </p>
              </div>
            </div>

            {/* Center - Search and Back Button */}
            <div className="flex items-center gap-3 flex-1 max-w-md mx-4">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={selectedCategory ? "Search tests..." : "Search categories..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#002E2C] focus:border-transparent bg-white/80 backdrop-blur-sm text-sm placeholder-gray-500"
                />
              </div>
              
              {selectedTopic ? (
                <Button
                  onClick={handleBackToTopics}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-[#002E2C] text-[#002E2C] hover:bg-[#002E2C] hover:text-white transition-all duration-200 text-sm px-3 py-2 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">← Topics</span>
                  <span className="sm:hidden">←</span>
                </Button>
              ) : selectedCategory ? (
                <Button
                  onClick={handleBackToCategories}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 border-[#002E2C] text-[#002E2C] hover:bg-[#002E2C] hover:text-white transition-all duration-200 text-sm px-3 py-2 whitespace-nowrap"
                >
                  <span className="hidden sm:inline">← Categories</span>
                  <span className="sm:hidden">←</span>
                </Button>
              ) : null}
            </div>
            
            {/* Desktop Navigation - Hidden on Mobile */}
            <div className="hidden md:flex items-center gap-3">
              <Button
                onClick={() => {
                  // Materials functionality - disabled for now
                }}
                disabled
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-2 border-orange-400 text-orange-600 bg-orange-50 cursor-not-allowed text-sm px-4 py-2 font-semibold"
              >
                <Lock className="h-4 w-4" />
                Materials
                <Badge className="ml-2 text-xs bg-orange-500 text-white animate-pulse">
                  Soon
                </Badge>
              </Button>
              <Button
                onClick={() => router.push('/account')}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 text-sm px-4 py-2"
              >
                <User className="h-4 w-4" />
                My Account
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 text-sm px-4 py-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>

            {/* Mobile Hamburger Menu - Hidden on Desktop */}
            <div className="relative md:hidden">
              <Button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all duration-200 text-sm px-4 py-2"
              >
                {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        // Materials functionality - disabled for now
                      }}
                      disabled
                      className="w-full px-4 py-2 text-left text-sm text-orange-600 bg-orange-50 hover:bg-orange-100 flex items-center gap-2 cursor-not-allowed font-semibold border-l-4 border-orange-400"
                    >
                      <Lock className="h-4 w-4" />
                      Materials
                      <Badge className="ml-auto text-xs bg-orange-500 text-white animate-pulse">
                        Coming Soon
                      </Badge>
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        router.push('/account')
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      My Account
                    </button>
                    <button
                      onClick={() => {
                        setIsMenuOpen(false)
                        logout()
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedCategory ? (
          // Categories View
          <>
            {/* Filter Bar - Hide in demo mode */}
            {searchParams.get('demo') !== 'true' && (
              <div className="mb-8 flex justify-end">
                <div className="flex gap-2">
                  <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                    <SelectTrigger className="w-48 border-2 border-gray-200 focus:border-[#002E2C]">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      setSelectedFilter('all')
                    }}
                    variant="outline"
                    className="whitespace-nowrap border-[#002E2C] text-[#002E2C] hover:bg-[#002E2C] hover:text-white transition-all duration-200"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}

            {/* Categories Count */}
            {!isCategoriesLoading && (
              <div className="mb-6">
                <p className="text-sm text-gray-600">Showing {getFilteredCategories().length} categories</p>
              </div>
            )}

            {/* Categories Grid */}
            {isCategoriesLoading ? (
              <div className="text-center py-16 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-[#002E2C]/10">
                <LoadingSpinner className="h-16 w-16 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-[#002E2C] mb-3">Loading Categories</h3>
                <p className="text-gray-600">Please wait while we fetch the test categories...</p>
              </div>
            ) : getFilteredCategories().length === 0 ? (
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
                          <span className="text-sm font-semibold text-[#002E2C]">{category.test_count} Tests Available</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="text-center relative z-10">
                      <CardTitle className="text-xl mb-6 text-[#002E2C] font-bold">{category.name}</CardTitle>
                      <Button
                        onClick={() => handleCategoryClick(category.id)}
                        className="w-full bg-gradient-to-r from-[#002E2C] to-emerald-600 hover:from-[#003d3a] hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
                      >
                        Explore Topics
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : !selectedTopic ? (
          // Topics View for Selected Category
          <>
            {(() => {
              const categoryTopics = getTopicsForCategory(selectedCategory)
              return (
                <>
                  {categoryTopics.length === 0 ? (
                    <div className="text-center py-16 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-[#002E2C]/10">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                      <h3 className="text-xl font-semibold text-[#002E2C] mb-3">No topics available</h3>
                      <p className="text-gray-600">There are no topics in this category at the moment.</p>
                    </div>
                  ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                      {categoryTopics.map((topic) => (
                        <Card key={topic.id} className="bg-white/95 backdrop-blur-lg border-2 border-[#002E2C]/10 hover:border-[#002E2C]/30 hover:shadow-2xl transition-all duration-300 cursor-pointer group transform hover:scale-105">
                          <CardHeader className="text-center pb-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="relative z-10">
                              <div className="mx-auto mb-6 p-4 bg-gradient-to-br from-emerald-600 to-[#002E2C] rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300 w-16 h-16 flex items-center justify-center">
                                <div className="text-white">
                                  <FileText className="h-6 w-6" />
                                </div>
                              </div>
                              <div className="flex items-center justify-center gap-2 mb-3 bg-emerald-600/5 rounded-full px-4 py-2 mx-auto w-fit">
                                <FileText className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-semibold text-emerald-600">{topic.test_count} Tests</span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="text-center relative z-10">
                            <CardTitle className="text-xl mb-3 text-[#002E2C] font-bold">{topic.name}</CardTitle>
                            <p className="text-gray-600 text-sm mb-6">{topic.description}</p>
                            <Button
                              onClick={() => handleTopicClick(topic.id)}
                              className="w-full bg-gradient-to-r from-emerald-600 to-[#002E2C] hover:from-emerald-700 hover:to-[#003d3a] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
                            >
                              View Tests
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </>
        ) : (
          // Tests View for Selected Topic
          <>
            {(() => {
              const topicTests = getTestsForTopic(selectedTopic)
              return (
                <>
                  {topicTests.length === 0 ? (
                    <div className="text-center py-16 bg-white/95 backdrop-blur-lg rounded-xl shadow-lg border border-[#002E2C]/10">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-6" />
                      <h3 className="text-xl font-semibold text-[#002E2C] mb-3">No tests available</h3>
                      <p className="text-gray-600">There are no tests in this topic at the moment.</p>
                    </div>
                  ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                      {topicTests.map((test: Test) => {
                        const status = getTestStatus(test)
                        const userStats = generateUserStats(test.id)
                        const IconComponent = userStats.icon
                        
                        return (
                          <div key={test.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-white/20 hover:border-[#002E2C]/30 hover:border-2 relative">
                            {/* User Statistics - Floating on Border */}
                            <div className="absolute -top-3 right-4">
                              <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${userStats.bgColor} ${userStats.borderColor} border shadow-md`}>
                                <IconComponent className={`h-3.5 w-3.5 mr-1.5 ${userStats.color}`} />
                                <span className={`text-xs font-semibold ${userStats.color}`}>
                                  {userStats.userCount} Users Given
                                </span>
                              </div>
                            </div>

                            {/* Header Section */}
                            <div className="mb-8 pt-4 pr-16">
                              <h3 className="font-bold text-2xl text-gray-900 leading-tight mb-4">{test.title}</h3>
                              <div className="flex flex-wrap gap-2 mb-3">
                                <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                                  <span className="text-xs font-medium text-[#002E2C]">{test.category?.name || 'General'}</span>
                                </div>
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

      {/* Countdown Modal */}
      {showCountdown && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-[#002E2C] to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">{countdown}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Test Starting In...</h3>
              <p className="text-gray-600">
                Get ready! Your test will begin in <span className="font-semibold text-[#002E2C]">{countdown} second{countdown !== 1 ? 's' : ''}</span>
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Timer will start automatically</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Make sure you're ready to begin</span>
              </div>
            </div>

            <div className="mt-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#002E2C] to-emerald-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <UpgradeDialog
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        categoryName="Allahabad High Court"
        userHasGoldPlan={true}
      />
    </div>
    </>
  )
}