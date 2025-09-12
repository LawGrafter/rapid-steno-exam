'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthday, setBirthday] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Simple admin login for demo - in production use proper authentication
    if (email === 'admin@rapidsteno.com' && password === 'admin123' && birthday === '3010') {
      localStorage.setItem('adminUser', JSON.stringify({ email, role: 'admin' }))
      router.push('/admin/dashboard')
    } else {
      setError('Invalid admin credentials or birthday')
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-slate-900">Admin Panel</CardTitle>
          <CardDescription className="text-gray-600">
            Sign in to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="birthday" className="text-sm font-medium text-gray-700">
                Aquib's Birthday
              </label>
              <Input
                id="birthday"
                type="number"
                value={birthday}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setBirthday(value)
                }}
                placeholder="____"
                maxLength={4}
                pattern="[0-9]{4}"
                required
                className="w-full text-center text-lg tracking-widest"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email || !password || !birthday}
              className="w-full bg-slate-800 hover:bg-slate-900"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          
        </CardContent>
      </Card>
    </div>
  )
}