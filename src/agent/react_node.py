from langgraph.prebuilt import create_react_agent
from agent.state import State
from langchain_core.runnables import RunnableConfig
from typing import Any, Dict
from langgraph.types import Command
from langchain_core.messages import ToolMessage, HumanMessage
import langchain

from langgraph.prebuilt.interrupt import (
    ActionRequest,
    HumanInterrupt,
    HumanInterruptConfig,
    HumanResponse,
)
from langgraph.types import interrupt
import httpx
import base64
import os

def query_to_human(query: str) -> str:
    """Query to human if you need to know some information."""
    action_request = ActionRequest(
        action="Confirm Message",
        args={"message": query},
    )

    interrupt_config = HumanInterruptConfig(
        allow_ignore=True,  # ユーザーが無視できる
        allow_respond=True,  # ユーザーが返信できる
        allow_edit=True,  # ユーザーが編集できる
        allow_accept=True,  # ユーザーが承認できる
    )

    async_request = HumanInterrupt(
        action_request=action_request, config=interrupt_config
    )

    human_response: HumanResponse = interrupt([async_request])[0]

    message = ""
    if human_response.get("type") == "response":
        message = f"User responded with: {human_response.get('args')}"
        
    elif human_response.get("type") == "accept":
        message = f"User accepted with: {human_response.get('args')}"
        
    elif human_response.get("type") == "edit":
        message = f"User edited with: {human_response.get('args')}"
        
    elif human_response.get("type") == "ignore":
        message = "User ignored interrupt."
    
    return message

def get_base64_from_image(image_path: str) -> str:
    """
    画像ファイルを読み込み、base64エンコードされた文字列を返す関数

    Args:
        image_path (str): 画像ファイルのパス

    Returns:
        str: base64エンコードされた画像データ
    """
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")

def react_node(state: State, config: RunnableConfig) -> Dict[str, Any]:
    # Increment iteration count
    current_iteration = int(state.iteration_count) + 1
    print(f"--- Iteration {current_iteration}/{state.max_iterations} ---")

    state.data_info = {1:"C:\\Users\\nyham\\work\\sampletest_3\\agent-inbox-langgraph-example\\data\\sample\\1",2:"C:\\Users\\nyham\\work\\sampletest_3\\agent-inbox-langgraph-example\\data\\sample\\2"}

    for file in os.listdir(state.data_info[current_iteration]):
        if file.endswith(".jpg") or file.endswith(".png"):
            image_data = get_base64_from_image(os.path.join(state.data_info[current_iteration], file))
            break

    agent = create_react_agent(
        model="gpt-4o-mini",
        tools=[query_to_human],
        prompt="必ず日本語で回答してください。",
    )

    procedure = state.procedure
    # Run the agent
    message = HumanMessage(
        content=[
            {"type":"text","text":procedure},
            {
                "type":"image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{image_data}"
                }
            }
        ]
    )

    inputs = {"messages": [message]}
    result = agent.invoke(inputs)

    # Update state with new messages and incremented count
    return {"messages": result["messages"], "iteration_count": current_iteration, "iter_data": {"iter_id":current_iteration, "messages": result["messages"]}}