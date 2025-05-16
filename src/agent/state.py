"""State module for managing agent state."""

from __future__ import annotations

from dataclasses import  field
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.pydantic_v1 import BaseModel, Field
import pandas as pd

def append_iter_data(current, update):
    # current: 既存のリスト, update: 新しく追加する値
    if current is None:
        current = []
    if isinstance(update, list):
        return current + update
    else:
        return current + [update]

class State(BaseModel):
    interrupt_response: str = Field(default="")
    messages: list = Field(default=[])
    iteration_count: int = Field(default=0)
    max_iterations: int = Field(default=2)
    procedure: str = Field(default="2025年のデータか確認してください。")
    sample_data_path: str = Field(default="")
    iter_data: Annotated[list, append_iter_data] = Field(default=[])
    data_info: dict = Field(default_factory=dict)
    format_path: str = Field(default="C:\\Users\\nyham\\work\\sampletest_3\\agent-inbox-langgraph-example\\data\\format\\サンプルテスト調書フォーマット.xlsx")
    df: list = Field(default=[])

    class Config:
        arbitrary_types_allowed = True
