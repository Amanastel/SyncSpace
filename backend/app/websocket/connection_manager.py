from fastapi import WebSocket, WebSocketDisconnect, Depends
from typing import Dict, List, Set
import json
import asyncio
from app.auth import get_current_user
from app.models import User
from app.redis_client import presence_manager
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Store active connections: user_id -> set of websockets
        self.active_connections: Dict[int, Set[WebSocket]] = {}
        # Store channel subscriptions: channel_id -> set of user_ids
        self.channel_subscriptions: Dict[int, Set[int]] = {}
        # Store direct message subscriptions: user_id -> set of user_ids
        self.dm_subscriptions: Dict[int, Set[int]] = {}
        # Store websocket to user mapping
        self.websocket_users: Dict[WebSocket, int] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        """Accept websocket connection and add to active connections"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        
        self.active_connections[user_id].add(websocket)
        self.websocket_users[websocket] = user_id
        
        # Set user as online in Redis
        await presence_manager.set_user_online(user_id, str(id(websocket)))
        
        logger.info(f"User {user_id} connected via WebSocket")
        
        # Notify about user coming online
        await self.broadcast_user_status(user_id, "online")
    
    async def disconnect(self, websocket: WebSocket):
        """Remove websocket connection and clean up"""
        user_id = self.websocket_users.get(websocket)
        
        if user_id:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                
                # If no more connections for this user, set as offline
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
                    await presence_manager.set_user_offline(user_id)
                    
                    # Notify about user going offline
                    await self.broadcast_user_status(user_id, "offline")
            
            # Clean up subscriptions
            for channel_id in list(self.channel_subscriptions.keys()):
                if user_id in self.channel_subscriptions[channel_id]:
                    self.channel_subscriptions[channel_id].discard(user_id)
                    if not self.channel_subscriptions[channel_id]:
                        del self.channel_subscriptions[channel_id]
            
            if websocket in self.websocket_users:
                del self.websocket_users[websocket]
            
            logger.info(f"User {user_id} disconnected from WebSocket")
    
    async def send_personal_message(self, message: str, user_id: int):
        """Send message to specific user"""
        if user_id in self.active_connections:
            disconnected_websockets = []
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_text(message)
                except Exception as e:
                    logger.error(f"Error sending message to user {user_id}: {e}")
                    disconnected_websockets.append(websocket)
            
            # Clean up disconnected websockets
            for websocket in disconnected_websockets:
                await self.disconnect(websocket)
    
    async def broadcast_to_channel(self, message: str, channel_id: int):
        """Broadcast message to all users in a channel"""
        if channel_id in self.channel_subscriptions:
            for user_id in self.channel_subscriptions[channel_id]:
                await self.send_personal_message(message, user_id)
    
    async def broadcast_user_status(self, user_id: int, status: str):
        """Broadcast user status change to all connected users"""
        message = json.dumps({
            "type": "user_status",
            "data": {
                "user_id": user_id,
                "status": status
            }
        })
        
        for connected_user_id in self.active_connections.keys():
            if connected_user_id != user_id:
                await self.send_personal_message(message, connected_user_id)
    
    async def subscribe_to_channel(self, user_id: int, channel_id: int):
        """Subscribe user to channel updates"""
        if channel_id not in self.channel_subscriptions:
            self.channel_subscriptions[channel_id] = set()
        
        self.channel_subscriptions[channel_id].add(user_id)
        logger.info(f"User {user_id} subscribed to channel {channel_id}")
    
    async def unsubscribe_from_channel(self, user_id: int, channel_id: int):
        """Unsubscribe user from channel updates"""
        if channel_id in self.channel_subscriptions:
            self.channel_subscriptions[channel_id].discard(user_id)
            if not self.channel_subscriptions[channel_id]:
                del self.channel_subscriptions[channel_id]
        
        logger.info(f"User {user_id} unsubscribed from channel {channel_id}")
    
    async def handle_message(self, websocket: WebSocket, data: dict):
        """Handle incoming WebSocket messages"""
        user_id = self.websocket_users.get(websocket)
        if not user_id:
            return
        
        message_type = data.get("type")
        
        if message_type == "join_channel":
            channel_id = data.get("channel_id")
            if channel_id:
                await self.subscribe_to_channel(user_id, channel_id)
        
        elif message_type == "leave_channel":
            channel_id = data.get("channel_id")
            if channel_id:
                await self.unsubscribe_from_channel(user_id, channel_id)
        
        elif message_type == "typing":
            channel_id = data.get("channel_id")
            if channel_id:
                typing_message = json.dumps({
                    "type": "typing",
                    "data": {
                        "user_id": user_id,
                        "channel_id": channel_id,
                        "typing": data.get("typing", False)
                    }
                })
                await self.broadcast_to_channel(typing_message, channel_id)
        
        elif message_type == "ping":
            # Update user activity
            await presence_manager.update_user_activity(user_id)
            await websocket.send_text(json.dumps({"type": "pong"}))


# Global connection manager instance
manager = ConnectionManager()


async def get_websocket_user(websocket: WebSocket, token: str):
    """Get user from WebSocket token"""
    try:
        from app.auth import verify_token
        from app.database import SessionLocal
        from fastapi import HTTPException
        
        credentials_exception = HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )
        
        token_data = verify_token(token, credentials_exception)
        
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == token_data.username).first()
            if user is None:
                raise credentials_exception
            return user
        finally:
            db.close()
    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        await websocket.close(code=4001)
        return None
