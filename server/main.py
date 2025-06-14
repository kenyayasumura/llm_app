from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from models import NodeType
from schemas import (
    CreateWorkflowRequest, CreateWorkflowResponse, 
    AddNodeRequest, WorkflowDetailResponse
)
from database import get_db, engine, Base
from repositories.workflow_repository import WorkflowRepository
from repositories.node_repository import NodeRepository

app = FastAPI(title="Workflow App")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"]
)

# データベースの初期化
Base.metadata.create_all(bind=engine)

@app.post("/workflows", response_model=CreateWorkflowResponse)
def create_workflow(req: CreateWorkflowRequest, db: Session = Depends(get_db)):
    repo = WorkflowRepository(db)
    workflow = repo.create_workflow(req.name)
    return CreateWorkflowResponse(id=workflow.id, name=workflow.name)

@app.get("/workflows/{wf_id}", response_model=WorkflowDetailResponse)
def get_workflow(wf_id: str, db: Session = Depends(get_db)):
    repo = WorkflowRepository(db)
    wf = repo.get_workflow(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    return WorkflowDetailResponse(
        id=wf.id, 
        name=wf.name, 
        nodes=[node.__dict__ for node in wf.nodes]
    )

@app.post("/workflows/{wf_id}/nodes")
def add_node(wf_id: str, req: AddNodeRequest, db: Session = Depends(get_db)):
    workflow_repo = WorkflowRepository(db)
    
    wf = workflow_repo.get_workflow(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    node_repo = NodeRepository(db)
    node = node_repo.add_node(wf_id, req.node_type, req.config)
    return {"message": "Node added", "node_id": node.id}

@app.post("/workflows/{wf_id}/run")
def run_workflow(wf_id: str, db: Session = Depends(get_db)):
    repo = WorkflowRepository(db)
    wf = repo.get_workflow(wf_id)
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
