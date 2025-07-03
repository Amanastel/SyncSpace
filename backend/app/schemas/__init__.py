from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# User schemas
class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class User(UserBase):
    id: int
    avatar_url: Optional[str] = None
    is_active: bool
    is_online: bool
    last_seen: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class UserPresence(BaseModel):
    user_id: int
    status: str
    last_activity: datetime
    socket_id: Optional[str] = None

    class Config:
        from_attributes = True


# Team schemas
class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_public: bool = True


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    avatar_url: Optional[str] = None


class Team(TeamBase):
    id: int
    avatar_url: Optional[str] = None
    created_by: int
    created_at: datetime
    members: List[User] = []

    class Config:
        from_attributes = True


# Channel schemas
class ChannelBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_private: bool = False


class ChannelCreate(ChannelBase):
    team_id: int


class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None


class Channel(ChannelBase):
    id: int
    team_id: int
    created_by: int
    created_at: datetime
    members: List[User] = []

    class Config:
        from_attributes = True


# Message schemas
class MessageBase(BaseModel):
    content: str
    message_type: str = "text"
    file_url: Optional[str] = None


class MessageCreate(MessageBase):
    channel_id: Optional[int] = None
    parent_message_id: Optional[int] = None


class MessageUpdate(BaseModel):
    content: str


class Message(MessageBase):
    id: int
    channel_id: Optional[int]
    sender_id: int
    parent_message_id: Optional[int] = None
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    created_at: datetime
    sender: User

    class Config:
        from_attributes = True


# Direct Message schemas
class DirectMessageCreate(MessageBase):
    receiver_id: int


class DirectMessage(MessageBase):
    id: int
    sender_id: int
    receiver_id: int
    is_read: bool = False
    read_at: Optional[datetime] = None
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    created_at: datetime
    sender: User
    receiver: User

    class Config:
        from_attributes = True


# Authentication schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class UserLogin(BaseModel):
    username: str
    password: str


# WebSocket schemas
class WebSocketMessage(BaseModel):
    type: str  # message, join_channel, leave_channel, typing, etc.
    data: dict


class ChatMessage(BaseModel):
    message_id: int
    content: str
    sender: User
    channel_id: Optional[int] = None
    receiver_id: Optional[int] = None
    message_type: str = "text"
    created_at: datetime


# Search schemas
class SearchQuery(BaseModel):
    query: str
    channel_id: Optional[int] = None
    user_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SearchResult(BaseModel):
    messages: List[Message]
    total_count: int
    page: int
    per_page: int
