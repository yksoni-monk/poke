# Frontend Architecture Documentation

## Overview
The Pokemon Scanner frontend is a React-based single-page application built with TypeScript, Vite, and Tailwind CSS. It provides a user interface for scanning Pokemon cards, managing a personal library, and authenticating users through SuperTokens.

## Technology Stack

### Core Technologies
- **React 18.3.1** - UI framework
- **TypeScript 5.5.3** - Type-safe JavaScript
- **Vite 5.4.19** - Build tool and dev server
- **Tailwind CSS 3.4.11** - Utility-first CSS framework

### Key Libraries
- **React Router DOM 6.26.2** - Client-side routing
- **SuperTokens Auth React 0.40.1** - Authentication framework
- **React Image Crop 11.0.10** - Image cropping functionality
- **Lucide React 0.462.0** - Icon library
- **Radix UI** - Accessible UI primitives (accordion, dialog, dropdown, etc.)
- **React Hook Form 7.53.0** - Form handling
- **Zod 3.23.8** - Schema validation

## Project Structure

```
frontend/src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   │   ├── SignIn.tsx           # OTP-based sign-in form
│   │   ├── ProtectedRoute.tsx   # Route protection wrapper
│   │   └── UserProfile.tsx      # User profile display
│   ├── ui/             # Base UI components (shadcn/ui)
│   │   ├── button.tsx           # Button component
│   │   ├── card.tsx             # Card component
│   │   ├── input.tsx            # Input component
│   │   └── ...                  # Other UI primitives
│   ├── CameraCapture.tsx        # Camera interface component
│   ├── CardDetails.tsx          # Card information display
│   └── LibraryCardDetails.tsx   # Library card view
├── contexts/           # React context providers
│   └── AuthContext.tsx          # Authentication state management
├── hooks/              # Custom React hooks
│   ├── use-mobile.tsx           # Mobile detection hook
│   └── use-toast.ts             # Toast notification hook
├── lib/                # Utility libraries
│   └── utils.ts                 # CSS class merging utilities
├── pages/              # Page components
│   ├── Index.tsx                # Main home page
│   ├── Library.tsx              # User's card library
│   ├── Auth.tsx                 # Authentication page
│   └── NotFound.tsx             # 404 error page
├── services/           # API service layer
│   └── cardApi.ts               # Card-related API calls
├── types/              # TypeScript type definitions
│   └── card.ts                  # Card data interfaces
├── utils/              # Utility functions
│   └── imageUtils.ts            # Image processing utilities
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Architecture Patterns

### 1. Component Architecture
- **Functional Components** - All components use modern React functional components with hooks
- **Component Composition** - Components are composed using props and children
- **Separation of Concerns** - UI logic separated from business logic

### 2. State Management
- **React Context** - Authentication state managed through `AuthContext`
- **Local State** - Component-specific state managed with `useState`
- **No Global State Library** - Simple context-based state management

### 3. Routing Architecture
- **Client-Side Routing** - React Router for navigation
- **Protected Routes** - `ProtectedRoute` component for authentication-based access control
- **Route Structure**:
  - `/` - Public home page (Index)
  - `/auth` - Authentication page
  - `/library` - Protected library page

### 4. Authentication Flow
- **SuperTokens Integration** - Passwordless email OTP authentication
- **Session Management** - Automatic session handling through SuperTokens
- **Route Protection** - Conditional rendering based on authentication status

## Key Components Deep Dive

### 1. App.tsx - Application Root
```typescript
// Main application wrapper with providers
<SuperTokensWrapper>
  <ComponentWrapper>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Route definitions */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ComponentWrapper>
</SuperTokensWrapper>
```

**Responsibilities:**
- Initialize SuperTokens authentication
- Provide authentication context
- Set up routing
- Wrap components with necessary providers

### 2. AuthContext.tsx - Authentication State
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, userData?: any) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}
```

**Responsibilities:**
- Manage user authentication state
- Provide authentication methods
- Handle session checking
- Expose authentication status to components

### 3. SignIn.tsx - Authentication Component
**Authentication Flow:**
1. User enters email address
2. System sends OTP via SuperTokens
3. User enters OTP code
4. System verifies OTP and creates session
5. User is redirected to home page

**Key Features:**
- Email validation
- OTP sending and verification
- Error handling and user feedback
- Local storage for session data

### 4. ProtectedRoute.tsx - Route Protection
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // true for protected, false for public
}
```

**Responsibilities:**
- Check authentication status
- Render appropriate content based on auth requirements
- Show loading states
- Redirect unauthenticated users

### 5. CardApiService - API Layer
```typescript
export class CardApiService {
  static async scanCard(imageBlob: Blob): Promise<ScanResult>
  static async addToLibrary(cardId: string): Promise<{ success: boolean; added?: boolean }>
  static async fetchLibrary(): Promise<{ success: boolean; card_ids: string[] }>
  static async getCardById(cardId: string): Promise<CardData | null>
}
```

**Responsibilities:**
- Handle all card-related API calls
- Image processing and upload
- Library management operations
- Error handling and response parsing

## Data Flow

### 1. Authentication Flow
```
User Input → SignIn Component → SuperTokens API → Backend → Session Creation → AuthContext Update → Route Protection → Protected Content
```

### 2. Card Scanning Flow
```
Camera/Upload → Image Processing → API Call → Card Recognition → Display Results → Add to Library (Optional)
```

### 3. Library Management Flow
```
User Request → API Call → Data Fetch → State Update → UI Rendering → User Interaction
```

## State Management Strategy

### 1. Authentication State
- **Global State** - User authentication status managed in `AuthContext`
- **Persistence** - Session data stored in SuperTokens cookies
- **Synchronization** - Automatic session checking on app load

### 2. Component State
- **Local State** - Component-specific data (forms, UI state, etc.)
- **Props** - Data passed down from parent components
- **Context** - Shared data accessed through React Context

### 3. API State
- **Loading States** - Individual API call loading indicators
- **Error Handling** - Component-level error states
- **Data Caching** - No global caching, fresh data on each request

## Styling Architecture

### 1. Tailwind CSS
- **Utility-First** - Rapid UI development with utility classes
- **Responsive Design** - Mobile-first responsive breakpoints
- **Custom Components** - shadcn/ui components built on Tailwind

### 2. Component Styling
- **Consistent Design System** - Unified color palette and spacing
- **Responsive Layouts** - Mobile and desktop optimized interfaces
- **Accessibility** - ARIA labels and keyboard navigation support

## Error Handling Strategy

### 1. API Errors
- **Try-Catch Blocks** - Wrapped around all async operations
- **User Feedback** - Clear error messages displayed to users
- **Graceful Degradation** - App continues to function despite errors

### 2. Authentication Errors
- **OTP Validation** - Clear feedback for invalid codes
- **Session Errors** - Automatic redirect to login on session expiry
- **Network Errors** - User-friendly network error messages

### 3. UI Errors
- **Form Validation** - Real-time input validation
- **Loading States** - Prevent multiple submissions
- **Fallback UI** - Loading spinners and error states

## Performance Considerations

### 1. Code Splitting
- **Route-Based Splitting** - Each page loaded separately
- **Component Lazy Loading** - Heavy components loaded on demand

### 2. Image Optimization
- **Image Resizing** - Automatic image compression before upload
- **Lazy Loading** - Images loaded only when needed
- **Format Optimization** - JPEG compression for smaller file sizes

### 3. State Updates
- **Minimal Re-renders** - Careful dependency management in useEffect
- **Memoization** - useCallback for expensive operations
- **Efficient Updates** - Batch state updates when possible

## Security Features

### 1. Authentication Security
- **OTP-Based** - Time-limited one-time passwords
- **Session Management** - Secure session handling through SuperTokens
- **Route Protection** - Server-side and client-side route validation

### 2. Data Security
- **HTTPS Only** - All API calls use secure connections
- **Input Validation** - Client-side and server-side validation
- **XSS Prevention** - React's built-in XSS protection

## Development Workflow

### 1. Development Environment
- **Vite Dev Server** - Fast hot module replacement
- **TypeScript** - Compile-time error checking
- **ESLint** - Code quality enforcement

### 2. Build Process
- **Vite Build** - Optimized production builds
- **Tree Shaking** - Unused code elimination
- **Asset Optimization** - Image and CSS optimization

### 3. Testing Strategy
- **Component Testing** - Individual component testing
- **Integration Testing** - API integration testing
- **User Testing** - Real-world usage testing

## Deployment Considerations

### 1. Build Output
- **Static Files** - HTML, CSS, JS bundles
- **Asset Optimization** - Compressed and optimized assets
- **Environment Variables** - Runtime configuration

### 2. Hosting
- **Static Hosting** - Can be deployed to any static hosting service
- **CDN Ready** - Optimized for content delivery networks
- **Environment Configuration** - API endpoints configurable per environment

## Future Enhancements

### 1. Performance Improvements
- **Service Workers** - Offline functionality and caching
- **Virtual Scrolling** - Large library performance optimization
- **Image Preloading** - Faster card image loading

### 2. User Experience
- **Progressive Web App** - Installable app experience
- **Offline Support** - Basic functionality without internet
- **Push Notifications** - Card price alerts and updates

### 3. Technical Debt
- **State Management** - Consider Redux/Zustand for complex state
- **Testing Coverage** - Unit and integration test coverage
- **Error Boundaries** - Better error handling and recovery

## Conclusion

The Pokemon Scanner frontend follows modern React development practices with a clean, maintainable architecture. The use of TypeScript, SuperTokens for authentication, and a well-structured component hierarchy provides a solid foundation for future development. The application successfully balances simplicity with functionality, making it easy to understand and extend.
