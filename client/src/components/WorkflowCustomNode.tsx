import { Handle, Position } from '@xyflow/react';
import { Box, Paper } from '@mui/material';

interface WorkflowCustomNodeProps {
    data: {
        label: string;
        type: string;
        description: string;
    };
}

export const WorkflowCustomNode = ({ data }: WorkflowCustomNodeProps) => {
    const { label, type, description } = data;

    return (
        <Paper
            elevation={3}
            sx={{
                padding: 2,
                minWidth: 200,
                borderRadius: 2,
            }}
        >
            <Handle type="target" position={Position.Top} />
            <Box sx={{ fontWeight: 'bold', marginBottom: 1 }}>{label}</Box>
            <Box sx={{ fontSize: '0.8rem', color: 'text.secondary', marginBottom: 1 }}>
                {type}
            </Box>
            <Box sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                {description}
            </Box>
            <Handle type="source" position={Position.Bottom} />
        </Paper>
    );
}; 