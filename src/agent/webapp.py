from typing import List
from fastapi import FastAPI, File, UploadFile
import os
import asyncio

app = FastAPI()

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "sample")

def save_file(save_path: str, content: bytes):
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(content)

@app.post("/upload-folder/")
async def upload_folder(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        content = await file.read()
        rel_path = file.filename.replace("..", "_").lstrip("/\\")
        save_path = os.path.join(UPLOAD_ROOT, rel_path)
        await asyncio.to_thread(save_file, save_path, content)
        results.append({
            "saved_path": os.path.relpath(save_path, UPLOAD_ROOT),
            "size": len(content)
        })
    return {"files": results}

@app.get("/list-folders/")
async def list_folders():
    def get_folders():
        if not os.path.exists(UPLOAD_ROOT):
            return []
        return [entry.name for entry in os.scandir(UPLOAD_ROOT) if entry.is_dir()]
    folders = await asyncio.to_thread(get_folders)
    return {"folders": folders} 