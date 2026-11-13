from enum import Enum


class UserRole(str, Enum):
    SCIENTIST = "scientist"
    OPERATIONAL_RESEARCHER = "operational_researcher"
