from datetime import date
from typing import Literal

from pydantic import BaseModel


class TopicMeta(BaseModel):
    id: str
    status: Literal['pending', 'in_progress', 'completed', 'review'] = 'pending'
    perceived_difficulty: Literal['easy', 'ok', 'hard'] | None = None
    weak_points: list[str] = []
    last_reviewed: date | None = None


class Subtopic(BaseModel):
    id: str
    title: str
    description: str
    completed: bool = False


class Topic(BaseModel):
    meta: TopicMeta
    title: str
    subtopics: list[Subtopic]


class Module(BaseModel):
    title: str
    description: str
    topics: list[Topic]


class Course(BaseModel):
    course: str
    slug: str
    created: date
    depth: Literal['quick', 'standard', 'deep']
    level: str
    goal: str
    language: str
    overview: str
    modules: list[Module]
