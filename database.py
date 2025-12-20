import asyncpg
import os
from typing import Optional
from loguru import logger

conn_pool: Optional[asyncpg.Pool] = None


async def init_postgres() -> None:
    """Initialize PostgreSQL connection pool and create tables"""
    global conn_pool
    try:
        conn_pool = await asyncpg.create_pool(os.getenv("DATABASE_URL"))
        logger.info("PostgreSQL connection pool initialized")

        # Create tables
        async with conn_pool.acquire() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    hashed_password VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS tickets (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    description TEXT NOT NULL,
                    status VARCHAR(50) DEFAULT 'open',
                    priority VARCHAR(50) DEFAULT 'medium',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS kb_articles (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    category VARCHAR(100),
                    is_published BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS ticket_messages (
                    id SERIAL PRIMARY KEY,
                    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    message TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                """
            )

        logger.info("Database tables initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL: {e}")
        raise


async def get_postgres() -> asyncpg.Pool:
    """Get the PostgreSQL connection pool"""
    if conn_pool is None:
        raise RuntimeError("Database pool not initialized")
    return conn_pool


async def close_postgres() -> None:
    """Close PostgreSQL connection pool"""
    global conn_pool
    if conn_pool:
        await conn_pool.close()
        logger.info("PostgreSQL connection pool closed")
