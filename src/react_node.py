from langgraph.prebuilt import create_react_agent
from pydantic import BaseModel, Field
from state import State
from langchain_core.runnables import RunnableConfig
from typing import Any, Dict, Sequence, TypedDict, Union
from langgraph.types import Command
from langchain_core.messages import ToolMessage, HumanMessage, BaseMessage
import langchain
from langchain_community.tools import tool
from langchain_openai import ChatOpenAI

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
import logging

from langgraph.graph.message import add_messages
from langgraph.managed import IsLastStep, RemainingSteps
from typing_extensions import Annotated

logger = logging.getLogger(__name__)

StructuredResponse = Union[dict, BaseModel]
class AgentState_custom(TypedDict):
    """The state of the agent."""

    messages: Annotated[Sequence[BaseMessage], add_messages]
    is_last_step: IsLastStep
    remaining_steps: RemainingSteps
    structured_response: StructuredResponse
    thought: str = Field(description="思考")

class Result(BaseModel):
    reason: str = Field(description="判断根拠")
    support_data: str = Field(description="根拠を裏付けるデータ")
    result: str = Field(description="結果(OK/NG/NA)")

def query_to_human(query: str, purpose: str) -> str:
    """
    他の手段で回答に必要な情報を取得できない場合（画像が不鮮明な場合など）に、人間に問い合わせる。
    どのデータについて、何を確認したいか明確に伝えることが必要。

    arg:
        query: 問い合わせ内容
        data: 問い合わせ対象のデータ
        purpose: このツールを呼ぶ意図・目的
    return:
        str: 問い合わせ結果
    """
    action_request = ActionRequest(
        action="Confirm Message",
        args={"message": query},
    )

    interrupt_config = HumanInterruptConfig(
        # allow_ignore=True,  # ユーザーが無視できる
        allow_respond=True,  # ユーザーが返信できる
        allow_edit=True,  # ユーザーが編集できる
        # allow_accept=True,  # ユーザーが承認できる
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
    logger.info(f"--- Iteration {current_iteration}/{state.max_iterations} ---")

    if state.sample_data_path:
        data_path = os.path.join("C:\\Users\\nyham\\work\\sampletest_3\\agent-inbox-langgraph-example\\data\\sample",state.sample_data_path)
        sample_num = len(os.listdir(data_path))

    image_data = []
    txt_data = []
    if state.sample_data_path:
        sample_data = os.listdir(data_path)[current_iteration-1]
        logger.info(f"sample_data: {sample_data}")
        for file in os.listdir(os.path.join(data_path, sample_data)):
            file_path = os.path.join(data_path, sample_data, file)
            logger.info(f"file_path: {file_path}")
            if file.endswith(".pdf"):
                # PyMuPDFでPDFをページごとに画像化
                doc = fitz.open(file_path)
                logger.info(f"doc_length: {len(doc)}")
                for page in doc[:5]:
                    pix = page.get_pixmap()
                    # メモリ上でPNGバイト列に変換
                    image_bytes = pix.tobytes("png")
                    # base64エンコード
                    image_data.append(base64.b64encode(image_bytes).decode("utf-8"))
                doc.close()
            elif file.endswith(".jpg") or file.endswith(".png"):
                image_data.append(get_base64_from_image(file_path))
            else:
                with open(file_path, "r", encoding="utf-8") as f:
                    txt_data.append(f.read())
                
    # analyze_image_tool を react_node のスコープ内で定義し、image_data をクロージャでキャプチャ
    @tool
    def analyze_image_tool(image_data_num: int, query: str) -> str:
        """
        画像データを分析する。何枚目の画像について、何を確認したいか明確に伝えることが必要。
        arg:
            image_data_num: 何枚目の画像について知りたいか数字で指定 (1-indexed)
            query: 確認したい内容
        return:
            str: 分析結果
        """
        nonlocal image_data # react_node スコープの image_data を参照
        if not image_data or not (0 < image_data_num <= len(image_data)):
            return "指定された番号の画像データが見つからないか、番号が範囲外です。"
        
        image_data_base64 = image_data[image_data_num-1]
        
        llm_for_tool = ChatOpenAI(model="gpt-4.1-mini") 
        tool_message_content = HumanMessage(
            content=[
                {"type": "text", "text": query},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data_base64}"}}
            ]
        )
        result = llm_for_tool.invoke([tool_message_content])
        # print(f"analyze_image_tool result: {result.content}") # デバッグ用
        return result.content

    agent = create_react_agent(
        model="gpt-4.1-mini",
        tools=[query_to_human, analyze_image_tool],
        prompt="必ず日本語で回答してください。監査人として手続きを実施してください。情報不備がある場合や複数の解釈が考えられる場合は自分の力で考えず、**必ず**query_to_humanツールで人間に問い合わせてください。",
        state_schema=AgentState_custom,
        response_format=Result
    )

    procedure = state.procedure
    format = "以下のフォーマットに従って回答してください。"
    # Run the agent
    if image_data:
        procedure_with_txtdata = "以下の手続きを実施し、結果と根拠を明確に示してください。監査人として手続きを実施してください。情報不備がある場合や複数の解釈が考えられる場合は自分の力で考えず、**必ず**query_to_humanツールで人間に問い合わせてください。\n" + procedure + "\n" + format + "\n" + "以下はこの手続きに使用するテキストデータです。\n" + "\n".join(txt_data)
        message = HumanMessage(
            content=[
                {"type":"text","text":procedure_with_txtdata},
                *[{"type":"image_url","image_url": {"url": f"data:image/jpeg;base64,{image}"}} for image in image_data]
            ]
        )
    else:
        procedure_with_txtdata = "以下の手続きを実施し、結果と根拠を明確に示してください。\n" + procedure + "\n" + format + "\n" + "以下はこの手続きに使用するテキストデータです。\n" + "\n".join(txt_data)
        message = HumanMessage(
            content=[
                {"type":"text","text":procedure_with_txtdata}
            ]
        )

    inputs = {"messages": [message]}
    result = agent.invoke(inputs)

    # eval_prompt = "以下は監査結果が論理的に妥当な内容か評価してください。\n" + f"監査手続き:{procedure}\n" + "以下は監査結果です。\n" + str(result["structured_response"])
    # eval_result = agent.invoke({"messages": [("human", eval_prompt)]})

    # Update state with new messages and incremented count
    return {"messages": result["messages"], "iteration_count": current_iteration, "max_iterations": sample_num, "iter_data": {"iter_id":current_iteration, "result": result["structured_response"]}}