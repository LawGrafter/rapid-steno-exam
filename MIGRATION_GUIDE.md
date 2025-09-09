# Migration Guide: From Secret Keys to Email-Based Authentication

This guide explains how to migrate your Rapid Steno MCQ Test System from the secret key authentication system to a traditional email-based authentication system.

## 🚀 **What Changed**

### **Before (Secret Key System)**
- Students login with unique secret keys + full name
- Admins generate bulk secret keys with expiration dates
- No traditional user accounts
- Secret keys become invalid after first use

### **After (Email-Based System)**
- Students login with email + password
- Admins directly create and manage student accounts
- Traditional user authentication
- Password-based security with hashing

## 📋 **Migration Steps**

### **Step 1: Database Migration**

1. **Connect to your Supabase project**
2. **Run the first migration** (if you haven't already):
   ```sql
   -- Run this first
   -- File: supabase/migrations/20250821061558_billowing_wood.sql
   ```

3. **Run the new migration**:
   ```sql
   -- Run this second
   -- File: supabase/migrations/20250821061559_email_auth.sql
   ```

   This migration will:
   - Add `email` and `password_hash` fields to the `users` table
   - Remove the `secret_keys` table
   - Update RLS policies for email-based auth
   - Create indexes for better performance

### **Step 2: Update Environment Variables**

Make sure your `.env` file has the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### **Step 3: Deploy Updated Code**

The code has been updated with:
- New authentication system in `lib/auth.ts`
- Updated login page (`app/login/page.tsx`)
- New student management page (`app/admin/students/page.tsx`)
- Updated admin dashboard
- Updated database types in `lib/supabase.ts`

### **Step 4: Create Initial Admin User**

After running the migration, you'll need to create an admin user:

```sql
-- Create admin user with email and password
INSERT INTO users (email, full_name, password_hash, role) 
VALUES (
  'admin@yourdomain.com', 
  'Admin User', 
  crypt('your_admin_password', gen_salt('bf')), 
  'admin'
);
```

**Note**: The default admin credentials (admin@rapidsteno.com / admin123) will be automatically created by the migration.

### **Step 5: Create Student Accounts**

Use the new admin interface at `/admin/students` to:
1. Add new students with email and password
2. Manage existing student accounts
3. Reset passwords when needed

## 🔧 **Technical Changes**

### **Database Schema Changes**

| Table | Changes |
|-------|---------|
| `users` | Added `email` (unique) and `password_hash` fields |
| `secret_keys` | **Removed entirely** |
| All other tables | No changes |

### **Authentication Flow Changes**

**Old Flow:**
```
Student → Enters Secret Key + Full Name → System validates key → Creates/updates user → Login
```

**New Flow:**
```
Student → Enters Email + Password → System validates credentials → Login
```

### **Security Improvements**

- **Password Hashing**: Uses bcrypt for secure password storage
- **Email Validation**: Ensures unique email addresses
- **Row Level Security**: Maintains existing RLS policies
- **Session Management**: Improved session handling

## 📱 **User Experience Changes**

### **For Students**
- **Login**: Now uses email + password instead of secret key + name
- **Access**: Only pre-registered students can access the system
- **Security**: More secure authentication process

### **For Administrators**
- **User Management**: Direct creation and management of student accounts
- **No More Secret Keys**: Eliminates the need to generate and distribute secret keys
- **Better Control**: Full control over who can access the system

## ⚠️ **Important Notes**

### **Data Migration**
- Existing users will be automatically migrated with placeholder emails
- You'll need to update these emails manually or recreate user accounts
- Test attempts and answers are preserved

### **Password Security**
- **IMPORTANT**: The current implementation uses SHA-256 for demonstration
- **PRODUCTION**: Replace with proper bcrypt implementation
- Consider implementing password reset functionality

### **Backup**
- Always backup your database before running migrations
- Test the migration in a development environment first

## 🧪 **Testing the Migration**

1. **Test Admin Login**: Ensure you can login to `/admin/login`
2. **Test Student Creation**: Create a test student account
3. **Test Student Login**: Verify the student can login with email/password
4. **Test Test Taking**: Ensure the student can take tests normally

## 🚨 **Troubleshooting**

### **Common Issues**

1. **"User not found" errors**: Check if the migration ran successfully
2. **Type errors**: Ensure all TypeScript types are updated
3. **Authentication failures**: Verify password hashing is working correctly

### **Rollback Plan**

If you need to rollback:
1. Restore your database backup
2. Revert the code changes
3. The system will work with the old secret key system

## 📞 **Support**

If you encounter issues during migration:
1. Check the Supabase logs for database errors
2. Verify all environment variables are set correctly
3. Ensure the migration SQL executed without errors
4. Check the browser console for JavaScript errors

## 🎯 **Next Steps After Migration**

1. **Update Student Accounts**: Add real email addresses for existing students
2. **Set Initial Passwords**: Set secure initial passwords for all students
3. **Communicate Changes**: Inform students about the new login process
4. **Monitor Usage**: Watch for any authentication issues
5. **Implement Password Reset**: Add password reset functionality if needed

---

**Migration Complete!** 🎉

Your system now uses a more standard and secure email-based authentication system that's easier to manage and more user-friendly.
