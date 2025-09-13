'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Calendar, Download, RefreshCw, Trash2 } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface DemoUser {
  name: string
  timestamp: string
  id: string
}

export default function DemoAnalyticsPage() {
  const router = useRouter()
  const user = getCurrentUser()
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    
    if (user.role !== 'admin') {
      router.push('/account')
      return
    }

    loadDemoUsers()
  }, [user, router])

  const loadDemoUsers = () => {
    setLoading(true)
    try {
      const demoUsersStr = localStorage.getItem('demo_users')
      if (demoUsersStr) {
        const users = JSON.parse(demoUsersStr)
        setDemoUsers(users.sort((a: DemoUser, b: DemoUser) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ))
      } else {
        setDemoUsers([])
      }
    } catch (error) {
      console.error('Error loading demo users:', error)
      setDemoUsers([])
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (demoUsers.length === 0) return

    const headers = ['Name', 'Date', 'Time', 'Demo ID']
    const csvContent = [
      headers.join(','),
      ...demoUsers.map(user => [
        `"${user.name}"`,
        new Date(user.timestamp).toLocaleDateString(),
        new Date(user.timestamp).toLocaleTimeString(),
        user.id
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demo-users-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const clearDemoData = () => {
    if (confirm('Are you sure you want to clear all demo user data? This action cannot be undone.')) {
      localStorage.removeItem('demo_users')
      setDemoUsers([])
    }
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString()
    }
  }

  const getStatsForPeriod = (days: number) => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return demoUsers.filter(user => new Date(user.timestamp) >= cutoff).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading demo analytics...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Demo Analytics</h1>
          <p className="text-gray-600">Track and analyze demo test usage</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Demo Users</p>
                  <p className="text-2xl font-bold text-gray-900">{demoUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Last 7 Days</p>
                  <p className="text-2xl font-bold text-gray-900">{getStatsForPeriod(7)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Last 30 Days</p>
                  <p className="text-2xl font-bold text-gray-900">{getStatsForPeriod(30)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today</p>
                  <p className="text-2xl font-bold text-gray-900">{getStatsForPeriod(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <Button onClick={loadDemoUsers} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button onClick={exportToCSV} disabled={demoUsers.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={clearDemoData} variant="destructive" disabled={demoUsers.length === 0}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Data
          </Button>
        </div>

        {/* Demo Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Demo Users ({demoUsers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {demoUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No demo users found</p>
                <p className="text-sm text-gray-500 mt-2">Demo users will appear here when they use the "Test Software" feature</p>
              </div>
            ) : (
              <div className="space-y-4">
                {demoUsers.map((demoUser, index) => {
                  const { date, time } = formatDate(demoUser.timestamp)
                  return (
                    <div key={demoUser.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{demoUser.name}</p>
                          <p className="text-sm text-gray-600">ID: {demoUser.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{date}</p>
                        <p className="text-sm text-gray-600">{time}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
