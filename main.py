from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from app import models, schemas, auth, database, ai_engine
from app.database import engine, get_db
from typing import List
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func

# 1. Define the app
app = FastAPI(title="AI-Powered Task & Knowledge System")

# 2. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Startup: Load existing AI Index
@app.on_event("startup")
def startup_event():
    ai_engine.load_index()

# Create tables
models.Base.metadata.create_all(bind=engine)

# --- ANALYTICS ---

@app.get("/analytics")
def get_task_analytics(db: Session = Depends(get_db)):
    total = db.query(models.Task).count() 
    completed = db.query(models.Task).filter(models.Task.status == "completed").count() 
    pending = db.query(models.Task).filter(models.Task.status == "pending").count() 
    
    return {
        "total": total,
        "completed": completed,
        "pending": pending
    }

# --- AUTHENTICATION ---

@app.post("/auth/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pw = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username, 
        password_hash=hashed_pw, 
        role_id=user.role_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=schemas.Token)
def login(user_credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_credentials.username).first()
    
    if not user or not auth.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(status_code=403, detail="Invalid Credentials")
    
    access_token = auth.create_access_token(data={"sub": user.username})
    
    log = models.ActivityLog(user_id=user.id, action="Login")
    db.add(log)
    db.commit()
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role_id": user.role_id 
    }

# --- DOCUMENT UPLOAD ---

@app.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...), 
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Only Admins can upload documents")

    if not file.filename.endswith(".txt"):
        raise HTTPException(status_code=400, detail="Only .txt files are supported")

    content = await file.read()
    text = content.decode("utf-8")

    # Add to AI Index
    ai_engine.add_to_index(text)
    # Persist index to disk
    ai_engine.save_index()

    db_doc = models.Document(filename=file.filename, content_preview=text[:200])
    db.add(db_doc)
    
    log = models.ActivityLog(user_id=current_user.id, action=f"Uploaded: {file.filename}")
    db.add(log)
    
    db.commit()
    return {"message": f"File '{file.filename}' uploaded and indexed successfully"}

# --- SEARCH ---

@app.post("/search", response_model=List[str])
def search_knowledge_base(query_data: schemas.SearchQuery, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    results = ai_engine.search_index(query_data.query)
    log = models.ActivityLog(user_id=current_user.id, action=f"Searched: {query_data.query}")
    db.add(log)
    db.commit()
    return results

# --- TASK MANAGEMENT ---

@app.post("/tasks", response_model=schemas.TaskOut)
def create_task(task: schemas.TaskCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Only Admins can create tasks")
    
    new_task = models.Task(title=task.title, description=task.description, assigned_to=task.assigned_to)
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    log = models.ActivityLog(user_id=current_user.id, action=f"Created task: {task.title}")
    db.add(log)
    db.commit()
    return new_task

@app.get("/tasks/my-tasks")
def get_my_tasks(status: str = None, db: Session = Depends(get_db), current_user = Depends(auth.get_current_user)):
    query = db.query(models.Task).filter(models.Task.assigned_to == current_user.id)
    if status:
        query = query.filter(models.Task.status == status)
    return query.all()

@app.patch("/tasks/{task_id}/status")
def update_task_status(task_id: int, new_status: str, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if current_user.role_id != 1 and task.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    task.status = new_status
    log = models.ActivityLog(user_id=current_user.id, action=f"Updated Task {task_id} to {new_status}")
    db.add(log)
    db.commit()
    return {"message": f"Task {task_id} updated to {new_status}"}

# --- ADMIN VIEW FUNCTIONS ---

@app.get("/logs/all", response_model=List[schemas.ActivityLogOut])
def get_all_logs(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc()).all()

@app.get("/admin/users", response_model=List[schemas.UserOut])
def get_all_users(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return db.query(models.User).all()

@app.get("/admin/all-tasks", response_model=List[schemas.TaskOut])
def get_all_tasks_admin(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return db.query(models.Task).all()