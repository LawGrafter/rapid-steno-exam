'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, ArrowLeft, Edit, FolderOpen, FileText } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

type TestCategory = {
  id: string
  name: string
  description: string
  display_order: number
}

type TestTopic = {
  id: string
  name: string
  description: string
  category_id: string
  display_order: number
}

type Test = {
  id: string
  title: string
  topic_id: string
}

type Material = {
  id: string
  title: string
  description?: string
  category_id: string
}

type MaterialCategory = {
  id: string
  name: string
  description: string
  display_order: number
  material_count?: number
}

export default function AdminCategoriesPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [categories, setCategories] = useState<MaterialCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const router = useRouter()

  // Fix hydration mismatch - only get user on client side
  useEffect(() => {
    setIsClient(true)
    // Check for admin user like other admin pages
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      setUser(JSON.parse(adminUser))
    }
  }, [router])

  useEffect(() => {
    if (!user || !isClient) return
    
    // Load categories and materials from database
    loadData()
  }, [user, isClient])
  
  const loadData = async () => {
    try {
      // Load categories from database
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('material_categories')
        .select('*')
        .order('name')

      if (categoriesError) {
        console.error('Categories error:', categoriesError)
        throw categoriesError
      }

      // Load materials from database (just id, title, category_id for counting)
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('id, title, category_id')

      if (materialsError) {
        console.error('Materials error:', materialsError)
        // Don't throw error for materials, continue with empty array
      }
      
      // Set the actual data from database
      setCategories(categoriesData || [])
      setMaterials(materialsData || [])
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      // Set empty arrays as fallback
      setCategories([])
      setMaterials([])
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return
    
    try {
      // Insert new category into Supabase database
      const { data, error } = await supabase
        .from('material_categories')
        .insert({
          name: newCategoryName,
          description: newCategoryDescription
        })
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Reload data from database to get updated list
      await loadData()
      setNewCategoryName('')
      setNewCategoryDescription('')
      setShowCategoryForm(false)
    } catch (error) {
      console.error('Error creating category:', error)
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) return
    
    try {
      // Check if category has materials
      const materialsInCategory = materials.filter(m => m.category_id === categoryId)
      if (materialsInCategory.length > 0) {
        if (!confirm(`This category has ${materialsInCategory.length} materials. Deleting it will remove the category association from these materials. Continue?`)) {
          return
        }
      }

      // Delete category from Supabase database
      const { error } = await supabase
        .from('material_categories')
        .delete()
        .eq('id', categoryId)

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Reload data from database to get updated list
      await loadData()
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in first, then navigate to admin categories.</p>
          <div className="space-y-2">
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
            <p className="text-sm text-gray-500">
              After login, manually navigate to /admin/categories
            </p>
          </div>
        </div>
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
                onClick={() => router.push('/admin/materials')}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Materials
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Category Management</h1>
                <p className="text-sm text-gray-600">Manage material categories</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push('/admin/dashboard')}
                variant="outline"
                size="sm"
              >
                Dashboard
              </Button>
              <Button
                onClick={() => router.push('/admin/materials')}
                variant="outline"
                size="sm"
              >
                Materials
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Category Form */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Add New Category</CardTitle>
              <Button
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                variant="outline"
                size="sm"
              >
                {showCategoryForm ? 'Cancel' : <Plus className="h-4 w-4 mr-2" />}
                {showCategoryForm ? 'Cancel' : 'Add Category'}
              </Button>
            </div>
          </CardHeader>
          
          {showCategoryForm && (
            <CardContent className="border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="categoryName">Category Name</Label>
                  <Input
                    id="categoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Enter category name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="categoryDescription">Description</Label>
                  <Input
                    id="categoryDescription"
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="Enter category description"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
                  Create Category
                </Button>
                <Button variant="outline" onClick={() => setShowCategoryForm(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle>All Categories ({categories.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
                  <p className="text-gray-600">Create your first category to organize materials.</p>
                </div>
                <Button onClick={() => setShowCategoryForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Category
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categories.map(category => {
                  const materialCount = materials.filter(m => m.category_id === category.id).length
                  return (
                    <div key={category.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{category.name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-sm">
                              {materialCount} material{materialCount !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDeleteCategory(category.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-4"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
