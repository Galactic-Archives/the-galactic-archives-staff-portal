import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncpg
import os
from loguru import logger

# Import your database and security utilities (You should copy database.py and security.py from the Support Portal)
# Note: You might need to slightly modify database.py to handle the shared connection if running separately.
from database import init_postgres, close_postgres, get_postgres
from security import verify_password, create_access_token, decode_token

# ==================== Models ====================

class TicketUpdate(BaseModel):
    status: str

class NoteCreate(BaseModel):
    content: str

# ==================== Dependencies ====================

async def get_current_staff(authorization: str = None, pool: asyncpg.Pool = Depends(get_postgres)) -> dict:
    """Verify user is authenticated AND is staff"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ")[1]
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")

    # Verify staff status in DB
    async with pool.acquire() as conn:
        user = await conn.fetchrow("SELECT is_staff FROM users WHERE id = $1", payload.get("user_id"))
        if not user or not user['is_staff']:
             raise HTTPException(status_code=403, detail="Access denied. Staff only.")
    
    return payload

# ==================== Lifespan & App ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Staff Portal Backend")
    await init_postgres()
    yield
    logger.info("Shutting down")
    await close_postgres()

app = FastAPI(title="Galactic Archives Staff Portal", lifespan=lifespan)

# Allow requests from your Staff React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Staff Routes ====================

@app.post("/api/auth/login") # Staff frontend might call this or /auth/login
async def staff_login(data: dict, pool: asyncpg.Pool = Depends(get_postgres)):
    email = data.get("email")
    password = data.get("password")
    
    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, username, hashed_password, is_staff FROM users WHERE email = $1", 
            email
        )

        if not user or not verify_password(password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not user["is_staff"]:
            raise HTTPException(status_code=403, detail="Access denied. Staff access only.")

        token_data = {"sub": email, "user_id": user["id"], "is_staff": True}
        return {
            "access_token": create_access_token(token_data),
            "refresh_token": create_access_token(token_data), # Simplify for hackathon
            "user": {"id": user["id"], "email": email, "is_staff": True}
        }

@app.get("/staff/dashboard")
async def get_dashboard_stats(user: dict = Depends(get_current_staff), pool: asyncpg.Pool = Depends(get_postgres)):
    async with pool.acquire() as conn:
        open_tickets = await conn.fetchval("SELECT COUNT(*) FROM tickets WHERE status = 'open'")
        in_progress = await conn.fetchval("SELECT COUNT(*) FROM tickets WHERE status = 'in_progress'")
        closed_today = await conn.fetchval("SELECT COUNT(*) FROM tickets WHERE status = 'closed' AND updated_at > CURRENT_DATE")
        articles = await conn.fetchval("SELECT COUNT(*) FROM kb_articles")
        
        return {
            "open_tickets": open_tickets,
            "in_progress_tickets": in_progress,
            "closed_today": closed_today,
            "total_articles": articles
        }

@app.get("/staff/tickets")
async def get_tickets(status: str = None, user: dict = Depends(get_current_staff), pool: asyncpg.Pool = Depends(get_postgres)):
    query = """
        SELECT t.*, u.email as user_email 
        FROM tickets t 
        JOIN users u ON t.user_id = u.id 
    """
    args = []
    if status and status != 'all':
        query += " WHERE t.status = $1"
        args.append(status)
    
    query += " ORDER BY t.created_at DESC"
    
    async with pool.acquire() as conn:
        tickets = await conn.fetch(query, *args)
        # Fetch messages for each ticket could be done here or in detail view
        return [dict(t) for t in tickets]

@app.put("/staff/tickets/{ticket_id}")
async def update_ticket(ticket_id: int, data: TicketUpdate, user: dict = Depends(get_current_staff), pool: asyncpg.Pool = Depends(get_postgres)):
    async with pool.acquire() as conn:
        await conn.execute("UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2", data.status, ticket_id)
        return {"status": "success"}

@app.post("/staff/tickets/{ticket_id}/messages")
async def add_note(ticket_id: int, data: NoteCreate, user: dict = Depends(get_current_staff), pool: asyncpg.Pool = Depends(get_postgres)):
    async with pool.acquire() as conn:
        # Assuming staff messages are just messages with the staff's user_id
        await conn.execute(
            "INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, $2, $3)",
            ticket_id, user['user_id'], data.content
        )
        return {"status": "success"}

# Add KB endpoints similarly...
