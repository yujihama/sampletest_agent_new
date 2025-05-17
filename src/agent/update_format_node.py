from langgraph.prebuilt import create_react_agent
from agent.state import State
from langchain_core.runnables import RunnableConfig
from typing import Any, Dict
from langgraph.types import Command
from langchain_core.messages import ToolMessage, HumanMessage, AIMessage
import langchain

import base64
import os
import pandas as pd

def update_format_node(state: State) -> dict:
    """
    Extracts iteration data from the state and converts it into a Pandas DataFrame.
    Currently, it prints the DataFrame for verification.
    """
    print("--- Updating Format ---")
    iter_data = state.iter_data
    
    if not iter_data:
        print("No iteration data found.")
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
            "iteration": iter_id,
            "last_message_content": content,
            # Add other fields extracted from messages if necessary
        })

    df = pd.DataFrame(data_for_df)
    
    return {"df": df.to_dict(orient="records")} # Return empty dict as we are not updating the state fields directly here
