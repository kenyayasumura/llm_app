from sqlalchemy.orm import Session
from uuid import uuid4
from typing import List, Dict, Any

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

    def update_nodes(self, workflow_id: str, nodes: List[Dict[str, Any]]) -> List[NodeDB]:
        """
        複数のノードをまとめて更新します。
        
        Args:
            workflow_id: ワークフローID
            nodes: 更新するノードのリスト。各ノードは id と config を含む必要があります。
        
        Returns:
            更新されたノードのリスト
        """
        updated_nodes = []
        for node_data in nodes:
            node = self.db.query(NodeDB).filter(
                NodeDB.workflow_id == workflow_id,
                NodeDB.id == node_data['id']
            ).first()

            if node:
                node.config = node_data['config']
                updated_nodes.append(node)

        self.db.commit()
        for node in updated_nodes:
            self.db.refresh(node)

        return updated_nodes