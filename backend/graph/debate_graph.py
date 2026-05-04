from typing import TypedDict, List, Dict, Any
from langgraph.graph import StateGraph, END
from agents import AGENT_REGISTRY, AGENT_ORDER

class DebateState(TypedDict):
    debate_id: int
    topic: str
    messages: List[Dict[str, Any]]
    current_round: int
    max_rounds: int
    current_step: int
    user_input: str

def make_agent_node(agent_name: str):
    def node(state: DebateState) -> DebateState:
        agent = AGENT_REGISTRY[agent_name]
        response = agent["run"](state["topic"], state["messages"])
        new_message = {
            "speaker": agent_name,
            "avatar": agent["avatar"],
            "content": response
        }
        new_messages = state["messages"] + [new_message]
        new_step = state["current_step"] + 1
        new_round = state["current_round"]
        if new_step >= len(AGENT_ORDER):
            new_step = 0
            new_round += 1
        return {
            **state,
            "messages": new_messages,
            "current_step": new_step,
            "current_round": new_round,
        }
    return node

def user_node(state: DebateState) -> DebateState:
    new_message = {
        "speaker": "You",
        "avatar": "💬",
        "content": state["user_input"]
    }
    return {
        **state,
        "messages": state["messages"] + [new_message],
        "user_input": ""
    }

def route_after_fact_checker(state: DebateState) -> str:
    if state["current_round"] >= state["max_rounds"]:
        return END
    return "Optimist"

def start_route(state: DebateState) -> str:
    if state.get("user_input"):
        return "User"
    return "Optimist"

def build_debate_graph():
    graph = StateGraph(DebateState)

    graph.add_node("Optimist", make_agent_node("Optimist"))
    graph.add_node("Skeptic", make_agent_node("Skeptic"))
    graph.add_node("Ethicist", make_agent_node("Ethicist"))
    graph.add_node("Fact-Checker", make_agent_node("Fact-Checker"))
    graph.add_node("User", user_node)

    graph.set_conditional_entry_point(start_route, {
        "User": "User",
        "Optimist": "Optimist"
    })

    graph.add_edge("User", "Optimist")
    graph.add_edge("Optimist", "Skeptic")
    graph.add_edge("Skeptic", "Ethicist")
    graph.add_edge("Ethicist", "Fact-Checker")
    graph.add_conditional_edges("Fact-Checker", route_after_fact_checker, {
        "Optimist": "Optimist",
        END: END
    })

    return graph.compile()

debate_graph = build_debate_graph()