from datetime import date, datetime

class User:
    def __init__(self, id, username, email, hashed_password, is_admin, xp, level, streak, last_active, created_at):
        self.id = id
        self.username = username
        self.email = email
        self.hashed_password = hashed_password
        self.is_admin = is_admin
        self.xp = xp
        self.level = level
        self.streak = streak
        self.last_active = last_active
        self.created_at = created_at

class Debate:
    def __init__(self, id, user_id, topic, rounds, status, created_at):
        self.id = id
        self.user_id = user_id
        self.topic = topic
        self.rounds = rounds
        self.status = status
        self.created_at = created_at

class DebateMessage:
    def __init__(self, id, debate_id, speaker, content, created_at):
        self.id = id
        self.debate_id = debate_id
        self.speaker = speaker
        self.content = content
        self.created_at = created_at

class HotTopic:
    def __init__(self, id, topic, date, created_at):
        self.id = id
        self.topic = topic
        self.date = date
        self.created_at = created_at

def calculate_level(xp):
    if xp >= 1000:
        return 5
    elif xp >= 500:
        return 4
    elif xp >= 250:
        return 3
    elif xp >= 100:
        return 2
    else:
        return 1

def get_level_title(level):
    titles = {
        1: "Debate Novice",
        2: "Argument Apprentice",
        3: "Logic Scholar",
        4: "Rhetoric Master",
        5: "Grand Debater"
    }
    return titles.get(level, "Debate Novice")

def xp_for_next_level(level):
    thresholds = {1: 100, 2: 250, 3: 500, 4: 1000, 5: 1000}
    return thresholds.get(level, 1000)