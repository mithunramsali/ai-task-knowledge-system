
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy import create_engine


# Format: mysql+pymysql://<username>:<password>@<host>/<database_name>
# Using your confirmed password 'mysqlpassword' and database 'ai_management_system'
DATABASE_URL = "mysql+pymysql://mysql_username:mysql_password@localhost/ai_management_system"

# The engine is the entry point to the database [cite: 20]
engine = create_engine(DATABASE_URL)

# Each instance of the SessionLocal class will be a database session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our class-based SQL models [cite: 21]
Base = declarative_base()

# Dependency to get the database session for each request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()