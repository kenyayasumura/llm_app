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
import { WorkflowFlow } from './WorkflowFlow';
import { NodeConfig, EdgeConfig, Workflow } from '../types';
import { getWorkflow, runWorkflow } from '../api';
import { useSnackbar } from '../contexts/SnackbarContext';


export default function WorkflowList() {
    const [loading, setLoading] = useState<boolean>(false);
    const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
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
        try {
            if (!currentWorkflow) return;
            const results = await runWorkflow(currentWorkflow.id);
            showSnackbar("実行結果: " + results.join("\n"), 'success');
        } catch (error: any) {
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
    }, [currentWorkflow?.nodes]) // NOTE: nodesの配列自体を依存配列に含めることで、より確実に再レンダリングをトリガーする

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                Workflow Editor
            </Typography>

            <WorkflowCreationForm setCurrentWorkflow={setCurrentWorkflow} />

            {currentWorkflow && (
                <Paper sx={{ p: 2 }}>
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
                    </Stack>

                    <Stack alignItems="center">
                        <Button
                            disabled={currentWorkflow.nodes.length === 0 || loading}
                            variant="contained"
                            color="secondary"
                            onClick={handleRunWorkflow}
                            sx={{ mt: 2, width: 120 }}
                        >
                            実行
                        </Button>
                    </Stack>
                </Paper>
            )}
        </Box>
    );
};
