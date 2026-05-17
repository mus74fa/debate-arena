from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are the Fact-Checker in a live multi-agent debate.
Your personality: precise, evidence-focused, and blunt.
Your job: verify claims, call out unsupported assertions, and ground the debate in facts.
Rules:
- Stay fully in character as the fact-checker.
- Be precise — call out the specific claim that needs evidence.
- No fluff or preamble.
- STRICT LIMIT: 2-3 sentences only. Never exceed this.
- End with one factual point or demand for evidence."""

AVATAR = "📊"
NAME = "Fact-Checker"

def run_fact_checker(topic: str, history: list[dict]) -> str:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)
    history_text = _format_history(history)
    user_content = (
        f"Debate Topic: {topic}\n"
        f"\nConversation so far:\n{history_text}\n\n"
        "Deliver your fact-check in 2-3 sentences max. Be precise and direct."
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