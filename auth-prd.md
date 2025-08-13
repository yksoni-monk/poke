# Authentication PRD - PokéScan App

## **User Requirements**

We need to implement a simple auth mechanism.

Right now when we have hardcoded a user. When we add a new card to library or fetch from library, the card is from this hardcoded user.

We want to give an option to the user to sign in using their email. User enters their email, and they receive a code. When user enter a code, they can use the code to sign in. They can request another code. The user then enters into a session. Then they can add new cards to the library, fetch library cards and sign out.

All this requires changes to both frontend and the backend.

I want to use Supertokens SDK to manage the auth. All the functionality that I just described is already present in supertoken.

Supertoken also has a docker container that I want to use. It should be part of backend docker-compose file.

Also, they have a frontend SDK for react.

Also, I think our database will require some modification. We will need to create a table to map user ids to all the data related to user (i.e. their library must be related to their user id.).

## **Implementation Plan**

### **1. Backend Changes**

#### **A. Docker Compose Integration**
- Add SuperTokens core service to `docker-compose.yml`
- Add SuperTokens PostgreSQL service (or use existing PostgreSQL if available)
- Configure environment variables for SuperTokens
- Set up proper networking between services

#### **B. Database Schema Modifications**
- **New Tables Required:**
  - `users` table: Store user information (id, email, created_at, etc.)
  - **Modify existing tables:**
    - `library` table: Add `user_id` foreign key to link cards to users
    - `scanned_cards` table (if exists): Add `user_id` foreign key
- **Migration Strategy:** 
  - Create new schema with user relationships
  - Handle existing hardcoded user data migration

#### **C. API Endpoint Updates**
- **Authentication Middleware:** Protect library-related endpoints
- **User Context:** Extract user ID from SuperTokens session in protected routes
- **Modified Endpoints:**
  - `POST /api/library` - Add user_id from session
  - `GET /api/library` - Filter by user_id from session
  - `POST /api/scan` - Optionally associate with user_id

#### **D. SuperTokens Backend Integration**
- Install SuperTokens Python SDK
- Configure SuperTokens with email OTP recipe
- Set up session management
- Implement protected route middleware

### **2. Frontend Changes**

#### **A. SuperTokens React SDK Integration**
- Install `supertokens-auth-react` package
- Configure SuperTokens frontend with email OTP recipe
- Set up SuperTokens provider in app root

#### **B. New Authentication Components**
- **SignIn Component:** Email input + OTP input + code request
- **Session Management:** Handle user sessions and authentication state
- **Protected Routes:** Wrap library and scanning features behind auth
- **User Menu:** Sign out functionality and user info display

#### **C. UI Flow Modifications**
- **Pre-Auth State:** Show sign-in option prominently
- **Post-Auth State:** Show user info and sign-out option
- **Library Access:** Only show library button after authentication
- **Card Operations:** Associate all card operations with authenticated user

#### **D. State Management Updates**
- **User Context:** Manage authentication state globally
- **Library State:** Filter library data by current user
- **Session Persistence:** Handle page refreshes and session restoration

### **3. Implementation Phases**

#### **Phase 1: Backend Foundation**
1. Add SuperTokens to docker-compose
2. Create database migration scripts
3. Install and configure SuperTokens backend SDK
4. Create authentication middleware

#### **Phase 2: Frontend Foundation**
1. Install SuperTokens React SDK
2. Create authentication components
3. Set up SuperTokens provider
4. Implement basic sign-in flow

#### **Phase 3: Integration**
1. Update API endpoints with user context
2. Modify frontend to use authenticated endpoints
3. Implement session management
4. Add user-specific library filtering

#### **Phase 4: Testing & Polish**
1. Test authentication flow end-to-end
2. Test user isolation (users can't see each other's cards)
3. Test session persistence
4. UI/UX refinements

### **4. Technical Considerations**

#### **A. Security**
- All library operations require valid SuperTokens session
- User data isolation enforced at database level
- Session tokens handled securely by SuperTokens

#### **B. User Experience**
- Seamless authentication flow with email OTP
- Clear indication of authentication status
- Graceful handling of expired sessions

#### **C. Data Migration**
- Strategy for existing hardcoded user data
- Backward compatibility during transition
- User data preservation

### **5. Configuration Requirements**

#### **A. Environment Variables**
- SuperTokens API keys
- Database connection strings
- Frontend domain configuration
- Email service configuration (for OTP delivery)

#### **B. Docker Services**
- SuperTokens core service
- PostgreSQL service (if not existing)
- Proper volume mounts for data persistence

### **6. Testing Strategy**
- Unit tests for authentication middleware
- Integration tests for user isolation
- End-to-end tests for complete auth flow
- Security testing for user data isolation

## **Benefits of This Approach**

This plan leverages SuperTokens' built-in email OTP functionality while maintaining your existing card scanning and library features. The key benefit is that SuperTokens handles all the complex authentication logic (OTP generation, session management, security) while we focus on integrating it with your existing card management system.

## **References**

- [SuperTokens Website](https://supertokens.com/)
- SuperTokens Docker container
- SuperTokens React SDK
- SuperTokens Python SDK

## **Example of Self-Hosted SuperTokens docker-compose reference file

```
version: '3'

services:
  # Note: If you are assigning a custom name to your db service on the line below, make sure it does not contain underscores
  db:
    image: 'postgres:latest'
    environment:
      POSTGRES_USER: supertokens_user 
      POSTGRES_PASSWORD: somePassword 
      POSTGRES_DB: supertokens
    ports:
      - 5432:5432
    networks:
      - app_network
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'pg_isready', '-U', 'supertokens_user', '-d', 'supertokens']
      interval: 5s
      timeout: 5s
      retries: 5

  supertokens:
    image: registry.supertokens.io/supertokens/supertokens-postgresql:latest
    depends_on:
      db:
        condition: service_healthy
    ports:
      - 3567:3567
    environment:
      POSTGRESQL_CONNECTION_URI: "postgresql://supertokens_user:somePassword@db:5432/supertokens"
    networks:
      - app_network
    restart: unless-stopped
    healthcheck:
      test: >
        bash -c 'exec 3<>/dev/tcp/127.0.0.1/3567 && echo -e "GET /hello HTTP/1.1\r\nhost: 127.0.0.1:3567\r\nConnection: close\r\n\r\n" >&3 && cat <&3 | grep "Hello"'
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  app_network:
    driver: bridge

```
