"""State module for managing agent state."""

from __future__ import annotations

from dataclasses import  field
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.pydantic_v1 import BaseModel, Field
import pandas as pd
import os
from pathlib import Path

# _DEFAULT_EXCEL_FORMAT_DIR = Path("C:/Users/nyham/work/sampletest_3/agent-inbox-langgraph-example/data/format") # コメントアウト

# def get_default_excel_file_from_format_dir() -> str: # コメントアウト
#     \"\"\"
#     デフォルトのExcelフォーマットディレクトリから最初のExcelファイルパスを取得する。
#     見つからない場合は空文字列を返す。
#     \"\"\"
#     if _DEFAULT_EXCEL_FORMAT_DIR.is_dir():
#         for item in sorted(list(_DEFAULT_EXCEL_FORMAT_DIR.iterdir())): # ソートして一貫性を保つ
#             if item.is_file() and item.suffix.lower() in ['.xlsx', '.xls']:
#                 return str(item.resolve())
#     return ""

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
    format_path: str = Field(default="C:\\\\Users\\\\nyham\\\\work\\\\sampletest_3\\\\agent-inbox-langgraph-example\\\\data\\\\format\\\\サンプルテスト調書フォーマット.xlsx")
    df: list = Field(default=[])
    excel_file: str = Field(default="C:\\\\Users\\\\nyham\\\\work\\\\sampletest_3\\\\agent-inbox-langgraph-example\\\\data\\\\format\\\\サンプルテスト調書フォーマット.xlsx", description="Excelファイルパス（Excel入力欄特定ワークフロー用）")
    output_dir: str = Field(default="C:\\\\Users\\\\nyham\\\\work\\\\sampletest_3\\\\agent-inbox-langgraph-example\\\\data\\\\format", description="出力ディレクトリ（Excel入力欄特定ワークフロー用）")
    output_excel_path: str = Field(default="", description="出力Excelファイルパス（Excel入力欄特定ワークフロー用）")
    excel_max_iterations: int = Field(default=5, description="Excel入力欄特定ワークフローの最大反復回数")
    excel_format_result: dict = Field(default_factory=dict, description="Excel入力欄特定ワークフローの最終結果（辞書形式）")
    excel_format_json_path: str = Field(default="", description="Excel入力欄特定ワークフローの最終JSONファイルパス")
    result: dict = Field(default_factory=dict, description="Excel入力欄特定ワークフローの最終結果（辞書形式）")
    highlighted_captures: list = Field(default=[], description="Excel入力欄特定ワークフローの最終結果（画像パス）")

    class Config:
        arbitrary_types_allowed = True
