import { NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/otp'
import { sendLoginNotificationEmail } from '@/lib/email'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()
    
    if (!email || !otp) {
      return NextResponse.json(
        { success: false, message: 'Email and OTP are required' },
        { status: 400 }
      )
    }
    
    // Verify OTP
    const result = verifyOTP(email, otp)
    
    if (!result.valid) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      )
    }
    
    // Get user's IP address and device info
    const headersList = headers();
    const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = headersList.get('user-agent') || 'Unknown Device';
    
    // Get location from IP address
    let location = 'Unknown';
    try {
      // For local development, we'll use a placeholder location
      if (ipAddress === '127.0.0.1') {
        location = 'Local Development';
      } else {
        // For production, we would use the IP geolocation API
        // This is a simplified implementation
        location = 'India'; // Default location for demonstration
      }
    } catch (error) {
      console.error('Error getting location:', error);
      location = 'Unknown';
    }
    
    // Send login notification email
    try {
      await sendLoginNotificationEmail(
        email,
        "Rapid Steno User", // Using a generic name instead of email username
        ipAddress,
        userAgent,
        location
      );
      console.log('Login notification email sent successfully');
    } catch (error) {
      console.error('Error sending login notification email:', error);
      // Continue with login process even if email fails
    }
    
    return NextResponse.json(
      { success: true, message: 'OTP verified successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}