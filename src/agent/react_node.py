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
import fitz

def query_to_human(query: str) -> str:
    """
    上位者への問い合わせを行う。
    どのデータについて、何を確認したいか明確に伝えることが必要。
    """
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

def analyze_image(image_data_num: int, query: str) -> str:
    """
    画像データを分析する。何枚目の画像について、何を確認したいか明確に伝えることが必要。
    arg:
        image_data_num: 何枚目の画像について知りたいか数字で指定
        query: 確認したい内容
    return:
        str: 分析結果
    """
    image_data_base64 = state.image_data[image_data_num-1]
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
    message = HumanMessage(
            content=[
                {"type":"text","text":query},
                {"type":"image_url","image_url": {"url": f"data:image/jpeg;base64,{image_data_base64}"}}
            ]
        )
    inputs = {"messages": [message]}
    result = llm.invoke(inputs)
    print(f"result: {result}")
    return result.content

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

    if state.sample_data_path:
        data_path = os.path.join("C:\\Users\\nyham\\work\\sampletest_3\\agent-inbox-langgraph-example\\data\\sample",state.sample_data_path)
        sample_num = len(os.listdir(data_path))

    image_data = []
    if state.sample_data_path:
        sample_data = os.listdir(data_path)[current_iteration-1]
        print(f"sample_data: {sample_data}")
        for file in os.listdir(os.path.join(data_path, sample_data)):
            file_path = os.path.join(data_path, sample_data, file)
            print(f"file_path: {file_path}")
            if file.endswith(".pdf"):
                # PyMuPDFでPDFをページごとに画像化
                doc = fitz.open(file_path)
                print(f"doc_length: {len(doc)}")
                for page in doc[:5]:
                    pix = page.get_pixmap()
                    # メモリ上でPNGバイト列に変換
                    image_bytes = pix.tobytes("png")
                    # base64エンコード
                    image_data.append(base64.b64encode(image_bytes).decode("utf-8"))
                doc.close()
            elif file.endswith(".jpg") or file.endswith(".png"):
                image_data.append(get_base64_from_image(file_path))
                
    agent = create_react_agent(
        model="gpt-4o-mini",
        state_schema = {"image_data": image_data},
        tools=[query_to_human, analyze_image],
        prompt="必ず日本語で回答してください。",
    )

    procedure = state.procedure
    # Run the agent
    if image_data:
        message = HumanMessage(
            content=[
                {"type":"text","text":procedure},
                *[{"type":"image_url","image_url": {"url": f"data:image/jpeg;base64,{image}"}} for image in image_data]
            ]
        )
    else:
        message = HumanMessage(
            content=[
                {"type":"text","text":procedure}
            ]
        )

    inputs = {"messages": [message]}
    result = agent.invoke(inputs)

    # Update state with new messages and incremented count
    return {"messages": result["messages"], "iteration_count": current_iteration, "max_iterations": sample_num, "iter_data": {"iter_id":current_iteration, "messages": result["messages"]}}