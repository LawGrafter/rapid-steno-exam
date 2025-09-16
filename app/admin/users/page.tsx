'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Users, Search, Filter, Plus, Calendar, Clock, UserCheck, UserX, Shield, Award, Edit, XCircle, AlertTriangle, CheckCircle, Trash2, Home, ChevronRight, Timer, LogOut, LayoutDashboard } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CardDescription } from '@/components/ui/card'
import { EditSubscriptionDialog } from './edit-subscription-dialog'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserSubscription {
  id: string
  user_id: string
  plan_id: string
  status: string
  created_at: string
  expires_at: string | null
  is_active: boolean
  deactivated_at: string | null
  deactivation_reason: string | null
  plans: {
    id: string
    name: string
    display_name: string
  }
  profiles: {
    id: string
    email: string
    full_name: string | null
  }
}

interface Plan {
  id: string
  name: string
  display_name: string
}

export default function UserManagementPage() {
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAccessDialog, setShowAccessDialog] = useState(false)
  const [showRevokeDialog, setShowRevokeDialog] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [editingSubscription, setEditingSubscription] = useState<UserSubscription | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserFullName, setNewUserFullName] = useState('')
  const [newUserPlan, setNewUserPlan] = useState('gold')
  const [createUserIfMissing, setCreateUserIfMissing] = useState(true)
  const [showAddForm, setShowAddForm] = useState(true) // Default to show
  const { toast } = useToast()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('adminUser')
    router.push('/admin/login')
  }

  // Derived quick stats (component scope)
  const totalUsers = subscriptions.length
  const activeUsers = subscriptions.filter(s => s.is_active).length
  const goldUsers = subscriptions.filter(s => (s.plans?.name || s.plans?.display_name)?.toLowerCase() === 'gold').length
  const ahcUsers = subscriptions.filter(s => (s.plans?.name || s.plans?.display_name)?.toLowerCase() === 'ahc').length

  const getInitials = (fullName?: string | null, email?: string | null) => {
    const source = (fullName && fullName.trim()) || (email ? email.split('@')[0] : '')
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'U'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getTimeUntilExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null
    
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return { text: 'Expired', color: 'text-red-600', bgColor: 'bg-red-50' }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (days > 30) {
      return { text: `${days} days left`, color: 'text-green-600', bgColor: 'bg-green-50' }
    } else if (days > 7) {
      return { text: `${days} days left`, color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
    } else if (days > 0) {
      return { text: `${days}d ${hours}h left`, color: 'text-orange-600', bgColor: 'bg-orange-50' }
    } else {
      return { text: `${hours}h ${minutes}m left`, color: 'text-red-600', bgColor: 'bg-red-50' }
    }
  }

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      
      // Get subscriptions directly without joins
      const { data: subs, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('*')

      if (subsError) {
        console.error('Subscriptions error:', subsError)
        setSubscriptions([])
        return
      }

      // Fetch plans separately
      const { data: plans, error: plansError } = await supabase
        .from('plans')
        .select('*')

      if (plansError) {
        console.error('Plans error:', plansError)
        setSubscriptions([])
        return
      }

      // Fetch users from public.users table (not auth.users)
      const { data: publicUsers, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')

      if (usersError) {
        console.error('Users error:', usersError)
      }

      // Set plans state
      setPlans(plans || [])

      // Build a user map with email and full_name from public.users
      const userMap: Record<string, { email: string | null; full_name: string | null }> = {}
      publicUsers?.forEach(user => {
        userMap[user.id] = { email: user.email ?? null, full_name: user.full_name ?? null }
      })

      // Combine data manually
      const combinedData = subs?.map(sub => {
        const plan = plans?.find(p => p.id === sub.plan_id)
        const userRecord = userMap[sub.user_id]
        const userEmail = userRecord?.email || `user-${sub.user_id.slice(0, 8)}@example.com`
        const derivedName = userEmail.split('@')[0].replace(/[0-9]/g, '').replace(/\./g, ' ')
        const fullName = (userRecord?.full_name || '').trim() || (derivedName.charAt(0).toUpperCase() + derivedName.slice(1))

        return {
          ...sub,
          plans: plan || { id: sub.plan_id, name: 'unknown', display_name: 'Unknown Plan' },
          profiles: {
            id: sub.user_id,
            email: userEmail,
            full_name: fullName
          }
        }
      }) || []

      setSubscriptions(combinedData)
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      setSubscriptions([])
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (subscriptionId: string, userEmail: string) => {
    try {
      // First get the user_id from the subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('id', subscriptionId)
        .single()

      if (!subscription) {
        throw new Error('Subscription not found')
      }

      // Delete subscription first
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('id', subscriptionId)

      if (subError) throw subError

      // Delete user from users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', subscription.user_id)

      if (userError) {
        console.warn('Failed to delete user record:', userError)
      }

      toast({
        title: "Success",
        description: `User ${userEmail} and subscription deleted successfully`
      })

      fetchSubscriptions()
    } catch (error) {
      console.error('Error deleting user:', error)
      toast({
        title: "Error",
        description: `Failed to delete user: ${error.message}`,
        variant: "destructive"
      })
    }
  }

  const toggleUserStatus = async (subscriptionId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus
      const updateData: any = {
        is_active: newStatus,
        status: newStatus ? 'active' : 'inactive'
      }

      if (!newStatus) {
        updateData.deactivated_at = new Date().toISOString()
        updateData.deactivation_reason = 'Manual deactivation by admin'
      } else {
        updateData.deactivated_at = null
        updateData.deactivation_reason = null
      }

      const { error } = await supabase
        .from('user_subscriptions')
        .update(updateData)
        .eq('id', subscriptionId)

      if (error) throw error

      toast({
        title: "Success",
        description: `User ${newStatus ? 'activated' : 'deactivated'} successfully`
      })

      fetchSubscriptions()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast({
        title: "Error",
        description: `Failed to update user status: ${error.message}`,
        variant: "destructive"
      })
    }
  }

  // Add function to create subscription for existing users
  const createUserSubscription = async (userEmail: string, planName: string) => {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(userEmail)) {
        throw new Error('Invalid email format')
      }

      // Find user in public.users by email
      let { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', userEmail.toLowerCase().trim())
        .single()

      // If not found and allowed, create the user
      if ((userError || !userData) && createUserIfMissing) {
        const { data: insertedUsers, error: insertErr } = await supabase
          .from('users')
          .insert({ 
            email: userEmail.toLowerCase().trim(), 
            full_name: newUserFullName || userEmail.split('@')[0].replace(/[^a-zA-Z\s]/g, ''), 
            role: 'student' 
          })
          .select('id, email, role')
          .limit(1)
        if (insertErr || !insertedUsers || insertedUsers.length === 0) {
          throw insertErr || new Error('Failed to create user')
        }
        userData = insertedUsers[0]
        
        toast({
          title: "User Created",
          description: `New user ${userEmail} created successfully`
        })
      } else if (userError || !userData) {
        toast({
          title: 'User not found',
          description: 'No user exists with that email. Enable "Create user if missing" or add the student first.',
          variant: 'destructive'
        })
        return
      }

      // Ensure user has correct role
      if (userData.role !== 'student') {
        const { error: roleUpdateError } = await supabase
          .from('users')
          .update({ role: 'student' })
          .eq('id', userData.id)
        
        if (roleUpdateError) {
          console.warn('Failed to update user role:', roleUpdateError)
        }
      }

      // Get plan by name
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('id')
        .eq('name', planName)
        .single()

      if (planError || !planData) {
        toast({
          title: "Error",
          description: "Plan not found",
          variant: "destructive"
        })
        return
      }

      // Check if subscription already exists for this user and plan
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('id, is_active, status')
        .eq('user_id', userData.id)
        .eq('plan_id', planData.id)
        .single()

      const expiryDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

      if (existingSub) {
        // Update existing subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'active',
            expires_at: expiryDate,
            is_active: true,
            deactivated_at: null,
            deactivation_reason: null
          })
          .eq('id', existingSub.id)

        if (error) throw error
        
        toast({
          title: "Subscription Updated",
          description: `Existing subscription for ${userEmail} updated and activated`
        })
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userData.id,
            plan_id: planData.id,
            status: 'active',
            expires_at: expiryDate,
            is_active: true
          })

        if (error) throw error
        
        toast({
          title: "Subscription Created",
          description: `New ${planName.toUpperCase()} subscription created for ${userEmail}`
        })
      }

      // Clear form
      setNewUserEmail('')
      setNewUserFullName('')
      
      fetchSubscriptions()
    } catch (error) {
      console.error('Error creating subscription:', error)
      toast({
        title: "Error",
        description: "Failed to create subscription",
        variant: "destructive"
      })
    }
  }

  // Fix user access issues - ensures user exists in users table with correct role
  const fixUserAccess = async (userEmail: string) => {
    try {
      // Ensure user exists in users table with correct role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', userEmail.toLowerCase().trim())
        .single()

      if (userError || !userData) {
        // User doesn't exist, create them
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: userEmail.toLowerCase().trim(),
            full_name: userEmail.split('@')[0],
            role: 'student'
          })
          .select('id, email, role')
          .single()

        if (createError) throw createError

        toast({
          title: "Success",
          description: `User ${userEmail} created and fixed`
        })
      } else {
        // User exists, ensure role is correct and fix any subscription issues
        const updates: any = {}
        if (userData.role !== 'student') {
          updates.role = 'student'
        }

        if (Object.keys(updates).length > 0) {
          const { error: roleError } = await supabase
            .from('users')
            .update(updates)
            .eq('id', userData.id)

          if (roleError) throw roleError
        }

        // Fix subscription status issues
        const { error: statusError } = await supabase
          .from('user_subscriptions')
          .update({ 
            status: 'active',
            is_active: true 
          })
          .eq('user_id', userData.id)
          .eq('is_active', true)

        if (statusError) {
          console.warn('Failed to fix subscription status:', statusError)
        }

        toast({
          title: "Success",
          description: `User ${userEmail} access fixed successfully`
        })
      }

      fetchSubscriptions()
    } catch (error) {
      console.error('Error fixing user access:', error)
      toast({
        title: "Error",
        description: `Failed to fix user access: ${error.message}`,
        variant: "destructive"
      })
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = searchTerm === '' || 
      sub.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sub.profiles?.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      sub.user_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesPlan = planFilter === 'all' || sub.plans?.name === planFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && sub.is_active) ||
      (statusFilter === 'inactive' && !sub.is_active)

    return matchesSearch && matchesPlan && matchesStatus
  })

  const getStatusBadge = (subscription: UserSubscription) => {
    if (!subscription.is_active) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Inactive
      </Badge>
    }

    if (subscription.expires_at) {
      const expiryDate = new Date(subscription.expires_at)
      const now = new Date()
      const isExpired = expiryDate < now
      const isExpiringSoon = expiryDate < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      if (isExpired) {
        return <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          Expired
        </Badge>
      }

      if (isExpiringSoon) {
        return <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
          <AlertTriangle className="w-3 h-3" />
          Expiring Soon
        </Badge>
      }
    }

    return <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800">
      <CheckCircle className="w-3 h-3" />
      Active
    </Badge>
  }

  const getPlanBadge = (planName: string) => {
    switch (planName?.toLowerCase()) {
      case 'gold':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Gold</Badge>
      case 'ahc':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">AHC</Badge>
      default:
        return <Badge variant="outline">{planName}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Breadcrumb */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <Link href="/admin/dashboard" className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors">
                  <Home className="h-4 w-4" />
                  <span>Admin</span>
                </Link>
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900">User Management</span>
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">{filteredSubscriptions.length} users found</span>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/admin/dashboard">
                  <Button variant="outline" size="sm">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage user subscriptions and access permissions</p>
        </div>

        {/* Filters Section - Moved to Top */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter users by search, plan, and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by name, email, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="ahc">AHC</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">Total Subscriptions</p>
            <p className="text-2xl font-bold">{totalUsers}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-700">{activeUsers}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">Gold Plans</p>
            <p className="text-2xl font-bold text-yellow-700">{goldUsers}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-xs text-gray-500">AHC Plans</p>
            <p className="text-2xl font-bold text-blue-700">{ahcUsers}</p>
          </div>
        </div>

        {/* Main Content Area - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: User List */}
          <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Subscriptions</CardTitle>
              <CardDescription>
                {filteredSubscriptions.length} subscription{filteredSubscriptions.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSubscriptions.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No users found</p>
                  <p className="text-sm text-gray-500">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubscriptions.map((subscription) => (
                    <div key={subscription.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700 border">
                            {getInitials(subscription.profiles?.full_name, subscription.profiles?.email)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {subscription.profiles?.full_name || subscription.profiles?.email || 'Unknown User'}
                              </h3>
                              {getPlanBadge(subscription.plans?.display_name || subscription.plans?.name)}
                              {getStatusBadge(subscription)}
                            </div>
                            <p className="text-sm text-gray-600">{subscription.profiles?.email}</p>
                            <p className="text-xs text-gray-500">User ID: {subscription.user_id}</p>
                            {subscription.expires_at && getTimeUntilExpiry(subscription.expires_at) && (
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTimeUntilExpiry(subscription.expires_at)?.bgColor} ${getTimeUntilExpiry(subscription.expires_at)?.color}`}>
                                <Timer className="h-3 w-3" />
                                {getTimeUntilExpiry(subscription.expires_at)?.text}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSubscription(subscription)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fixUserAccess(subscription.profiles?.email || '')}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Fix Access
                          </Button>
                          <Button
                            variant={subscription.is_active ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleUserStatus(subscription.id, subscription.is_active)}
                          >
                            {subscription.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User Subscription</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete the subscription for {subscription.profiles?.full_name || subscription.profiles?.email}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(subscription.id, subscription.profiles?.email || 'Unknown')}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-gray-500">Created:</span>
                          <p className="font-medium">
                            {new Date(subscription.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {subscription.expires_at && (
                          <div>
                            <span className="text-gray-500">Expires:</span>
                            <p className="font-medium">
                              {new Date(subscription.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {subscription.deactivated_at && (
                          <div>
                            <span className="text-gray-500">Deactivated:</span>
                            <p className="font-medium">
                              {new Date(subscription.deactivated_at).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {subscription.deactivation_reason && (
                          <div>
                            <span className="text-gray-500">Reason:</span>
                            <p className="font-medium text-xs">
                              {subscription.deactivation_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actions & Filters */}
        <div className="lg:col-span-1 space-y-6">
          {/* Add New Subscription */}
          <Card>
            <CardHeader>
              <CardTitle>Add Subscription</CardTitle>
              <CardDescription>Create a new user and subscription</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3">
                  <Input
                    placeholder="Email address (required)"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    type="email"
                  />
                  <Input
                    placeholder="Full name (optional)"
                    value={newUserFullName}
                    onChange={(e) => setNewUserFullName(e.target.value)}
                  />
                  <Select value={newUserPlan} onValueChange={setNewUserPlan}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold">Gold Plan (₹999 - 3 months)</SelectItem>
                      <SelectItem value="ahc">AHC Plan (₹1499 - 3 months)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createUserIfMissing}
                    onChange={(e) => setCreateUserIfMissing(e.target.checked)}
                  />
                  Create user in Students table if not found
                </label>
                <div>
                  <Button 
                    onClick={() => {
                      if (newUserEmail) {
                        createUserSubscription(newUserEmail, newUserPlan)
                      }
                    }}
                    disabled={!newUserEmail}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create / Update Subscription
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations</CardTitle>
              <CardDescription>Manage multiple users at once</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    const expiredSubs = subscriptions.filter(sub => {
                      if (!sub.expires_at) return false
                      return new Date(sub.expires_at) < new Date()
                    })
                    
                    if (expiredSubs.length === 0) {
                      toast({
                        title: "No Action Needed",
                        description: "No expired subscriptions found"
                      })
                      return
                    }

                    // Deactivate all expired subscriptions
                    Promise.all(expiredSubs.map(sub => 
                      toggleUserStatus(sub.id, true)
                    )).then(() => {
                      toast({
                        title: "Success",
                        description: `Deactivated ${expiredSubs.length} expired subscriptions`
                      })
                    })
                  }}
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Deactivate Expired Users
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    const expiringSoon = subscriptions.filter(sub => {
                      if (!sub.expires_at) return false
                      const expiryDate = new Date(sub.expires_at)
                      const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                      return expiryDate < weekFromNow && expiryDate > new Date()
                    })
                    
                    toast({
                      title: "Expiring Soon",
                      description: `${expiringSoon.length} subscriptions expire within 7 days`
                    })
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Check Expiring Soon ({subscriptions.filter(sub => {
                    if (!sub.expires_at) return false
                    const expiryDate = new Date(sub.expires_at)
                    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    return expiryDate < weekFromNow && expiryDate > new Date()
                  }).length})
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

        {/* Edit Subscription Dialog */}
        {editingSubscription && (
          <EditSubscriptionDialog
            subscription={editingSubscription}
            plans={plans}
            open={!!editingSubscription}
            onClose={() => setEditingSubscription(null)}
            onUpdate={fetchSubscriptions}
          />
        )}
      </div>
    </div>
  )
}
