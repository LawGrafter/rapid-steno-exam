'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { AccessControl, UserAccess } from '@/lib/access-control'
import { UpgradeDialog } from '@/components/ui/upgrade-dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { getCurrentUser, logout } from '@/lib/auth'
import { FileText, Image, BookOpen, LogOut, Lock, Eye, Download, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Search, Building, Cpu, Shirt } from 'lucide-react'
import { useRouter } from 'next/navigation'
import './materials.css'

type Material = {
  id: string
  title: string
  description: string
  type: 'pdf' | 'mindmap'
  file_url: string
  section: string
  topic: string
  tags: string[]
  associated_test_id?: string
}

type Category = {
  id: string
  name: string
  description: string
  materialCount: number
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [restrictedCategory, setRestrictedCategory] = useState('')
  const [upgradeMessage, setUpgradeMessage] = useState('')
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const [pendingMaterial, setPendingMaterial] = useState<Material | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  
  // Initialize Supabase client and AccessControl
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const accessControl = new AccessControl(supabase)

  useEffect(() => {
    setIsClient(true)
    const currentUser = getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
      // Load user access permissions
      loadUserAccess(currentUser.id)
    } else {
      router.push('/login')
    }
  }, [])

  const loadUserAccess = async (userId: string) => {
    try {
      const access = await accessControl.getUserAccess(userId)
      setUserAccess(access)
    } catch (error) {
      console.error('Error loading user access:', error)
    }
  }

  const handleMaterialAccess = async (material: Material) => {
    if (!user || !userAccess) return

    // Check if user can access this material
    const canAccess = accessControl.canAccessMaterial(userAccess, material.id, material.section)
    
    if (!canAccess) {
      // Show upgrade dialog for restricted content
      setRestrictedCategory(material.section)
      setShowUpgradeDialog(true)
      return
    }

    // User has access, proceed with viewing
    handleViewMaterial(material)
  }

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
             window.innerWidth <= 768
    }
    setIsMobile(checkMobile())
  }, [])

  useEffect(() => {
    if (!user || !isClient) return
    
    const fetchData = async () => {
      try {
        // Fetch materials
        const materialsResponse = await fetch('/api/materials')
        if (materialsResponse.ok) {
          const materialsData = await materialsResponse.json()
          const transformedMaterials: Material[] = materialsData.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description || '',
            type: 'pdf',
            file_url: item.pdf_url,
            section: item.category?.name || 'General',
            topic: item.title,
            tags: item.tags || [],
            associated_test_id: item.associated_test_id
          }))
          setMaterials(transformedMaterials)

          // Create categories with material counts
          const categoryMap = new Map<string, { name: string; description: string; count: number }>()
          
          materialsData.forEach((item: any) => {
            const categoryName = item.category?.name || 'General'
            const categoryDesc = item.category?.description || 'General materials'
            
            if (categoryMap.has(categoryName)) {
              categoryMap.get(categoryName)!.count++
            } else {
              categoryMap.set(categoryName, { name: categoryName, description: categoryDesc, count: 1 })
            }
          })

          const categoriesArray: Category[] = Array.from(categoryMap.entries()).map(([name, data]) => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: data.name,
            description: data.description,
            materialCount: data.count
          }))

          setCategories(categoriesArray)
          setFilteredCategories(categoriesArray)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setMaterials([])
        setCategories([])
        setFilteredCategories([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user, isClient])

  // Filter categories based on search and filter
  useEffect(() => {
    let filtered = categories

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(category => 
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply category filter
    if (selectedFilter !== 'all') {
      // You can add specific filters here if needed
      filtered = filtered.filter(category => category.name.toLowerCase().includes(selectedFilter.toLowerCase()))
    }

    setFilteredCategories(filtered)
  }, [categories, searchQuery, selectedFilter])

  const handleCategoryClick = async (categoryName: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    try {
      // Check user access for this category
      const userAccess = await accessControl.getUserAccess(user.id)
      
      if (!accessControl.canAccessCategory(userAccess, categoryName)) {
        setUpgradeMessage(accessControl.getUpgradeMessage(categoryName))
        setShowUpgradeDialog(true)
        return
      }

      setSelectedCategory(categoryName)
    } catch (error) {
      console.error('Error checking category access:', error)
      setUpgradeMessage('Unable to verify access. Please try again.')
      setShowUpgradeDialog(true)
    }
  }

  const handleBackToCategories = () => {
    setSelectedCategory(null)
  }

  const getCategoryMaterials = (categoryName: string) => {
    return materials.filter(material => material.section === categoryName)
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setSelectedFilter('all')
  }

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes('computer') || name.includes('electronics')) return <Cpu className="h-6 w-6" />
    if (name.includes('construction') || name.includes('building')) return <Building className="h-6 w-6" />
    if (name.includes('textile') || name.includes('fashion')) return <Shirt className="h-6 w-6" />
    return <BookOpen className="h-6 w-6" />
  }

  // Convert Google Drive URL to embeddable format
  const getEmbeddableUrl = (url: string) => {
    // Check if it's a Google Drive URL
    if (url.includes('drive.google.com')) {
      // Extract file ID from various Google Drive URL formats
      // Handle both /file/d/ID/view and /file/d/ID/view?usp=sharing formats
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/) || url.match(/id=([a-zA-Z0-9-_]+)/)
      if (fileIdMatch) {
        const fileId = fileIdMatch[1]
        // Use simple preview URL without extra parameters
        return `https://drive.google.com/file/d/${fileId}/preview`
      }
    }
    // Return original URL if not Google Drive or if conversion fails
    return url
  }

  const handleViewMaterial = (material: Material) => {
    // Show warning dialog first
    setPendingMaterial(material)
    setShowWarning(true)
  }

  const handleWarningAgree = () => {
    if (pendingMaterial) {
      // Convert URL to embeddable format if it's Google Drive
      const updatedMaterial = {
        ...pendingMaterial,
        file_url: getEmbeddableUrl(pendingMaterial.file_url)
      }
      
      // Open PDF in new tab instead of modal
      window.open(updatedMaterial.file_url, '_blank', 'noopener,noreferrer')
    }
    
    // Close warning and reset
    setShowWarning(false)
    setPendingMaterial(null)
  }

  const handleWarningDisagree = () => {
    // Close warning and reset
    setShowWarning(false)
    setPendingMaterial(null)
  }

  const closeViewer = () => {
    setIsViewerOpen(false)
    setSelectedMaterial(null)
    setZoomLevel(1) // Reset zoom when closing
    setIsDragging(false)
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3)) // Max zoom 3x
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5)) // Min zoom 0.5x
  }

  const handleResetZoom = () => {
    setZoomLevel(1)
  }

  // Mouse drag scrolling handlers
  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (!isViewerOpen || selectedMaterial?.type !== 'mindmap' || !containerRef.current) return
    
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setScrollStart({ x: containerRef.current.scrollLeft, y: containerRef.current.scrollTop })
    
    // Change cursor to grabbing
    containerRef.current.style.cursor = 'grabbing'
    e.preventDefault()
  }

  const handleDragMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    containerRef.current.scrollLeft = scrollStart.x - deltaX
    containerRef.current.scrollTop = scrollStart.y - deltaY

    e.preventDefault()
  }

  const handleDragMouseUp = () => {
    if (!containerRef.current) return
    
    setIsDragging(false)
    containerRef.current.style.cursor = zoomLevel > 1 ? 'grab' : 'default'
  }

  // Set cursor style based on zoom level
  useEffect(() => {
    if (containerRef.current && isViewerOpen && selectedMaterial?.type === 'mindmap') {
      containerRef.current.style.cursor = zoomLevel > 1 ? 'grab' : 'default'
    }
  }, [zoomLevel, isViewerOpen, selectedMaterial])



  // Prevent hydration mismatch
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  const computerAwarenessMaterials = materials.filter(m => m.section === 'Computer Awareness')

  return (
    <>
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Study Materials</h1>
                <p className="text-sm text-gray-600">Welcome, {user.full_name}</p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => router.push('/tests')}
                  variant="outline"
                  size="sm"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  Tests
                </Button>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!selectedCategory ? (
            // Show Categories View with Search and Filters
            <>
              {/* Search and Filter Bar */}
              <div className="mb-8 space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="🔍 Search materials and categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 border-2 border-gray-200 focus:border-[#002E2C] rounded-xl"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                      <SelectTrigger className="w-[180px] h-12 border-2 border-gray-200 rounded-xl">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name.toLowerCase()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleClearFilters} className="h-12 px-6 border-2 border-gray-200 rounded-xl hover:bg-gray-50">
                      Clear Filters
                    </Button>
                  </div>
                </div>
                
                {/* Results Count */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#002E2C] rounded-full"></div>
                  <p className="text-sm font-medium text-gray-700">
                    Showing {filteredCategories.length} categories
                  </p>
                </div>
              </div>

              {filteredCategories.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-12 w-12 text-[#002E2C]" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">No Categories Found</h3>
                  <p className="text-gray-600 max-w-md mx-auto">Try adjusting your search or filters to discover amazing study materials.</p>
                </div>
              ) : (
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCategories.map((category) => {
                    return (
                      <Card 
                        key={category.id} 
                        className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-200/50 bg-white hover:bg-gradient-to-br hover:from-teal-50/50 hover:to-emerald-50/50 shadow-md hover:shadow-xl overflow-hidden"
                        onClick={() => handleCategoryClick(category.name)}
                      >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#002E2C] via-teal-500 to-emerald-500"></div>
                        
                        <CardHeader className="text-center pb-6 pt-8">
                          <div className="mx-auto mb-6 p-4 bg-gradient-to-br from-[#002E2C] to-teal-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                            <div className="text-white">
                              {getCategoryIcon(category.name)}
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 mb-4">
                            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-teal-100 to-emerald-100 text-[#002E2C] border border-teal-200">
                              📚 {category.materialCount} Materials
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="text-center pb-8">
                          <CardTitle className="text-xl font-bold mb-4 text-gray-900 group-hover:text-[#002E2C] transition-colors">
                            {category.name}
                          </CardTitle>
                          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                            {category.description}
                          </p>
                          <Button
                            onClick={() => handleCategoryClick(category.name)}
                            className="w-full bg-gradient-to-r from-[#002E2C] to-teal-600 hover:from-[#001A18] hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105"
                          >
                            🚀 Explore Materials
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            // Show Materials for Selected Category
            <>
              <div className="mb-8">
                <Button 
                  onClick={handleBackToCategories}
                  variant="outline" 
                  className="mb-4"
                >
                  ← Back to Categories
                </Button>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-8 rounded-full" style={{backgroundColor: '#002E2C'}}></div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedCategory}</h2>
                  <Badge variant="secondary" className="ml-2">
                    {getCategoryMaterials(selectedCategory).length} Materials
                  </Badge>
                </div>
                
                {/* Important Notice for Allahabad High Court */}
                {selectedCategory.includes('Allahabad High Court') && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-center font-medium text-amber-800">
                      ⚠️ Important: Every week 1 new subject's notes will be uploaded. As the vacancy is announced, we will speed up the process.
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getCategoryMaterials(selectedCategory).map((material) => (
                  <Card key={material.id} className="group hover:shadow-xl transition-all duration-300 border border-gray-200/50 bg-white hover:bg-gradient-to-br hover:from-teal-50/50 hover:to-emerald-50/50 shadow-md hover:shadow-xl overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#002E2C] via-teal-500 to-emerald-500"></div>
                    
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-4 mb-3">
                        <div className="relative">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-[#002E2C] to-teal-600 shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-2xl font-bold text-gray-900 mb-1 line-clamp-2 group-hover:text-[#002E2C] transition-colors">
                            {material.title}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">
                        {material.description || 'Comprehensive study material designed for effective learning and exam preparation.'}
                      </p>
                      
                      {/* Tags Display */}
                      {material.tags && material.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {material.tags.slice(0, 3).map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-teal-100 to-emerald-100 text-[#002E2C] border border-teal-200">
                              #{tag}
                            </span>
                          ))}
                          {material.tags.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              +{material.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <Button
                        onClick={() => handleMaterialAccess(material)}
                        className="w-full h-14 bg-gradient-to-r from-[#002E2C] to-teal-600 hover:from-[#001A18] hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]"
                      >
                        <div className="flex items-center justify-center gap-3">
                          <div className="p-2 bg-white/20 rounded-lg">
                            <FileText className="h-5 w-5" />
                          </div>
                          <span className="text-lg font-bold">Study Material Now</span>
                        </div>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Upgrade Dialog */}
      <UpgradeDialog 
        isOpen={showUpgradeDialog}
        onClose={() => setShowUpgradeDialog(false)}
        categoryName={restrictedCategory}
        userHasGoldPlan={userAccess?.hasGoldPlan || false}
      />

      {/* PDF Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="max-w-md border-4 border-red-500 shadow-2xl bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-full">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                ⚠️ Important Notice
              </span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-4 mt-4">
              <div className="p-4 bg-gradient-to-r from-red-100 to-orange-100 border-l-4 border-red-500 rounded-r-lg">
                <p className="font-bold text-lg text-red-800 mb-2">
                  🚫 Please Do Not Share This PDF With Anyone Outside
                </p>
                <p className="text-red-700">
                  Each PDF has a <span className="font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">Unique ID</span> and gets tracked. 
                  Unauthorized sharing will result in your account being blocked permanently.
                </p>
              </div>
              
              <div className="p-3 bg-gradient-to-r from-yellow-100 to-orange-100 border border-yellow-400 rounded-lg">
                <p className="text-sm text-gray-800 font-medium">
                  By clicking <span className="font-bold text-green-600">"Yes, I Agree"</span>, you acknowledge that you understand and accept these terms.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 mt-6">
            <AlertDialogCancel 
              onClick={handleWarningDisagree}
              className="bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              ❌ No, I Don't Agree
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleWarningAgree}
              className="bg-gradient-to-r from-[#002E2C] to-teal-600 hover:from-[#001A18] hover:to-teal-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              ✅ Yes, I Agree
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Material Viewer */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent 
          className="max-w-6xl h-[90vh] p-0 materials-viewer"
        >
                     {/* Close Button - Floating */}
           <Button
             onClick={closeViewer}
             variant="outline"
             size="sm"
             className="absolute top-2 right-2 z-20 h-8 w-8 p-0 bg-white/90 hover:bg-white"
           >
             ✕
           </Button>

           {/* Zoom Controls - Only for mindmaps */}
           {selectedMaterial?.type === 'mindmap' && (
             <div className="absolute top-2 left-2 z-20 flex gap-2">
               <Button
                 onClick={handleZoomOut}
                 variant="outline"
                 size="sm"
                 className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                 disabled={zoomLevel <= 0.5}
               >
                 <ZoomOut className="h-4 w-4" />
               </Button>
               <Button
                 onClick={handleResetZoom}
                 variant="outline"
                 size="sm"
                 className="h-8 px-2 bg-white/90 hover:bg-white text-xs"
               >
                 {Math.round(zoomLevel * 100)}%
               </Button>
               <Button
                 onClick={handleZoomIn}
                 variant="outline"
                 size="sm"
                 className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                 disabled={zoomLevel >= 3}
               >
                 <ZoomIn className="h-4 w-4" />
               </Button>
             </div>
           )}

          <div 
            className="flex-1 overflow-hidden relative"
          >
            
            {selectedMaterial?.type === 'pdf' ? (
              <div className="h-full w-full relative">
                {isMobile ? (
                  // Mobile: Use direct link instead of iframe
                  <div className="h-full w-full flex flex-col items-center justify-center p-4 bg-gray-50">
                    <div className="text-center mb-4">
                      <FileText className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">
                        {selectedMaterial?.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        PDF viewing is optimized for mobile. Tap the button below to open.
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        // Open PDF in new tab for mobile
                        window.open(selectedMaterial?.file_url, '_blank', 'noopener,noreferrer')
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open PDF
                    </Button>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      Opens in a new tab for better mobile experience
                    </p>
                  </div>
                ) : (
                  // Desktop: Use iframe with Google Drive embed
                  <iframe
                    src={selectedMaterial?.file_url || ''}
                    className="w-full h-full border-0"
                    title={selectedMaterial?.title || ''}
                    style={{
                      pointerEvents: 'auto'
                    }}
                  />
                )}
              </div>
            ) : (
              <div 
                ref={containerRef}
                className="w-full h-full overflow-auto"
              >
                <div 
                  className="min-h-full min-w-full flex items-center justify-center p-4"
                  style={{
                    width: `${100 * zoomLevel}%`,
                    height: `${100 * zoomLevel}%`
                  }}
                >
                  <img
                    src={selectedMaterial?.file_url || ''}
                    alt={selectedMaterial?.title || ''}
                    className="max-w-none"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top left',
                      width: 'auto',
                      height: 'auto'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
