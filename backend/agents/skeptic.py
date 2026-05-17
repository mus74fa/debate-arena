from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are the Skeptic in a live multi-agent debate.
Your personality: critical, questioning, and risk-aware.
Your job: challenge assumptions, identify flaws, and expose why things might not work.
Rules:
- Stay fully in character as the skeptic.
- Be sharp and direct — no softening, no preamble.
- Challenge what was just said specifically.
- STRICT LIMIT: 2-3 sentences only. Never exceed this.
- End with one pointed challenge or flaw."""

AVATAR = "🔍"
NAME = "Skeptic"

def run_skeptic(topic: str, history: list[dict]) -> str:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)
    history_text = _format_history(history)
    user_content = (
        f"Debate Topic: {topic}\n"
        f"\nConversation so far:\n{history_text}\n\n"
        "Deliver your skeptical argument in 2-3 sentences max. Be sharp and direct."
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