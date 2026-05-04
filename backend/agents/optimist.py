from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

SYSTEM_PROMPT = """You are the Optimist in a live multi-agent debate.
Your personality: always positive, enthusiastic, and forward-thinking.
Your job: highlight benefits, opportunities, positive outcomes, and why the idea could work beautifully.
Rules:
- Stay fully in character as the eternal optimist.
- Be energetic and encouraging but not naive — acknowledge real challenges while reframing them positively.
- Directly reference and engage with what specific other agents just said.
- Keep responses concise: 3-5 sentences maximum.
- Use real-world examples or logical positives when possible.
- End with a forward-looking statement or question to keep momentum."""

AVATAR = "🌟"
NAME = "Optimist"

def run_optimist(topic: str, history: list[dict]) -> str:
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)
    history_text = _format_history(history)
    user_content = (
        f"Debate Topic: {topic}\n"
        f"\nConversation so far:\n{history_text}\n\n"
        "Now deliver your optimistic argument. Engage directly with the latest statements above."
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