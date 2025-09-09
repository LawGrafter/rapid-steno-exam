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

      const [usersResult, testsResult, attemptsResult, studentsResult] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('tests').select('id', { count: 'exact' }),
        supabase.from('attempts').select('id', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }).eq('role', 'student')
      ])

      setStats({
        totalUsers: usersResult.count || 0,
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Rapid Steno MCQ Test System</p>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Management
              </CardTitle>
              <CardDescription>
                Manage student accounts and access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/students">
                <Button className="w-full" variant="outline">
                  Manage Students
                </Button>
              </Link>
              <Link href="/admin/students">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Student
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Tests & Questions
              </CardTitle>
              <CardDescription>
                Create and manage tests and questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/tests">
                <Button className="w-full" variant="outline">
                  Manage Tests
                </Button>
              </Link>
              <Link href="/admin/tests/create">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Test
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Results & Analytics
              </CardTitle>
              <CardDescription>
                View test attempts and export results
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/results">
                <Button className="w-full" variant="outline">
                  View Results
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button className="w-full" variant="outline">
                  Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Study Materials
              </CardTitle>
              <CardDescription>
                Upload and manage study materials for students
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/materials">
                <Button className="w-full" variant="outline">
                  Manage Materials
                </Button>
              </Link>
              <Link href="/admin/materials">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
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