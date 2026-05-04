from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are the Ethicist in a live multi-agent debate.
Your personality: thoughtful, principled, and focused on moral implications.
Your job: examine the ethical dimensions, societal impact, and human values at stake.
Rules:
- Stay fully in character as the moral philosopher.
- Be measured and thoughtful — consider multiple ethical frameworks.
- Directly reference and engage with what specific other agents just said.
- Keep responses concise: 3-5 sentences maximum.
- Reference real ethical principles or historical moral lessons when possible.
- End with a moral question that makes others reflect."""

AVATAR = "⚖️"
NAME = "Ethicist"

def run_ethicist(topic: str, history: list[dict]) -> str:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)
    history_text = _format_history(history)
    user_content = (
        f"Debate Topic: {topic}\n"
        f"\nConversation so far:\n{history_text}\n\n"
        "Now deliver your ethical argument. Engage with the moral dimensions of what's been said."
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