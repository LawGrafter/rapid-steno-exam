'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, FileText, Clock, Calendar, Edit, Trash2, RotateCcw, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

type Test = {
  id: string
  title: string
  description: string
  category_id: string
  topic_id: string
  duration_minutes: number
  status: 'draft' | 'published' | 'coming_soon'
  created_at: string
  category?: { id: string; name: string } | null
  topic?: { id: string; name: string } | null
  question_count?: number
}

type Category = {
  id: string
  name: string
}

type Topic = {
  id: string
  name: string
  category_id: string
}

export default function TestsPage() {
  const router = useRouter()
  const [tests, setTests] = useState<Test[]>([])
  const [filteredTests, setFilteredTests] = useState<Test[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [testsPerPage] = useState(9)
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedTopic, setSelectedTopic] = useState<string>('all')

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (!adminUser) {
      router.push('/admin/login')
      return
    }

    fetchTests()
  }, [router])

  // Filter functions
  useEffect(() => {
    let filtered = tests

    if (searchQuery) {
      filtered = filtered.filter(test => 
        test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(test => test.category_id === selectedCategory)
    }

    if (selectedTopic && selectedTopic !== 'all') {
      filtered = filtered.filter(test => test.topic_id === selectedTopic)
    }

    setFilteredTests(filtered)
    // Reset to first page when filters change
    setCurrentPage(1)
  }, [tests, searchQuery, selectedCategory, selectedTopic])

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSelectedTopic('all') // Reset topic when category changes
  }

  const getTopicsForCategory = (categoryId: string) => {
    return topics.filter(topic => topic.category_id === categoryId)
  }

  const fetchTests = async () => {
    try {
      // Fetch tests with category and topic information
      const { data: testsData, error } = await supabase
        .from('tests')
        .select('id, title, description, category_id, topic_id, duration_minutes, status, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get category and topic info for each test
      const testsWithInfo = await Promise.all(
        (testsData || []).map(async (test) => {
          const [categoryResult, topicResult, questionResult] = await Promise.all([
            supabase.from('test_categories').select('id, name').eq('id', test.category_id).single(),
            supabase.from('test_topics').select('id, name').eq('id', test.topic_id).single(),
            supabase.from('questions').select('id', { count: 'exact', head: true }).eq('test_id', test.id)
          ])

          return {
            ...test,
            category: categoryResult.data,
            topic: topicResult.data,
            question_count: questionResult.count || 0
          }
        })
      )

      setTests(testsWithInfo)
      setFilteredTests(testsWithInfo)
      
      // Fetch categories and topics for filters
      await fetchCategoriesAndTopics()
    } catch (error) {
      console.error('Error fetching tests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchCategoriesAndTopics = async () => {
    try {
      const [categoriesResult, topicsResult] = await Promise.all([
        supabase.from('test_categories').select('id, name').order('name'),
        supabase.from('test_topics').select('id, name, category_id').order('name')
      ])

      if (categoriesResult.data) setCategories(categoriesResult.data)
      if (topicsResult.data) setTopics(topicsResult.data)
    } catch (error) {
      console.error('Error fetching categories and topics:', error)
    }
  }

  const deleteTest = async (testId: string) => {
    if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testId)

      if (error) throw error
      await fetchTests()
    } catch (error) {
      console.error('Error deleting test:', error)
    }
  }

  const resetTest = async (testId: string, testTitle: string) => {
    if (!confirm(`Are you sure you want to reset "${testTitle}"? This will delete all user attempts for this test and allow users to retake it. This action cannot be undone.`)) {
      return
    }

    try {
      // Delete all attempts for this test
      const { error } = await supabase
        .from('attempts')
        .delete()
        .eq('test_id', testId)

      if (error) throw error
      
      alert(`Test "${testTitle}" has been reset successfully. All user attempts have been cleared.`)
    } catch (error) {
      console.error('Error resetting test:', error)
      alert('Error resetting test. Please try again.')
    }
  }

  const getStatusInfo = (test: Test) => {
    switch (test.status) {
      case 'draft':
        return { label: 'Draft', color: 'bg-gray-500' }
      case 'published':
        return { label: 'Published', color: 'bg-[#002E2C]' }
      case 'coming_soon':
        return { label: 'Coming Soon', color: 'bg-blue-500' }
      default:
        return { label: 'Unknown', color: 'bg-gray-500' }
    }
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tests Management</h1>
                <p className="text-sm text-gray-600">Create and manage MCQ tests</p>
              </div>
            </div>
            <Link href="/admin/tests/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Section */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-500" />
            <h3 className="font-medium text-gray-900">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Topic Filter */}
            <Select 
              value={selectedTopic} 
              onValueChange={setSelectedTopic}
              disabled={!selectedCategory || selectedCategory === 'all'}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedCategory && selectedCategory !== 'all' ? "All Topics" : "Select Category First"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {getTopicsForCategory(selectedCategory).map(topic => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Clear Filters */}
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSelectedTopic('all')
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {filteredTests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
            <p className="text-gray-600 mb-4">Create your first test to get started.</p>
            <Link href="/admin/tests/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Test
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Get current tests */}
              {filteredTests
                .slice((currentPage - 1) * testsPerPage, currentPage * testsPerPage)
                .map((test) => {
                  const status = getStatusInfo(test)
                  return (
                    <Card key={test.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg line-clamp-2">{test.title}</CardTitle>
                          <Badge className={`${status.color} text-white`}>
                            {status.label}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {test.description || 'No description'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {test.duration_minutes} min
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {test.question_count || 0}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <p><span className="font-medium">Category:</span> {test.category?.name || 'Unknown'}</p>
                          <p><span className="font-medium">Topic:</span> {test.topic?.name || 'Unknown'}</p>
                          <p>Created: {new Date(test.created_at).toLocaleDateString()}</p>
                        </div>

                        <div className="flex gap-2">
                          <Link href={`/admin/tests/edit/${test.id}`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resetTest(test.id, test.title)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Reset test - Clear all user attempts"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteTest(test.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
            
            {/* Pagination */}
            <div className="flex justify-center items-center mt-8 space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.ceil(filteredTests.length / testsPerPage) }).map((_, index) => (
                  <Button
                    key={index}
                    variant={currentPage === index + 1 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(index + 1)}
                    className={`w-8 h-8 p-0 ${
                      currentPage === index + 1 ? "bg-[#002E2C] text-white" : ""
                    }`}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredTests.length / testsPerPage)))}
                disabled={currentPage === Math.ceil(filteredTests.length / testsPerPage)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}