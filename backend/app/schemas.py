from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .models import ApprovalStatus, FaultSeverity, FaultStatus
from .roles import UserRole


class SchemaBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class TelemetryRequest(SchemaBase):
    subsystemId: str = Field(min_length=1, max_length=64)
    processorTemperature: float = Field(ge=-100, le=200)
    powerDraw: float = Field(ge=0, le=1000)
    batteryLevel: float = Field(ge=0, le=100)
    communicationDelay: float = Field(ge=0, le=3600)
    processorLoad: float = Field(ge=0, le=100)
    memoryUtilization: float | None = Field(default=None, ge=0, le=100)
    storageUtilization: float | None = Field(default=None, ge=0, le=100)
    timestamp: datetime | None = None


class TelemetryResponse(SchemaBase):
    id: UUID
    subsystemId: str
    processorTemperature: float
    powerDraw: float
    batteryLevel: float
    communicationDelay: float
    processorLoad: float
    memoryUtilization: float | None = None
    storageUtilization: float | None = None
    timestamp: datetime


class FaultRequest(SchemaBase):
    subsystemId: str = Field(min_length=1, max_length=64)
    faultType: str = Field(min_length=1, max_length=80)
    severity: FaultSeverity
    description: str = Field(min_length=1, max_length=2000)
    telemetryId: UUID | None = None


class FaultPatchRequest(SchemaBase):
    status: FaultStatus | None = None
    resolutionNotes: str | None = Field(default=None, max_length=2000)


class FaultResponse(SchemaBase):
    id: UUID
    subsystemId: str
    faultType: str
    severity: FaultSeverity
    description: str
    detectionTimestamp: datetime
    status: FaultStatus
    resolvedAt: datetime | None = None
    resolutionNotes: str | None = None
    supportingTelemetry: TelemetryResponse | None = None


class RecoveryStrategyRequest(SchemaBase):
    faultId: UUID | None = None
    subsystemId: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(min_length=1, max_length=2000)
    policyRecommendation: str | None = Field(default=None, max_length=2000)
    decisionContext: dict | None = None


class RecoveryStrategyResponse(SchemaBase):
    id: UUID
    faultId: UUID | None = None
    subsystemId: str
    name: str
    description: str
    policyRecommendation: str | None = None
    decisionContext: dict | None = None
    executionEligibility: str
    approvalStatus: ApprovalStatus
    approvedBy: str | None = None
    approvedTimestamp: datetime | None = None
    createdTimestamp: datetime


class CommandVerificationRequest(SchemaBase):
    strategyId: UUID | None = None
    commandId: str = Field(min_length=1, max_length=120)
    proposedCommand: str = Field(min_length=1, max_length=2000)
    verificationMethod: str = Field(min_length=1, max_length=80)
    verificationStatus: str = Field(min_length=1, max_length=24)
    validationResult: str = Field(min_length=1, max_length=2000)
    actor: str | None = Field(default=None, max_length=120)


class CommandVerificationResponse(SchemaBase):
    id: UUID
    strategyId: UUID | None = None
    commandId: str
    proposedCommand: str
    verificationMethod: str
    verificationStatus: str
    validationResult: str
    actor: str | None = None
    timestamp: datetime


class RecoveryOutcomeRequest(SchemaBase):
    faultId: UUID | None = None
    strategyId: UUID | None = None
    verificationId: UUID | None = None
    replicationResult: str | None = Field(default=None, max_length=2000)
    recoveryOutcome: str = Field(min_length=1, max_length=80)
    missionStatus: str = Field(min_length=1, max_length=40)
    executionStatus: str = Field(min_length=1, max_length=40)
    executionTimestamp: datetime | None = None
    completionTimestamp: datetime | None = None
    diagnosticExplanation: str | None = Field(default=None, max_length=2000)


class RecoveryOutcomeResponse(SchemaBase):
    id: UUID
    faultId: UUID | None = None
    strategyId: UUID | None = None
    verificationId: UUID | None = None
    replicationResult: str | None = None
    recoveryOutcome: str
    missionStatus: str
    executionStatus: str
    executionTimestamp: datetime | None = None
    completionTimestamp: datetime | None = None
    diagnosticExplanation: str | None = None


T = TypeVar("T")


class PageResponse(BaseModel, Generic[T]):
    content: list[T]
    totalElements: int
    totalPages: int
    size: int
    number: int
    first: bool
    last: bool


class SubsystemSummary(SchemaBase):
    subsystemId: str
    health: float
    status: str
    trend: str
    signals: int
    lastUpdate: datetime


class DashboardOverviewResponse(SchemaBase):
    missionStatus: str
    hasData: bool
    telemetryCount: int
    activeFaultCount: int
    aiAvailable: bool
    generatedAt: datetime
    latestTelemetry: list[TelemetryResponse]
    subsystems: list[SubsystemSummary]
    recentFaults: list[FaultResponse]


class AiAnalysisRequest(SchemaBase):
    task: str = Field(min_length=1)
    faultId: UUID | None = None
    telemetryContext: str | None = None
    strategyContext: str | None = None


class AiAnalysisResponse(SchemaBase):
    available: bool
    capability: str
    content: str | None = None
    message: str | None = None
    generatedAt: datetime


class AuthRequest(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=200)
    role: UserRole


class AuthResponse(BaseModel):
    accessToken: str
    expiresAt: datetime
    role: UserRole
