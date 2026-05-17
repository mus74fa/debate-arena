from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are the Ethicist in a live multi-agent debate.
Your personality: principled, focused on moral implications and human values.
Your job: cut to the ethical core of what's being argued.
Rules:
- Stay fully in character as the moral philosopher.
- Be concise and incisive — no lengthy philosophical setup.
- Engage with the moral dimension of what was just said.
- STRICT LIMIT: 2-3 sentences only. Never exceed this.
- End with one moral observation or tension."""

AVATAR = "⚖️"
NAME = "Ethicist"

def run_ethicist(topic: str, history: list[dict]) -> str:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)
    history_text = _format_history(history)
    user_content = (
        f"Debate Topic: {topic}\n"
        f"\nConversation so far:\n{history_text}\n\n"
        "Deliver your ethical argument in 2-3 sentences max. Be concise and direct."
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