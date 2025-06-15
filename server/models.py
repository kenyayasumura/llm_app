from sqlalchemy import Column, String, JSON, ForeignKey
from sqlalchemy.orm import relationship
from typing import List, Optional
from enum import Enum
from pydantic import BaseModel
from database import Base

class NodeType(str, Enum):
    EXTRACT_TEXT = "extract_text"
    GENERATIVE_AI = "generative_ai"
    FORMATTER = "formatter"

# SQLAlchemy models
class WorkflowDB(Base):
    __tablename__ = "workflows"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    nodes = relationship("NodeDB", back_populates="workflow", cascade="all, delete-orphan")

class NodeDB(Base):
    __tablename__ = "nodes"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, ForeignKey("workflows.id"))
    node_type = Column(String, nullable=False)
    config = Column(JSON, nullable=False)
    workflow = relationship("WorkflowDB", back_populates="nodes")

# Pydantic models for API
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
