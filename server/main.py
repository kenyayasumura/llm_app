from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import shutil
from pdf2image import convert_from_path
import pytesseract

from models import NodeType
from schemas import (
    CreateWorkflowRequest, CreateWorkflowResponse, 
    AddNodeRequest, WorkflowDetailResponse
)
from database import get_db, engine, Base
from repositories.workflow_repository import WorkflowRepository
from repositories.node_repository import NodeRepository
from services.generative_ai_service import GenerativeAIService
from services.formatter_service import FormatterService

app = FastAPI(title="Workflow App")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "*"],
    allow_headers=["*"],
)

# データベースの初期化
Base.metadata.create_all(bind=engine)

# 一時ファイルの保存ディレクトリ
UPLOAD_DIR = "uploads"

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
    node = node_repo.add_node(wf_id, req.node_type, req.config)
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

@app.post("/workflows/{wf_id}/run")
def run_workflow(wf_id: str, db: Session = Depends(get_db)):
    """
    ワークフローを実行します。

    Args:
        wf_id: ワークフローのID
        db: データベースセッション

    Returns:
        最終的な出力テキスト
    """
    repo = WorkflowRepository(db)
    wf = repo.get_workflow(wf_id)
    if not wf:
        raise HTTPException(status_code=404, detail="ワークフローが見つかりません")

    data = {}
    for node in wf.nodes:
        if node.node_type == NodeType.EXTRACT_TEXT:
            data["text"] = "[EXTRACTED] " + data["text"]
        elif node.node_type == NodeType.GENERATIVE_AI:
            ai_service = GenerativeAIService()
            generated_text = ai_service.generate_text(
                prompt=node.config["prompt"],
                model=node.config["model"],
                temperature=node.config["temperature"],
                max_tokens=node.config["max_tokens"]
            )
            data["text"] = generated_text
        elif node.node_type == NodeType.FORMATTER:
            formatter_service = FormatterService()
            data["text"] = formatter_service.format_text(data["text"], node.config)
        else:
            pass  # 未知のノードタイプはスキップ

    return {"final_output": data["text"]}
