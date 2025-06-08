from typing import List
from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import asyncio
from pathlib import Path

app = FastAPI()

# Define the path to the project's root directory
# __file__ is src/webapp.py, so Path(__file__).resolve().parent.parent is the root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# Mount the 'data' directory to be served under '/files'
# This will allow accessing files like /data/format/file.xlsx via /files/format/file.xlsx
app.mount("/files", StaticFiles(directory=DATA_DIR), name="files")

UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "sample")
UPLOAD_ROOT_FORMAT = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "format")

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

@app.post("/upload-format/")
async def upload_format(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        content = await file.read()
        rel_path = file.filename.replace("..", "_").lstrip("/\\")
        save_path = os.path.join(UPLOAD_ROOT_FORMAT, rel_path)
        await asyncio.to_thread(save_file, save_path, content)
        results.append({
            "saved_path": os.path.relpath(save_path, UPLOAD_ROOT_FORMAT),
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