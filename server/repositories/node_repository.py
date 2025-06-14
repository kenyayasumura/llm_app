from sqlalchemy.orm import Session
from uuid import uuid4

from models import NodeDB

class NodeRepository:
    def __init__(self, db: Session):
        self.db = db

    def add_node(self, workflow_id: str, node_type: str, config: dict) -> NodeDB:
        node_id = str(uuid4())
        new_node = NodeDB(
            id=node_id,
            workflow_id=workflow_id,
            node_type=node_type,
            config=config
        )
        self.db.add(new_node)
        self.db.commit()
        self.db.refresh(new_node)
        return new_node