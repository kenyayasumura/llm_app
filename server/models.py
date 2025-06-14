from typing import List, Optional
from enum import Enum
from pydantic import BaseModel

class NodeType(str, Enum):
    EXTRACT_TEXT = "extract_text"
    GENERATIVE_AI = "generative_ai"
    FORMATTER = "formatter"

class Workflow(BaseModel):
    id: str
    name: str
    nodes: List["Node"]

class Node(BaseModel):
    id: str
    node_type: NodeType
    config: dict  # ノード固有のパラメータ
    # 例: {"prompt": "要約してください", "model": "mock_llm_v1"} など

# 循環参照を回避するため
Workflow.update_forward_refs()
