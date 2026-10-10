import os
from abc import ABC


class Env(ABC):
    """Abstract base class for environment configuration."""

    def __init__(self):
        self.VAULT_PATH = os.getenv("VAULT_PATH") or None
