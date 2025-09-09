'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import './materials.css'

type Material = {
  id: string
  title: string
  description: string
  type: 'pdf' | 'mindmap'
  file_url: string
  section: string
  topic: string
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
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [pendingMaterial, setPendingMaterial] = useState<Material | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Fix hydration mismatch - only get user on client side
  useEffect(() => {
    setIsClient(true)
    const currentUser = getCurrentUser()
    if (currentUser) {
      setUser(currentUser)
    } else {
      router.push('/login')
    }

    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
             window.innerWidth <= 768
    }
    setIsMobile(checkMobile())
  }, [router])

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

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName)
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
              <div className="mb-8 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search materials and categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                      <SelectTrigger className="w-[180px]">
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
                    <Button variant="outline" onClick={handleClearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </div>
                
                {/* Results Count */}
                <p className="text-sm text-gray-600">
                  Showing {filteredCategories.length} categories
                </p>
              </div>

              {filteredCategories.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No Categories Found</h3>
                  <p className="text-gray-500">Try adjusting your search or filters to find materials.</p>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCategories.map((category) => {
                    const IconComponent = getCategoryIcon(category.name)
                    return (
                      <Card 
                        key={category.id} 
                        className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
                        onClick={() => handleCategoryClick(category.name)}
                      >
                        <CardHeader className="text-center pb-4">
                          <div className="mx-auto mb-4 p-3 bg-gray-50 rounded-full group-hover:bg-[#002E2C] transition-colors">
                            <div className="text-[#002E2C] group-hover:text-white">
                              {getCategoryIcon(category.name)}
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-[#002E2C]" />
                            <span className="text-sm font-medium text-[#002E2C]">{category.materialCount} Materials</span>
                          </div>
                        </CardHeader>
                        <CardContent className="text-center">
                          <CardTitle className="text-xl mb-6 text-gray-900">{category.name}</CardTitle>
                          <Button
                            onClick={() => handleCategoryClick(category.name)}
                            className="w-full bg-[#002E2C] hover:bg-[#004A47] text-white font-medium py-2 px-4 rounded-md transition-colors"
                          >
                            View Materials
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
              </div>

              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {getCategoryMaterials(selectedCategory).map((material) => (
                  <Card key={material.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg" style={{backgroundColor: '#002E2C20'}}>
                          <FileText className="h-6 w-6" style={{color: '#002E2C'}} />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{material.title}</CardTitle>
                          <p className="text-sm text-gray-600">Study Material</p>
                        </div>
                      </div>
                      <p className="text-gray-600">
                        {material.description || 'Study material for comprehensive learning and exam preparation.'}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* PDF Button */}
                        <Button
                          onClick={() => handleViewMaterial(material)}
                          className="h-16 text-base font-medium"
                          variant="outline"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <FileText className="h-5 w-5 text-red-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-semibold">View PDF</div>
                              <div className="text-xs text-gray-500">{material.title}</div>
                            </div>
                          </div>
                        </Button>

                        {/* Mock Test Button */}
                        <Button
                          onClick={() => {
                            // Check if material has associated test ID
                            if (material.associated_test_id) {
                              // Navigate directly to the specific test
                              router.push(`/test/${material.associated_test_id}`)
                            } else {
                              // Fallback to tests page with category filter
                              router.push(`/tests?category=${encodeURIComponent(material.section)}`)
                            }
                          }}
                          className="h-16 text-base font-medium"
                          variant="outline"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <BookOpen className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <div className="font-semibold">Take Mock Test</div>
                              <div className="text-xs text-gray-500">
                                Practice Questions
                              </div>
                            </div>
                          </div>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      {/* PDF Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Important Notice
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm space-y-3">
              <p className="font-semibold text-gray-800">
                Please Do Not Share This PDF With Anyone
              </p>
              <p>
                Each PDF has a <span className="font-semibold text-blue-600">Unique ID</span> and gets tracked. 
                Unauthorized sharing will result in your account being blocked permanently.
              </p>
              <p className="text-xs text-gray-600">
                By clicking "Yes, I Agree", you acknowledge that you understand and accept these terms.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel 
              onClick={handleWarningDisagree}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800"
            >
              No, I Don't Agree
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleWarningAgree}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Yes, I Agree
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
