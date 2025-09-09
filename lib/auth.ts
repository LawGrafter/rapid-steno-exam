import { supabase } from './supabase'
import { Database } from './supabase'

type User = Database['public']['Tables']['users']['Row']
type StudentForAdmin = Omit<User, 'password_hash'>

export async function validateStudentLogin(email: string, fullName: string): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Check if user exists with the given email (only validate email, accept any name)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('role', 'student')
      .single()

    if (userError || !userData) {
      return { success: false, error: 'Email not found in our system' }
    }

    // Accept any name - no validation against database
    // This allows tracking who took the test while only validating paid email access
    return { success: true, user: userData }
  } catch (error) {
    console.error('Login validation error:', error)
    return { success: false, error: 'System error during login' }
  }
}

export async function createUser(email: string, fullName: string, role: 'student' | 'admin' = 'student'): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    // Create new user (no password needed)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        full_name: fullName,
        role: role
      })
      .select()
      .single()

    if (userError || !userData) {
      return { success: false, error: 'Error creating user' }
    }

    return { success: true, user: userData }
  } catch (error) {
    console.error('User creation error:', error)
    return { success: false, error: 'System error during user creation' }
  }
}

export async function updateUser(userId: string, updates: Partial<Pick<User, 'full_name' | 'email'>>): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)

    if (error) {
      return { success: false, error: 'Error updating user' }
    }

    return { success: true }
  } catch (error) {
    console.error('User update error:', error)
    return { success: false, error: 'System error during user update' }
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !data) return null
    return data
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}

export async function getAllStudents(): Promise<StudentForAdmin[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, created_at')
      .eq('role', 'student')
      .order('full_name')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Get students error:', error)
    return []
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (error) {
      return { success: false, error: 'Error deleting user' }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete user error:', error)
    return { success: false, error: 'System error during user deletion' }
  }
}

export async function createSession(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('currentUser', JSON.stringify(user))
  }
}

export function getCurrentUser(): User | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      return JSON.parse(stored)
    }
  }
  return null
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser')
    window.location.href = '/login'
  }
}