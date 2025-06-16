from sqlalchemy import Column, DateTime, String, Integer, JSON, ForeignKey, Enum as SQLAlchemyEnum
from sqlalchemy.orm import relationship
from typing import List
from enum import Enum
from pydantic import BaseModel
from database import Base
from datetime import datetime

class NodeType(str, Enum):
    EXTRACT_TEXT = "extract_text"
    GENERATIVE_AI = "generative_ai"
    FORMATTER = "formatter"
    AGENT = "agent"

class WorkflowDB(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    nodes = relationship("NodeDB", back_populates="workflow", cascade="all, delete-orphan")

class NodeDB(Base):
    __tablename__ = "nodes"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    node_type = Column(String, nullable=False)
    config = Column(JSON, nullable=False)
    x = Column(Integer, default=0)  # ReactFlowのX座標
    y = Column(Integer, default=0)  # ReactFlowのY座標
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    workflow = relationship("WorkflowDB", back_populates="nodes")

class Node(BaseModel):
    id: str
    node_type: NodeType
    config: dict

    class Config:
        from_attributes = True

class Workflow(BaseModel):
    id: str
    name: str
    nodes: List[Node]

    class Config:
        from_attributes = True

class CreateWorkflowRequest(BaseModel):
    name: str

class CreateWorkflowResponse(BaseModel):
    id: str
    name: str

class AddNodeRequest(BaseModel):
    node_type: NodeType
    config: dict

class WorkflowDetailResponse(BaseModel):
    id: str
    name: str
    nodes: List[dict]
