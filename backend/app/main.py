import uuid
import datetime
import os
import time
from dotenv import load_dotenv

# Load environment variables on startup
load_dotenv()
print("--- ENVIRONMENT CHECK ---")
print("STREAM_API_KEY loaded:", bool(os.getenv("STREAM_API_KEY")))
print("STREAM_API_SECRET loaded:", bool(os.getenv("STREAM_API_SECRET")))
print("-------------------------")

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

from . import models, schemas, crud, database
from .database import engine, get_db

# Create Database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zoom Clone API", version="1.0.0")

# CORS middleware to allow Next.js app to communicate
# In production, this can be restricted to the deployed frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development/deployment demo, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup if empty
@app.on_event("startup")
def startup_populate_db():
    db = next(get_db())
    if db.query(models.User).count() == 0:
        print("Database is empty. Running seeder...")
        try:
            from seed import seed_database
            seed_database()
        except ImportError:
            import sys
            sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            from seed import seed_database
            seed_database()
    else:
        print("Database already contains records. Skipping seeder.")
    db.close()

@app.post("/meetings/instant", response_model=schemas.Meeting)
def create_instant_meeting(meeting_in: schemas.MeetingCreate, db: Session = Depends(get_db)):
    # Ensure host user exists in database to avoid foreign key errors
    host_user = db.query(models.User).filter(models.User.id == meeting_in.host_id).first()
    if not host_user:
        new_host = models.User(
            id=meeting_in.host_id,
            name=meeting_in.host_name,
            email=f"{meeting_in.host_id}@zoomguest.com",
            role="host"
        )
        db.add(new_host)
        db.commit()

    meeting_id = crud.generate_meeting_id()
    passcode = crud.generate_passcode()
    # The frontend constructs canonical URL from window.location.origin
    invite_link = f"http://localhost:3000/meeting/{meeting_id}?passcode={passcode}"
    
    meeting = crud.create_meeting(
        db=db,
        meeting=meeting_in,
        meeting_id=meeting_id,
        invite_link=invite_link,
        status="active",
        passcode=passcode
    )
    
    # Auto-add host as a participant
    crud.add_participant(db=db, meeting_id=meeting_id, user_name=meeting_in.host_name, user_id=meeting_in.host_id, role="host")
    meeting.participants = crud.get_participants(db=db, meeting_id=meeting_id)
    return meeting

@app.post("/meetings/schedule", response_model=schemas.Meeting)
def schedule_meeting(meeting_in: schemas.MeetingCreate, db: Session = Depends(get_db)):
    # Ensure host user exists in database to avoid foreign key errors
    host_user = db.query(models.User).filter(models.User.id == meeting_in.host_id).first()
    if not host_user:
        new_host = models.User(
            id=meeting_in.host_id,
            name=meeting_in.host_name,
            email=f"{meeting_in.host_id}@zoomguest.com",
            role="host"
        )
        db.add(new_host)
        db.commit()

    meeting_id = crud.generate_meeting_id()
    passcode = crud.generate_passcode()
    invite_link = f"http://localhost:3000/meeting/{meeting_id}?passcode={passcode}"
    
    meeting = crud.create_meeting(
        db=db,
        meeting=meeting_in,
        meeting_id=meeting_id,
        invite_link=invite_link,
        status="scheduled",
        passcode=passcode
    )
    return meeting

@app.get("/meetings/upcoming", response_model=List[schemas.Meeting])
def get_upcoming_meetings(db: Session = Depends(get_db)):
    meetings = crud.get_upcoming_meetings(db=db)
    for m in meetings:
        m.participants = crud.get_participants(db=db, meeting_id=m.id)
    return meetings

@app.get("/meetings/recent", response_model=List[schemas.Meeting])
def get_recent_meetings(db: Session = Depends(get_db)):
    meetings = crud.get_recent_meetings(db=db)
    for m in meetings:
        m.participants = crud.get_participants(db=db, meeting_id=m.id)
    return meetings

@app.post("/meetings/join/{meeting_id}", response_model=schemas.Meeting)
def join_meeting(meeting_id: str, request_in: schemas.JoinMeetingRequest, db: Session = Depends(get_db)):
    meeting = crud.get_meeting(db=db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting ID '{meeting_id}' not found. Please check and try again."
        )
    
    if meeting.status in ("completed", "ended"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This meeting has already ended."
        )
    
    # Resolve user ID for database mapping
    user_id = request_in.user_id if request_in.user_id else f"user-{uuid.uuid4().hex[:6]}"
    
    # Ensure participant user exists in database to avoid foreign key errors
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        user = models.User(
            id=user_id,
            name=request_in.user_name,
            email=f"{user_id}@zoomguest.com",
            role="participant"
        )
        db.add(user)
        db.commit()
    
    # Check if participant already exists in meeting to avoid duplicates
    existing_participants = crud.get_participants(db=db, meeting_id=meeting_id)
    user_names = [p.user_name for p in existing_participants]
    if request_in.user_name not in user_names:
        crud.add_participant(
            db=db, 
            meeting_id=meeting_id, 
            user_name=request_in.user_name, 
            user_id=user.id,
            role="participant"
        )
    
    # If the meeting was upcoming/scheduled, transition it to active
    if meeting.status == "upcoming" or meeting.status == "scheduled":
        meeting.status = "active"
        db.commit()
        db.refresh(meeting)
        
    meeting.participants = crud.get_participants(db=db, meeting_id=meeting_id)
    return meeting

@app.get("/meetings/{meeting_id}", response_model=schemas.Meeting)
def get_meeting_endpoint(meeting_id: str, db: Session = Depends(get_db)):
    meeting = crud.get_meeting(db=db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting ID '{meeting_id}' not found."
        )
    meeting.participants = crud.get_participants(db=db, meeting_id=meeting.id)
    return meeting

@app.delete("/meetings/{meeting_id}/participants/{user_name}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant_endpoint(meeting_id: str, user_name: str, db: Session = Depends(get_db)):
    meeting = crud.get_meeting(db=db, meeting_id=meeting_id)
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Meeting not found"
        )
    crud.remove_participant(db=db, meeting_id=meeting.id, user_name=user_name)
    return

@app.post("/meetings/token", response_model=schemas.TokenResponse)
def get_stream_token(request: schemas.TokenRequest):
    api_key = os.environ.get("STREAM_API_KEY", "")
    api_secret = os.environ.get("STREAM_API_SECRET", "")
    
    # Token payload definition
    payload = {
        "user_id": request.user_id,
        "iat": int(time.time()) - 60, # buffer
        "exp": int(time.time()) + 24 * 3600 # 24h expiration
    }
    
    # Fallback default values for local showcase if keys aren't set
    signing_secret = api_secret if api_secret else "mock_secret_for_development_purposes"
    res_api_key = api_key if api_key else "mock_api_key"
    
    try:
        from jose import jwt
        token = jwt.encode(payload, signing_secret, algorithm="HS256")
    except Exception as e:
        token = f"dummy_token_{request.user_id}"
        
    return schemas.TokenResponse(token=token, api_key=res_api_key)

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt

security = HTTPBearer()

@app.post("/auth/register", response_model=schemas.AuthResponse)
def register_user(request: schemas.UserRegisterRequest, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.email == request.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Try signing in!"
        )
    
    # Create new user in the database
    user_id = f"user-{uuid.uuid4().hex[:8]}"
    new_user = models.User(id=user_id, name=request.name, email=request.email, role="host")
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Generate token
    payload = {
        "sub": new_user.email,
        "id": new_user.id,
        "name": new_user.name,
        "exp": int(time.time()) + 30 * 24 * 3600 # 30 days
    }
    token = jwt.encode(payload, "secret_for_local_zoom_jwt_key", algorithm="HS256")
    
    return schemas.AuthResponse(
        token=token,
        user_id=new_user.id,
        name=new_user.name,
        email=new_user.email
    )

@app.post("/auth/login", response_model=schemas.AuthResponse)
def login_user(request: schemas.UserLoginRequest, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == request.email).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please sign up first!"
        )
    
    # Generate token
    payload = {
        "sub": db_user.email,
        "id": db_user.id,
        "name": db_user.name,
        "exp": int(time.time()) + 30 * 24 * 3600 # 30 days
    }
    token = jwt.encode(payload, "secret_for_local_zoom_jwt_key", algorithm="HS256")
    
    return schemas.AuthResponse(
        token=token,
        user_id=db_user.id,
        name=db_user.name,
        email=db_user.email
    )

@app.get("/auth/me", response_model=schemas.User)
def get_auth_me(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, "secret_for_local_zoom_jwt_key", algorithms=["HS256"])
        email = payload.get("sub")
        db_user = db.query(models.User).filter(models.User.email == email).first()
        if not db_user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return db_user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session or token expired")
