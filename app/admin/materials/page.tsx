'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { getCurrentUser, logout } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { FileText, Image, Plus, Upload, Trash2, Edit, Eye } from 'lucide-react'

type Material = {
  id: string
  title: string
  description: string
  tags: string[]
  pdf_url: string
  category_id: string
  category_name?: string
  associated_test_id: string | null
  associated_test_title?: string
  status: 'draft' | 'published' | 'coming_soon'
  created_at: string
  updated_at: string
}

type MaterialCategory = {
  id: string
  name: string
  description: string
}

type Test = {
  id: string
  title: string
  status: 'draft' | 'published' | 'coming_soon'
}

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [categories, setCategories] = useState<MaterialCategory[]>([])
  const [tests, setTests] = useState<Test[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryDescription, setNewCategoryDescription] = useState('')
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    pdf_url: '',
    category_id: '',
    associated_test_id: '',
    status: 'draft' as 'draft' | 'published' | 'coming_soon'
  })
  
  const [tagInput, setTagInput] = useState('')

  // Fix hydration mismatch - only get user on client side
  useEffect(() => {
    setIsClient(true)
    // Check for admin user like other admin pages
    const adminUser = localStorage.getItem('adminUser')
    if (adminUser) {
      setUser(JSON.parse(adminUser))
    }
    // Remove automatic redirect - let the UI handle it
  }, [router])

  useEffect(() => {
    if (!user || !isClient) return
    
    // Load categories, tests, and materials from database
    loadData()
  }, [user, isClient])
  
  const loadData = async () => {
    try {
      console.log('Starting to load admin data...')
      
      // Load categories from database
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('material_categories')
        .select('*')
        .order('name')

      if (categoriesError) {
        console.error('Categories error:', categoriesError)
        // Don't throw error, continue with empty categories
      }

      console.log('Loaded categories:', categoriesData)

      // Load tests from database - remove the non-existent 'category' column
      const { data: testsData, error: testsError } = await supabase
        .from('tests')
        .select('id, title, status')
        .order('title')

      if (testsError) {
        console.error('Tests error:', testsError)
        // Don't throw error, continue with empty tests
      }

      console.log('Loaded tests:', testsData)

      // Load materials using the same API endpoint as the user-facing page
      console.log('Fetching materials from API...')
      const materialsResponse = await fetch('/api/materials')
      let materialsData = []
      
      if (materialsResponse.ok) {
        const apiMaterials = await materialsResponse.json()
        console.log('Loaded materials from API:', apiMaterials)
        
        // Transform API materials to match admin format
        materialsData = apiMaterials.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || '',
          tags: item.tags || [],
          pdf_url: item.pdf_url,
          category_id: item.category?.id || '',
          category_name: item.category?.name || 'General',
          associated_test_id: item.associated_test_id || null,
          associated_test_title: testsData?.find((t: any) => t.id === item.associated_test_id)?.title || '',
          status: item.status || 'published',
          created_at: item.created_at,
          updated_at: item.created_at
        }))
      } else {
        console.error('Failed to fetch materials from API:', materialsResponse.status, materialsResponse.statusText)
        // Try to get error details
        try {
          const errorText = await materialsResponse.text()
          console.error('API Error details:', errorText)
        } catch (e) {
          console.error('Could not read error response')
        }
      }
      
      console.log('Final materials data:', materialsData)
      
      // Set the data - use fallbacks for failed queries
      setCategories(categoriesData || [])
      setTests(testsData || [])
      setMaterials(materialsData)
      setIsLoading(false)
      
      console.log('Data loading completed')
    } catch (error) {
      console.error('Error loading data:', error)
      // Set empty arrays as fallback
      setCategories([])
      setTests([])
      setMaterials([])
      setIsLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }
  
  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.pdf_url || !formData.category_id) return

    setIsUploading(true)
    try {
      // Create material locally for now due to RLS permissions
      const newMaterial: Material = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        tags: formData.tags,
        pdf_url: formData.pdf_url,
        category_id: formData.category_id,
        category_name: categories.find(c => c.id === formData.category_id)?.name || '',
        associated_test_id: formData.associated_test_id || null,
        associated_test_title: tests.find(t => t.id === formData.associated_test_id)?.title || '',
        status: formData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Insert into Supabase database
      const { data, error } = await supabase
        .from('materials')
        .insert({
          title: formData.title,
          description: formData.description,
          tags: formData.tags,
          pdf_url: formData.pdf_url,
          category_id: formData.category_id,
          associated_test_id: formData.associated_test_id || null,
          status: formData.status
        })
        .select()
        .single()

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      // Reload data from database to get updated list
      await loadData()
      resetForm()
    } catch (error) {
      console.error('Error creating material:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleEdit = (material: Material) => {
    setFormData({
      title: material.title,
      description: material.description,
      tags: material.tags,
      pdf_url: material.pdf_url,
      category_id: material.category_id || '',
      associated_test_id: material.associated_test_id || '',
      status: material.status
    })
    setEditingMaterial(material)
    setShowUploadForm(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMaterial || !formData.title || !formData.pdf_url || !formData.category_id) return

    setIsUploading(true)
    try {
      // Update material in Supabase
      const { error } = await supabase
        .from('materials')
        .update({
          title: formData.title,
          description: formData.description,
          tags: formData.tags,
          pdf_url: formData.pdf_url,
          category_id: formData.category_id,
          associated_test_id: formData.associated_test_id === 'none' ? null : formData.associated_test_id,
          status: formData.status
        })
        .eq('id', editingMaterial.id)

      if (error) throw error

      // Reload data to get updated list
      await loadData()
      resetForm()
    } catch (error) {
      console.error('Error updating material:', error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return
    
    try {
      // Delete material from Supabase
      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Reload data to get updated list
      await loadData()
    } catch (error) {
      console.error('Error deleting material:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      tags: [],
      pdf_url: '',
      category_id: '',
      associated_test_id: '',
      status: 'draft'
    })
    setTagInput('')
    setEditingMaterial(null)
    setShowUploadForm(false)
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
          <p className="text-gray-600 mb-4">Please log in first, then navigate to admin materials.</p>
          <div className="space-y-2">
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
            <p className="text-sm text-gray-500">
              After login, manually navigate to /admin/materials
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Materials Management</h1>
              <p className="text-sm text-gray-600">Admin Panel - Manage study materials and categories</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push('/admin/categories')}
                variant="outline"
                size="sm"
              >
                Categories
              </Button>
              <Button
                onClick={() => router.push('/admin/dashboard')}
                variant="outline"
                size="sm"
              >
                Dashboard
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Material Form */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingMaterial ? 'Edit Material' : 'Add New Material'}</CardTitle>
              <Button
                onClick={() => setShowUploadForm(!showUploadForm)}
                variant="outline"
                size="sm"
              >
                {showUploadForm ? 'Cancel' : <Plus className="h-4 w-4 mr-2" />}
                {showUploadForm ? 'Cancel' : 'Add Material'}
              </Button>
            </div>
          </CardHeader>
          {showUploadForm && (
            <CardContent>
              <form onSubmit={editingMaterial ? handleUpdate : handleSubmit} className="space-y-6">
                {/* Title and Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter material title"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category_id || ""}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter material description"
                    rows={3}
                  />
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Enter tag and press Add"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* PDF URL */}
                <div>
                  <Label htmlFor="pdfUrl">PDF URL (Google Drive) *</Label>
                  <Input
                    id="pdfUrl"
                    value={formData.pdf_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, pdf_url: e.target.value }))}
                    placeholder="https://drive.google.com/file/d/YOUR_FILE_ID/view?usp=sharing"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Paste the Google Drive sharing URL of your PDF
                  </p>
                </div>

                {/* Associated Test */}
                <div>
                  <Label htmlFor="associatedTest">Associated Test (Optional)</Label>
                  <Select
                    value={formData.associated_test_id || undefined}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, associated_test_id: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select test (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {tests.map(test => (
                        <SelectItem key={test.id} value={test.id}>
                          {test.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Available tests: {tests.length}
                  </p>
                </div>

                {/* Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select
                      value={formData.status || "draft"}
                      onValueChange={(value: 'draft' | 'published' | 'coming_soon') => 
                        setFormData(prev => ({ ...prev, status: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft - Not visible to users</SelectItem>
                        <SelectItem value="published">Published - Visible to users</SelectItem>
                        <SelectItem value="coming_soon">Coming Soon - Visible but not accessible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isUploading}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {isUploading ? 'Saving...' : (editingMaterial ? 'Update Material' : 'Create Material')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>

        {/* Materials List by Category */}
        <div className="space-y-6">
          {categories.map(category => {
            const categoryMaterials = materials.filter(m => m.category_id === category.id)
            if (categoryMaterials.length === 0) return null
            
            return (
              <div key={category.id}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-6 rounded-full bg-blue-600"></div>
                  <h2 className="text-xl font-semibold text-gray-900">{category.name}</h2>
                  <Badge variant="secondary">{categoryMaterials.length} materials</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryMaterials.map(material => (
                    <Card key={material.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-red-100">
                            <FileText className="h-5 w-5 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{material.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={
                                material.status === 'published' ? 'default' :
                                material.status === 'coming_soon' ? 'secondary' : 'outline'
                              } className="text-xs">
                                {material.status.replace('_', ' ')}
                              </Badge>
                              {material.associated_test_title && (
                                <Badge variant="outline" className="text-xs">
                                  {material.associated_test_title}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-700 text-sm mb-3 line-clamp-2">
                          {material.description}
                        </p>
                        
                        {material.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {material.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {material.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{material.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => handleEdit(material)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDelete(material.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
