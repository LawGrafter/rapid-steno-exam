import { SupabaseClient } from '@supabase/supabase-js'

export interface UserPlan {
  id: string
  name: string
  display_name: string
  features: any
}

export interface UserAccess {
  hasAHCPlan: boolean
  hasGoldPlan: boolean
  specificAccess: string[]
}

export class AccessControl {
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  async getUserAccess(userId: string): Promise<UserAccess> {
    try {
      // Check active subscriptions - simplified query without RLS issues
      const { data: subscriptions, error: subsError } = await this.supabase
        .from('user_subscriptions')
        .select('plan_id, status, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')

      if (subsError) {
        console.error('Subscription query error:', subsError)
      }

      // Get plans separately to avoid JOIN issues
      const { data: plans, error: plansError } = await this.supabase
        .from('plans')
        .select('id, name')

      if (plansError) {
        console.error('Plans query error:', plansError)
      }

      // Match subscriptions with plans
      const userPlans = subscriptions?.map(sub => {
        const plan = plans?.find(p => p.id === sub.plan_id)
        return plan?.name
      }).filter(Boolean) || []

      const hasAHCPlan = userPlans.includes('ahc')
      const hasGoldPlan = userPlans.includes('gold')

      console.log('Access check result:', { 
        userId, 
        userPlans, 
        hasAHCPlan, 
        hasGoldPlan,
        subscriptions: subscriptions?.length || 0,
        plans: plans?.length || 0,
        subscriptionDetails: subscriptions
      })

      return {
        hasAHCPlan,
        hasGoldPlan,
        specificAccess: [] // Skip user_plan_access table for now due to RLS issues
      }
    } catch (error) {
      console.error('Error checking user access:', error)
      return {
        hasAHCPlan: false,
        hasGoldPlan: false,
        specificAccess: []
      }
    }
  }

  canAccessCategory(userAccess: UserAccess, categoryName: string): boolean {
    const lowerCaseName = categoryName.toLowerCase()
    
    // Allow access to sample/demo categories for everyone (including demo users)
    if (lowerCaseName.includes('sample') || 
        lowerCaseName.includes('demo') || 
        lowerCaseName.includes('sample test') ||
        lowerCaseName.startsWith('sample')) {
      return true
    }
    
    // AHC plan has access to everything
    if (userAccess.hasAHCPlan) {
      return true
    }

    // Check if it's AHC content
    const isAHCContent = this.isAHCContent(categoryName)
    
    // Gold plan can access non-AHC content
    if (userAccess.hasGoldPlan && !isAHCContent) {
      return true
    }

    // Check specific access for AHC content
    if (isAHCContent && userAccess.hasGoldPlan) {
      return userAccess.specificAccess.some(access => 
        access.startsWith('category:') && 
        access.includes(categoryName.toLowerCase())
      )
    }

    return false
  }

  canAccessMaterial(userAccess: UserAccess, materialId: string, categoryName: string): boolean {
    // AHC plan has access to everything
    if (userAccess.hasAHCPlan) {
      return true
    }

    // Check category access first
    if (!this.canAccessCategory(userAccess, categoryName)) {
      return false
    }

    // Check specific material access
    const hasSpecificAccess = userAccess.specificAccess.includes(`material:${materialId}`)
    
    return hasSpecificAccess || !this.isAHCContent(categoryName)
  }

  canAccessTest(userAccess: UserAccess, testId: string, categoryName?: string): boolean {
    // AHC plan has access to everything
    if (userAccess.hasAHCPlan) {
      return true
    }

    // Check if it's AHC content
    const isAHCContent = categoryName ? this.isAHCContent(categoryName) : false
    
    // Gold plan can access non-AHC tests
    if (userAccess.hasGoldPlan && !isAHCContent) {
      return true
    }

    // Check specific test access
    if (isAHCContent && userAccess.hasGoldPlan) {
      return userAccess.specificAccess.includes(`test:${testId}`)
    }

    return false
  }

  private isAHCContent(categoryName: string): boolean {
    const lowerCaseName = categoryName.toLowerCase()
    
    console.log('Checking AHC content for category:', categoryName, 'lowercase:', lowerCaseName)
    
    // Don't treat sample/demo categories as AHC content
    if (lowerCaseName.includes('sample') || 
        lowerCaseName.includes('demo') || 
        lowerCaseName.includes('sample test') ||
        lowerCaseName.startsWith('sample')) {
      console.log('Category excluded from AHC (sample/demo):', categoryName)
      return false
    }
    
    // Only treat as AHC content if it's specifically the premium Allahabad High Court category
    const ahcKeywords = ['allahabad', 'ahc', 'allahabad high court']
    const isAHC = ahcKeywords.some(keyword => lowerCaseName.includes(keyword))
    
    console.log('AHC check result for', categoryName, ':', isAHC)
    return isAHC
  }

  getUpgradeMessage(categoryName: string): string {
    if (this.isAHCContent(categoryName)) {
      return `This content is part of the Allahabad High Court (AHC) Plan. Upgrade to AHC Plan to access all ${categoryName} materials and tests, or contact admin for specific access.`
    }
    return 'Upgrade to Gold Plan or AHC Plan to access this content.'
  }
}

// Export the class for instantiation with Supabase client
// Usage: const accessControl = new AccessControl(supabaseClient)
