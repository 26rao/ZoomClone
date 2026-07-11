import random
import string
from sqlalchemy.orm import Session
from datetime import datetime
from . import models, schemas
import uuid

def generate_meeting_id() -> str:
    """Generates a clean short unique Meeting ID (8 characters of alphanumeric uppercase)"""
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=8))

def generate_passcode(length: int = 6) -> str:
    """Generates a numeric passcode of the given length."""
    return "".join(random.choices(string.digits, k=length))

def get_meeting(db: Session, meeting_id: str):
    # Retrieve by id or meeting_id (they are equal)
    return db.query(models.Meeting).filter(
        (models.Meeting.id == meeting_id) | (models.Meeting.meeting_id == meeting_id)
    ).first()

def get_upcoming_meetings(db: Session):
    # Retrieve meetings starting now or in the future that are active/upcoming/scheduled
    now = datetime.utcnow()
    return db.query(models.Meeting).filter(
        models.Meeting.start_time >= now,
        models.Meeting.status != "ended",
        models.Meeting.status != "completed"
    ).order_by(models.Meeting.start_time.asc()).all()

def get_recent_meetings(db: Session):
    # Retrieve meetings in the past or marked as ended/completed
    now = datetime.utcnow()
    return db.query(models.Meeting).filter(
        (models.Meeting.start_time < now) | 
        (models.Meeting.status == "ended") | 
        (models.Meeting.status == "completed")
    ).order_by(models.Meeting.start_time.desc()).all()

def create_meeting(
    db: Session,
    meeting: schemas.MeetingCreate,
    meeting_id: str,
    invite_link: str,
    status: str = "upcoming",
    passcode: str = None
):
    db_meeting = models.Meeting(
        id=meeting_id,
        meeting_id=meeting_id,
        title=meeting.title,
        description=meeting.description,
        host_id=meeting.host_id,
        host_name=meeting.host_name,
        start_time=meeting.start_time,
        scheduled_time=meeting.start_time,
        duration=meeting.duration,
        status=status,
        invite_link=invite_link,
        passcode=passcode,
        is_active=(status != "ended" and status != "completed"),
        is_demo=meeting.is_demo if hasattr(meeting, "is_demo") else False,
        demo_participants=meeting.demo_participants if hasattr(meeting, "demo_participants") else []
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

def add_participant(db: Session, meeting_id: str, user_name: str, user_id: str = None, role: str = "participant"):
    db_participant = models.Participant(
        meeting_id=meeting_id,
        user_id=user_id,
        user_name=user_name,
        role=role
    )
    db.add(db_participant)
    db.commit()
    db.refresh(db_participant)
    return db_participant

def get_participants(db: Session, meeting_id: str):
    return db.query(models.Participant).filter(models.Participant.meeting_id == meeting_id).all()

def remove_participant(db: Session, meeting_id: str, user_name: str):
    db.query(models.Participant).filter(
        models.Participant.meeting_id == meeting_id,
        models.Participant.user_name == user_name
    ).delete()
    db.commit()
