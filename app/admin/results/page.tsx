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
import { ArrowLeft, Download, Eye, BarChart3, Search, Filter, X, Trash2 } from 'lucide-react'

type AttemptWithDetails = {
  id: string
  user_id: string
  test_id: string
  started_at: string
  submitted_at: string | null
  total_score: number
  status: 'active' | 'submitted'
  users: {
    full_name: string
  }
  tests: {
    title: string
    category: string
  }
}

type Test = {
  id: string
  title: string
  category: string
}

export default function ResultsPage() {
  const router = useRouter()
  const [attempts, setAttempts] = useState<AttemptWithDetails[]>([])
  const [allAttempts, setAllAttempts] = useState<AttemptWithDetails[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedTest, setSelectedTest] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (!adminUser) {
      router.push('/admin/login')
      return
    }

    fetchData()
  }, [router])

  const fetchData = async () => {
    try {
      // Fetch tests
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('id, title, category')
        .order('title')

      if (testsError) throw testsError
      setTests(testsData || [])

      // Extract unique categories
      const categorySet = new Set(testsData?.map(test => test.category).filter(Boolean))
      const uniqueCategories = Array.from(categorySet)
      setCategories(uniqueCategories)

      // Use the same query pattern that works in analytics page
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('attempts')
        .select(`
          *,
          users (full_name),
          tests (title, category)
        `)
        .order('started_at', { ascending: false })

      if (attemptsError) throw attemptsError
      setAllAttempts(attemptsData || [])
      setAttempts(attemptsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Filter attempts based on all criteria
  useEffect(() => {
    let filtered = [...allAttempts]

    // Filter by test
    if (selectedTest !== 'all') {
      filtered = filtered.filter(a => a.test_id === selectedTest)
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => (a.tests as any)?.category === selectedCategory)
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(a => a.status === selectedStatus)
    }

    // Filter by search query (student name)
    if (searchQuery.trim()) {
      filtered = filtered.filter(a => 
        (a.users as any)?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(a => new Date(a.started_at) >= new Date(dateFrom))
    }
    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999) // Include the entire end date
      filtered = filtered.filter(a => new Date(a.started_at) <= endDate)
    }

    setAttempts(filtered)
  }, [allAttempts, selectedTest, selectedCategory, selectedStatus, searchQuery, dateFrom, dateTo])

  const clearAllFilters = () => {
    setSelectedTest('all')
    setSelectedCategory('all')
    setSelectedStatus('all')
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
  }

  const deleteAttempt = async (attemptId: string, studentName: string, testTitle: string) => {
    if (!confirm(`Are you sure you want to delete ${studentName}'s attempt for "${testTitle}"? This will allow them to retake the test. This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('attempts')
        .delete()
        .eq('id', attemptId)

      if (error) throw error
      
      // Refresh the data
      await fetchData()
      alert(`Attempt deleted successfully. ${studentName} can now retake "${testTitle}".`)
    } catch (error) {
      console.error('Error deleting attempt:', error)
      alert('Error deleting attempt. Please try again.')
    }
  }

  const exportResults = async () => {
    try {
      const filteredAttempts = attempts

      const csvContent = [
        'Student Name,Test Title,Category,Started At,Submitted At,Time Taken,Score,Status',
        ...filteredAttempts.map(attempt => {
          const timeTaken = attempt.submitted_at 
            ? Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / (1000 * 60))
            : 0
          const scoreFormat = attempt.total_score
          return [
            attempt.users?.full_name || 'Unknown',
            attempt.tests?.title || 'Unknown Test',
            (attempt.tests as any)?.category || 'General',
            new Date(attempt.started_at).toLocaleString(),
            attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : 'Not submitted',
            attempt.submitted_at ? `${timeTaken} minutes` : '-',
            scoreFormat,
            attempt.status
          ].join(',')
        })
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `test-results-${selectedTest === 'all' ? 'all' : 'filtered'}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting results:', error)
    }
  }

  const getStatusBadge = (status: string, submittedAt: string | null) => {
    if (status === 'submitted') {
      return <Badge className="bg-green-500 text-white">Completed</Badge>
    } else {
      return <Badge className="bg-yellow-500 text-white">In Progress</Badge>
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
                <h1 className="text-2xl font-bold text-gray-900">Test Results</h1>
                <p className="text-sm text-gray-600">View and export test attempts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportResults} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle>Filters</CardTitle>
              </div>
              <Button onClick={clearAllFilters} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Search by Student Name */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter by Test */}
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger>
                  <SelectValue placeholder="All Tests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tests</SelectItem>
                  {tests.map(test => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter by Category */}
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filter by Status */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Completed</SelectItem>
                  <SelectItem value="active">In Progress</SelectItem>
                </SelectContent>
              </Select>

              {/* Date From */}
              <Input
                type="date"
                placeholder="From date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />

              {/* Date To */}
              <Input
                type="date"
                placeholder="To date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" style={{color: '#002E2C'}}>{attempts.length}</div>
              <p className="text-sm text-gray-600">Total Attempts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">
                {attempts.filter((a: AttemptWithDetails) => a.status === 'submitted').length}
              </div>
              <p className="text-sm text-gray-600">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">
                {attempts.filter((a: AttemptWithDetails) => a.status === 'active').length}
              </div>
              <p className="text-sm text-gray-600">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">
                {attempts.length > 0 
                  ? (attempts.reduce((sum: number, a: AttemptWithDetails) => sum + a.total_score, 0) / attempts.length).toFixed(1)
                  : '0'
                }
              </div>
              <p className="text-sm text-gray-600">Average Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Test Attempts</CardTitle>
            <CardDescription>
              {selectedTest === 'all' 
                ? `Showing all ${attempts.length} attempts`
                : `Showing ${attempts.length} attempts for selected test`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No attempts found</h3>
                <p className="text-gray-600">No test attempts match the selected criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Student</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Test</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Category</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Started</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Submitted</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Duration</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Score</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt: AttemptWithDetails) => {
                      const timeTaken = attempt.submitted_at 
                        ? Math.round((new Date(attempt.submitted_at).getTime() - new Date(attempt.started_at).getTime()) / (1000 * 60))
                        : 0
                      const scoreFormat = attempt.total_score
                      
                      return (
                        <tr key={attempt.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">
                            <div className="font-medium text-gray-900">{attempt.users?.full_name || 'Unknown'}</div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="text-gray-900">{attempt.tests?.title || 'Unknown Test'}</div>
                          </td>
                          <td className="py-3 px-2">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                              {(attempt.tests as any)?.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {new Date(attempt.started_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {attempt.submitted_at 
                              ? new Date(attempt.submitted_at).toLocaleString()
                              : '-'
                            }
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {attempt.submitted_at ? `${timeTaken} min` : '-'}
                          </td>
                          <td className="py-3 px-2">
                            <span className="font-medium text-gray-900">{scoreFormat}</span>
                          </td>
                          <td className="py-3 px-2">
                            {getStatusBadge(attempt.status, attempt.submitted_at)}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <Link href={`/admin/results/${attempt.id}`}>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                              </Link>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => deleteAttempt(attempt.id, attempt.users?.full_name || 'Unknown', attempt.tests?.title || 'Unknown Test')}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                title="Delete attempt - Allow student to retake test"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}