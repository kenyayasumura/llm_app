from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from uuid import uuid4

from server.models import Workflow, Node, NodeType
from server.schemas import (
    CreateWorkflowRequest, CreateWorkflowResponse, 
    AddNodeRequest, WorkflowDetailResponse
)

app = FastAPI(title="Workflow App")

app.add_middleware(
    CORSMiddleware,
    allow_origins="http://localhost:*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
)

# 簡易的にメモリ内で管理
workflows = {}

@app.post("/workflows", response_model=CreateWorkflowResponse)
def create_workflow(req: CreateWorkflowRequest):
    wf_id = str(uuid4())
    new_wf = Workflow(id=wf_id, name=req.name, nodes=[])
    workflows[wf_id] = new_wf
    return CreateWorkflowResponse(id=wf_id, name=req.name)

@app.get("/workflows/{wf_id}", response_model=WorkflowDetailResponse)
def get_workflow(wf_id: str):
    wf = workflows.get(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowDetailResponse(
        id=wf.id, 
        name=wf.name, 
        nodes=[node.dict() for node in wf.nodes]
    )

@app.post("/workflows/{wf_id}/nodes")
def add_node(wf_id: str, req: AddNodeRequest):
    wf = workflows.get(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    node_id = str(uuid4())
    new_node = Node(id=node_id, node_type=req.node_type, config=req.config)
    wf.nodes.append(new_node)
    return {"message": "Node added", "node_id": node_id}

@app.post("/workflows/{wf_id}/run")
def run_workflow(wf_id: str):
    wf = workflows.get(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # シンプルに、ノードを順に処理してみる（疑似実装）
    data = {"text": "Initial text from some doc ..."}  # 本来はアップロードファイルの解析結果など
    for node in wf.nodes:
        if node.node_type == NodeType.EXTRACT_TEXT:
            # ダミー: テキスト抽出
            data["text"] = "[EXTRACTED] " + data["text"]
        elif node.node_type == NodeType.GENERATIVE_AI:
            # ダミー: 生成AIに投げた結果をモックで返す
            prompt = node.config.get("prompt", "")
            data["text"] = f"[GEN_AI with prompt='{prompt}']: " + data["text"]
        elif node.node_type == NodeType.FORMATTER:
            # ダミー: 文字列を整形
            data["text"] = data["text"].upper()
        else:
            pass  # 未知のノードタイプはスキップ
    return {"final_output": data["text"]}
