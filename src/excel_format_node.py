from state import State
from understand_format import build_workflow, ExcelFormFields, ValidationResult
from pathlib import Path

def run_excel_format_workflow_node(state: State) -> dict:
    """
    StateからExcelファイルパス・出力先・反復回数を取得し、Excel入力欄特定ワークフローを実行。
    結果（最終JSONや構造化データ）をStateに格納して返す。
    """
    # 子グラフの初期状態を作成
    initial_state = {
        "excel_file": state.excel_file,
        "output_dir": state.output_dir,
        "max_iterations": state.excel_max_iterations,
        "current_iteration": 1,
        "extracted_text_file": "",
        "original_excel_capture": "",
        "estimated_fields": {},
        "structured_fields": ExcelFormFields(fields=[], reason=""),
        "highlighted_excel": "",
        "highlighted_captures": [],
        "validation_result": "",
        "structured_validation": ValidationResult(status="OK"),
        "validation_status": "OK",
        "final_json": "",
        "status": "進行中",
        "error_message": ""
    }
    # 子グラフを構築・実行
    workflow = build_workflow()
    app = workflow.compile()
    result = app.invoke(initial_state)
    # Stateに結果を格納して返す
    return {
        "excel_format_result": result.get("estimated_fields", {}),
        "excel_format_json_path": result.get("final_json", ""),
        "highlighted_captures": result.get("highlighted_captures", "")
    } 