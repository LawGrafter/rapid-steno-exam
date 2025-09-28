import { NextResponse } from 'next/server'
import { generateOTP, storeOTP } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { getUserByEmail } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      )
    }
    
    // Check if user exists
    const user = await getUserByEmail(email)
    if (!user) {
      // Don't reveal that the user doesn't exist for security reasons
      return NextResponse.json(
        { success: true, message: 'If your email is registered, you will receive an OTP' },
        { status: 200 }
      )
    }
    
    // Generate OTP
    const otp = generateOTP()
    
    // Store OTP
    storeOTP(email, otp)
    
    // Send OTP email
    const emailResult = await sendOtpEmail(email, otp)
    
    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: 'Failed to send OTP email' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { success: true, message: 'OTP sent successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error sending OTP:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}