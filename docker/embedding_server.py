"""
Local Embedding Server using Sentence Transformers
Provides a simple HTTP API for generating embeddings.
"""

import os
from typing import List, Union
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import uvicorn

# Configuration
MODEL_NAME = os.getenv('MODEL', 'all-MiniLM-L6-v2')

# Initialize model (downloads on first run)
print(f"Loading model: {MODEL_NAME}")
model = SentenceTransformer(MODEL_NAME)
print(f"Model loaded. Dimensions: {model.get_sentence_embedding_dimension()}")

app = FastAPI(
    title="Embedding Server",
    description="Local embedding service using Sentence Transformers",
    version="1.0.0"
)


class EmbedRequest(BaseModel):
    inputs: Union[str, List[str]]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimensions: int
    model: str


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    """Generate embeddings for input text(s)."""
    try:
        # Handle single string or list
        texts = request.inputs if isinstance(request.inputs, list) else [request.inputs]
        
        # Generate embeddings
        embeddings = model.encode(texts, normalize_embeddings=True)
        
        return EmbedResponse(
            embeddings=embeddings.tolist(),
            dimensions=len(embeddings[0]),
            model=MODEL_NAME
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "dimensions": model.get_sentence_embedding_dimension()
    }


@app.get("/")
async def root():
    """Root endpoint with usage info."""
    return {
        "service": "Embedding Server",
        "model": MODEL_NAME,
        "dimensions": model.get_sentence_embedding_dimension(),
        "endpoints": {
            "POST /embed": "Generate embeddings",
            "GET /health": "Health check"
        }
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv('PORT', 8080)))
