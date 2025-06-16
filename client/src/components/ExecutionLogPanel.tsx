import {
    Box,
    Typography,
    Paper,
    PaperProps,
    CircularProgress,
    Stack,
} from '@mui/material';

export interface ExecutionLogEntry {
    step: string;
    result: string;
    timestamp: string;
}

export interface ExecutionLog {
    nodeId: string;
    nodeType: string;
    status: 'success' | 'error' | 'running';
    timestamp: string;
    result: string;
    execution_log?: ExecutionLogEntry[];
}

interface ExecutionLogPanelProps extends PaperProps {
    logs: ExecutionLog[];
}

export const ExecutionLogPanel = (props: ExecutionLogPanelProps) => {
    const { logs } = props;

    const getStatusColor = (status: ExecutionLog['status']) => {
        switch (status) {
            case 'success':
                return 'success.main';
            case 'error':
                return 'error.main';
            case 'running':
                return 'info.main';
        }
    };

    const getStatusText = (status: ExecutionLog['status']) => {
        switch (status) {
            case 'success':
                return '成功';
            case 'error':
                return 'エラー';
            case 'running':
                return '実行中';
        }
    };

    if (logs.length === 0) {
        return <></>;
    }

    return (
        <Paper {...props}>
            <Typography variant="h6" sx={{ mb: 2 }}>実行ログ</Typography>
            {logs.map(log => (
                <Paper
                    key={log.nodeId}
                    sx={{
                        p: 2,
                        borderLeft: 4,
                        borderColor: getStatusColor(log.status),
                        mb: 1
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" mb={1}>
                        <Typography variant="subtitle2">
                            {log.nodeType} - {new Date(log.timestamp).toLocaleString()}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {log.status === 'running' && (
                                <CircularProgress size={12} thickness={4} />
                            )}
                            <Typography variant="caption" color={getStatusColor(log.status)}>
                                {getStatusText(log.status)}
                            </Typography>
                        </Box>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {log.result}
                    </Typography>
                    {log.execution_log && log.execution_log.length > 0 && (
                        <Box sx={{ mt: 2, pl: 2, borderLeft: 1, borderColor: 'divider' }}>
                            {log.execution_log.map((entry, index) => (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        {entry.step} - {new Date(entry.timestamp).toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {entry.result}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Paper>
            ))}
        </Paper>
    );
}; 