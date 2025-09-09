'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { validateStudentLogin, createSession } from '@/lib/auth'
import { ExternalLink, Crown, Mail, User, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await validateStudentLogin(email, fullName)
    
    if (result.success && result.user) {
      await createSession(result.user)
      router.push('/tests')
    } else {
      // Show subscription dialog instead of error message
      setShowSubscriptionDialog(true)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-emerald-50 flex items-center justify-center p-4 relative overflow-hidden font-lexend">
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

            <div className="text-center text-sm text-gray-600 space-y-1 pt-4 border-t border-gray-200">
              <p className="flex items-center justify-center gap-2">
                <Crown className="h-4 w-4 text-[#002E2C]" />
                Premium Access Required
              </p>
              <p className="text-xs text-gray-500">Contact administrator for enrollment</p>
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
    </div>
  )
}