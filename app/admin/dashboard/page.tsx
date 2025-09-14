'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { Users, FileText, Key, BarChart3, LogOut, Plus } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTests: 0,
    totalAttempts: 0,
    totalStudents: 0
  })

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (!adminUser) {
      router.push('/admin/login')
      return
    }

    fetchStats()
  }, [router])

  const fetchStats = async () => {
    try {
      // Check if Supabase is properly configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url' || supabaseUrl.includes('placeholder')) {
        console.warn('Supabase not configured. Please set up your environment variables.')
        return
      }

      const [usersResult, testsResult, attemptsResult, studentsResult, subscriptionsResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('tests').select('id', { count: 'exact' }),
        supabase.from('attempts').select('id', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student'),
        supabase.from('user_subscriptions').select('id', { count: 'exact' })
      ])

      setStats({
        totalUsers: subscriptionsResult.count || 0, // Use subscriptions count for user management
        totalTests: testsResult.count || 0,
        totalAttempts: attemptsResult.count || 0,
        totalStudents: studentsResult.count || 0
      })
    } catch (error) {
      console.warn('Unable to fetch stats. Please configure Supabase connection.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminUser')
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-1">Rapid Steno MCQ Test System</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm" className="hover:bg-red-50 hover:border-red-200 hover:text-red-700">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-800">Total Users</CardTitle>
              <Users className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{stats.totalUsers}</div>
              <p className="text-xs text-blue-600 mt-1">Active subscriptions</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">Total Tests</CardTitle>
              <FileText className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{stats.totalTests}</div>
              <p className="text-xs text-green-600 mt-1">Available tests</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-800">Total Attempts</CardTitle>
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{stats.totalAttempts}</div>
              <p className="text-xs text-purple-600 mt-1">Test submissions</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">Active Students</CardTitle>
              <Users className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900">{stats.totalStudents}</div>
              <p className="text-xs text-orange-600 mt-1">Registered students</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                User Management
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage user subscriptions, plans, and access permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/users">
                <Button className="w-full h-12 text-base font-medium" variant="outline">
                  View All Users
                </Button>
              </Link>
              <Link href="/admin/users">
                <Button className="w-full h-12 text-base font-medium bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Subscription
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                Tests & Questions
              </CardTitle>
              <CardDescription className="text-gray-600">
                Create and manage tests and questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/tests">
                <Button className="w-full h-12 text-base font-medium" variant="outline">
                  Manage Tests
                </Button>
              </Link>
              <Link href="/admin/tests/create">
                <Button className="w-full h-12 text-base font-medium bg-green-600 hover:bg-green-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Test
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                Results & Analytics
              </CardTitle>
              <CardDescription className="text-gray-600">
                View test attempts and export results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/results">
                <Button className="w-full h-12 text-base font-medium" variant="outline">
                  View Results
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button className="w-full h-12 text-base font-medium" variant="outline">
                  Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
                Study Materials
              </CardTitle>
              <CardDescription className="text-gray-600">
                Upload and manage study materials for students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/materials">
                <Button className="w-full h-12 text-base font-medium" variant="outline">
                  Manage Materials
                </Button>
              </Link>
              <Link href="/admin/materials">
                <Button className="w-full h-12 text-base font-medium bg-orange-600 hover:bg-orange-700">
                  <Plus className="h-5 w-5 mr-2" />
                  Upload New Material
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}