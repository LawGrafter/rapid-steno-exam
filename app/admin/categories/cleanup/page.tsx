'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Trash2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Category {
  id: string
  name: string
  description: string
  display_order: number
  test_count: number
  topic_count: number
  isEmpty: boolean
}

interface CleanupData {
  categories: Category[]
  emptyCategories: Category[]
}

export default function CategoryCleanupPage() {
  const [data, setData] = useState<CleanupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/cleanup-categories')
      if (!response.ok) throw new Error('Failed to fetch data')
      
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching cleanup data:', error)
      toast({
        title: "Error",
        description: "Failed to fetch category data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedCategories.length === 0) return

    try {
      setDeleting(true)
      const response = await fetch('/api/cleanup-categories', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ categoryIds: selectedCategories })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete categories')
      }

      const result = await response.json()
      toast({
        title: "Success",
        description: `Deleted ${result.deletedCount} categories successfully`
      })

      setSelectedCategories([])
      await fetchData() // Refresh data
    } catch (error) {
      console.error('Error deleting categories:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete categories",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
    }
  }

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const selectAllEmpty = () => {
    if (!data) return
    const emptyIds = data.emptyCategories.map(cat => cat.id)
    setSelectedCategories(emptyIds)
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Category Cleanup</h1>
          <p className="text-gray-600">Manage and clean up unused categories and topics</p>
        </div>

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{data.categories.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Empty Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{data.emptyCategories.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Categories with Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {data.categories.length - data.emptyCategories.length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <Button onClick={selectAllEmpty} variant="outline">
                Select All Empty Categories
              </Button>
              
              <Button onClick={() => setSelectedCategories([])} variant="outline">
                Clear Selection
              </Button>
              
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              {selectedCategories.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={deleting}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedCategories.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Categories</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedCategories.length} selected categories? 
                        This action cannot be undone and will also delete any empty topics in these categories.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteSelected}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Categories List */}
            <Card>
              <CardHeader>
                <CardTitle>All Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.categories.map((category) => (
                    <div
                      key={category.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedCategories.includes(category.id)
                          ? 'border-blue-500 bg-blue-50'
                          : category.isEmpty
                          ? 'border-red-200 bg-red-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => toggleCategorySelection(category.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">{category.name}</h3>
                            {category.isEmpty ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3" />
                                Empty
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3" />
                                Has Tests
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>Topics: {category.topic_count}</span>
                            <span>Tests: {category.test_count}</span>
                            <span>Order: {category.display_order}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => toggleCategorySelection(category.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
