'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'

interface OtpInputProps {
  length?: number
  onComplete: (otp: string) => void
  disabled?: boolean
}

export function OtpInput({ length = 6, onComplete, disabled = false }: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length)
  }, [length])

  // Focus on first input on mount
  useEffect(() => {
    if (inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus()
    }
  }, [disabled])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value
    
    // Only accept numbers
    if (!/^\d*$/.test(value)) return
    
    // Take the last character if multiple characters are pasted
    const digit = value.slice(-1)
    
    // Update the OTP array
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    
    // If a digit was entered, move to the next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Check if OTP is complete
    const otpValue = newOtp.join('')
    if (otpValue.length === length) {
      onComplete(otpValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    // Move to previous input on backspace if current input is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    
    // Move to next input on right arrow
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Move to previous input on left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain').trim()
    
    // Only accept numbers
    if (!/^\d*$/.test(pastedData)) return
    
    // Fill the OTP array with pasted digits
    const digits = pastedData.slice(0, length).split('')
    const newOtp = [...otp]
    
    digits.forEach((digit, idx) => {
      newOtp[idx] = digit
    })
    
    setOtp(newOtp)
    
    // Focus on the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex(val => !val)
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex
    inputRefs.current[focusIndex]?.focus()
    
    // Check if OTP is complete
    const otpValue = newOtp.join('')
    if (otpValue.length === length) {
      onComplete(otpValue)
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={otp[index]}
          onChange={e => handleChange(e, index)}
          onKeyDown={e => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-12 text-center text-xl font-bold border-2 focus:border-[#002E2C] focus:ring-[#002E2C]/20"
          aria-label={`Digit ${index + 1}`}
        />
      ))}
    </div>
  )
}