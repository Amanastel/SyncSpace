from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import User
from app.schemas import User as UserSchema, UserPresence
from app.auth import get_current_active_user
from app.redis_client import presence_manager

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserSchema)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user profile"""
    return current_user


@router.get("/", response_model=List[UserSchema])
async def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all users (for mentions, etc.)"""
    users = db.query(User).filter(User.is_active == True).all()
    return users


@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific user details"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.get("/{user_id}/presence", response_model=UserPresence)
async def get_user_presence(
    user_id: int,
    current_user: User = Depends(get_current_active_user)
):
    """Get user presence status"""
    presence = await presence_manager.get_user_presence(user_id)
    return UserPresence(
        user_id=user_id,
        status=presence.get("status", "offline"),
        last_activity=presence.get("last_activity"),
        socket_id=presence.get("socket_id")
    )


@router.get("/online/list", response_model=List[int])
async def get_online_users(
    current_user: User = Depends(get_current_active_user)
):
    """Get list of online user IDs"""
    online_users = await presence_manager.get_online_users()
    return list(online_users)

from fastapi import HTTPException
