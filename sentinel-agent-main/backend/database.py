import logging
import math
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from config import settings

logger = logging.getLogger("sentinel.database")

_db_pool: pool.ThreadedConnectionPool | None = None
_in_memory_ephemeral_incidents: list[dict] = []
_in_memory_incident_memory: list[dict] = []

def init_db_pool():
    """Initialize psycopg2 ThreadedConnectionPool for CockroachDB concurrency."""
    global _db_pool
    try:
        _db_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=20,
            dsn=settings.DATABASE_URL
        )
        logger.info("CockroachDB connection pool initialized successfully.")
        _setup_schema()
    except Exception as e:
        logger.warning(f"Failed to connect to CockroachDB at {settings.DATABASE_URL}: {e}")
        logger.info("Operating with in-memory fallback for vector search & CockroachDB Dual Memory storage.")

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
    """Create active_incidents (Row-Level TTL) and incident_memory (vector_cosine_ops) tables."""
    conn = get_db_connection()
    if not conn:
        return
    try:
        with conn.cursor() as cur:
            # Enable pgvector if available
            try:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            except Exception:
                conn.rollback()

            # 1. Ephemeral Active Incidents Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS active_incidents (
                    id STRING PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
                    title STRING NOT NULL,
                    summary STRING,
                    details STRING,
                    created_at TIMESTAMPTZ DEFAULT now()
                );
            """)

            # 2. Vector Incident Memory Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS incident_memory (
                    id STRING PRIMARY KEY DEFAULT gen_random_uuid()::STRING,
                    title STRING NOT NULL,
                    summary STRING NOT NULL,
                    solution STRING,
                    embedding FLOAT8[] NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT now()
                );
            """)

            # Try creating vector index with vector_cosine_ops if vector extension is enabled
            try:
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS incident_memory_vector_idx 
                    ON incident_memory USING hnsw (embedding vector_cosine_ops);
                """)
            except Exception:
                conn.rollback()

            conn.commit()
            logger.info("CockroachDB Dual Memory schema setup complete.")
    except Exception as e:
        logger.error(f"Error initializing CockroachDB Dual Memory schema: {e}")
        conn.rollback()
    finally:
        release_db_connection(conn)

def log_ephemeral_incident(title: str, summary: str, details: str = "") -> dict:
    """
    Inserts a row into active_incidents appending 'EXPIRE AT now() + INTERVAL '24 hours''
    utilizing CockroachDB's Row-Level TTL.
    """
    conn = get_db_connection()
    incident_id = None
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO active_incidents (title, summary, details)
                    VALUES (%s, %s, %s)
                    EXPIRE AT now() + INTERVAL '24 hours'
                    RETURNING id;
                    """,
                    (title, summary, details)
                )
                incident_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Logged ephemeral incident {incident_id} with 24h Row-Level TTL in CockroachDB.")
        except Exception as e:
            logger.warning(f"CockroachDB TTL query fallback (attempting standard insert if EXPIRE AT unsupported): {e}")
            if conn:
                conn.rollback()
            # Standard fallback insert if EXPIRE AT clause is restricted
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO active_incidents (title, summary, details)
                        VALUES (%s, %s, %s)
                        RETURNING id;
                        """,
                        (title, summary, details)
                    )
                    incident_id = cur.fetchone()[0]
                    conn.commit()
            except Exception as ex:
                logger.error(f"Failed to insert active incident: {ex}")
                if conn:
                    conn.rollback()
        finally:
            release_db_connection(conn)

    record = {
        "id": incident_id or f"active-inc-{len(_in_memory_ephemeral_incidents) + 1}",
        "title": title,
        "summary": summary,
        "details": details,
        "ttl": "24 hours"
    }

    if not conn or not incident_id:
        _in_memory_ephemeral_incidents.append(record)

    return record

def search_past_incidents(embedding: list[float], top_k: int = 3) -> list[dict]:
    """
    Specifically queries the incident_memory table using vector_cosine_ops (or cosine similarity)
    and returns top matches along with their calculated similarity distance.
    Returns: [{'id': ..., 'title': ..., 'summary': ..., 'similarity': float}]
    """
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Attempt pgvector vector_cosine_ops operatorquery first
                try:
                    cur.execute(
                        """
                        SELECT id, title, summary, solution,
                               (1 - (embedding <=> %s::vector)) AS similarity
                        FROM incident_memory
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s;
                        """,
                        (embedding, embedding, top_k)
                    )
                    rows = cur.fetchall()
                    if rows:
                        return [
                            {
                                "id": r["id"],
                                "title": r["title"],
                                "summary": r["summary"],
                                "solution": r.get("solution", ""),
                                "similarity": round(float(r["similarity"]), 4)
                            }
                            for r in rows
                        ]
                except Exception as ve:
                    logger.debug(f"pgvector operator query failed, falling back to python cosine match: {ve}")
                    conn.rollback()

                # Fallback SELECT query for array types
                cur.execute("SELECT id, title, summary, solution, embedding FROM incident_memory;")
                rows = cur.fetchall()

            results = []
            for r in rows:
                emb = r["embedding"]
                sim = _cosine_similarity(embedding, emb)
                results.append({
                    "id": r["id"],
                    "title": r["title"],
                    "summary": r["summary"],
                    "solution": r.get("solution", ""),
                    "similarity": round(sim, 4)
                })

            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]
        except Exception as e:
            logger.error(f"CockroachDB incident_memory query error: {e}")
            if conn:
                conn.rollback()
        finally:
            release_db_connection(conn)

    # In-memory fallback if CockroachDB is not active
    results = []
    for r in _in_memory_incident_memory:
        sim = _cosine_similarity(embedding, r["embedding"])
        results.append({
            "id": r.get("id", "mem-id"),
            "title": r["title"],
            "summary": r["summary"],
            "solution": r.get("solution", ""),
            "similarity": round(sim, 4)
        })

    results.sort(key=lambda x: x["similarity"], reverse=True)
    return results[:top_k]

def insert_incident_memory(title: str, summary: str, solution: str, embedding: list[float]) -> dict:
    """Inserts a past incident record into incident_memory table."""
    conn = get_db_connection()
    inc_id = None
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO incident_memory (title, summary, solution, embedding)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id;
                    """,
                    (title, summary, solution, embedding)
                )
                inc_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Inserted incident memory {inc_id} into CockroachDB.")
        except Exception as e:
            logger.error(f"Error inserting incident memory into CockroachDB: {e}")
            conn.rollback()
        finally:
            release_db_connection(conn)

    record = {
        "id": inc_id or f"mem-inc-{len(_in_memory_incident_memory) + 1}",
        "title": title,
        "summary": summary,
        "solution": solution,
        "embedding": embedding
    }

    if not conn or not inc_id:
        _in_memory_incident_memory.append(record)

    return record

def vector_cosine_similarity_search(query_embedding: list[float], top_k: int = 3) -> list[dict]:
    """Compatibility wrapper redirecting to search_past_incidents."""
    return search_past_incidents(query_embedding, top_k)

def insert_runbook(title: str, description: str, solution: str, embedding: list[float]) -> dict:
    """Compatibility wrapper for inserting into incident memory."""
    return insert_incident_memory(title, description, solution, embedding)

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

# Seed default historical incident memory entries
def seed_default_incident_memory():
    if not _in_memory_incident_memory:
        dummy_vec1 = [0.1] * 1536
        dummy_vec2 = [0.08] * 1536
        dummy_vec3 = [0.04] * 1536

        insert_incident_memory(
            title="DB Connection Pool Exhaustion on auth-service",
            summary="Max connections reached in PostgreSQL primary node during traffic peak.",
            solution="Scale AWS EC2 cluster nodes & cancel idle DB sessions.",
            embedding=dummy_vec1
        )
        insert_incident_memory(
            title="Redis Cache Eviction Cascade & High CPU Spike",
            summary="Thundering herd on user session lookup leading to CPU throttle at 99%.",
            solution="Expand maxmemory and flush stale session keys.",
            embedding=dummy_vec2
        )
        insert_incident_memory(
            title="PostgreSQL Index Lock contention during migration",
            summary="Schema modification caused temporary deadlocks across replica nodes.",
            solution="Apply non-blocking CONCURRENTLY index creation.",
            embedding=dummy_vec3
        )

seed_default_incident_memory()
