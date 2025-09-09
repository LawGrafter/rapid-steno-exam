# Rapid Steno - Online MCQ Test System

A comprehensive, secure online examination platform built with Next.js 13+, Supabase, and modern web technologies.

## 🚀 **Quick Start**

### **For Students**
1. **Direct Access**: Visit the application URL
2. **Auto-Redirect**: You'll be automatically taken to the student login page
3. **Login**: Enter your **email address** and **full name**
4. **Access Tests**: View and take available tests

### **For Administrators**
1. **Access**: Navigate to `/admin/login`
2. **Login**: Use admin credentials
3. **Dashboard**: Manage tests, students, and view results

## ✨ **Key Features**

### **Student Experience**
- **Direct Login**: No landing page - straight to authentication
- **Simple Authentication**: Email + Full Name only (no passwords)
- **Real-time Testing**: Live timer, auto-save, question navigation
- **Mobile Responsive**: Works on all devices
- **Auto-submission**: Tests submit automatically when time expires

### **Administrative Features**
- **Student Management**: Add, edit, and remove student accounts
- **Test Creation**: Build comprehensive MCQ tests with CSV import
- **Results Analytics**: Detailed performance insights and exports
- **User Tracking**: Monitor student activity and progress

## 🏗️ **Architecture**

- **Frontend**: Next.js 13+ with App Router, React 18, TypeScript
- **Backend**: Supabase (PostgreSQL + Real-time + Auth)
- **UI**: Tailwind CSS + shadcn/ui components
- **Security**: Row Level Security (RLS) policies
- **Database**: PostgreSQL with optimized schemas

## 🔐 **Authentication System**

### **Student Authentication**
- **Method**: Email + Full Name verification
- **Process**: Backend matches email with registered students
- **Security**: Only pre-registered students can access
- **No Passwords**: Simplified login experience

### **Admin Authentication**
- **Method**: Traditional username/password
- **Access**: Full system control and management
- **Security**: Protected admin routes and functions

## 📊 **Database Schema**

### **Core Tables**
- **users**: Student and admin accounts
- **tests**: Test definitions and settings
- **questions**: Individual test questions
- **options**: Multiple choice options
- **attempts**: Student test attempts
- **answers**: Student responses and scoring

### **Security Features**
- **Row Level Security (RLS)**: Database-level access control
- **Role-based Access**: Separate student and admin permissions
- **Data Isolation**: Students can only access their own data

## 🚀 **Installation & Setup**

### **Prerequisites**
- Node.js 18+ 
- npm or yarn
- Supabase account

### **Environment Variables**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### **Setup Steps**
1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd rapid-steno
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   - Copy `.env.example` to `.env`
   - Add your Supabase credentials

4. **Database Setup**
   - Run the provided SQL migrations in Supabase
   - Create initial admin user

5. **Start Development**
   ```bash
   npm run dev
   ```

## 📱 **User Flow**

### **Student Journey**
```
Website URL → Auto-redirect to /login → Enter Email + Name → Access Tests → Take Test → Submit → View Results
```

### **Admin Journey**
```
/admin/login → Dashboard → Manage Students/Tests → View Analytics → Export Results
```

## 🔧 **Development**

### **Available Scripts**
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### **Project Structure**
```
app/                    # Next.js App Router pages
├── admin/             # Admin interface routes
├── login/             # Student login page
├── test/[id]/         # Dynamic test taking route
├── tests/             # Available tests listing
└── submitted/         # Test submission confirmation

components/             # Reusable UI components
├── ui/                # shadcn/ui components
└── ...                # Custom components

lib/                   # Utility functions and configurations
├── auth.ts            # Authentication logic
├── supabase.ts        # Supabase client and types
└── utils.ts           # Helper functions

supabase/              # Database migrations and schemas
└── migrations/        # SQL migration files
```

## 🚀 **Deployment**

### **Vercel (Recommended)**
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically on push

### **Other Platforms**
- **Netlify**: Static export compatible
- **Railway**: Full-stack deployment
- **DigitalOcean**: App Platform deployment

## 🔒 **Security Considerations**

- **HTTPS Only**: All production deployments use SSL
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Supabase handles parameterized queries
- **XSS Prevention**: React's built-in XSS protection
- **CSRF Protection**: Built into Next.js framework

## 📈 **Performance Features**

- **Static Generation**: Optimized page loading
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic bundle optimization
- **Caching**: Built-in caching strategies
- **Mobile First**: Responsive design for all devices

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 **Support**

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the code examples

---

**Built with ❤️ using Next.js, Supabase, and modern web technologies**