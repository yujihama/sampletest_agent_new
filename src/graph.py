import sys
import langgraph.prebuilt
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

"""Module for defining the agent's workflow graph and human interaction nodes."""

from langgraph.graph import StateGraph, END
from state import State
from react_node import react_node
from update_format_node import update_format_node
from excel_format_node import run_excel_format_workflow_node

# Define a new graph
workflow = StateGraph(State)

# Add the node to the graph. This node will interrupt when it is invoked.
workflow.add_node("react_node", react_node)
workflow.add_node("update_format_node", update_format_node)
workflow.add_node("run_excel_format_workflow_node", run_excel_format_workflow_node)

# Define the conditional edge function
def should_continue(state: State) -> str:
    """Determines whether to continue the loop or end."""
    if state.iteration_count >= state.max_iterations:
        return "end"
    else:
        return "continue"

# Set the entrypoint as `react_node`
workflow.add_edge("__start__", "react_node")
# Add the conditional edge
workflow.add_conditional_edges(
    "react_node",
    should_continue,
    {
        "continue": "react_node",  # Loop back to react_node if should_continue returns "continue"
        "end": "run_excel_format_workflow_node"  # "end" の場合に run_excel_format_workflow_node へ遷移
    }
)

# Add edge from run_excel_format_workflow_node to update_format_node
workflow.add_edge("run_excel_format_workflow_node", "update_format_node")

# Compile the workflow into an executable graph
graph = workflow.compile()
graph.name = "Agent Inbox Example"  # This defines the custom name in LangSmith
