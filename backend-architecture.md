# Backend Architecture Documentation

## Overview
The Pokemon Scanner backend is a FastAPI application that provides card scanning, library management, and authentication services. It uses SuperTokens for passwordless email OTP authentication and integrates with a SQLite database for card storage.

## Technology Stack

### Core Technologies
- **FastAPI** - Modern Python web framework
- **Python 3.x** - Runtime environment
- **SQLite** - Lightweight database for card storage
- **SuperTokens** - Authentication framework
- **PIL (Pillow)** - Image processing library
- **Pandas** - Data manipulation for card similarity

### Key Dependencies
- **supertokens-python** - Backend authentication SDK
- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **PIL** - Image processing
- **pandas** - Data analysis

## Project Structure

```
backend/
├── api.py                    # Main FastAPI application
├── supertokens_config.py    # SuperTokens configuration
├── image_similarity.py      # Image similarity algorithms
├── ocr.py                   # OCR functionality
├── migrations.py            # Database migrations
├── pokemon_cards.db         # SQLite database
├── card_names.csv           # Card data source
├── embedding_cache/         # Cached image embeddings
├── pyproject.toml           # Python dependencies
├── uv.lock                  # Locked dependency versions
└── Dockerfile               # Container configuration
```

## Architecture Patterns

### 1. Application Lifecycle Management
- **Lifespan Context Manager** - SuperTokens initialization during FastAPI startup
- **Proper Logging Setup** - Configured before any imports for Docker compatibility
- **Error Handling** - Comprehensive exception handling with detailed logging

### 2. Authentication Architecture
- **SuperTokens Integration** - Passwordless email OTP authentication
- **Middleware Approach** - `app.add_middleware(get_middleware())` for automatic endpoint creation
- **Session Management** - Automatic session handling through SuperTokens

### 3. Database Architecture
- **SQLite Database** - Lightweight, file-based storage
- **Thread-Safe Operations** - Database operations wrapped in threading for safety
- **Automatic Table Creation** - Tables created on startup if they don't exist

## Key Components Deep Dive

### 1. api.py - Main Application
```python
@asynccontextmanager
async def lifespan(app):
    # Initialize SuperTokens during startup
    from supertokens_config import init_supertokens
    init_supertokens()
```

**Responsibilities:**
- FastAPI application setup
- SuperTokens initialization
- Middleware configuration
- Route registration
- Exception handling

### 2. supertokens_config.py - Authentication Configuration
```python
def init_supertokens():
    init(
        app_info=InputAppInfo(
            app_name="Pokemon Card Scanner",
            api_domain="localhost:8000",
            website_domain="localhost:8080",
            api_base_path="/auth",
            website_base_path="/auth"
        ),
        recipe_list=[
            session.init(),
            passwordless.init(
                flow_type="USER_INPUT_CODE",
                contact_config=ContactEmailOnlyConfig()
            )
        ]
    )
```

**Responsibilities:**
- SuperTokens initialization
- Passwordless OTP configuration
- Session management setup
- Environment-based configuration

### 3. Authentication Endpoints
The backend automatically creates these SuperTokens endpoints:
- **`/auth/signinup`** - OTP sending and verification
- **`/auth/session`** - Session management
- **`/auth/signout`** - User sign out

**Custom Endpoint:**
- **`/sessioninfo`** - Custom session information using SuperTokens verification

### 4. API Endpoints
```python
api_router = APIRouter(prefix="/v1/api")

# Card scanning
@api_router.post('/scan-card')
async def scan_card(image: UploadFile)

# Library management
@api_router.get('/library')
async def get_library(s: SessionContainer = Depends(verify_session()))

@api_router.post('/library/add')
async def add_to_library(card_id: str, s: SessionContainer = Depends(verify_session()))

# Card data
@api_router.get('/card/{card_id}')
async def get_card(card_id: str)

# Health check
@api_router.get("/health")
async def health_check()
```

## Data Flow

### 1. Authentication Flow
```
Frontend Request → Nginx → FastAPI → SuperTokens Middleware → SuperTokens Core → Response
```

### 2. Card Scanning Flow
```
Image Upload → FastAPI → Image Processing → Similarity Search → Database Query → Results
```

### 3. Library Management Flow
```
Authenticated Request → Session Verification → Database Operation → Response
```

## Database Schema

### 1. pokemon_cards Table
- **id** - Primary key
- **name** - Card name
- **image_large** - Card image URL
- **set_name** - Card set information
- **rarity** - Card rarity
- **artist** - Card artist
- **hp** - Hit points
- **types** - Card types
- **attacks** - Attack information
- **abilities** - Special abilities

### 2. user_library Table
- **id** - Auto-increment primary key
- **user_id** - SuperTokens user ID
- **card_id** - Reference to pokemon_cards.id
- **added_date** - Timestamp when card was added
- **UNIQUE(user_id, card_id)** - Prevents duplicate entries

## Security Features

### 1. Authentication Security
- **Passwordless OTP** - Time-limited one-time passwords
- **Session Management** - Secure session handling through SuperTokens
- **Route Protection** - Protected endpoints using `verify_session()` dependency

### 2. Data Security
- **Input Validation** - FastAPI automatic request validation
- **SQL Injection Protection** - Parameterized queries
- **Error Handling** - No sensitive information leaked in error messages

## Performance Considerations

### 1. Image Processing
- **Embedding Caching** - Image embeddings cached for similarity search
- **Async Operations** - Non-blocking image processing
- **Memory Management** - Proper cleanup of image data

### 2. Database Operations
- **Connection Management** - Proper connection handling and cleanup
- **Indexing** - Database indexes on frequently queried fields
- **Thread Safety** - Database operations wrapped in threading for safety

## Error Handling Strategy

### 1. Global Exception Handlers
```python
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError)

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception)
```

### 2. Logging Strategy
- **Structured Logging** - Consistent log format across the application
- **Error Tracking** - Full traceback logging for debugging
- **Docker Compatibility** - Logs sent to stderr for proper container capture

## Deployment Configuration

### 1. Docker Configuration
- **Multi-stage Build** - Optimized container images
- **Health Checks** - Service health monitoring
- **Volume Mounts** - Persistent data storage
- **Network Configuration** - Docker network for service communication

### 2. Environment Variables
- **SUPERTOKENS_CONNECTION_URI** - SuperTokens core connection
- **PYTHONUNBUFFERED** - Python output buffering disabled
- **PYTHONDONTWRITEBYTECODE** - No .pyc files generated

## Integration Points

### 1. Frontend Integration
- **RESTful API** - Standard HTTP endpoints
- **CORS Configuration** - Handled at nginx level
- **Session Cookies** - Automatic cookie management through SuperTokens

### 2. External Services
- **SuperTokens Core** - Authentication service
- **PostgreSQL** - SuperTokens metadata storage
- **Nginx** - Reverse proxy and load balancer

## Monitoring and Observability

### 1. Health Checks
- **`/v1/api/health`** - Application health endpoint
- **Docker Health Checks** - Container-level health monitoring
- **SuperTokens Health** - Authentication service health

### 2. Logging
- **Request Logging** - All API requests logged with details
- **Error Logging** - Comprehensive error tracking
- **Performance Logging** - Operation timing and resource usage

## Future Enhancements

### 1. Performance Improvements
- **Database Connection Pooling** - Better database connection management
- **Redis Caching** - Session and data caching
- **Async Database Operations** - Non-blocking database queries

### 2. Scalability
- **Microservices Architecture** - Split into smaller, focused services
- **Message Queues** - Asynchronous processing for heavy operations
- **Load Balancing** - Multiple backend instances

### 3. Security Enhancements
- **Rate Limiting** - API request throttling
- **Input Sanitization** - Enhanced input validation
- **Audit Logging** - Comprehensive security event tracking

## Conclusion

The Pokemon Scanner backend follows modern Python development practices with a clean, maintainable architecture. The use of FastAPI, SuperTokens, and proper error handling provides a solid foundation for authentication and card management services. The application successfully balances simplicity with functionality, making it easy to understand and extend.
