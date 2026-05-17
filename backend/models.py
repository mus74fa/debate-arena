from datetime import date, datetime

class User:
    def __init__(self, id, username, email, hashed_password, is_admin, created_at):
        self.id = id
        self.username = username
        self.email = email
        self.hashed_password = hashed_password
        self.is_admin = is_admin
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

class Persona:
    def __init__(self, id, name, title, personality, debating_style, expertise, avatar, created_by, created_at):
        self.id = id
        self.name = name
        self.title = title
        self.personality = personality
        self.debating_style = debating_style
        self.expertise = expertise
        self.avatar = avatar
        self.created_by = created_by
        self.created_at = created_at

class HotTopic:
    def __init__(self, id, topic, date, created_at):
        self.id = id
        self.topic = topic
        self.date = date
        self.created_at = created_at

