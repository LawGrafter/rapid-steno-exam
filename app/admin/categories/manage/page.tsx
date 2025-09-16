'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, ArrowLeft, Edit, FolderOpen, FileText, Settings } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

type TestCategory = {
  id: string
  name: string
  description: string
  display_order: number
  topic_count?: number
  test_count?: number
}

type TestTopic = {
  id: string
  name: string
  description: string
  category_id: string
  display_order: number
  test_count?: number
}

export default function CategoriesManagePage() {
  const [categories, setCategories] = useState<TestCategory[]>([])
  const [topics, setTopics] = useState<TestTopic[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  
  // Category form state
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TestCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  
  // Topic form state
  const [showTopicForm, setShowTopicForm] = useState(false)
  const [editingTopic, setEditingTopic] = useState<TestTopic | null>(null)
  const [topicName, setTopicName] = useState('')
  const [topicDescription, setTopicDescription] = useState('')
  
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      setUser(JSON.parse(adminUser))
    }
  }, [])

  useEffect(() => {
    if (!user || !isClient) return
    loadData()
  }, [user, isClient])

  const loadTopicsForCategory = async () => {
    if (!selectedCategory) return
    
    try {
      const { data: topicsData, error: topicsError } = await supabase
        .from('test_topics')
        .select(`
          id,
          name,
          description,
          category_id,
          display_order,
          tests:tests(id)
        `)
        .eq('category_id', selectedCategory)
        .order('display_order')

      if (topicsError) throw topicsError

      const topicsWithCounts = topicsData?.map(topic => ({
        ...topic,
        test_count: topic.tests?.length || 0
      })) || []

      setTopics(topicsWithCounts)
    } catch (error) {
      console.error('Error loading topics:', error)
      toast({
        title: "Error",
        description: "Failed to load topics",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    if (selectedCategory) {
      loadTopicsForCategory()
    } else {
      setTopics([])
    }
  }, [selectedCategory])

  const loadData = async () => {
    try {
      setIsLoading(true)
      
      // Load categories with counts
      const { data: categoriesData, error: catError } = await supabase
        .from('test_categories')
        .select(`
          id,
          name,
          description,
          display_order,
          topics:test_topics(
            id,
            tests:tests(id)
          )
        `)
        .order('display_order')

      if (catError) throw catError

      // Calculate counts for categories
      const categoriesWithCounts = categoriesData?.map(cat => ({
        ...cat,
        topic_count: cat.topics?.length || 0,
        test_count: cat.topics?.reduce((total, topic) => total + (topic.tests?.length || 0), 0) || 0
      })) || []

      setCategories(categoriesWithCounts)

    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load categories and topics",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) return

    try {
      const maxOrder = Math.max(...categories.map(c => c.display_order), 0)
      
      const { error } = await supabase
        .from('test_categories')
        .insert({
          name: categoryName,
          description: categoryDescription,
          display_order: maxOrder + 1
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Category created successfully"
      })

      resetCategoryForm()
      loadData()
    } catch (error) {
      console.error('Error creating category:', error)
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive"
      })
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory || !categoryName.trim()) return

    try {
      const { error } = await supabase
        .from('test_categories')
        .update({
          name: categoryName,
          description: categoryDescription
        })
        .eq('id', editingCategory.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Category updated successfully"
      })

      resetCategoryForm()
      loadData()
    } catch (error) {
      console.error('Error updating category:', error)
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive"
      })
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // Check if category has topics/tests
      const category = categories.find(c => c.id === categoryId)
      if (category && (category.topic_count! > 0 || category.test_count! > 0)) {
        toast({
          title: "Cannot Delete",
          description: "Category contains topics or tests. Please move or delete them first.",
          variant: "destructive"
        })
        return
      }

      const { error } = await supabase
        .from('test_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Category deleted successfully"
      })

      if (selectedCategory === categoryId) {
        setSelectedCategory(null)
        setTopics([])
      }
      loadData()
    } catch (error) {
      console.error('Error deleting category:', error)
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive"
      })
    }
  }

  const handleCreateTopic = async () => {
    if (!topicName.trim() || !selectedCategory) return

    try {
      const maxOrder = Math.max(...topics.map(t => t.display_order), 0)
      
      const { error } = await supabase
        .from('test_topics')
        .insert({
          name: topicName,
          description: topicDescription,
          category_id: selectedCategory,
          display_order: maxOrder + 1
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Topic created successfully"
      })

      resetTopicForm()
      loadData()
    } catch (error) {
      console.error('Error creating topic:', error)
      toast({
        title: "Error",
        description: "Failed to create topic",
        variant: "destructive"
      })
    }
  }

  const handleUpdateTopic = async () => {
    if (!editingTopic || !topicName.trim()) return

    try {
      const { error } = await supabase
        .from('test_topics')
        .update({
          name: topicName,
          description: topicDescription
        })
        .eq('id', editingTopic.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Topic updated successfully"
      })

      resetTopicForm()
      loadData()
    } catch (error) {
      console.error('Error updating topic:', error)
      toast({
        title: "Error",
        description: "Failed to update topic",
        variant: "destructive"
      })
    }
  }

  const handleDeleteTopic = async (topicId: string) => {
    try {
      // Check if topic has tests
      const topic = topics.find(t => t.id === topicId)
      if (topic && topic.test_count! > 0) {
        toast({
          title: "Cannot Delete",
          description: "Topic contains tests. Please move or delete them first.",
          variant: "destructive"
        })
        return
      }

      const { error } = await supabase
        .from('test_topics')
        .delete()
        .eq('id', topicId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Topic deleted successfully"
      })

      loadData()
    } catch (error) {
      console.error('Error deleting topic:', error)
      toast({
        title: "Error",
        description: "Failed to delete topic",
        variant: "destructive"
      })
    }
  }

  const resetCategoryForm = () => {
    setShowCategoryForm(false)
    setEditingCategory(null)
    setCategoryName('')
    setCategoryDescription('')
  }

  const resetTopicForm = () => {
    setShowTopicForm(false)
    setEditingTopic(null)
    setTopicName('')
    setTopicDescription('')
  }

  const startEditCategory = (category: TestCategory) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setCategoryDescription(category.description)
    setShowCategoryForm(true)
  }

  const startEditTopic = (topic: TestTopic) => {
    setEditingTopic(topic)
    setTopicName(topic.name)
    setTopicDescription(topic.description)
    setShowTopicForm(true)
  }

  if (!isClient || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
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
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push('/admin/dashboard')}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Categories & Topics Management</h1>
                <p className="text-sm text-gray-600">Manage test categories and topics</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => router.push('/admin/categories/cleanup')}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Cleanup
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Categories Section */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Categories ({categories.length})
                  </CardTitle>
                  <Button
                    onClick={() => setShowCategoryForm(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Category Form */}
                {showCategoryForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <h3 className="font-semibold mb-3">
                      {editingCategory ? 'Edit Category' : 'Add New Category'}
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="categoryName">Name</Label>
                        <Input
                          id="categoryName"
                          value={categoryName}
                          onChange={(e) => setCategoryName(e.target.value)}
                          placeholder="Category name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="categoryDescription">Description</Label>
                        <Input
                          id="categoryDescription"
                          value={categoryDescription}
                          onChange={(e) => setCategoryDescription(e.target.value)}
                          placeholder="Category description"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                          disabled={!categoryName.trim()}
                          size="sm"
                        >
                          {editingCategory ? 'Update' : 'Create'}
                        </Button>
                        <Button
                          onClick={resetCategoryForm}
                          variant="outline"
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Categories List */}
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedCategory === category.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          <p className="text-sm text-gray-600">{category.description}</p>
                          <div className="flex gap-3 mt-2">
                            <Badge variant="secondary">
                              {category.topic_count} topics
                            </Badge>
                            <Badge variant="secondary">
                              {category.test_count} tests
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              startEditCategory(category)
                            }}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                onClick={(e) => e.stopPropagation()}
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCategory(category.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Topics Section */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Topics ({topics.length})
                    {selectedCategory && (
                      <span className="text-sm font-normal text-gray-500">
                        in {categories.find(c => c.id === selectedCategory)?.name}
                      </span>
                    )}
                  </CardTitle>
                  <Button
                    onClick={() => setShowTopicForm(true)}
                    disabled={!selectedCategory}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Topic
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!selectedCategory ? (
                  <div className="text-center py-8 text-gray-500">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Select a category to view and manage its topics</p>
                  </div>
                ) : (
                  <>
                    {/* Topic Form */}
                    {showTopicForm && (
                      <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                        <h3 className="font-semibold mb-3">
                          {editingTopic ? 'Edit Topic' : 'Add New Topic'}
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="topicName">Name</Label>
                            <Input
                              id="topicName"
                              value={topicName}
                              onChange={(e) => setTopicName(e.target.value)}
                              placeholder="Topic name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="topicDescription">Description</Label>
                            <Input
                              id="topicDescription"
                              value={topicDescription}
                              onChange={(e) => setTopicDescription(e.target.value)}
                              placeholder="Topic description"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={editingTopic ? handleUpdateTopic : handleCreateTopic}
                              disabled={!topicName.trim()}
                              size="sm"
                            >
                              {editingTopic ? 'Update' : 'Create'}
                            </Button>
                            <Button
                              onClick={resetTopicForm}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Topics List */}
                    <div className="space-y-3">
                      {topics.map((topic) => (
                        <div
                          key={topic.id}
                          className="p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{topic.name}</h3>
                              <p className="text-sm text-gray-600">{topic.description}</p>
                              <div className="mt-2">
                                <Badge variant="secondary">
                                  {topic.test_count} tests
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => startEditTopic(topic)}
                                variant="ghost"
                                size="sm"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Topic</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{topic.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteTopic(topic.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
