"""
ANNY - MODULE 18: NEURAL MEMORY ENGINE
Filename: memory_engine.py
Purpose: Persistent vector-based memory, conversation indexing, and semantic retrieval.
"""

import os
import uuid
import time
import json
import logging
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional, Union

class MemoryEngine:
    """
    The long-term neural vault for ANNY. 
    Manages vector embeddings, conversation history, and ranked retrieval.
    """

    def __init__(self, db_path: str = "./database/neural_vault"):
        self.db_path = db_path
        os.makedirs(self.db_path, exist_ok=True)
        
        # Initialize Persistent Vector Client
        self.client = chromadb.PersistentClient(path=self.db_path)
        
        # Collection for general semantic memories
        self.memories = self.client.get_or_create_collection(
            name="long_term_memory",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Collection for conversation history
        self.history = self.client.get_or_create_collection(
            name="conversation_history",
            metadata={"hnsw:space": "l2"}
        )
        
        self.cache: Dict[str, Any] = {}
        self._setup_logging()

    def _setup_logging(self):
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("Anny.MemoryEngine")

    def save_memory(self, text: str, metadata: Optional[Dict[str, Any]] = None, is_history: bool = False):
        """
        Commits a text-based memory to the persistent vector store.
        """
        doc_id = str(uuid.uuid4())
        collection = self.history if is_history else self.memories
        
        # Add metadata for temporal tracking
        meta = metadata or {}
        meta["timestamp"] = time.time()
        meta["date"] = time.strftime('%Y-%m-%d %H:%M:%S')

        try:
            collection.add(
                documents=[text],
                metadatas=[meta],
                ids=[doc_id]
            )
            self.logger.info(f"Memory Secured: {doc_id[:8]} (Collection: {'History' if is_history else 'General'})")
            return doc_id
        except Exception as e:
            self.logger.error(f"Error: Failed to encode memory. {str(e)}")
            return None

    def search_memory(self, query: str, limit: int = 5, min_relevance: float = 0.4) -> List[Dict[str, Any]]:
        """
        Semantic retrieval of memories based on vector similarity.
        """
        try:
            results = self.memories.query(
                query_texts=[query],
                n_results=limit
            )
            
            # Formulate response objects
            extracted = []
            for i in range(len(results['documents'][0])):
                # Chroma space 'cosine' returns distances where smaller is better
                # Converting to a rough relevance score
                distance = results['distances'][0][i]
                relevance = 1.0 - distance
                
                if relevance >= min_relevance:
                    extracted.append({
                        "content": results['documents'][0][i],
                        "metadata": results['metadatas'][0][i],
                        "relevance": round(relevance, 4)
                    })
            
            return self.rank_memory(extracted)
        except Exception as e:
            self.logger.error(f"Error: Semantic search failed. {str(e)}")
            return []

    def rank_memory(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Applies additional logic to rank results (e.g., giving preference to newer data).
        """
        # Sort by relevance primary, timestamp secondary
        return sorted(results, key=lambda x: (x['relevance'], x['metadata'].get('timestamp', 0)), reverse=True)

    def get_conversation_context(self, window: int = 10) -> str:
        """Retrieves the recent conversation context as a single block."""
        try:
            results = self.history.query(
                query_texts=[""], # Empty query to get latest if sorted by ID/Time
                n_results=window
            )
            # Reconstruct dialogue
            return "\n".join(results['documents'][0])
        except:
            return ""

    def clear_cache(self):
        """Wipes the volatile system cache."""
        self.cache = {}
        self.logger.info("Neural cache purged.")

    def wipe_all(self):
        """Destructive reset of all persistent memories."""
        self.client.delete_collection("long_term_memory")
        self.client.delete_collection("conversation_history")
        self.logger.critical("TOTAL MEMORY WIPE EXECUTED.")

if __name__ == "__main__":
    # Dependency: pip install chromadb
    engine = MemoryEngine()
    
    # Test Storage
    engine.save_memory("The system architecture consists of 15 modular units.", {"category": "system_rules"})
    engine.save_memory("Safety protocols require LOTO before maintenance.", {"category": "safety"})
    
    # Test Retrieval
    print("--- NEURAL RECALL TEST ---")
    results = engine.search_memory("How many modules are there?")
    for r in results:
        print(f"[{r['relevance']}] {r['content']}")
