from agents.optimist import run_optimist, NAME as OPTIMIST_NAME, AVATAR as OPTIMIST_AVATAR
from agents.skeptic import run_skeptic, NAME as SKEPTIC_NAME, AVATAR as SKEPTIC_AVATAR
from agents.ethicist import run_ethicist, NAME as ETHICIST_NAME, AVATAR as ETHICIST_AVATAR
from agents.fact_checker import run_fact_checker, NAME as FACT_CHECKER_NAME, AVATAR as FACT_CHECKER_AVATAR
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

AGENT_ORDER = ["Optimist", "Skeptic", "Ethicist", "Fact-Checker"]

AGENT_REGISTRY = {
    "Optimist": {"run": run_optimist, "avatar": OPTIMIST_AVATAR, "name": OPTIMIST_NAME},
    "Skeptic": {"run": run_skeptic, "avatar": SKEPTIC_AVATAR, "name": SKEPTIC_NAME},
    "Ethicist": {"run": run_ethicist, "avatar": ETHICIST_AVATAR, "name": ETHICIST_NAME},
    "Fact-Checker": {"run": run_fact_checker, "avatar": FACT_CHECKER_AVATAR, "name": FACT_CHECKER_NAME},
}


def _format_history_for_persona(history: list[dict]) -> str:
    if not history:
        return "(No previous statements — you are opening the debate!)"
    recent = history[-10:]
    return "\n".join(f"{h['speaker']}: {h['content']}" for h in recent)


def run_persona_agent(persona: dict, topic: str, history: list[dict]) -> str:
    name = persona["name"]
    title = persona.get("title") or ""
    personality = persona["personality"]
    debating_style = persona["debating_style"]
    expertise = persona["expertise"]

    title_line = f", {title}" if title else ""

    system_prompt = f"""You are {name}{title_line}, participating in a live multi-agent debate.

Background:
- Personality: {personality}
- Debating style: {debating_style}
- Field of expertise: {expertise}

Rules:
- Stay completely in character as {name}.
- Draw on your expertise in {expertise}.
- Apply your debating style: {debating_style}.
- STRICT LIMIT: 2-3 sentences only. Never exceed this.
- Speak in the first person. No preamble."""

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.8)
    history_text = _format_history_for_persona(history)
    user_content = (
        f"Debate Topic: {topic}\n"
        f"\nConversation so far:\n{history_text}\n\n"
        f"Deliver your argument as {name} in 2-3 sentences max."
    )
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_content),
    ]
    response = llm.invoke(messages)
    return response.content.strip()


def run_question_agent(speaker_info: dict, topic: str, history: list[dict]) -> str:
    """Generate a short question directed at the user to get their perspective."""
    name = speaker_info.get("name", "Agent")
    expertise = speaker_info.get("expertise", "")
    title = speaker_info.get("title", "")

    if speaker_info.get("_is_default"):
        # Built-in agent — derive persona from the key
        key = speaker_info.get("_key", name)
        personas_context = {
            "Optimist": "an optimist who sees opportunities",
            "Skeptic": "a skeptic who questions assumptions",
            "Ethicist": "an ethicist focused on moral implications",
            "Fact-Checker": "a fact-checker focused on evidence",
        }
        role_desc = personas_context.get(key, "a debater")
    else:
        role_desc = f"{title} with expertise in {expertise}" if expertise else name

    system_prompt = f"""You are {name}, {role_desc}, in a live debate.
You want to pause and ask the human observer a question to hear their view.
Rules:
- Ask exactly ONE short, direct question related to the debate topic.
- Make it feel natural and conversational — like you genuinely want to know.
- Address them as "you" directly.
- 1-2 sentences maximum. No preamble."""

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.9)
    history_text = _format_history_for_persona(history)
    user_content = (
        f"Debate Topic: {topic}\n"
        f"\nConversation so far:\n{history_text}\n\n"
        f"Ask the human one direct question about their view on this topic."
    )
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_content),
    ]
    response = llm.invoke(messages)
    return response.content.strip()