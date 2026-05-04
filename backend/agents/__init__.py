from agents.optimist import run_optimist, NAME as OPTIMIST_NAME, AVATAR as OPTIMIST_AVATAR
from agents.skeptic import run_skeptic, NAME as SKEPTIC_NAME, AVATAR as SKEPTIC_AVATAR
from agents.ethicist import run_ethicist, NAME as ETHICIST_NAME, AVATAR as ETHICIST_AVATAR
from agents.fact_checker import run_fact_checker, NAME as FACT_CHECKER_NAME, AVATAR as FACT_CHECKER_AVATAR

AGENT_ORDER = ["Optimist", "Skeptic", "Ethicist", "Fact-Checker"]

AGENT_REGISTRY = {
    "Optimist": {"run": run_optimist, "avatar": OPTIMIST_AVATAR, "name": OPTIMIST_NAME},
    "Skeptic": {"run": run_skeptic, "avatar": SKEPTIC_AVATAR, "name": SKEPTIC_NAME},
    "Ethicist": {"run": run_ethicist, "avatar": ETHICIST_AVATAR, "name": ETHICIST_NAME},
    "Fact-Checker": {"run": run_fact_checker, "avatar": FACT_CHECKER_AVATAR, "name": FACT_CHECKER_NAME},
}