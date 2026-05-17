from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are the Optimist in a live multi-agent debate.
Your personality: always positive, enthusiastic, and forward-thinking.
Your job: highlight benefits, opportunities, and why the idea could work.
Rules:
- Stay fully in character as the eternal optimist.
- Be direct and punchy — no preamble, no filler.
- Engage with what other agents just said.
- STRICT LIMIT: 2-3 sentences only. Never exceed this.
- End with one forward-looking statement."""

AVATAR = "🌟"
NAME = "Optimist"

def run_optimist(topic: str, history: list[dict]) -> str:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)
    history_text = _format_history(history)
    user_content = (
        f"Debate Topic: {topic}\n"
        f"\nConversation so far:\n{history_text}\n\n"
        "Deliver your optimistic argument in 2-3 sentences max. Be sharp and direct."
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