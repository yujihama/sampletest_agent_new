import logging
from langgraph.prebuilt import create_react_agent
from agent.state import State
from langchain_core.runnables import RunnableConfig
from typing import Any, Dict, List
from langgraph.types import Command
from langchain_core.messages import ToolMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, RootModel
import json

import base64
import os
import pandas as pd

logger = logging.getLogger(__name__)

class CellValue(BaseModel):
    cell_id: str
    value: str

class CellValueList(BaseModel):
    items: List[CellValue]

def update_format_node(state: State) -> dict:
    """
    Extracts iteration data from the state and converts it into a Pandas DataFrame.
    Currently, it prints the DataFrame for verification.
    """
    logger.info("--- Updating Format ---")
    iter_data = state.iter_data
    
    if not iter_data:
        logger.info("No iteration data found.")
        return {} # 状態は変更しない

    # Prepare data for DataFrame
    data_for_df = []
    for item in iter_data:
        iter_id = item.get("iter_id")
        messages = item.get("messages", [])
        
        # Extract content from messages (assuming the last message is most relevant, or adjust as needed)
        last_message = messages[-1] if messages else None
        content = ""
        if isinstance(last_message, AIMessage):
            content = last_message.content
        elif isinstance(last_message, HumanMessage):
            # HumanMessage can have complex content (text, image_url list)
            if isinstance(last_message.content, str):
                content = last_message.content
            elif isinstance(last_message.content, list):
                 # Extract text part if available
                 text_parts = [part.get("text") for part in last_message.content if isinstance(part, dict) and part.get("type") == "text"]
                 content = "\\n".join(filter(None, text_parts))
        elif isinstance(last_message, ToolMessage):
            content = f"Tool Call: {last_message.tool_call_id}, Output: {last_message.content}"
            
        # Add other relevant message info if needed
            
        data_for_df.append({
            "sample_data": iter_id,
            "result": content,
            # Add other fields extracted from messages if necessary
        })

    df = pd.DataFrame(data_for_df)
    format_file = state.excel_format_json_path
    with open(format_file, "r", encoding="utf-8") as f:
        format_json = f.read()

    # LLMに、各セルにどのようなデータを記入するか回答させる
    llm = ChatOpenAI(model="gpt-4.1-mini")
    prompt = f"""
    以下の形式で、各セル番号（cell_id）と記入すべき値（value）のペアをリストで出力してください。
    例:
    {{
      \"items\": [
        {{"cell_id": "C3", "value": "テスト名の例"}},
        {{"cell_id": "C4", "value": "2024-06-01"}}
      ]
    }}
    セル情報:
    {format_json}
    データ:
    {df.to_dict(orient="records")}
    """
    response = llm.with_structured_output(CellValueList).invoke(prompt)
    logger.info(response.items)

    return {"df": df.to_dict(orient="records"), "result": response.items}
