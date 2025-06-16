import { Dispatch, FormEvent, useState } from 'react';
import {
    Paper,
    FormControl,
    TextField,
    Button,
    Stack,
} from '@mui/material';
import { createWorkflow } from '../api';
import { Workflow } from '../types';
import { useSnackbar } from '../contexts/SnackbarContext';

interface WorkflowCreationFormProps {
    setCurrentWorkflow: Dispatch<React.SetStateAction<Workflow | null>>
}

export default function WorkflowCreationForm({ setCurrentWorkflow }: WorkflowCreationFormProps) {
    const [workflowName, setWorkflowName] = useState("");
    const { showSnackbar } = useSnackbar();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        try {
            if (!workflowName)
                throw new Error("ワークフロー名を入力してください");
            const workflow = await createWorkflow({ name: workflowName });
            setCurrentWorkflow({ ...workflow, nodes: [] });
            setWorkflowName("");
            showSnackbar('ワークフローを作成しました', 'success');
        } catch (error: any) {
            showSnackbar(error.message, 'error');
        }
    }

    return (
        <Paper component="form" onSubmit={handleSubmit} sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
                <FormControl fullWidth>
                    <TextField
                        label="ワークフロー名"
                        value={workflowName}
                        onChange={(e) => setWorkflowName(e.target.value)}
                        size="small"
                        required
                    />
                </FormControl>
                <Button
                    type="submit"
                    variant="contained"
                    disabled={!workflowName}
                >
                    作成
                </Button>
            </Stack>
        </Paper>
    );
}
