import { useMemo, useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
} from '@mui/material';
import WorkflowCreationForm from './WorkflowCreationForm';
import GenerativeAiButton from './GenerativeAiButton';
import FormatterButton from './FormatterButton';
import ExtractTextButton from './ExtractTextButton';
import AgentButton from './AgentButton';
import { WorkflowFlow } from './WorkflowFlow';
import { NodeConfig, EdgeConfig, Workflow } from '../types';
import { getWorkflow, runWorkflowWithSSE } from '../api';
import { useSnackbar } from '../contexts/SnackbarContext';
import { ExecutionLogPanel, ExecutionLog } from './ExecutionLogPanel';

export default function WorkflowList() {
    const [loading, setLoading] = useState<boolean>(false);
    const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
    const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
    const { showSnackbar } = useSnackbar();

    const handleRefetch = async () => {
        setLoading(true); 
        try {
            if (!currentWorkflow) return;
            const workflow = await getWorkflow(currentWorkflow.id);
            setCurrentWorkflow(workflow);
        } catch (error: any) {
            showSnackbar(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    const handleRunWorkflow = async () => {
        setLoading(true);
        setExecutionLogs([]);
        try {
            if (!currentWorkflow) return;

            // 実行開始時に各ノードをrunning状態で初期化
            const initialLogs: ExecutionLog[] = currentWorkflow.nodes.map(node => ({
                nodeId: node.id,
                nodeType: node.node_type,
                status: 'running' as const,
                timestamp: new Date().toISOString(),
                result: '実行中...'
            }));
            setExecutionLogs(initialLogs);

            // SSEを使用してワークフローを実行
            const cleanup = runWorkflowWithSSE(currentWorkflow.id, (nodeId, status, result, execution_log) => {
                setExecutionLogs(prevLogs => {
                    const newLogs = [...prevLogs];
                    
                    // NOTE: 並び替えのために、同じnodeIdのログを探して、そのログを削除して、新しいログを追加する
                    const existingIndex = newLogs.findIndex(log => log.nodeId === nodeId);
                    const newLog: ExecutionLog = {
                        nodeId,
                        nodeType: newLogs[existingIndex]?.nodeType || '',
                        status,
                        timestamp: new Date().toISOString(),
                        result,
                        execution_log
                    };

                    if (existingIndex !== -1) {
                        newLogs.splice(existingIndex, 1);
                    }

                    return [...newLogs, newLog];
                });
            });

            // コンポーネントのアンマウント時にSSEをクリーンアップ
            return () => {
                cleanup();
            };
        } catch (error: any) {
            setExecutionLogs(prev => [...prev, {
                nodeId: 'error',
                nodeType: 'ERROR',
                status: 'error' as const,
                timestamp: new Date().toISOString(),
                result: error.message
            }]);
            showSnackbar(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }

    const { nodeTemplate, edgeTemplate } = useMemo(() => {
        const nodeCount = (currentWorkflow?.nodes || []).length + 1;

        const nodeTemplate: NodeConfig = {
            id: nodeCount.toString(),
            type: 'custom',
            position: {
                x: 0, 
                y: 150 * nodeCount,
            },
        }

        let edgeTemplate: EdgeConfig | null = null;
        if (nodeCount > 1) {
            const source = nodeCount - 1;
            edgeTemplate = {
                id: `e-${nodeCount}`,
                type: 'smoothstep',
                source: source.toString(),
                target: nodeCount.toString(),
                animated: true,
            }
        }

        return { nodeTemplate, edgeTemplate }
    }, [currentWorkflow?.nodes])

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                Workflow Editor
            </Typography>

            <WorkflowCreationForm setCurrentWorkflow={setCurrentWorkflow} />

            {currentWorkflow && (
                <>
                    <Paper sx={{ p: 2, mb: 2 }}>
                        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                            <Typography variant="h5" gutterBottom>
                                {currentWorkflow.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">
                                (ID: {currentWorkflow.id})
                            </Typography>
                        </Stack>

                        <Box sx={{ mb: 3 }}>
                            <WorkflowFlow
                                currentWorkflow={currentWorkflow}
                                onRefetch={handleRefetch}
                                onNodesChange={(nodes) => {
                                    console.log('Nodes changed:', nodes);
                                }}
                                onEdgesChange={(edges) => {
                                    console.log('Edges changed:', edges);
                                }}
                            />
                        </Box>

                        <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 2 }}>
                            <GenerativeAiButton
                                variant="contained"
                                currentWorkflow={currentWorkflow}
                                nodeTemplate={nodeTemplate}
                                edgeTemplate={edgeTemplate}
                                onRefetch={handleRefetch}
                                sx={{ width: 160 }}
                            />
                            <FormatterButton
                                variant="contained"
                                currentWorkflow={currentWorkflow}
                                nodeTemplate={nodeTemplate}
                                edgeTemplate={edgeTemplate}
                                onRefetch={handleRefetch}
                                sx={{ width: 160 }}
                            />
                            <ExtractTextButton
                                variant="contained"
                                currentWorkflow={currentWorkflow}
                                nodeTemplate={nodeTemplate}
                                edgeTemplate={edgeTemplate}
                                onRefetch={handleRefetch}
                                sx={{ width: 160 }}
                            />
                            <AgentButton
                                variant="contained"
                                currentWorkflow={currentWorkflow}
                                nodeTemplate={nodeTemplate}
                                edgeTemplate={edgeTemplate}
                                onRefetch={handleRefetch}
                                sx={{ width: 160 }}
                            />
                        </Stack>
                    </Paper>

                    <ExecutionLogPanel logs={executionLogs} sx={{ p: 2, mb: 2 }} />

                    <Stack alignItems="center">
                        <Button
                            disabled={
                                currentWorkflow.nodes.length === 0 || 
                                loading || 
                                executionLogs.some(log => log.status === 'running')
                            }
                            variant="contained"
                            color="secondary"
                            onClick={handleRunWorkflow}
                            sx={{ mt: 2, width: 120 }}
                        >
                            実行
                        </Button>
                    </Stack>
                </>

            )}
        </Box>
    );
};
