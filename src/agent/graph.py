"""Module for defining the agent's workflow graph and human interaction nodes."""

from langgraph.graph import StateGraph, END
from agent.state import State
from agent.react_node import react_node
from agent.update_format_node import update_format_node

# Define a new graph
workflow = StateGraph(State)

# Add the node to the graph. This node will interrupt when it is invoked.
workflow.add_node("react_node", react_node)
workflow.add_node("update_format_node", update_format_node)

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
        "end": "update_format_node"  # "end" の場合に update_format_node へ遷移
    }
)

# Add edge from update_format_node to END
workflow.add_edge("update_format_node", END)

# Compile the workflow into an executable graph
graph = workflow.compile()
graph.name = "Agent Inbox Example"  # This defines the custom name in LangSmith
