import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    """
    User model representing registered, mock, or guest users.
    """
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True, comment="Custom user ID string")
    name = Column(String, nullable=False, comment="Display name of the user")
    email = Column(String, unique=True, index=True, nullable=False, comment="Unique email address")
    role = Column(String, default="participant", nullable=True, comment="User role (host/participant)")

    # Relationships
    hosted_meetings = relationship("Meeting", back_populates="host")
    participations = relationship("Participant", back_populates="user")


class Meeting(Base):
    """
    Meeting model containing schedule times, unique identifiers, status codes, and links.
    """
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, index=True, comment="Unique short Meeting ID")
    meeting_id = Column(
        String, 
        unique=True, 
        index=True, 
        nullable=False, 
        comment="Unique Zoom-style meeting identifier (e.g. 123-456-789)"
    )
    title = Column(String, nullable=False, comment="Topic/Subject of the meeting")
    description = Column(String, nullable=True, comment="Description of the meeting topic")
    passcode = Column(String, nullable=True, comment="Numeric passcode required to join the meeting")
    
    host_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="Host User ID")
    host_name = Column(String, nullable=False, comment="The display name of the host user")
    
    start_time = Column(DateTime, nullable=False, comment="Scheduled start date and time (UTC)")
    scheduled_time = Column(DateTime, nullable=True, comment="Alias for start_time for migration and scheduling compliance")
    duration = Column(Integer, nullable=False, comment="Scheduled meeting duration in minutes")
    status = Column(
        String, 
        default="upcoming", 
        nullable=False, 
        comment="Current state of meeting: upcoming, active, ended, scheduled, completed"
    )
    invite_link = Column(String, nullable=False, comment="Shareable web URL to join this meeting")
    is_active = Column(Boolean, default=True, nullable=False, comment="Whether the meeting is currently active")
    
    is_demo = Column(Boolean, default=False, comment="Whether this is a demo simulation meeting")
    demo_participants = Column(JSON, default=list, comment="List of demo participant names")

    # Relationships
    host = relationship("User", back_populates="hosted_meetings")
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")


class Participant(Base):
    """
    Participant model containing a list of users currently or previously in a meeting room.
    """
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True, comment="Primary key ID")
    meeting_id = Column(
        String, 
        ForeignKey("meetings.id", ondelete="CASCADE"), 
        nullable=False, 
        comment="Foreign key linking to the meeting room id"
    )
    user_id = Column(
        String,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        comment="Foreign key linking to the user id"
    )
    user_name = Column(String, nullable=False, comment="Display name of the participant")
    role = Column(String, default="participant", nullable=True, comment="Role of participant in meeting")
    joined_at = Column(
        DateTime, 
        default=datetime.datetime.utcnow, 
        nullable=False, 
        comment="Timestamp when the user joined the room"
    )

    # Relationships
    meeting = relationship("Meeting", back_populates="participants")
    user = relationship("User", back_populates="participations")
