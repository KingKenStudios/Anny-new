"""
ANNY - MODULE 06: LOCAL KNOWLEDGE RAG
Description: Persistent vector storage for offline document retrieval.
"""

import chromadb
from chromadb.config import Settings
import uuid
from typing import List, Dict, Optional

class NeuralMemory:
    def __init__(self, storage_path: str = "./database/vector_store"):
        self.client = chromadb.PersistentClient(path=storage_path)
        self.collection = self.client.get_or_create_collection(name="system_knowledge")

    def remember(self, text: str, metadata: Optional[Dict] = None):
        """Stores text into the long-term vector vault."""
        doc_id = str(uuid.uuid4())
        self.collection.add(
            documents=[text],
            metadatas=[metadata or {"source": "manual_entry"}],
            ids=[doc_id]
        )
        return doc_id

    def recall(self, query: str, limit: int = 5) -> List[str]:
        """Retrieves relevant context based on semantic similarity."""
        results = self.collection.query(
            query_texts=[query],
            n_results=limit
        )
        return results['documents'][0]

    def clear(self):
        """Wipes the current collection for re-indexing."""
        self.client.delete_collection(name="system_knowledge")
        self.collection = self.client.get_or_create_collection(name="system_knowledge")

if __name__ == "__main__":
    memory = NeuralMemory()
    print("Indexing industrial policy...")
    memory.remember(
        "LOTO Safety Rule: Always verify zero energy state before maintenance.",
        {"category": "ics_safety"}
    )
    
    print("Recalling safety data...")
    rel_facts = memory.recall("How to perform maintenance safely?")
    for i, fact in enumerate(rel_facts):
        print(f"Fact {i+1}: {fact}")
