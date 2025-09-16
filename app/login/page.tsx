'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, User, Lock, TestTube } from 'lucide-react'
import Head from 'next/head'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { validateStudentLogin, createSession } from '@/lib/auth'
import { ExternalLink, Crown, Mail, Sparkles, Check } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showDemoDialog, setShowDemoDialog] = useState(false)
  const [demoName, setDemoName] = useState('')
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await validateStudentLogin(email, fullName)
    
    if (result.success && result.user) {
      createSession(result.user)
      setShowSuccessPopup(true)
      
      // Redirect after showing success animation
      setTimeout(() => {
        router.push('/tests')
      }, 2000)
    } else {
      // Show subscription dialog instead of error message
      setShowSubscriptionDialog(true)
    }
    
    setIsLoading(false)
  }

  const handleDemoAccess = () => {
    setShowDemoDialog(true)
  }

  const handleDemoLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsDemoLoading(true)
    
    try {
      // Create a demo user session
      const demoUser = {
        id: `demo_${Date.now()}`,
        email: `demo_${Date.now()}@demo.com`,
        full_name: demoName,
        role: 'student' as const,
        user_type: 'demo',
        created_at: new Date().toISOString()
      }
      
      // Save demo user info to local storage for tracking
      const demoUsers = JSON.parse(localStorage.getItem('demo_users') || '[]')
      demoUsers.push({
        name: demoName,
        timestamp: new Date().toISOString(),
        id: demoUser.id
      })
      localStorage.setItem('demo_users', JSON.stringify(demoUsers))
      
      // Create session for demo user
      createSession(demoUser)
      
      setShowSuccessPopup(true)
      setShowDemoDialog(false)
      
      // Redirect after showing success animation
      setTimeout(() => {
        router.push('/tests?demo=true')
      }, 2000)
    } catch (error) {
      console.error('Demo login error:', error)
    } finally {
      setIsDemoLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Login - Rapid Steno Exam</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 relative overflow-hidden flex items-center justify-center p-4 font-lexend">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md bg-white/95 backdrop-blur-lg border-2 border-[#002E2C]/10 shadow-2xl">
        <CardHeader className="space-y-4 text-center relative">
          <div className="mx-auto w-16 h-16 bg-[#002E2C] rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-[#002E2C]">
            Rapid Steno
          </CardTitle>
          <CardDescription className="text-gray-600 text-base">
            Enter your credentials to access premium tests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#002E2C] flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Registered Email Address
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your registered email address"
                  required
                  className="w-full bg-white border-2 border-gray-200 text-[#002E2C] placeholder:text-gray-500 focus:border-[#002E2C] focus:ring-[#002E2C]/20 pl-10 transition-all duration-200"
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-[#002E2C] flex items-center gap-2">
                <User className="h-4 w-4" />
                Your Full Name
              </label>
              <div className="relative">
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name for result"
                  required
                  className="w-full bg-white border-2 border-gray-200 text-[#002E2C] placeholder:text-gray-500 focus:border-[#002E2C] focus:ring-[#002E2C]/20 pl-10 transition-all duration-200"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email || !fullName}
              className="w-full bg-[#002E2C] hover:bg-[#002E2C]/90 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Access Exam Dashboard
                </>
              )}
            </Button>

            <div className="text-center text-sm text-gray-600 space-y-3 pt-4 border-t border-gray-200">
              <p className="flex items-center justify-center gap-2">
                <Crown className="h-4 w-4 text-[#002E2C]" />
                Premium Access Required
              </p>
              <p className="text-xs text-gray-500">Contact administrator for enrollment</p>
              
              {/* Demo button hidden as requested */}
              {/* <div className="pt-2">
                <Button
                  onClick={handleDemoAccess}
                  variant="outline"
                  className="w-full border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200"
                >
                  <TestTube className="mr-2 h-4 w-4" />
                  Test Software (Demo)
                </Button>
                <p className="text-xs text-gray-400 mt-2">Try our software with a sample test</p>
              </div> */}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Dialog */}
      <AlertDialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              Upgrade to Gold Pass Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-2">
              You haven't purchased a paid plan yet. Please subscribe to our Gold Pass to take this test and access all premium features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
            <AlertDialogAction asChild>
              <Button 
                onClick={() => window.open('https://rapidsteno.com/how-to-pay', '_blank')}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Subscribe to Gold Pass
              </Button>
            </AlertDialogAction>
            <Button 
              variant="outline" 
              onClick={() => setShowSubscriptionDialog(false)}
              className="w-full"
            >
              Maybe Later
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Success Animation */}
            <div className="p-8 text-center">
              <div className="mx-auto mb-6 relative">
                {/* Animated Circle */}
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-ping opacity-75"></div>
                  <div className="relative z-10">
                    <Check className="h-10 w-10 text-white animate-in zoom-in-50 duration-500 delay-300" />
                  </div>
                </div>
                
                {/* Success Sparkles */}
                <div className="absolute -top-2 -right-2 animate-bounce delay-500">
                  <Sparkles className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="absolute -bottom-2 -left-2 animate-bounce delay-700">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-200">
                Authentication Successful!
              </h3>
              <p className="text-gray-600 animate-in slide-in-from-bottom-4 duration-500 delay-300">
                Welcome back! Redirecting to your dashboard...
              </p>
              
              {/* Progress Bar */}
              <div className="mt-6 w-full bg-gray-200 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse transition-all duration-2000 ease-out w-full"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demo Access Dialog */}
      <AlertDialog open={showDemoDialog} onOpenChange={setShowDemoDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-400 to-blue-600">
              <TestTube className="h-6 w-6 text-white" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-gray-900">
              Try Our Software - Demo Access
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 mt-2">
              Experience our exam software with a sample test. Just enter your name to get started!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleDemoLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="demoName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Your Name
              </label>
              <div className="relative">
                <Input
                  id="demoName"
                  type="text"
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full bg-white border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 pl-10 transition-all duration-200"
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Demo Features:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Access to Sample Test category only</li>
                <li>• Experience the full exam interface</li>
                <li>• See how results are displayed</li>
                <li>• No registration required</li>
              </ul>
            </div>
            <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowDemoDialog(false)}
                className="w-full"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isDemoLoading || !demoName.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                {isDemoLoading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Starting Demo...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Start Demo
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  )
}