from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Channel, User, Team, channel_members, team_members
from app.schemas import ChannelCreate, ChannelUpdate, Channel as ChannelSchema, User as UserSchema
from app.auth import get_current_active_user

router = APIRouter(prefix="/channels", tags=["channels"])


@router.post("/", response_model=ChannelSchema)
async def create_channel(
    channel: ChannelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new channel"""
    # Check if user is team member
    is_member = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == channel.team_id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a team member")
    
    # Check if channel name already exists in team
    existing_channel = db.query(Channel).filter(
        Channel.name == channel.name,
        Channel.team_id == channel.team_id
    ).first()
    
    if existing_channel:
        raise HTTPException(status_code=400, detail="Channel name already exists")
    
    db_channel = Channel(
        name=channel.name,
        description=channel.description,
        is_private=channel.is_private,
        team_id=channel.team_id,
        created_by=current_user.id
    )
    
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)
    
    # Add creator as member
    db.execute(
        channel_members.insert().values(
            user_id=current_user.id,
            channel_id=db_channel.id
        )
    )
    db.commit()
    
    return db_channel


@router.get("/team/{team_id}", response_model=List[ChannelSchema])
async def get_team_channels(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all channels for a team"""
    # Check if user is team member
    is_member = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == team_id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a team member")
    
    # Get public channels and private channels user is member of
    public_channels = db.query(Channel).filter(
        Channel.team_id == team_id,
        Channel.is_private == False
    ).all()
    
    private_channels = db.query(Channel).join(channel_members).filter(
        Channel.team_id == team_id,
        Channel.is_private == True,
        channel_members.c.user_id == current_user.id
    ).all()
    
    return public_channels + private_channels


@router.get("/{channel_id}", response_model=ChannelSchema)
async def get_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific channel details"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check access permissions
    if channel.is_private:
        is_member = db.query(channel_members).filter(
            channel_members.c.user_id == current_user.id,
            channel_members.c.channel_id == channel_id
        ).first()
        
        if not is_member:
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        # Check if user is team member for public channels
        is_team_member = db.query(team_members).filter(
            team_members.c.user_id == current_user.id,
            team_members.c.team_id == channel.team_id
        ).first()
        
        if not is_team_member:
            raise HTTPException(status_code=403, detail="Not a team member")
    
    return channel


@router.put("/{channel_id}", response_model=ChannelSchema)
async def update_channel(
    channel_id: int,
    channel_update: ChannelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update channel details"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if user is creator or team admin
    is_creator = channel.created_by == current_user.id
    is_admin = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == channel.team_id,
        team_members.c.role == "admin"
    ).first()
    
    if not (is_creator or is_admin):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Update channel
    for field, value in channel_update.dict(exclude_unset=True).items():
        setattr(channel, field, value)
    
    db.commit()
    db.refresh(channel)
    
    return channel


@router.post("/{channel_id}/join")
async def join_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Join a channel"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if user is team member
    is_team_member = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == channel.team_id
    ).first()
    
    if not is_team_member:
        raise HTTPException(status_code=403, detail="Not a team member")
    
    # Can't join private channels without invitation
    if channel.is_private:
        raise HTTPException(status_code=403, detail="Cannot join private channel")
    
    # Check if already member
    existing_member = db.query(channel_members).filter(
        channel_members.c.user_id == current_user.id,
        channel_members.c.channel_id == channel_id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="Already a member")
    
    # Add member
    db.execute(
        channel_members.insert().values(
            user_id=current_user.id,
            channel_id=channel_id
        )
    )
    db.commit()
    
    return {"message": "Joined channel successfully"}


@router.post("/{channel_id}/leave")
async def leave_channel(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Leave a channel"""
    result = db.execute(
        channel_members.delete().where(
            channel_members.c.user_id == current_user.id,
            channel_members.c.channel_id == channel_id
        )
    )
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Not a member of this channel")
    
    db.commit()
    
    return {"message": "Left channel successfully"}


@router.post("/{channel_id}/members/{user_id}")
async def add_channel_member(
    channel_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add member to channel (for private channels)"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check if current user can add members
    is_creator = channel.created_by == current_user.id
    is_admin = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == channel.team_id,
        team_members.c.role == "admin"
    ).first()
    
    if not (is_creator or is_admin):
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Check if target user is team member
    is_team_member = db.query(team_members).filter(
        team_members.c.user_id == user_id,
        team_members.c.team_id == channel.team_id
    ).first()
    
    if not is_team_member:
        raise HTTPException(status_code=400, detail="User is not a team member")
    
    # Check if already member
    existing_member = db.query(channel_members).filter(
        channel_members.c.user_id == user_id,
        channel_members.c.channel_id == channel_id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="User already a member")
    
    # Add member
    db.execute(
        channel_members.insert().values(
            user_id=user_id,
            channel_id=channel_id
        )
    )
    db.commit()
    
    return {"message": "Member added successfully"}


@router.get("/{channel_id}/members", response_model=List[UserSchema])
async def get_channel_members(
    channel_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all channel members"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check access permissions
    if channel.is_private:
        is_member = db.query(channel_members).filter(
            channel_members.c.user_id == current_user.id,
            channel_members.c.channel_id == channel_id
        ).first()
        
        if not is_member:
            raise HTTPException(status_code=403, detail="Access denied")
    
    members = db.query(User).join(channel_members).filter(
        channel_members.c.channel_id == channel_id
    ).all()
    
    return members
