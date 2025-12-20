import asyncio
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
import asyncpg
from loguru import logger

# Import utilities from your copied files
from config import settings
from database import init_postgres, close_postgres, get_postgres
from security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password 
)

# ==================== Pydantic Models ====================

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: dict

class DashboardStats(BaseModel):
    open_tickets: int
    in_progress_tickets: int
    closed_today: int
    total_articles: int

class TicketStatusUpdate(BaseModel):
    status: str

class TicketNoteCreate(BaseModel):
    content: str

class ArticleCreate(BaseModel):
    title: str
    category: str
    content: str

class ArticleUpdate(BaseModel):
    title: str
    category: str
    content: str

# ==================== Dependencies ====================

async def get_current_staff(
    authorization: str = None, 
    pool: asyncpg.Pool = Depends(get_postgres)
) -> dict:
    """
    Dependency to verify the user is logged in AND is a staff member.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Not authenticated"
        )

    token = authorization.split(" ")[1]
    payload = decode_token(token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid token"
        )

    async with pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, is_staff FROM users WHERE id = $1", 
            payload.get("user_id")
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="User not found"
            )
            
        # CHECK: Ensure the user has staff privileges
        if not user['is_staff']:
             raise HTTPException(
                 status_code=status.HTTP_403_FORBIDDEN, 
                 detail="Access denied. Staff access only."
             )
    
    return payload

# ==================== Lifespan & App Setup ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Galactic Archives Staff Portal Backend")
    await init_postgres()
    yield
    logger.info("Shutting down Staff Portal Backend")
    await close_postgres()

app = FastAPI(
    title="Galactic Archives Staff Portal",
    description="Backend API for Staff Operations",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS to allow your React Frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with your specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Auth Routes ====================

@app.post("/api/auth/login", response_model=TokenResponse)
async def staff_login(data: UserLogin, pool: asyncpg.Pool = Depends(get_postgres)):
    """Staff Login Endpoint"""
    try:
        async with pool.acquire() as conn:
            user = await conn.fetchrow(
                "SELECT id, username, email, hashed_password, is_staff FROM users WHERE email = $1",
                data.email,
            )

            if not user or not verify_password(data.password, user["hashed_password"]):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials",
                )
            
            # Enforce Staff Access
            if not user["is_staff"]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. This portal is for staff only.",
                )

            token_data = {"sub": user["email"], "user_id": user["id"], "is_staff": True}
            access_token = create_access_token(token_data)
            refresh_token = create_refresh_token(token_data)

            return TokenResponse(
                access_token=access_token,
                refresh_token=refresh_token,
                user={"id": user["id"], "email": user["email"], "username": user["username"], "is_staff": True},
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@app.post("/api/auth/refresh")
async def refresh_token_endpoint(refresh_token: str, pool: asyncpg.Pool = Depends(get_postgres)):
    """Refresh the access token"""
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_data = {"sub": payload["sub"], "user_id": payload["user_id"], "is_staff": True}
    return {"access_token": create_access_token(token_data)}

# ==================== Dashboard Routes ====================

@app.get("/staff/dashboard", response_model=DashboardStats)
async def get_dashboard(
    user: dict = Depends(get_current_staff), 
    pool: asyncpg.Pool = Depends(get_postgres)
):
    """Get statistics for the staff dashboard"""
    try:
        async with pool.acquire() as conn:
            open_tickets = await conn.fetchval("SELECT COUNT(*) FROM tickets WHERE status = 'open'")
            in_progress = await conn.fetchval("SELECT COUNT(*) FROM tickets WHERE status = 'in_progress'")
            # Count tickets closed today
            closed_today = await conn.fetchval(
                "SELECT COUNT(*) FROM tickets WHERE status = 'closed' AND updated_at::date = CURRENT_DATE"
            )
            total_articles = await conn.fetchval("SELECT COUNT(*) FROM kb_articles")
            
            return {
                "open_tickets": open_tickets or 0,
                "in_progress_tickets": in_progress or 0,
                "closed_today": closed_today or 0,
                "total_articles": total_articles or 0
            }
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard stats")

# ==================== Ticket Management Routes ====================

@app.get("/staff/tickets")
async def get_tickets(
    status: str = None, 
    user: dict = Depends(get_current_staff), 
    pool: asyncpg.Pool = Depends(get_postgres)
):
    """Fetch all tickets, optionally filtered by status"""
    try:
        query = """
            SELECT t.id, t.title, t.description, t.status, t.priority, t.created_at, u.email as user_email
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
            
            # Fetch messages for each ticket to show in the details view
            # (Note: In a larger app, you might fetch messages in a separate endpoint)
            result = []
            for t in tickets:
                t_dict = dict(t)
                messages = await conn.fetch("""
                    SELECT tm.message as content, u.email as author 
                    FROM ticket_messages tm
                    JOIN users u ON tm.user_id = u.id
                    WHERE tm.ticket_id = $1
                    ORDER BY tm.created_at ASC
                """, t['id'])
                t_dict['messages'] = [dict(m) for m in messages]
                result.append(t_dict)
                
            return result
    except Exception as e:
        logger.error(f"Tickets fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch tickets")

@app.put("/staff/tickets/{ticket_id}")
async def update_ticket_status(
    ticket_id: int, 
    data: TicketStatusUpdate, 
    user: dict = Depends(get_current_staff), 
    pool: asyncpg.Pool = Depends(get_postgres)
):
    """Update the status of a ticket"""
    try:
        async with pool.acquire() as conn:
            result = await conn.execute(
                "UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2",
                data.status, ticket_id
            )
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Ticket not found")
            return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update ticket error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update ticket")

@app.post("/staff/tickets/{ticket_id}/messages")
async def add_ticket_message(
    ticket_id: int, 
    data: TicketNoteCreate, 
    user: dict = Depends(get_current_staff), 
    pool: asyncpg.Pool = Depends(get_postgres)
):
    """Add a staff note/message to a ticket"""
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO ticket_messages (ticket_id, user_id, message)
                VALUES ($1, $2, $3)
                """,
                ticket_id, user['user_id'], data.content
            )
            return {"status": "success"}
    except Exception as e:
        logger.error(f"Add message error: {e}")
        raise HTTPException(status_code=500, detail="Failed to add message")

# ==================== Knowledge Base Routes ====================

@app.get("/staff/kb/articles")
async def get_all_articles(
    user: dict = Depends(get_current_staff), 
    pool: asyncpg.Pool = Depends(get_postgres)
):
    """Get ALL articles (drafts and published) for the editor"""
    try:
        async with pool.acquire() as conn:
            articles = await conn.fetch("""
                SELECT id, title, content, category, is_published, created_at 
                FROM kb_articles 
                ORDER BY created_at DESC
            """)
            return [dict(a) for a in articles]
    except Exception as e:
        logger.error(f"KB fetch error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch articles")

@app.post("/staff/kb/articles")
async def create_article(
    data: ArticleCreate,
    user: dict = Depends(get_current_staff),
    pool: asyncpg.Pool = Depends(get_postgres)
):
    """Create a new KB article"""
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO kb_articles (title, category, content, is_published)
                VALUES ($1, $2, $3, FALSE)
            """, data.title, data.category, data.content)
            return {"status": "created"}
    except Exception as e:
        logger.error(f"KB create error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create article")

@app.put("/staff/kb/articles/{article_id}")
async def update_article(
    article_id: int,
    data: ArticleUpdate,
    user: dict = Depends(get_current_staff),
    pool: asyncpg.Pool = Depends(get_postgres)
):
    """Update an existing article"""
    try:
        async with pool.acquire() as conn:
            result = await conn.execute("""
                UPDATE kb_articles 
                SET title = $1, category = $2, content = $3, updated_at = NOW()
                WHERE id = $4
            """, data.title, data.category, data.content, article_id)
            
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Article not found")
            return {"status": "updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"KB update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update article")

@app.post("/staff/kb/articles/{article_id}/publish")
async def publish_article(
    article_id: int,
    user: dict = Depends(get_current_staff),
    pool: asyncpg.Pool = Depends(get_postgres)
):
    """Publish a draft article"""
    try:
        async with pool.acquire() as conn:
            result = await conn.execute(
                "UPDATE kb_articles SET is_published = TRUE, updated_at = NOW() WHERE id = $1",
                article_id
            )
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Article not found")
            return {"status": "published"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"KB publish error: {e}")
        raise HTTPException(status_code=500, detail="Failed to publish article")

@app.delete("/staff/kb/articles/{article_id}")
async def delete_article(
    article_id: int,
    user: dict = Depends(get_current_staff),
    pool: asyncpg.Pool = Depends(get_postgres)
):
    """Delete an article"""
    try:
        async with pool.acquire() as conn:
            result = await conn.execute("DELETE FROM kb_articles WHERE id = $1", article_id)
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Article not found")
            return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"KB delete error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete article")
