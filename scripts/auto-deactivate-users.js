#!/usr/bin/env node

/**
 * Auto-deactivate inactive users script
 * This script should be run periodically (e.g., daily via cron job) to automatically
 * deactivate users who have been inactive for more than 90 days.
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function autoDeactivateInactiveUsers() {
  try {
    console.log('Starting automatic user deactivation process...')
    
    // Call the database function we created
    const { data, error } = await supabase.rpc('auto_deactivate_inactive_users')
    
    if (error) {
      console.error('Error calling auto_deactivate_inactive_users function:', error)
      return
    }
    
    console.log(`Auto-deactivation process completed. Deactivated ${data || 0} users.`)
    
    // Log the activity
    const { error: logError } = await supabase
      .from('admin_activity_log')
      .insert({
        action: 'auto_deactivate_users',
        details: { deactivated_count: data || 0 },
        performed_by: 'system',
        performed_at: new Date().toISOString()
      })
    
    if (logError) {
      console.warn('Could not log activity (table may not exist):', logError.message)
    }
    
  } catch (error) {
    console.error('Unexpected error during auto-deactivation:', error)
  }
}

// Run the function
autoDeactivateInactiveUsers()
  .then(() => {
    console.log('Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })
