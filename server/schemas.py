from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from models import NodeType

class NodeConfig(BaseModel):
    position: Dict[str, float]
    id: str
    type: str

class EdgeConfig(BaseModel):
    id: str
    source: str
    target: str
    animated: bool

class WorkflowConfig(BaseModel):
    node: NodeConfig
    edge: Optional[EdgeConfig] = None

class ExtractTextConfig(WorkflowConfig):
    file_name: str
    file_size: int
    file_type: str
    extracted_text: str

class GenerativeAIConfig(WorkflowConfig):
    prompt: str
    model: str
    temperature: float
    max_tokens: int

class FormatterConfig(WorkflowConfig):
    operation: str
    kana: Optional[bool] = None
    digit: Optional[bool] = None
    ascii: Optional[bool] = None

class NodeResponse(BaseModel):
    id: str
    node_type: NodeType
    config: Dict[str, Any]

class CreateWorkflowRequest(BaseModel):
    name: str

class CreateWorkflowResponse(BaseModel):
    id: str
    name: str

class AddNodeRequest(BaseModel):
    node_type: NodeType
    config: Dict[str, Any]

class WorkflowDetailResponse(BaseModel):
    id: str
    name: str
    nodes: List[NodeResponse]

class WorkflowExecutionResult(BaseModel):
    outputs: Dict[str, Any]
