'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, FileText, Clock, Calendar, Edit, Trash2, RotateCcw } from 'lucide-react'

type Test = {
  id: string
  title: string
  description: string
  category: string
  duration_minutes: number
  status: 'draft' | 'published' | 'coming_soon'
  created_at: string
}

export default function TestsPage() {
  const router = useRouter()
  const [tests, setTests] = useState<Test[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (!adminUser) {
      router.push('/admin/login')
      return
    }

    fetchTests()
  }, [router])

  const fetchTests = async () => {
    try {
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTests(data || [])
    } catch (error) {
      console.error('Error fetching tests:', error)
    } finally {
      setIsLoading(false)
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
        {tests.length === 0 ? (
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tests.map((test) => {
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
                        {test.category || 'General'}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
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
        )}
      </main>
    </div>
  )
}