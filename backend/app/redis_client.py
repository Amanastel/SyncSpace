import redis
from app.config import settings

# Redis connection
redis_client = redis.from_url(settings.redis_url, decode_responses=True)


class PresenceManager:
    def __init__(self):
        self.redis = redis_client
        
    async def set_user_online(self, user_id: int, socket_id: str):
        """Set user as online with socket ID"""
        await self.redis.hset(f"user_presence:{user_id}", mapping={
            "status": "online",
            "socket_id": socket_id,
            "last_activity": str(int(time.time()))
        })
        await self.redis.sadd("online_users", user_id)
        
    async def set_user_offline(self, user_id: int):
        """Set user as offline"""
        await self.redis.hset(f"user_presence:{user_id}", "status", "offline")
        await self.redis.srem("online_users", user_id)
        
    async def get_user_presence(self, user_id: int):
        """Get user presence status"""
        presence = await self.redis.hgetall(f"user_presence:{user_id}")
        return presence if presence else {"status": "offline"}
        
    async def get_online_users(self):
        """Get list of online users"""
        return await self.redis.smembers("online_users")
        
    async def update_user_activity(self, user_id: int):
        """Update user's last activity timestamp"""
        await self.redis.hset(f"user_presence:{user_id}", "last_activity", str(int(time.time())))


class CacheManager:
    def __init__(self):
        self.redis = redis_client
        
    async def cache_message(self, channel_id: int, message_data: dict, ttl: int = 3600):
        """Cache recent messages for a channel"""
        await self.redis.lpush(f"channel_messages:{channel_id}", str(message_data))
        await self.redis.expire(f"channel_messages:{channel_id}", ttl)
        
    async def get_cached_messages(self, channel_id: int, limit: int = 50):
        """Get cached messages for a channel"""
        messages = await self.redis.lrange(f"channel_messages:{channel_id}", 0, limit - 1)
        return [eval(msg) for msg in messages]  # In production, use proper JSON serialization
        
    async def cache_user_channels(self, user_id: int, channels: list, ttl: int = 1800):
        """Cache user's channels"""
        await self.redis.setex(f"user_channels:{user_id}", ttl, str(channels))
        
    async def get_cached_user_channels(self, user_id: int):
        """Get cached user channels"""
        channels = await self.redis.get(f"user_channels:{user_id}")
        return eval(channels) if channels else None


# Global instances
presence_manager = PresenceManager()
cache_manager = CacheManager()

import time
