// OTP generation and verification logic

// Generate a random 6-digit OTP
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTPs in memory (in a production app, you'd use a database or Redis)
interface OTPRecord {
  otp: string;
  email: string;
  createdAt: number; // timestamp
  attempts: number;
}

// Using global variable to ensure persistence between API calls
declare global {
  var otpStore: Record<string, OTPRecord>;
}

// Initialize global OTP store if it doesn't exist
if (!global.otpStore) {
  global.otpStore = {};
}

const otpStore = global.otpStore;

// Store OTP for a user
export const storeOTP = (email: string, otp: string): void => {
  otpStore[email] = {
    otp,
    email,
    createdAt: Date.now(),
    attempts: 0,
  };
};

// Verify OTP
export const verifyOTP = (email: string, userOtp: string): { valid: boolean; message?: string } => {
  const record = otpStore[email];
  
  // Check if OTP exists
  if (!record) {
    return { valid: false, message: 'OTP not found. Please request a new one.' };
  }
  
  // Check if OTP is expired (10 minutes)
  const now = Date.now();
  const otpAge = now - record.createdAt;
  const OTP_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds
  
  if (otpAge > OTP_EXPIRY) {
    delete otpStore[email]; // Clean up expired OTP
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  // Increment attempts
  record.attempts += 1;
  
  // Check if too many attempts (5 max)
  if (record.attempts > 5) {
    delete otpStore[email]; // Clean up after too many attempts
    return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  // Check if OTP matches
  if (record.otp !== userOtp) {
    return { 
      valid: false, 
      message: `Invalid OTP. ${5 - record.attempts} attempts remaining.` 
    };
  }
  
  // OTP is valid, clean up
  delete otpStore[email];
  return { valid: true };
};

// Clear OTP (for cleanup)
export const clearOTP = (email: string): void => {
  delete otpStore[email];
};