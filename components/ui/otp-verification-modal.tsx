'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { OtpInput } from '@/components/ui/otp-input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'

interface OtpVerificationModalProps {
  isOpen: boolean
  onClose: () => void
  onVerify: (otp: string) => Promise<{ success: boolean; message?: string }>
  onResendOtp: () => Promise<{ success: boolean; message?: string }>
  email: string
}

export function OtpVerificationModal({
  isOpen,
  onClose,
  onVerify,
  onResendOtp,
  email
}: OtpVerificationModalProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)

  // Handle countdown for resend button
  useEffect(() => {
    if (!isOpen) return
    
    setCountdown(60)
    setCanResend(false)
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setCanResend(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [isOpen, isResending])

  const handleVerify = async (otp: string) => {
    setIsVerifying(true)
    setError('')
    setSuccess('')
    
    try {
      const result = await onVerify(otp)
      
      if (result.success) {
        setSuccess('Verification successful!')
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError(result.message || 'Verification failed. Please try again.')
      }
    } catch (err) {
      setError('An error occurred during verification. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOtp = async () => {
    if (!canResend || isResending) return
    
    setIsResending(true)
    setError('')
    setSuccess('')
    
    try {
      const result = await onResendOtp()
      
      if (result.success) {
        setSuccess('OTP resent successfully!')
        setCanResend(false)
      } else {
        setError(result.message || 'Failed to resend OTP. Please try again.')
      }
    } catch (err) {
      setError('An error occurred while resending OTP. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={undefined}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-[#002E2C]">
            Verify Your Identity
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            We've sent a 6-digit verification code to<br />
            <span className="font-medium text-[#002E2C]">{email}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-4">
          <OtpInput 
            length={6} 
            onComplete={handleVerify} 
            disabled={isVerifying}
          />
          
          {isVerifying && (
            <div className="flex items-center text-blue-500 text-sm font-medium">
              <LoadingSpinner className="h-4 w-4 mr-2" />
              Verifying OTP, Please Wait...
            </div>
          )}
          
          {error && !isVerifying && (
            <div className="flex items-center text-red-500 text-sm font-medium">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </div>
          )}
          
          {success && !isVerifying && (
            <div className="flex items-center text-green-500 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {success}
            </div>
          )}
          
          <div className="text-sm text-gray-500">
            Didn't receive the code?{' '}
            <Button
              variant="link"
              className={`p-0 h-auto font-medium ${canResend ? 'text-[#002E2C]' : 'text-gray-400'}`}
              onClick={handleResendOtp}
              disabled={!canResend || isResending}
            >
              {isResending ? (
                <>
                  <LoadingSpinner className="h-3 w-3 mr-1" />
                  Resending...
                </>
              ) : canResend ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Resend OTP
                </>
              ) : (
                `Resend in ${countdown}s`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}