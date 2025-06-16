import { Box, Typography } from '@mui/material';
import { Node } from '@xyflow/react';

interface WorkflowFlowSelectedNodeMenuProps {
    selectedNode: Node;
    // onDelete: () => void; TODO: 削除ボタンを追加する
    // onEdit: () => void; TODO: 編集ボタンを追加する
}

// NOTE: Nodeのdataの型を定義する
interface NodeData {
    type: string;
    label: string;
    description: string;
}

export const WorkflowFlowSelectedNodeMenu = ({ selectedNode }: WorkflowFlowSelectedNodeMenuProps) => {

    // FIXME: 型の管理を検討する
    const nodeData = selectedNode.data as unknown as NodeData;

    return (
        <Box width={300} p={2}>
            <Typography variant="h6" gutterBottom>
                設定
            </Typography>
            <Typography variant="body2" color="text.secondary">
                ID: {selectedNode.id}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Type: {nodeData.type}
            </Typography>
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    {nodeData.label}
                </Typography>
                <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                    {nodeData.description} 
                </pre>
            </Box>
        </Box>
    );
};
