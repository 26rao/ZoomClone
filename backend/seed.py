from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import os
import sys

# Add root folder to sys.path so we can import app modules properly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import Base, User, Meeting, Participant

def seed_database():
    print("Dropping existing database tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    print("Seeding database...")

    # === Seed 10 Users ===
    users = [
        {"id": "user1", "email": "alex.rivera@zoomclone.com", "name": "Alex Rivera", "role": "host"},
        {"id": "user2", "email": "sarah.chen@zoomclone.com", "name": "Sarah Chen", "role": "participant"},
        {"id": "user3", "email": "mike.torres@zoomclone.com", "name": "Mike Torres", "role": "participant"},
        {"id": "user4", "email": "priya.sharma@zoomclone.com", "name": "Priya Sharma", "role": "host"},
        {"id": "user5", "email": "john.doe@zoomclone.com", "name": "John Doe", "role": "participant"},
        {"id": "user6", "email": "emily.watson@zoomclone.com", "name": "Emily Watson", "role": "participant"},
        {"id": "user7", "email": "david.kim@zoomclone.com", "name": "David Kim", "role": "participant"},
        {"id": "user8", "email": "sofia.patel@zoomclone.com", "name": "Sofia Patel", "role": "participant"},
        {"id": "user9", "email": "james.smith@zoomclone.com", "name": "James Smith", "role": "host"},
        {"id": "user-999", "email": "alex.river@zoomclone.com", "name": "Alex River", "role": "host"}
    ]

    created_users = {}
    for u in users:
        user = User(
            id=u["id"],
            email=u["email"],
            name=u["name"],
            role=u["role"]
        )
        db.add(user)
        created_users[u["id"]] = user
    db.commit()
    print(f"Seeded {len(users)} users")

    # === Seed 15 Meetings ===
    now = datetime.utcnow()
    
    meetings = [
        {
            "id": "STANDUP01",
            "title": "Daily Team Standup",
            "description": "Weekly core status check",
            "host_id": "user1",
            "scheduled_time": now - timedelta(days=2),
            "duration": 15,
            "status": "completed"
        },
        {
            "id": "SPRINT01",
            "title": "Sprint Planning",
            "description": "Planning tasks for Sprint 14",
            "host_id": "user-999",
            "scheduled_time": now - timedelta(days=1),
            "duration": 45,
            "status": "completed"
        },
        {
            "id": "Q3PLAN01",
            "title": "Team Sync - Q3 Planning",
            "description": "Review key priorities for the upcoming quarter",
            "host_id": "user1",
            "scheduled_time": now + timedelta(hours=2),
            "duration": 45,
            "status": "scheduled"
        },
        {
            "id": "AI_SYNC01",
            "title": "AI Research Sync",
            "description": "Discuss new large language model capabilities",
            "host_id": "user9",
            "scheduled_time": now + timedelta(hours=4),
            "duration": 60,
            "status": "scheduled"
        },
        {
            "id": "DEMO01",
            "title": "Client Demo - Acme Corp",
            "description": "Showcasing Zoom Clone functionalities",
            "host_id": "user4",
            "scheduled_time": now + timedelta(days=1, hours=3),
            "duration": 60,
            "status": "scheduled"
        },
        {
            "id": "DESIGN01",
            "title": "Design Review: Zoom Clone",
            "description": "Checking wireframes and UI components",
            "host_id": "user-999",
            "scheduled_time": now + timedelta(days=2),
            "duration": 60,
            "status": "scheduled"
        },
        {
            "id": "INTERVIEW1",
            "title": "Technical Interview - Senior Engineer",
            "description": "Coding challenge and architectural evaluation",
            "host_id": "user9",
            "scheduled_time": now - timedelta(hours=10),
            "duration": 45,
            "status": "completed"
        },
        {
            "id": "PROD_REV1",
            "title": "Product Roadmap Review",
            "description": "Reviewing Q4 product strategy",
            "host_id": "user4",
            "scheduled_time": now - timedelta(days=3),
            "duration": 60,
            "status": "completed"
        },
        {
            "id": "DESIGN_D1",
            "title": "Design System Architecture",
            "description": "Formulating theme variables and layout standards",
            "host_id": "user1",
            "scheduled_time": now - timedelta(days=4),
            "duration": 90,
            "status": "completed"
        },
        {
            "id": "AI_AGENT1",
            "title": "AI Agent Orchestration Sync",
            "description": "Agentic workflow framework discussion",
            "host_id": "user-999",
            "scheduled_time": now + timedelta(hours=8),
            "duration": 30,
            "status": "scheduled"
        },
        {
            "id": "STAFF_MTG",
            "title": "Monthly Staff Meeting",
            "description": "Company updates and announcements",
            "host_id": "user4",
            "scheduled_time": now - timedelta(days=15),
            "duration": 60,
            "status": "completed"
        },
        {
            "id": "CLIENT_FB",
            "title": "Client Feedback Session",
            "description": "Review feedback from initial client release",
            "host_id": "user9",
            "scheduled_time": now - timedelta(hours=20),
            "duration": 45,
            "status": "completed"
        },
        {
            "id": "STANDUP02",
            "title": "Daily Team Standup",
            "description": "Daily alignment and blockers review",
            "host_id": "user1",
            "scheduled_time": now - timedelta(minutes=5),
            "duration": 15,
            "status": "active",
            "is_demo": True,
            "demo_participants": ["Sarah Chen", "Mike Torres", "Priya Sharma"]
        },
        {
            "id": "RETRO01",
            "title": "Sprint 12 Retrospective",
            "description": "Identify improvements for the team velocity",
            "host_id": "user-999",
            "scheduled_time": now - timedelta(days=12),
            "duration": 60,
            "status": "completed"
        },
        {
            "id": "KICKOFF01",
            "title": "Project Kickoff - NextGen Web",
            "description": "Scope definition and milestone setting",
            "host_id": "user1",
            "scheduled_time": now + timedelta(days=5),
            "duration": 60,
            "status": "scheduled"
        }
    ]

    created_meetings = {}
    for m in meetings:
        passcode = "123456"
        meeting_id = m["id"]
        invite_link = f"http://localhost:3000/meeting/{meeting_id}?passcode={passcode}"
        
        host_user = created_users.get(m["host_id"])
        host_name = host_user.name if host_user else "Unknown Host"
        
        meeting = Meeting(
            id=meeting_id,
            meeting_id=meeting_id,
            title=m["title"],
            description=m["description"],
            host_id=m["host_id"],
            host_name=host_name,
            start_time=m["scheduled_time"],
            scheduled_time=m["scheduled_time"],
            duration=m["duration"],
            status=m["status"],
            passcode=passcode,
            invite_link=invite_link,
            is_active=(m["status"] not in ("completed", "ended")),
            is_demo=m.get("is_demo", False),
            demo_participants=m.get("demo_participants", [])
        )
        db.add(meeting)
        created_meetings[meeting_id] = meeting
    db.commit()
    print(f"Seeded {len(meetings)} meetings")

    # === Seed Participants ===
    meeting_participants = {
        "STANDUP01": ["user1", "user2", "user3", "user5"],
        "SPRINT01": ["user-999", "user2", "user3", "user6", "user7"],
        "Q3PLAN01": ["user1", "user2", "user3"],
        "AI_SYNC01": ["user9", "user5", "user8"],
        "INTERVIEW1": ["user9", "user6"],
        "PROD_REV1": ["user4", "user1", "user2", "user7"],
        "STANDUP02": ["user1", "user2", "user5", "user6"]
    }
    for m_id, u_ids in meeting_participants.items():
        for uid in u_ids:
            p_user = created_users.get(uid)
            if p_user:
                participant = Participant(
                    meeting_id=m_id,
                    user_id=uid,
                    user_name=p_user.name,
                    role="host" if uid == created_meetings[m_id].host_id else "participant"
                )
                db.add(participant)
    db.commit()
    print("Seeded participants for meetings")

    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
