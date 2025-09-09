'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Key, Download, Calendar } from 'lucide-react'
import Link from 'next/link'

type SecretKey = {
  id: string
  code: string
  is_used: boolean
  user_id: string | null
  expires_at: string
  created_at: string
  users?: {
    full_name: string
  } | null
}

export default function SecretKeysPage() {
  const router = useRouter()
  const [secretKeys, setSecretKeys] = useState<SecretKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateCount, setGenerateCount] = useState(10)
  const [expirationDays, setExpirationDays] = useState(30)

  useEffect(() => {
    const adminUser = localStorage.getItem('adminUser')
    if (!adminUser) {
      router.push('/admin/login')
      return
    }

    fetchSecretKeys()
  }, [router])

  const fetchSecretKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('secret_keys')
        .select(`
          *,
          users (full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSecretKeys(data || [])
    } catch (error) {
      console.error('Error fetching secret keys:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateSecretKeys = async () => {
    setIsGenerating(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expirationDays)

      const keys = []
      for (let i = 0; i < generateCount; i++) {
        const code = generateRandomKey()
        keys.push({
          code,
          expires_at: expiresAt.toISOString()
        })
      }

      const { error } = await supabase
        .from('secret_keys')
        .insert(keys)

      if (error) throw error

      await fetchSecretKeys()
    } catch (error) {
      console.error('Error generating secret keys:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateRandomKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const exportKeys = () => {
    const unused = secretKeys.filter(k => !k.is_used)
    const csvContent = [
      'Secret Key,Expires At,Created At',
      ...unused.map(k => `${k.code},${k.expires_at},${k.created_at}`)
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'secret-keys.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const getKeyStatus = (key: SecretKey) => {
    if (key.is_used) {
      return { label: 'Used', color: 'bg-green-500' }
    }
    
    const now = new Date()
    const expiresAt = new Date(key.expires_at)
    
    if (now > expiresAt) {
      return { label: 'Expired', color: 'bg-red-500' }
    }
    
    return { label: 'Available', color: 'bg-[#002E2C]' }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  const unusedKeys = secretKeys.filter(k => !k.is_used && new Date(k.expires_at) > new Date())

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Secret Keys Management</h1>
                <p className="text-sm text-gray-600">Generate and manage student access keys</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={exportKeys} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Unused
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Generate Keys Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Generate New Secret Keys
            </CardTitle>
            <CardDescription>
              Create new secret keys for student access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Keys
                </label>
                <Input
                  type="number"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                  min="1"
                  max="100"
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires in (days)
                </label>
                <Input
                  type="number"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(parseInt(e.target.value) || 1)}
                  min="1"
                  max="365"
                  className="w-full"
                />
              </div>
              <Button 
                onClick={generateSecretKeys}
                disabled={isGenerating}
                className="flex-shrink-0"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4 mr-2" />
                    Generate Keys
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{unusedKeys.length}</div>
              <p className="text-sm text-gray-600">Available Keys</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" style={{color: '#002E2C'}}>
                {secretKeys.filter(k => k.is_used).length}
              </div>
              <p className="text-sm text-gray-600">Used Keys</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">
                {secretKeys.filter(k => !k.is_used && new Date(k.expires_at) <= new Date()).length}
              </div>
              <p className="text-sm text-gray-600">Expired Keys</p>
            </CardContent>
          </Card>
        </div>

        {/* Keys List */}
        <Card>
          <CardHeader>
            <CardTitle>All Secret Keys</CardTitle>
            <CardDescription>
              Total: {secretKeys.length} keys
            </CardDescription>
          </CardHeader>
          <CardContent>
            {secretKeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No secret keys found</h3>
                <p className="text-gray-600">Generate some secret keys to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {secretKeys.map((key) => {
                  const status = getKeyStatus(key)
                  return (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {key.code}
                          </code>
                          <Badge className={`${status.color} text-white`}>
                            {status.label}
                          </Badge>
                        </div>
                        {key.users && (
                          <p className="text-sm text-gray-600">Used by: {key.users.full_name}</p>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center gap-1 mb-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {new Date(key.expires_at).toLocaleDateString()}
                        </div>
                        <div>Created: {new Date(key.created_at).toLocaleDateString()}</div>
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