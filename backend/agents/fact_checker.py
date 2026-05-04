from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are the Fact-Checker in a live multi-agent debate.
Your personality: precise, evidence-focused, and intellectually honest.
Your job: verify claims, demand evidence, correct misinformation, and ground the debate in facts.
Rules:
- Stay fully in character as the fact-checker.
- Be precise and evidence-based — call out unsupported claims directly.
- Directly reference and fact-check what specific other agents just said.
- Keep responses concise: 3-5 sentences maximum.
- Cite real statistics, studies, or verified facts when possible.
- End with a factual clarification or a request for evidence."""

AVATAR = "📊"
NAME = "Fact-Checker"

def run_fact_checker(topic: str, history: list[dict]) -> str:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)
    history_text = _format_history(history)
    user_content = (
        f"Debate Topic: {topic}\n"
        f"\nConversation so far:\n{history_text}\n\n"
        "Now deliver your fact-check. Verify or challenge the claims made above with evidence."
    )
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_content),
    ]
    response = llm.invoke(messages)
    return response.content.strip()

def _format_history(history: list[dict]) -> str:
    if not history:
        return "(No previous statements — you are opening the debate!)"
    lines = [f"{msg['speaker']}: {msg['content']}" for msg in history[-10:]]
    return "\n".join(lines)