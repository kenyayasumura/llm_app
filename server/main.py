from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sse_starlette.sse import EventSourceResponse # type: ignore
from sqlalchemy.orm import Session
import os
import shutil
from pdf2image import convert_from_path
import pytesseract
from typing import List, Dict, Any
from models import NodeType
from services.workflow_service import WorkflowService
import logging
import json
from datetime import datetime

from schemas import (
    CreateWorkflowRequest, CreateWorkflowResponse, 
    AddNodeRequest, WorkflowDetailResponse,
)
from database import get_db, engine, Base
from repositories.workflow_repository import WorkflowRepository
from repositories.node_repository import NodeRepository

# ロガーの設定
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('WorkflowApp')

app = FastAPI(title="Workflow App")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
)

# データベースの初期化
Base.metadata.create_all(bind=engine)

# 一時ファイルの保存ディレクトリ
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# デバッグモードの設定
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"

# ワークフロー実行サービスのインスタンス
workflow_service = WorkflowService(debug=DEBUG_MODE)

@app.post("/workflows", response_model=CreateWorkflowResponse)
def create_workflow(req: CreateWorkflowRequest, db: Session = Depends(get_db)):
    """
    ワークフローを作成します。

    Args:
        req: ワークフローの名前
        db: データベースセッション

    Returns:
        作成されたワークフローのIDと名前
    """
    repo = WorkflowRepository(db)
    workflow = repo.create_workflow(req.name)
    return CreateWorkflowResponse(id=workflow.id, name=workflow.name)

@app.get("/workflows/{wf_id}", response_model=WorkflowDetailResponse)
def get_workflow(wf_id: str, db: Session = Depends(get_db)):
    """
    ワークフローを取得します。

    Args:
        wf_id: ワークフローのID
        db: データベースセッション

    Returns:
        ワークフローのIDと名前、ノードのリスト
    """
    repo = WorkflowRepository(db)
    wf = repo.get_workflow(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="ワークフローが見つかりません")

    return WorkflowDetailResponse(
        id=wf.id, 
        name=wf.name, 
        nodes=[{ "id": node.id, "node_type": node.node_type, "config": node.config } for node in wf.nodes]
    )

@app.post("/workflows/{wf_id}/nodes")
def add_node(wf_id: str, req: AddNodeRequest, db: Session = Depends(get_db)):
    """
    ワークフローにノードを追加します。

    Args:
        wf_id: ワークフローのID
        req: 追加するノードの情報
        db: データベースセッション

    Returns:
        ノードのID
    """
    workflow_repo = WorkflowRepository(db)
    wf = workflow_repo.get_workflow(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="ワークフローが見つかりません")

    node_repo = NodeRepository(db)
    node = node_repo.add_node(wf_id, req.node_type.value, req.config)
    return {"message": "Node added", "node_id": node.id}

@app.post("/workflows/{wf_id}/upload")
async def upload_pdf(wf_id: str, file: UploadFile = File(...)):
    """
    PDFファイルをアップロードします。

    Args:
        wf_id: ワークフローのID
        file: アップロードするPDFファイル

    Returns:
        抽出されたテキスト
    """
    # TODO： OCRはRun時にまとめてやってもいいかも
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDFファイルのみアップロードできます")

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    file_size = 0
    chunk_size = 1024 * 1024

    while chunk := await file.read(chunk_size): # ここでポインタがズレる
        file_size += len(chunk)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="ファイルサイズは10MB以下にしてください")

    await file.seek(0) # ポインタを先頭に戻す

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        images = convert_from_path(file_path)
        extracted_text = ""
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image, lang='jpn+eng')
            extracted_text += f"\n--- Page {i+1} ---\n{text}"

        os.remove(file_path)
        return {"text": extracted_text.strip()}
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/workflows/{workflow_id}/run", response_model=List[str])
async def run_workflow(workflow_id: str, db: Session = Depends(get_db)):
    """
    ワークフローを実行します。

    Args:
        workflow_id: ワークフローのID
        db: データベースセッション

    Returns:
        ワークフローの実行結果（文字列の配列）
    """
    try:
        if DEBUG_MODE:
            logger.debug(f"ワークフロー実行開始: workflow_id={workflow_id}")

        workflow_repo = WorkflowRepository(db)
        workflow = workflow_repo.get_workflow(workflow_id)
        if not workflow:
            raise HTTPException(status_code=404, detail="ワークフローが見つかりません")

        nodes = [
            {
                "id": node.id,
                "node_type": node.node_type,
                "config": node.config
            }
            for node in workflow.nodes
        ]

        if DEBUG_MODE:
            logger.debug(f"実行するノード: {json.dumps(nodes, indent=2, ensure_ascii=False)}")

        results = workflow_service.execute(nodes)

        if DEBUG_MODE:
            logger.debug(f"実行結果: {json.dumps(results, indent=2, ensure_ascii=False)}")

        return results

    except ValueError as e:
        if DEBUG_MODE:
            logger.error(f"バリデーションエラー: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        if DEBUG_MODE:
            logger.error(f"実行エラー: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"ワークフローの実行中にエラーが発生しました: {str(e)}")

@app.put("/workflows/{workflow_id}/nodes")
async def update_nodes(
    workflow_id: str,
    nodes: List[Dict[str, Any]],
    db: Session = Depends(get_db)
):
    node_repo = NodeRepository(db)
    updated_nodes = node_repo.update_nodes(workflow_id=workflow_id, nodes=nodes)

    if not updated_nodes:
        raise HTTPException(status_code=404, detail="No nodes found to update")

    return {"status": "success", "updated_nodes": len(updated_nodes)}

# REFACTOR: このstreamでワークフローを実行しているが、本来分けるべき。ステータスをRedis等で管理する。
@app.get("/workflows/{wf_id}/run/stream")
async def run_workflow_stream(wf_id: str, db: Session = Depends(get_db)):
    """
    ワークフローの実行状態をストリーミングします。
    """
    workflow_repo = WorkflowRepository(db)
    workflow = workflow_repo.get_workflow(wf_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    async def event_generator():
        try:
            # ワークフローの実行を開始
            workflow_service = WorkflowService(debug=DEBUG_MODE)
            nodes = [
                {
                    "id": node.id,
                    "node_type": node.node_type,
                    "config": node.config
                }
                for node in workflow.nodes
            ]

            # 実行順序に従ってノードを実行
            async for result in workflow_service.execute(nodes):
                yield {
                    "event": "node_update",
                    "data": json.dumps(result, ensure_ascii=False)
                }

        except Exception as e:
            logger.error(f"Error in workflow execution: {str(e)}")
            yield {
                "event": "workflow_error",
                "data": json.dumps({
                    "status": "error",
                    "timestamp": datetime.now().isoformat(),
                    "result": f"エラー: {str(e)}"
                }, ensure_ascii=False)
            }

    return EventSourceResponse(event_generator())
