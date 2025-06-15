import { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    Stack,
} from '@mui/material';
import { getWorkflow, runWorkflow } from '../api';
import { Workflow } from '../types';
import WorkflowCreationForm from './WorkflowCreationForm';
import GenerativeAiButton from './GenerativeAiButton';
import FormatterButton from './FormatterButton';
import ExtractTextButton from './ExtractTextButton';

export default function WorkflowList() {
    const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);

    async function handleRefetch() {
        if (!currentWorkflow) return;
        const workflow = await getWorkflow(currentWorkflow.id);
        setCurrentWorkflow(workflow);
    }

    async function handleRunWorkflow() {
        if (!currentWorkflow) return;
        const result = await runWorkflow(currentWorkflow.id);
        alert("Final output: " + result.final_output);
    }

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                Workflow Editor
            </Typography>

            <WorkflowCreationForm setCurrentWorkflow={setCurrentWorkflow} />

            {currentWorkflow && (
                <Paper sx={{ p: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="h5" gutterBottom>
                            {currentWorkflow.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" whiteSpace="nowrap" textOverflow="ellipsis" overflow="hidden">
                            (ID: {currentWorkflow.id})
                        </Typography>
                    </Stack>
                    <Box
                        sx={{
                            maxHeight: "calc(100vh - 380px)",
                            overflowY: 'auto',  
                            '&::-webkit-scrollbar': {
                                width: '8px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: '#f1f1f1',
                                borderRadius: '4px',
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: '#888',
                                borderRadius: '4px',
                                '&:hover': {
                                    background: '#555',
                                },
                            },
                        }}
                    >
                        <List>
                            {currentWorkflow.nodes.map((node, index) => (
                                <Box key={node.id}>
                                    <ListItem>
                                        <ListItemText
                                            primary={node.node_type}
                                            secondary={
                                                <Box component="pre" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                                    {JSON.stringify(node.config, null, 2)}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                    {index < currentWorkflow.nodes.length - 1 && <Divider />}
                                </Box>
                            ))}
                        </List>
                    </Box>

                    <Stack direction="row" justifyContent="center" spacing={2} sx={{ mt: 2 }}>
                        <ExtractTextButton variant='contained' currentWorkflow={currentWorkflow} onRefetch={handleRefetch} sx={{width: 180}} />
                        <GenerativeAiButton variant='contained' currentWorkflow={currentWorkflow} onRefetch={handleRefetch} sx={{width: 180}} />
                        <FormatterButton variant='contained' currentWorkflow={currentWorkflow} onRefetch={handleRefetch} sx={{width: 180}} />
                    </Stack>

                    <Stack alignItems="center">
                        <Button
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
} 