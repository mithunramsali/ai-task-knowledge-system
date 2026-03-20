import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
import os
import pickle

# Files for persistence
INDEX_FILE = "vector_store.index"
METADATA_FILE = "metadata.pkl"

# Global variables
model = SentenceTransformer('all-MiniLM-L6-v2')
dimension = 384
index = faiss.IndexFlatL2(dimension)
metadata = []

def save_index():
    """Saves both the FAISS index and the text metadata to disk."""
    # Save the math vectors
    faiss.write_index(index, INDEX_FILE)
    # Save the actual text chunks
    with open(METADATA_FILE, "wb") as f:
        pickle.dump(metadata, f)

def load_index():
    """Loads vectors and text chunks from disk on startup."""
    global index, metadata
    if os.path.exists(INDEX_FILE) and os.path.exists(METADATA_FILE):
        index = faiss.read_index(INDEX_FILE)
        with open(METADATA_FILE, "rb") as f:
            metadata = pickle.load(f)

def add_to_index(text: str):
    """Chunks text, creates embeddings, adds to FAISS, and saves state."""
    chunks = [text[i:i+500] for i in range(0, len(text), 500)]
    
    if chunks:
        embeddings = model.encode(chunks)
        index.add(np.array(embeddings).astype('float32'))
        metadata.extend(chunks)
        # Automatically save so data isn't lost 
        save_index()
    return True

def search_index(query: str, k: int = 3):
    """Searches vectors and safely retrieves matching text."""
    if not metadata:
        return []

    query_vector = model.encode([query])
    distances, indices = index.search(np.array(query_vector).astype('float32'), k)
    
    # Use a safety check to ensure indices match metadata length
    results = []
    for i in indices[0]:
        if i != -1 and i < len(metadata):
            results.append(metadata[i])
            
    return results