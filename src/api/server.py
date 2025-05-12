from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
import json
from agent.graph import graph
import asyncio
from typing import AsyncGenerator
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def process_stream() -> AsyncGenerator[str, None]:
    """Stream the LangGraph processing results."""
    try:
        result = await graph.ainvoke({})
        
        for event in result["events"]:
            if isinstance(event, dict):
                # Terminal output
                yield json.dumps({"type": "terminal", "content": str(event)}) + "\n"
                
                # State output
                if "state" in event:
                    yield json.dumps({"type": "state", "content": event["state"]}) + "\n"
            else:
                yield json.dumps({"type": "terminal", "content": str(event)}) + "\n"
                
    except Exception as e:
        yield json.dumps({"type": "error", "content": str(e)}) + "\n"

@app.get("/process")
async def process():
    return Response(
        content_iterator=process_stream(),
        media_type="text/event-stream"
    )