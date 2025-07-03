# SyncSpace - System Design Document

## High-Level Architecture

### Overview
SyncSpace is a real-time team collaboration platform designed to handle millions of concurrent users across different time zones. The system follows a microservices-ready architecture with clear separation of concerns.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   FastAPI       │    │   MySQL         │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         │              │   (Cache &      │              │
         └──────────────┤    Presence)    │──────────────┘
                        └─────────────────┘
```

## Components and Data Flow

### 1. Frontend (React.js)
- **Purpose**: User interface and real-time interactions
- **Technology**: React 18, TypeScript, Material-UI
- **Key Features**:
  - Real-time chat interface
  - User authentication forms
  - Team and channel management
  - WebSocket client for live updates

### 2. Backend (FastAPI)
- **Purpose**: API server and business logic
- **Technology**: Python 3.11+, FastAPI, SQLAlchemy
- **Key Features**:
  - REST API endpoints
  - WebSocket server for real-time communication
  - JWT authentication
  - Message validation and processing

### 3. Database (MySQL)
- **Purpose**: Persistent data storage
- **Technology**: MySQL 8.0 with InnoDB engine
- **Key Features**:
  - ACID compliance
  - Complex relationships
  - Full-text search capabilities
  - Horizontal scaling ready

### 4. Cache & Presence (Redis)
- **Purpose**: Real-time user status and caching
- **Technology**: Redis 7.0
- **Key Features**:
  - User presence tracking
  - Session management
  - Message caching
  - Pub/Sub for notifications

## Database Schema Design

### Core Entities

#### Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### Teams Table
```sql
CREATE TABLE teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(255),
    is_public BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### Channels Table
```sql
CREATE TABLE channels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    team_id INT NOT NULL,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### Messages Table
```sql
CREATE TABLE messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    file_url VARCHAR(255),
    channel_id INT,
    sender_id INT NOT NULL,
    parent_message_id INT,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (channel_id) REFERENCES channels(id),
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (parent_message_id) REFERENCES messages(id),
    FULLTEXT(content)
);
```

### Relationship Tables

#### Team Members
```sql
CREATE TABLE team_members (
    user_id INT,
    team_id INT,
    role VARCHAR(50) DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, team_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);
```

#### Channel Members
```sql
CREATE TABLE channel_members (
    user_id INT,
    channel_id INT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, channel_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (channel_id) REFERENCES channels(id)
);
```

## Security Implementation

### 1. Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access**: Team and channel-level permissions
- **Token Expiration**: Configurable token lifetime

```python
# JWT Token Creation
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

### 2. Data Protection
- **Input Validation**: Pydantic models for request validation
- **SQL Injection Prevention**: SQLAlchemy ORM
- **XSS Protection**: Content sanitization
- **CORS Configuration**: Restricted origins

### 3. Transport Security
- **HTTPS**: TLS encryption in production
- **WebSocket Security**: WSS with token authentication
- **Rate Limiting**: Request throttling (can be added)

## Cost Optimization Strategies

### 1. Infrastructure Optimization
- **Containerization**: Docker for efficient resource usage
- **Auto-scaling**: Horizontal scaling based on load
- **CDN**: Static asset distribution
- **Load Balancing**: Distribute traffic efficiently

### 2. Database Optimization
- **Indexing Strategy**:
  ```sql
  -- Message retrieval optimization
  CREATE INDEX idx_messages_channel_created ON messages(channel_id, created_at DESC);
  
  -- User lookup optimization
  CREATE INDEX idx_users_username ON users(username);
  CREATE INDEX idx_users_email ON users(email);
  
  -- Team membership optimization
  CREATE INDEX idx_team_members_user ON team_members(user_id);
  CREATE INDEX idx_team_members_team ON team_members(team_id);
  ```

- **Query Optimization**:
  - Pagination for message history
  - Efficient JOIN operations
  - Connection pooling

### 3. Caching Strategy
- **Redis Caching**:
  ```python
  # User presence caching
  redis.hset(f"user_presence:{user_id}", {
      "status": "online",
      "last_activity": timestamp,
      "socket_id": socket_id
  })
  
  # Recent messages caching
  redis.lpush(f"channel_messages:{channel_id}", message_data)
  redis.expire(f"channel_messages:{channel_id}", 3600)  # 1 hour TTL
  ```

- **Application-level Caching**:
  - User session data
  - Channel membership
  - Recent message history

### 4. Performance Monitoring
- **Metrics Collection**:
  - Response times
  - Database query performance
  - WebSocket connection counts
  - Memory usage patterns

## Scalability Architecture

### 1. Horizontal Scaling
```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   API Gateway   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
    ┌─────▼─────┐          ┌─────▼─────┐
    │ FastAPI   │          │ FastAPI   │
    │ Instance 1│          │ Instance 2│
    └─────┬─────┘          └─────┬─────┘
          │                      │
          └──────────┬───────────┘
                     │
            ┌────────▼────────┐
            │   Shared Redis  │
            │   & MySQL       │
            └─────────────────┘
```

### 2. Database Scaling
- **Read Replicas**: Separate read/write operations
- **Sharding**: Horizontal partitioning by team_id
- **Connection Pooling**: Efficient connection management

### 3. WebSocket Scaling
- **Sticky Sessions**: Route users to same server
- **Message Broadcasting**: Redis Pub/Sub for multi-instance
- **Connection Limits**: Per-instance connection management

## Real-Time Communication Flow

### 1. WebSocket Connection
```python
# Server-side WebSocket handler
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await authenticate_websocket(token)
    await manager.connect(websocket, user.id)
    
    try:
        while True:
            data = await websocket.receive_text()
            await handle_message(websocket, data)
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
```

### 2. Message Broadcasting
```python
# Broadcast to channel members
async def broadcast_to_channel(channel_id: int, message: dict):
    members = await get_channel_members(channel_id)
    for member_id in members:
        await connection_manager.send_to_user(member_id, message)
```

### 3. Presence Management
```python
# Update user presence
async def update_presence(user_id: int, status: str):
    await redis.hset(f"presence:{user_id}", {
        "status": status,
        "timestamp": time.time(),
        "socket_id": connection_id
    })
    
    # Notify connected users
    await broadcast_presence_update(user_id, status)
```

## Deployment Strategy

### 1. Development Environment
```bash
# Local development with hot reload
docker-compose -f docker-compose.dev.yml up
```

### 2. Production Environment
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d
```

### 3. CI/CD Pipeline
1. **Testing**: Automated tests on pull requests
2. **Building**: Docker image creation
3. **Deployment**: Rolling updates with zero downtime
4. **Monitoring**: Health checks and alerting

## Monitoring and Observability

### 1. Application Metrics
- Request/response times
- Error rates
- WebSocket connection counts
- Database query performance

### 2. Infrastructure Metrics
- CPU and memory usage
- Network I/O
- Database connections
- Redis memory usage

### 3. Business Metrics
- Active users
- Message volume
- Channel activity
- User engagement

This architecture provides a solid foundation for a scalable, secure, and cost-effective real-time chat application that can handle millions of users while maintaining high performance and reliability.
