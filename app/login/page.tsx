'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, User, Lock, TestTube, HelpCircle, MessageCircle, Mail } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { validateStudentLogin, createSession, getCurrentUser } from '@/lib/auth'
import { ExternalLink, Crown, Sparkles, Check, ShieldCheck } from 'lucide-react'
import { OtpVerificationModal } from '@/components/ui/otp-verification-modal'

// Animation styles for scrolling exam names
const floatingStyles = `
  @keyframes scrollRight {
    0% { transform: translateX(-150%); }
    100% { transform: translateX(150%); }
  }
  
  @keyframes scrollLeft {
    0% { transform: translateX(150%); }
    100% { transform: translateX(-150%); }
  }
  
  .animate-scroll-right {
    animation: scrollRight 15s linear infinite;
  }
  
  .animate-scroll-left {
    animation: scrollLeft 15s linear infinite;
  }
  
  .animation-duration-8 {
    animation-duration: 8s;
  }
  
  .animation-duration-10 {
    animation-duration: 10s;
  }
  
  .animation-duration-12 {
    animation-duration: 12s;
  }
  
  .animation-duration-15 {
    animation-duration: 15s;
  }
  
  .animation-duration-18 {
    animation-duration: 18s;
  }
  
  .animation-duration-20 {
    animation-duration: 20s;
  }
  
  .animation-duration-22 {
    animation-duration: 22s;
  }
  
  .animation-duration-25 {
    animation-duration: 25s;
  }
`

export default function LoginPage() {
  // Add style tag for animations
  useEffect(() => {
    // Add the animation styles to the document
    const styleElement = document.createElement('style')
    styleElement.innerHTML = floatingStyles
    document.head.appendChild(styleElement)
    
    return () => {
      // Clean up on unmount
      document.head.removeChild(styleElement)
    }
  }, [])

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showDemoDialog, setShowDemoDialog] = useState(false)
  const [demoName, setDemoName] = useState('')
  const [isDemoLoading, setIsDemoLoading] = useState(false)
  const [showOtpModal, setShowOtpModal] = useState(false)
  const [verifiedUser, setVerifiedUser] = useState<any>(null)
  const router = useRouter()
  
  // Check if user is already logged in and redirect to tests page
  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      router.push('/tests')
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const result = await validateStudentLogin(email, fullName)
    
    if (result.success && result.user) {
      // Store user data temporarily until OTP verification
      setVerifiedUser(result.user)
      
      // Send OTP to user's email
      try {
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        })
        
        const data = await response.json()
        
        if (data.success) {
          // Show OTP verification modal
          setShowOtpModal(true)
        } else {
          setError('Failed to send verification code. Please try again.')
        }
      } catch (error) {
        console.error('Error sending OTP:', error)
        setError('An error occurred. Please try again later.')
      }
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

  // Function to request fullscreen mode
  const requestFullscreen = () => {
    const element = document.documentElement;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).mozRequestFullScreen) { // Firefox
      (element as any).mozRequestFullScreen();
    } else if ((element as any).webkitRequestFullscreen) { // Chrome, Safari and Opera
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) { // IE/Edge
      (element as any).msRequestFullscreen();
    }
  };

  // Handle OTP verification
  const handleVerifyOtp = async (otp: string) => {
    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        // OTP verified, proceed with login
        if (verifiedUser) {
          createSession(verifiedUser)
          setShowOtpModal(false)
          setShowSuccessPopup(true)
          
          // Request fullscreen mode
          requestFullscreen();
          
          // Redirect after showing success animation
          setTimeout(() => {
            router.push('/tests')
          }, 2000)
        }
        return { success: true }
      } else {
        return { success: false, message: data.message || 'Invalid verification code' }
      }
    } catch (error) {
      console.error('Error verifying OTP:', error)
      return { success: false, message: 'An error occurred. Please try again.' }
    }
  }

  // Handle resend OTP
  const handleResendOtp = async () => {
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        return { success: true, message: 'Verification code resent successfully' }
      } else {
        return { success: false, message: data.message || 'Failed to resend verification code' }
      }
    } catch (error) {
      console.error('Error resending OTP:', error)
      return { success: false, message: 'An error occurred. Please try again.' }
    }
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 relative overflow-hidden flex items-center justify-center p-4 font-lexend">
        {/* Main card container */}
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
          {/* Left side - Login form */}
          <div className="order-2 md:order-1 w-full md:w-1/2 p-8 md:p-12">
            <div className="mb-8">
              <h2 className="text-4xl font-extrabold text-[#01342F] mb-3 tracking-tight">Rapid Steno</h2>
              <p className="text-gray-600">Enter your credentials to access premium tests</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#078F65] focus:border-[#078F65]"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label htmlFor="fullName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Your Full Name
                  </label>
                </div>
                <div className="relative">
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name for result"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#078F65] focus:border-[#078F65]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email || !fullName}
                className="w-full bg-gradient-to-r from-[#078F65] to-[#01342F] hover:from-[#01342F] hover:to-[#078F65] text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Sending OTP...
                  </>
                ) : (
                  "Access Exam Dashboard"
                )}
              </Button>
              
              <div className="text-center text-sm text-gray-600 space-y-3 pt-4 border-t border-gray-200">
                <p className="flex items-center justify-center gap-2 font-medium">
                  <HelpCircle className="h-4 w-4 text-gray-700" />
                  Need Help?
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-2">
                  <a 
                    href="https://api.whatsapp.com/send/?phone=917307133551&text&type=phone_number&app_absent=0" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-all mb-2 sm:mb-0"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Connect Via WhatsApp
                  </a>
                  <a 
                    href="mailto:info@rapidsteno.com" 
                    className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-all"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Connect Via Mail
                  </a>
                </div>
              </div>
            </form>
          </div>
          
          {/* Right side - Full section with auto-scrolling exam names */}
          <div className="order-1 md:order-2 w-full md:w-1/2 bg-gradient-to-br from-[#078F65] to-[#01342F] p-8 flex items-center justify-center relative overflow-hidden max-h-[250px] md:max-h-none">
            
            {/* Rapid Steno Batch Heading - hidden on mobile */}
            <div className="absolute top-4 left-0 right-0 text-center z-20 hidden md:block">
              <h1 className="text-white text-2xl md:text-3xl font-bold">Rapid Steno Batch</h1>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full filter blur-xl opacity-10"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full filter blur-xl opacity-10"></div>
            
            {/* Auto-scrolling exam names container */}
            <div className="relative z-10 w-full max-w-md h-[180px] md:h-[400px] md:max-w-lg">
              <div className="w-full h-full relative">
                {/* Mobile exam names - with fixed positions */}
                <div className="absolute top-[10%] left-0 right-0 bg-white p-3 rounded-lg shadow-lg animate-scroll-left animation-duration-8 mx-auto w-max md:hidden">
                  <span className="text-[#01342F] font-medium text-sm">Supreme Court of India</span>
                </div>
                
                <div className="absolute top-[25%] bg-white p-3 rounded-lg shadow-lg animate-scroll-right animation-duration-12 md:hidden">
                  <span className="text-[#01342F] font-medium text-sm">Patna High Court</span>
                </div>
                
                <div className="absolute top-[40%] bg-white p-3 rounded-lg shadow-lg animate-scroll-right animation-duration-18 md:hidden">
                  <span className="text-[#01342F] font-medium text-sm">Special SSC Stenographer</span>
                </div>
                
                <div className="absolute top-[55%] bg-white p-3 rounded-lg shadow-lg animate-scroll-right animation-duration-10 md:hidden">
                  <span className="text-[#01342F] font-medium text-sm">Delhi High Court</span>
                </div>
                
                <div className="absolute top-[70%] bg-white p-3 rounded-lg shadow-lg animate-scroll-left animation-duration-15 md:hidden">
                  <span className="text-[#01342F] font-medium text-sm">Rajasthan High Court</span>
                </div>
                
                {/* Desktop exam names - with fixed positions */}
                <div className="absolute top-[5%] left-0 right-0 bg-white p-3 rounded-lg shadow-lg animate-scroll-left animation-duration-8 mx-auto w-max hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">Supreme Court of India</span>
                </div>
                
                <div className="absolute top-[15%] bg-white p-3 rounded-lg shadow-lg animate-scroll-right animation-duration-22 hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">Patna High Court</span>
                </div>
                
                <div className="absolute top-[25%] bg-white p-3 rounded-lg shadow-lg animate-scroll-left animation-duration-12 hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">Allahabad High Court</span>
                </div>
                
                <div className="absolute top-[35%] bg-white p-3 rounded-lg shadow-lg animate-scroll-right animation-duration-18 hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">Special SSC Stenographer</span>
                </div>
                
                <div className="absolute top-[45%] bg-white p-3 rounded-lg shadow-lg animate-scroll-left animation-duration-25 hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">AIIMS Stenographer</span>
                </div>
                
                <div className="absolute top-[55%] bg-white p-3 rounded-lg shadow-lg animate-scroll-right animation-duration-10 hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">Delhi High Court</span>
                </div>
                
                <div className="absolute top-[65%] bg-white p-3 rounded-lg shadow-lg animate-scroll-left animation-duration-15 hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">Rajasthan High Court</span>
                </div>
                
                <div className="absolute top-[75%] bg-white p-3 rounded-lg shadow-lg animate-scroll-right animation-duration-20 hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">Punjab & Haryana High Court</span>
                </div>
                
                <div className="absolute top-[85%] bg-white p-3 rounded-lg shadow-lg animate-scroll-left animation-duration-12 hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">Telangana High Court</span>
                </div>
                
                <div className="absolute top-[95%] bg-white p-3 rounded-lg shadow-lg animate-scroll-right animation-duration-22 hidden md:block">
                  <span className="text-[#01342F] font-medium text-sm">Jharkhand High Court</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Dialog */}
      <AlertDialog open={showSubscriptionDialog} onOpenChange={setShowSubscriptionDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[#078F65] to-[#01342F]">
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
                className="w-full bg-gradient-to-r from-[#078F65] to-[#01342F] hover:from-[#01342F] hover:to-[#078F65] text-white"
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
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-[#078F65] to-[#01342F] rounded-full flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#078F65] to-[#01342F] rounded-full animate-ping opacity-75"></div>
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
                <div className="h-full bg-gradient-to-r from-[#078F65] to-[#01342F] rounded-full animate-pulse transition-all duration-2000 ease-out w-full"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* OTP Verification Modal */}
      <OtpVerificationModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerify={handleVerifyOtp}
        onResendOtp={handleResendOtp}
        email={email}
      />
    </>
  )
}