from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Team, User, team_members
from app.schemas import TeamCreate, TeamUpdate, Team as TeamSchema, User as UserSchema
from app.auth import get_current_active_user

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("/", response_model=TeamSchema)
async def create_team(
    team: TeamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new team"""
    db_team = Team(
        name=team.name,
        description=team.description,
        is_public=team.is_public,
        created_by=current_user.id
    )
    
    db.add(db_team)
    db.commit()
    db.refresh(db_team)
    
    # Add creator as admin member
    db.execute(
        team_members.insert().values(
            user_id=current_user.id,
            team_id=db_team.id,
            role="admin"
        )
    )
    db.commit()
    
    return db_team


@router.get("/", response_model=List[TeamSchema])
async def get_user_teams(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all teams for current user"""
    teams = db.query(Team).join(team_members).filter(
        team_members.c.user_id == current_user.id
    ).all()
    
    return teams


@router.get("/{team_id}", response_model=TeamSchema)
async def get_team(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get specific team details"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is member
    is_member = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == team_id
    ).first()
    
    if not is_member and not team.is_public:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return team


@router.put("/{team_id}", response_model=TeamSchema)
async def update_team(
    team_id: int,
    team_update: TeamUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update team details"""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    # Check if user is admin
    member = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == team_id,
        team_members.c.role == "admin"
    ).first()
    
    if not member:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Update team
    for field, value in team_update.dict(exclude_unset=True).items():
        setattr(team, field, value)
    
    db.commit()
    db.refresh(team)
    
    return team


@router.post("/{team_id}/members/{user_id}")
async def add_team_member(
    team_id: int,
    user_id: int,
    role: str = "member",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Add member to team"""
    # Check if user is admin
    is_admin = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == team_id,
        team_members.c.role == "admin"
    ).first()
    
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already member
    existing_member = db.query(team_members).filter(
        team_members.c.user_id == user_id,
        team_members.c.team_id == team_id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="User already a member")
    
    # Add member
    db.execute(
        team_members.insert().values(
            user_id=user_id,
            team_id=team_id,
            role=role
        )
    )
    db.commit()
    
    return {"message": "Member added successfully"}


@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Remove member from team"""
    # Check if user is admin or removing themselves
    is_admin = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == team_id,
        team_members.c.role == "admin"
    ).first()
    
    if not is_admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    # Remove member
    result = db.execute(
        team_members.delete().where(
            team_members.c.user_id == user_id,
            team_members.c.team_id == team_id
        )
    )
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.commit()
    
    return {"message": "Member removed successfully"}


@router.get("/{team_id}/members", response_model=List[UserSchema])
async def get_team_members(
    team_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all team members"""
    # Check if user is member
    is_member = db.query(team_members).filter(
        team_members.c.user_id == current_user.id,
        team_members.c.team_id == team_id
    ).first()
    
    if not is_member:
        raise HTTPException(status_code=403, detail="Access denied")
    
    members = db.query(User).join(team_members).filter(
        team_members.c.team_id == team_id
    ).all()
    
    return members
