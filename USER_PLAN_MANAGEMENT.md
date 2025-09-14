# User Plan Management System

This document describes the comprehensive user plan management system that handles Gold Plan and Allahabad High Court (AHC) Plan subscriptions with automatic user activation/deactivation features.

## Features

### 1. Plan-Based Access Control
- **Gold Plan**: Access to general content, excluding AHC-specific materials
- **AHC Plan**: Full access to all content including Allahabad High Court materials
- **Specific Access Grants**: Admins can grant Gold users access to specific AHC content

### 2. User Activation/Deactivation
- **Manual Control**: Admins can activate/deactivate users through the admin panel
- **Automatic Deactivation**: Users are automatically deactivated after 90 days of inactivity
- **Detailed Tracking**: All activation changes are logged with timestamps and reasons

### 3. Admin Interface
- **User Management**: View, search, and filter users by plan and status
- **Plan Assignment**: Assign and revoke user subscriptions
- **Access Control**: Grant specific access to restricted content
- **Activation Controls**: Activate/deactivate users with one click

## Database Schema

### Tables Created

#### `plans`
- Stores available subscription plans (Gold, AHC)
- Includes pricing, duration, and feature information

#### `user_subscriptions`
- Links users to their active plans
- Tracks activation status, expiration, and deactivation details
- Fields: `is_active`, `deactivated_at`, `deactivated_by`, `deactivation_reason`

#### `user_plan_access`
- Manages specific access grants for individual resources
- Allows Gold users to access specific AHC content

### Database Functions

#### `check_user_access(user_id, category_name, resource_type, resource_id)`
- Determines if a user can access specific content
- Checks plan subscriptions and specific access grants
- Handles AHC content detection automatically

#### `auto_deactivate_inactive_users()`
- Automatically deactivates users inactive for 90+ days
- Returns count of deactivated users
- Logs deactivation with system timestamp

#### `update_user_activity(user_id)`
- Updates user's last activity timestamp
- Should be called on user login and content access

## Setup Instructions

### 1. Database Migration
Run the migration to create the user plan schema:
```sql
-- Apply the migration file: supabase/migrations/20250914131900_create_user_plans.sql
```

### 2. Insert Default Plans
```sql
INSERT INTO plans (name, display_name, description, price, duration_months, features, is_active) VALUES
('gold', 'Gold Plan', 'Access to general study materials and tests', 999, 12, '{"general_access": true, "ahc_access": false}', true),
('ahc', 'AHC Plan', 'Full access including Allahabad High Court materials', 1499, 12, '{"general_access": true, "ahc_access": true}', true);
```

### 3. Automatic Deactivation Setup

#### Option A: Cron Job (Recommended)
Set up a daily cron job to run the auto-deactivation script:
```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/your/app && node scripts/auto-deactivate-users.js
```

#### Option B: Scheduled Database Function (if pg_cron is available)
```sql
SELECT cron.schedule('auto-deactivate-users', '0 2 * * *', 'SELECT auto_deactivate_inactive_users();');
```

#### Option C: Manual Execution
Run the script manually when needed:
```bash
node scripts/auto-deactivate-users.js
```

### 4. Environment Variables
Ensure these environment variables are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Usage

### Admin Panel Access
Navigate to `/admin/users` to access the user management interface.

### User Plan Assignment
1. Go to the "Plan Subscriptions" tab
2. Search for a user by email
3. Click "Assign Plan" and select the appropriate plan
4. Set expiration date if needed

### User Activation/Deactivation
1. Find the user in the subscriptions list
2. Click "Activate" or "Deactivate" button
3. The system will update the user's status and log the change

### Specific Access Grants
1. Go to the "Specific Access" tab
2. Grant Gold users access to specific AHC content
3. Set expiration dates and add notes for tracking

## Access Control Integration

### Frontend Usage
```typescript
import { AccessControl } from '@/lib/access-control'

const accessControl = new AccessControl(supabase)
const userAccess = await accessControl.getUserAccess(userId)

// Check category access
if (accessControl.canAccessCategory(userAccess, categoryName)) {
  // Allow access
} else {
  // Show upgrade dialog
}
```

### Upgrade Dialog
The system includes a branded upgrade dialog that:
- Detects the type of content being accessed
- Shows appropriate upgrade messaging
- Allows Gold users to request specific AHC access
- Provides clear upgrade paths

## Monitoring and Maintenance

### Activity Tracking
- All user activity should call `update_user_activity(user_id)`
- Monitor deactivation logs through admin interface
- Track subscription changes and access grants

### Regular Maintenance
- Review automatically deactivated users monthly
- Clean up expired access grants
- Monitor plan usage and conversion rates

## Security Features

### Row Level Security (RLS)
- Users can only see their own subscriptions and access grants
- Admin-only policies for management operations
- Secure access control checks at database level

### Access Control
- Centralized access logic in database functions
- Frontend access control library for consistent checks
- Upgrade dialogs prevent unauthorized access

## Troubleshooting

### Common Issues

1. **Users not being deactivated automatically**
   - Check if the cron job is running
   - Verify the database function exists
   - Ensure environment variables are set

2. **Access control not working**
   - Verify RLS policies are enabled
   - Check if user has active subscription
   - Ensure `update_user_activity` is being called

3. **Admin panel not loading users**
   - Check admin role in user metadata
   - Verify Supabase connection
   - Review browser console for errors

### Logs and Debugging
- Check application logs for access control decisions
- Monitor Supabase logs for database function calls
- Use browser developer tools for frontend debugging

## Future Enhancements

- Email notifications for deactivation warnings
- Bulk user management operations
- Advanced reporting and analytics
- Integration with payment systems
- Mobile app support for plan management
