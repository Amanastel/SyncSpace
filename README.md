# SyncSpace - Real-Time Chat Application

A comprehensive real-time team collaboration platform built with FastAPI (backend) and React (frontend).

## 🏗 Architecture Overview

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.11+
- **Database**: MySQL with SQLAlchemy ORM
- **Cache/Presence**: Redis
- **Authentication**: JWT with PyJWT
- **Real-time**: WebSocket connections
- **Deployment**: Docker + Docker Compose

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: React Context + useReducer
- **Real-time**: Socket.IO client
- **Routing**: React Router
- **HTTP Client**: Axios

## 🚀 Features

### Core Features
- ✅ **User Authentication** - JWT-based login/register
- ✅ **Real-time Messaging** - WebSocket-powered chat
- ✅ **Team Management** - Create and manage teams
- ✅ **Channel System** - Public and private channels
- ✅ **Direct Messages** - One-on-one conversations
- ✅ **User Presence** - Online/offline status with Redis
- ✅ **Message History** - Persistent chat history
- ✅ **Search** - Message search with filters
- ✅ **Typing Indicators** - Real-time typing status
- ✅ **Message Actions** - Edit, delete, reply to messages

### Advanced Features
- 🔒 **Security** - JWT authentication, input validation
- 📱 **Responsive Design** - Mobile-friendly UI
- 🔄 **Real-time Updates** - Live user status and notifications
- 🎨 **Modern UI** - Clean, intuitive interface
- 📊 **Scalable Architecture** - Microservices-ready design

## 📋 Prerequisites

- Python 3.11+
- Node.js 16+
- Docker & Docker Compose
- MySQL 8.0+
- Redis 7+

## 🛠 Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SyncSpace
```

### 2. Backend Setup

#### Option A: Using Docker Compose (Recommended)

```bash
cd backend
# Start all services (MySQL, Redis, FastAPI)
docker-compose up -d
```

#### Option B: Local Development

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database and Redis configurations

# Run migrations (if using Alembic)
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API endpoints

# Start the development server
npm start
```

### 4. Database Setup

The application will create tables automatically when you start the backend. Sample data is included in `init.sql`.

**Default Users** (password: `secret123` for all):
- `admin` / `admin@syncspace.com` (Admin user)
- `john_doe` / `john@example.com` (Regular user)
- `jane_smith` / `jane@example.com` (Regular user)

## 🐳 Docker Deployment

### Complete Stack Deployment

```bash
# From the root directory
docker-compose up -d
```

This will start:
- MySQL database on port 3306
- Redis cache on port 6379
- FastAPI backend on port 8000
- React frontend on port 3000 (if included in compose)

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=mysql+pymysql://user:password@localhost:3306/syncspace
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-super-secret-key
CORS_ORIGINS=["http://localhost:3000"]
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000
```

## 📡 API Documentation

Once the backend is running, visit:
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Key Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

#### Teams
- `GET /api/teams` - List user teams
- `POST /api/teams` - Create team
- `GET /api/teams/{id}/members` - Team members

#### Channels
- `GET /api/channels/team/{team_id}` - Team channels
- `POST /api/channels` - Create channel
- `POST /api/channels/{id}/join` - Join channel

#### Messages
- `POST /api/messages/channel` - Send channel message
- `POST /api/messages/direct` - Send direct message
- `GET /api/messages/channel/{id}` - Get channel messages
- `POST /api/messages/search` - Search messages

#### WebSocket
- `WS /ws?token={jwt_token}` - WebSocket connection

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🔧 Development

### Backend Development
- Code is hot-reloaded with `--reload` flag
- API documentation auto-generated
- Database migrations with Alembic

### Frontend Development
- Hot module replacement enabled
- TypeScript for type safety
- ESLint and Prettier configured

## 📊 Database Schema

### Core Tables
- `users` - User accounts and profiles
- `teams` - Team/workspace definitions
- `channels` - Communication channels
- `messages` - Channel messages
- `direct_messages` - Direct messages
- `team_members` - Team membership
- `channel_members` - Channel membership
- `user_presence` - Real-time user status

## 🔐 Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection

## 🚦 Performance Optimizations

- Redis caching for user presence
- Message pagination
- WebSocket connection pooling
- Database indexing
- Efficient database queries

## 📈 Scalability Considerations

- Horizontal scaling ready
- Stateless API design
- Redis for session management
- Docker containerization
- Load balancer friendly

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   # Check if MySQL is running
   docker ps | grep mysql
   
   # Check logs
   docker-compose logs mysql
   ```

2. **WebSocket Connection Failed**
   ```bash
   # Verify backend is running
   curl http://localhost:8000/health
   ```

3. **Frontend Build Errors**
   ```bash
   # Clear cache and reinstall
   npm run clean
   npm install
   ```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🎯 Roadmap

- [ ] File upload and sharing
- [ ] Voice and video calls
- [ ] Mobile applications
- [ ] Advanced message formatting
- [ ] Bot integrations
- [ ] Advanced admin controls
- [ ] Analytics dashboard
- [ ] Multiple team support per user
