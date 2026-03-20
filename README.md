AI-Powered Task & Knowledge Management System
A sophisticated full-stack application designed to streamline office operations through Semantic AI Search and Automated Task Management. This system allows administrators to index company documentation and enables users to retrieve information using natural language queries.

Key Features: 
-Semantic Knowledge Retrieval: Uses the sentence-transformers model to understand the meaning of a search query rather than just matching keywords.

-Vector Database Persistence: Integrated with FAISS (Facebook AI Similarity Search) to store document "fingerprints" (embeddings) permanently on disk.

-Role-Based Access Control (RBAC): Secure separation between Admin (ID: 1) and Standard User (ID: 2) dashboards.

-Real-Time Analytics: Admin dashboard features a live summary of task distribution (Total, Completed, and Pending).

-Audit Logging: Every login, search, and document upload is logged in the MySQL database for compliance and auditing.

Technical Architecture:
The system follows a modern decoupled architecture:

-Backend: Python 3.x with FastAPI for high-performance asynchronous API routing.

-Database: MySQL for structured data (Users, Tasks, Activity Logs).

-AI Engine: FAISS for vector indexing and MiniLM-L6-v2 for generating 384-dimensional embeddings.

-Frontend: Responsive Vanilla JavaScript, CSS3, and HTML5.

Installation & Setup
1. Prerequisites
Python 3.10 or higher installed.

MySQL Server running locally.

2. Clone and Environment Setup
Bash
git clone https://github.com/mithunramsali/ai-task-knowledge-system.git
cd ai-task-knowledge-system
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

3. Install Dependencies
Bash
pip install -r requirements.txt

4. Database Configuration
Log into your MySQL Workbench or Shell.

Create the database: CREATE DATABASE ai_management_system;
https://drive.google.com/file/d/1gUyV1rKFHmP2IOEvtRvk5KDnH9Itmign/view?usp=sharing
this is the drive where it has all the queries so you can run in your system 

Open app/database.py and update the DATABASE_URL with your MySQL password:
DATABASE_URL = "mysql+pymysql://root:YOUR_PASSWORD@localhost/ai_management_system"

How to Use
Starting the System
Run the backend server using Uvicorn:

Bash
uvicorn app.main:app --reload
Once the server is running, simply open index.html in your browser.

Testing the AI
Login as Admin: Register an account with Role ID: 1.

Upload Knowledge: In the Admin panel, upload a .txt file containing office policies.

Search: Log in as a user (Role ID: 2) and ask questions like "What is the policy for lost laptops?".

📂 Project Structure
Plaintext
├── app/
│   ├── main.py          # FastAPI application & API Endpoints
│   ├── models.py        # SQLAlchemy Database Models
│   ├── ai_engine.py     # FAISS Indexing & Search Logic
│   ├── auth.py          # JWT Token & Password Security
│   ├── database.py      # MySQL Connection Setup
│   └── schemas.py       # Pydantic Data Validation
├── frontend/
│   ├── index.html       # Dashboard & Login UI
│   ├── style.css        # Custom Dark-themed styling
│   └── script.js        # Frontend logic & API calls
├── requirements.txt     # Project dependencies
└── README.md            # You are here!

🛠️ Troubleshooting
IndexError: If the search crashes, ensure you have uploaded at least one .txt file to initialize the vector_store.index and metadata.pkl files.

CORS Error: Ensure the API_URL in script.js matches your local server address (usually http://localhost:8000).
