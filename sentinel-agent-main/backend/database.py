import logging
import math
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from config import settings

logger = logging.getLogger("sentinel.database")

_db_pool: pool.ThreadedConnectionPool | None = None
_in_memory_runbooks = []

def init_db_pool():
    """Initialize psycopg2 ThreadedConnectionPool for CockroachDB concurrency."""
    global _db_pool
    try:
        # Create threaded connection pool (minconn 1, maxconn 20)
        _db_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=20,
            dsn=settings.DATABASE_URL
        )
        logger.info("CockroachDB connection pool initialized successfully.")
        _setup_schema()
    except Exception as e:
        logger.warning(f"Failed to connect to CockroachDB at {settings.DATABASE_URL}: {e}")
        logger.info("Operating with in-memory fallback for vector search & runbook storage.")

def get_db_connection():
    """Retrieve connection from thread pool."""
    if _db_pool:
        return _db_pool.getconn()
    return None

def release_db_connection(conn):
    """Release connection back to thread pool."""
    if _db_pool and conn:
        _db_pool.putconn(conn)

def _setup_schema():
    """Create runbooks table with vector column support in CockroachDB."""
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            # Enable pgvector if available, fallback to FLOAT8[] if needed
            try:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            except Exception:
                conn.rollback()

            cur.execute("""
                CREATE TABLE IF NOT EXISTS runbooks (
                    id STRING PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
                    title STRING NOT NULL,
                    description STRING NOT NULL,
                    solution STRING NOT NULL,
                    embedding FLOAT8[] NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT now()
                );
            """)
            conn.commit()
            logger.info("CockroachDB schema setup complete.")
    except Exception as e:
        logger.error(f"Error initializing CockroachDB schema: {e}")
        conn.rollback()
    finally:
        release_db_connection(conn)

def vector_cosine_similarity_search(query_embedding: list[float], top_k: int = 3) -> list[dict]:
    """
    Performs cosine similarity search between query_embedding and stored runbooks in CockroachDB.
    Returns list of dicts: [{'id': ..., 'title': ..., 'description': ..., 'solution': ..., 'similarity': float}]
    """
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Query all runbooks to compute vector cosine similarity
                cur.execute("SELECT id, title, description, solution, embedding FROM runbooks;")
                rows = cur.fetchall()

            results = []
            for r in rows:
                emb = r["embedding"]
                sim = _cosine_similarity(query_embedding, emb)
                results.append({
                    "id": r["id"],
                    "title": r["title"],
                    "description": r["description"],
                    "solution": r["solution"],
                    "similarity": round(sim, 4)
                })

            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]
        except Exception as e:
            logger.error(f"CockroachDB query error: {e}")
            if conn:
                conn.rollback()
        finally:
            release_db_connection(conn)

    # In-memory fallback if CockroachDB is not active
    results = []
    for r in _in_memory_runbooks:
        sim = _cosine_similarity(query_embedding, r["embedding"])
        results.append({
            "id": r.get("id", "mem-id"),
            "title": r["title"],
            "description": r["description"],
            "solution": r["solution"],
            "similarity": round(sim, 4)
        })
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:top_k]

def insert_runbook(title: str, description: str, solution: str, embedding: list[float]) -> dict:
    """
    Inserts a new runbook entry into CockroachDB.
    """
    conn = get_db_connection()
    runbook_id = None
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO runbooks (title, description, solution, embedding)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id;
                    """,
                    (title, description, solution, embedding)
                )
                runbook_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Inserted runbook {runbook_id} into CockroachDB.")
        except Exception as e:
            logger.error(f"Error inserting runbook into CockroachDB: {e}")
            conn.rollback()
        finally:
            release_db_connection(conn)

    record = {
        "id": runbook_id or f"mem-{len(_in_memory_runbooks) + 1}",
        "title": title,
        "description": description,
        "solution": solution,
        "embedding": embedding
    }

    if not conn or not runbook_id:
        _in_memory_runbooks.append(record)

    return record

def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Computes cosine similarity between two float vectors: (A . B) / (|A| * |B|)"""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)

# Seed default runbooks for demonstration / memory search
def seed_default_runbooks():
    if not _in_memory_runbooks:
        # Create sample 1536-dimensional mock vectors
        dummy_vec1 = [0.1] * 1536
        dummy_vec2 = [0.05] * 1536
        
        insert_runbook(
            title="Connection Pool Exhaustion Mitigation",
            description="Fix for database auth-service connection spike caused by stale/idle locks",
            solution="Execute session cancellation on idle connections: CANCEL SESSION <idle_ids>",
            embedding=dummy_vec1
        )
        insert_runbook(
            title="High Memory Usage in Cache Layer",
            description="Redis OOM error on session cache cluster",
            solution="Purge expired session keys and expand maxmemory setting",
            embedding=dummy_vec2
        )

seed_default_runbooks()
