# Study Materials System - Rapid Steno Exam

## Overview
The Study Materials System is a secure, feature-rich platform for managing and viewing educational content in the Rapid Steno Exam application. It provides both student and admin interfaces with comprehensive security features to protect intellectual property.

## Features

### 🎯 Student Interface (`/materials`)
- **Computer Awareness Section**: Organized study materials
- **Introduction to Computer Topic**: First topic with PDF and mindmap
- **Secure Viewing**: Protected content with security measures
- **Responsive Design**: Works on all devices
- **Navigation**: Easy access from Tests page

### 🔐 Admin Interface (`/admin/materials`)
- **Material Management**: Upload, edit, and delete study materials
- **File Support**: PDF documents and image mindmaps
- **Organization**: Section and topic-based categorization
- **User Management**: Admin-only access control

## Security Features

### 🛡️ Content Protection
- **Right-click Disabled**: Prevents context menu access
- **Copy Prevention**: Blocks Ctrl+C, Ctrl+A shortcuts
- **Print Protection**: Disables printing and Ctrl+P
- **Download Blocking**: Prevents file downloads
- **Keyboard Lockdown**: Disables F12, F5, and other function keys
- **Selection Disabled**: No text or content selection
- **Drag & Drop Prevention**: Blocks file dragging

### 🔒 Advanced Security
- **Watermark Overlay**: "SECURED" watermark on all content
- **Iframe Security**: Enhanced PDF viewer protection
- **Event Prevention**: Comprehensive keyboard and mouse event blocking
- **Print Media Blocking**: CSS-based print prevention
- **Cross-browser Compatibility**: Works across all modern browsers

## File Structure

```
app/
├── materials/
│   ├── page.tsx          # Student materials page
│   └── materials.css     # Security and styling
├── admin/
│   └── materials/
│       └── page.tsx      # Admin materials management
└── tests/
    └── page.tsx          # Updated with materials link
```

## Usage Instructions

### For Students
1. **Access Materials**: Navigate to `/materials` or click "Materials" from Tests page
2. **Browse Content**: View Computer Awareness section and topics
3. **View Content**: Click "View PDF" or "View Mindmap" buttons
4. **Secure Viewing**: Content opens in protected viewer with security features

### For Administrators
1. **Access Admin Panel**: Navigate to `/admin/materials`
2. **Upload Materials**: Use the upload form to add new content
3. **Manage Content**: Edit descriptions, replace files, or delete materials
4. **Organize**: Categorize by section and topic

## File Upload Guidelines

### Supported Formats
- **PDF Documents**: `.pdf` files for study materials
- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif` for mindmaps

### File Organization
- **Sections**: Broad categories (e.g., "Computer Awareness")
- **Topics**: Specific subjects within sections (e.g., "Introduction to Computer")
- **Types**: PDF documents or mindmap images

## Security Implementation

### JavaScript Security
```typescript
// Prevent right-click context menu
const handleContextMenu = (e: React.MouseEvent) => {
  e.preventDefault()
  return false
}

// Block keyboard shortcuts
const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.ctrlKey && (e.key === 'c' || e.key === 'p' || e.key === 's')) {
    e.preventDefault()
    return false
  }
}
```

### CSS Security
```css
.materials-viewer {
  -webkit-user-select: none;
  user-select: none;
  -webkit-context-menu: none;
  context-menu: none;
}

@media print {
  .materials-viewer,
  .materials-viewer * {
    display: none !important;
  }
}
```

### PDF Security
- Toolbar disabled (`#toolbar=0`)
- Navigation panes hidden (`#navpanes=0`)
- Download blocked (`#download=0`)
- Print disabled (`#print=0`)

## Customization

### Adding New Sections
1. Update the `sections` array in admin materials page
2. Add corresponding materials with new section names
3. Update student page to display new sections

### Adding New Topics
1. Update the `topics` array in admin materials page
2. Create materials with new topic names
3. Organize content by topic within sections

### Security Customization
- Modify `handleKeyDown` function for additional shortcuts
- Update CSS classes for enhanced protection
- Add custom watermark text or styling

## Browser Compatibility

### Supported Browsers
- ✅ Chrome/Chromium (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ Internet Explorer (limited support)

### Mobile Support
- ✅ iOS Safari
- ✅ Android Chrome
- ✅ Responsive design
- ✅ Touch-friendly interface

## Troubleshooting

### Common Issues
1. **PDF Not Loading**: Check file path and browser PDF support
2. **Security Features Not Working**: Ensure JavaScript is enabled
3. **Mobile Issues**: Verify responsive CSS is loaded
4. **Admin Access**: Check user permissions and login status

### Security Bypass Prevention
- **Developer Tools**: F12 and other keys are blocked
- **Print Screen**: Limited effectiveness due to watermark
- **Screenshot Tools**: May capture but content remains protected
- **Browser Extensions**: Limited access due to iframe restrictions

## Future Enhancements

### Planned Features
- **Analytics**: Track material usage and student engagement
- **Progress Tracking**: Monitor student progress through materials
- **Search Functionality**: Find specific content quickly
- **Offline Support**: Download materials for offline study
- **Multi-language Support**: Internationalization features

### Security Improvements
- **Watermark Customization**: Dynamic watermarks with user info
- **Session-based Protection**: Time-limited access to materials
- **Audit Logging**: Track all access attempts and violations
- **Advanced Encryption**: Enhanced file protection

## Support

For technical support or feature requests:
- Check the application logs for error messages
- Verify file permissions and upload paths
- Ensure all dependencies are properly installed
- Contact the development team for advanced issues

## License

This system is part of the Rapid Steno Exam application and is proprietary software. All rights reserved.
