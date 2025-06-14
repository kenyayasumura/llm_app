from sqlalchemy.orm import Session
from uuid import uuid4
from models import WorkflowDB
from sqlalchemy.orm import joinedload

class WorkflowRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_workflow(self, name: str) -> WorkflowDB:
        wf_id = str(uuid4())
        new_wf = WorkflowDB(id=wf_id, name=name)
        self.db.add(new_wf)
        self.db.commit()
        self.db.refresh(new_wf)
        return new_wf

    def get_workflow(self, wf_id: str) -> WorkflowDB:
        return self.db.query(WorkflowDB).options(
            joinedload(WorkflowDB.nodes)
        ).filter(WorkflowDB.id == wf_id).first()