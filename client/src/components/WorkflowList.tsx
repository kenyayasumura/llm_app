import { useEffect, useMemo, useState } from 'react';
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
        setExecutionLogs([]);  // ログをクリア
        try {
            if (!currentWorkflow) return;

            // SSEを使用してワークフローを実行
            const cleanup = runWorkflowWithSSE(currentWorkflow.id, (nodeId, status, result, execution_log) => {
                setExecutionLogs(prevLogs => {
                    const newLogs = [...prevLogs];
                    
                    // 同じnodeIdのログを探して、そのログを削除
                    const existingIndex = newLogs.findIndex(log => log.nodeId === nodeId);
                    if (existingIndex !== -1) {
                        newLogs.splice(existingIndex, 1);
                    }

                    // 新しいログを作成
                    const node = currentWorkflow.nodes.find(n => n.id === nodeId);
                    const newLog: ExecutionLog = {
                        nodeId,
                        nodeType: node?.node_type || '',
                        status,
                        timestamp: new Date().toISOString(),
                        result,
                        execution_log,
                        execution_order: newLogs[existingIndex]?.execution_order || newLogs.length
                    };

                    // 新しいログを追加
                    newLogs.push(newLog);

                    // 実行中のノードが複数ある場合は、最新のものだけを残す
                    const runningLogs = newLogs.filter(log => log.status === 'running');
                    if (runningLogs.length > 1) {
                        const latestRunningLog = runningLogs[runningLogs.length - 1];
                        newLogs.forEach(log => {
                            if (log.status === 'running' && log.nodeId !== latestRunningLog.nodeId) {
                                log.status = 'pending';
                            }
                        });
                    }

                    // 実行順序でソート
                    const sortedLogs = newLogs.sort((a, b) => (a.execution_order || 0) - (b.execution_order || 0));

                    // すべてのノードが完了したかチェック
                    const allNodesCompleted = currentWorkflow.nodes.every(node => {
                        const nodeLog = sortedLogs.find(log => log.nodeId === node.id);
                        return nodeLog && (nodeLog.status === 'success' || nodeLog.status === 'error');
                    });

                    // すべてのノードが完了したらloadingをfalseに
                    if (allNodesCompleted) {
                        setLoading(false);
                    }

                    return sortedLogs;
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

    useEffect(() => {
        if (currentWorkflow) {
            setExecutionLogs([]);
        }
    }, [currentWorkflow?.id])

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
                                disabled={loading}
                                variant="contained"
                                currentWorkflow={currentWorkflow}
                                nodeTemplate={nodeTemplate}
                                edgeTemplate={edgeTemplate}
                                onRefetch={handleRefetch}
                                sx={{ width: 160 }}
                            />
                            <FormatterButton
                                disabled={loading}
                                variant="contained"
                                currentWorkflow={currentWorkflow}
                                nodeTemplate={nodeTemplate}
                                edgeTemplate={edgeTemplate}
                                onRefetch={handleRefetch}
                                sx={{ width: 160 }}
                            />
                            <ExtractTextButton
                                disabled={loading}
                                variant="contained"
                                currentWorkflow={currentWorkflow}
                                nodeTemplate={nodeTemplate}
                                edgeTemplate={edgeTemplate}
                                onRefetch={handleRefetch}
                                sx={{ width: 160 }}
                            />
                            <AgentButton
                                disabled={loading}
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
