from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, and_
from typing import List, Optional
from app.database import get_db
from app.models import Message, DirectMessage, User, Channel, channel_members, team_members
from app.schemas import (
    MessageCreate, MessageUpdate, Message as MessageSchema,
    DirectMessageCreate, DirectMessage as DirectMessageSchema,
    SearchQuery, SearchResult
)
from app.auth import get_current_active_user

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("/channel", response_model=MessageSchema)
async def send_channel_message(
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send message to a channel"""
    if not message.channel_id:
        raise HTTPException(status_code=400, detail="Channel ID required")
    
    # Check if user is channel member
    channel = db.query(Channel).filter(Channel.id == message.channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check permissions
    if channel.is_private:
        is_member = db.query(channel_members).filter(
            channel_members.c.user_id == current_user.id,
            channel_members.c.channel_id == message.channel_id
        ).first()
        
        if not is_member:
            raise HTTPException(status_code=403, detail="Not a channel member")
    else:
        # Check if user is team member for public channels
        is_team_member = db.query(team_members).filter(
            team_members.c.user_id == current_user.id,
            team_members.c.team_id == channel.team_id
        ).first()
        
        if not is_team_member:
            raise HTTPException(status_code=403, detail="Not a team member")
    
    db_message = Message(
        content=message.content,
        message_type=message.message_type,
        file_url=message.file_url,
        channel_id=message.channel_id,
        sender_id=current_user.id,
        parent_message_id=message.parent_message_id
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return db_message


@router.post("/direct", response_model=DirectMessageSchema)
async def send_direct_message(
    message: DirectMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Send direct message to a user"""
    # Check if receiver exists
    receiver = db.query(User).filter(User.id == message.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    db_message = DirectMessage(
        content=message.content,
        message_type=message.message_type,
        file_url=message.file_url,
        sender_id=current_user.id,
        receiver_id=message.receiver_id
    )
    
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    
    return db_message


@router.get("/channel/{channel_id}", response_model=List[MessageSchema])
async def get_channel_messages(
    channel_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get messages from a channel with pagination"""
    channel = db.query(Channel).filter(Channel.id == channel_id).first()
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Check permissions
    if channel.is_private:
        is_member = db.query(channel_members).filter(
            channel_members.c.user_id == current_user.id,
            channel_members.c.channel_id == channel_id
        ).first()
        
        if not is_member:
            raise HTTPException(status_code=403, detail="Not a channel member")
    else:
        # Check if user is team member for public channels
        is_team_member = db.query(team_members).filter(
            team_members.c.user_id == current_user.id,
            team_members.c.team_id == channel.team_id
        ).first()
        
        if not is_team_member:
            raise HTTPException(status_code=403, detail="Not a team member")
    
    offset = (page - 1) * per_page
    messages = db.query(Message).filter(
        Message.channel_id == channel_id
    ).order_by(desc(Message.created_at)).offset(offset).limit(per_page).all()
    
    return messages


@router.get("/direct/{user_id}", response_model=List[DirectMessageSchema])
async def get_direct_messages(
    user_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get direct messages between current user and another user"""
    offset = (page - 1) * per_page
    
    messages = db.query(DirectMessage).filter(
        or_(
            and_(DirectMessage.sender_id == current_user.id, DirectMessage.receiver_id == user_id),
            and_(DirectMessage.sender_id == user_id, DirectMessage.receiver_id == current_user.id)
        )
    ).order_by(desc(DirectMessage.created_at)).offset(offset).limit(per_page).all()
    
    return messages


@router.put("/{message_id}", response_model=MessageSchema)
async def update_message(
    message_id: int,
    message_update: MessageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a message (edit)"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user is the sender
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")
    
    message.content = message_update.content
    message.is_edited = True
    message.edited_at = func.now()
    
    db.commit()
    db.refresh(message)
    
    return message


@router.delete("/{message_id}")
async def delete_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a message"""
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user is the sender or admin
    if message.sender_id != current_user.id:
        # Check if user is channel admin or team admin
        channel = db.query(Channel).filter(Channel.id == message.channel_id).first()
        is_admin = db.query(team_members).filter(
            team_members.c.user_id == current_user.id,
            team_members.c.team_id == channel.team_id,
            team_members.c.role == "admin"
        ).first()
        
        if not is_admin:
            raise HTTPException(status_code=403, detail="Permission denied")
    
    db.delete(message)
    db.commit()
    
    return {"message": "Message deleted successfully"}


@router.post("/search", response_model=SearchResult)
async def search_messages(
    search_query: SearchQuery,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Search messages with filters"""
    query = db.query(Message).join(Channel).join(team_members).filter(
        team_members.c.user_id == current_user.id
    )
    
    # Apply search filters
    if search_query.query:
        query = query.filter(Message.content.contains(search_query.query))
    
    if search_query.channel_id:
        query = query.filter(Message.channel_id == search_query.channel_id)
    
    if search_query.user_id:
        query = query.filter(Message.sender_id == search_query.user_id)
    
    if search_query.start_date:
        query = query.filter(Message.created_at >= search_query.start_date)
    
    if search_query.end_date:
        query = query.filter(Message.created_at <= search_query.end_date)
    
    # Get total count
    total_count = query.count()
    
    # Apply pagination
    offset = (page - 1) * per_page
    messages = query.order_by(desc(Message.created_at)).offset(offset).limit(per_page).all()
    
    return SearchResult(
        messages=messages,
        total_count=total_count,
        page=page,
        per_page=per_page
    )


@router.post("/direct/{message_id}/mark-read")
async def mark_direct_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Mark a direct message as read"""
    message = db.query(DirectMessage).filter(DirectMessage.id == message_id).first()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user is the receiver
    if message.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only mark own messages as read")
    
    message.is_read = True
    message.read_at = func.now()
    
    db.commit()
    
    return {"message": "Message marked as read"}

from sqlalchemy.sql import func
