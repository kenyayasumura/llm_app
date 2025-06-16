import { useState, FormEvent, useEffect } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    ButtonProps,
} from '@mui/material';
import { EdgeConfig, GenerativeAIConfig, NodeConfig, NodeType, Workflow } from '../types';
import { addNode } from '../api';
import { useSnackbar } from '../contexts/SnackbarContext';

interface GenerativeAiButtonProps extends ButtonProps {
    currentWorkflow: Workflow;
    nodeTemplate: NodeConfig;
    edgeTemplate: EdgeConfig | null;
    onRefetch: () => Promise<void>;
}

const AVAILABLE_MODELS = [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4.5-preview'
];

export default function GenerativeAiButton(props: GenerativeAiButtonProps) {
    const { currentWorkflow, nodeTemplate, edgeTemplate, onRefetch } = props
    const [open, setOpen] = useState(false);
    const { showSnackbar } = useSnackbar();
    const defaultFormData = {
        prompt: '',
        model: AVAILABLE_MODELS[0],
        temperature: 0.7,
        max_tokens: 1000,
        node: nodeTemplate,
        edge: edgeTemplate,
    };
    const [formData, setFormData] = useState<GenerativeAIConfig>(defaultFormData);

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await addNode(currentWorkflow.id, NodeType.GENERATIVE_AI, formData);
            await onRefetch();
            setFormData(defaultFormData);
            showSnackbar('AIノードを追加しました', 'success');
            handleClose();
        } catch (error: any) {
            showSnackbar(error.message, 'error');
        }
    };

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            node: nodeTemplate,
            edge: edgeTemplate,
        }));
    }, [nodeTemplate, edgeTemplate]);

    return (
        <>
            <Button
                {...props}
                onClick={handleOpen}
            >
                AI
            </Button>

            <Dialog
                component="form"
                onSubmit={handleSubmit}
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>設定</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        <TextField
                            label="質問を入力してください..."
                            value={formData.prompt}
                            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                            fullWidth
                            multiline
                            minRows={3}
                            rows={3}
                            required
                            inputProps={{
                                maxLength: 2000
                            }}
                            helperText={`${formData.prompt.length}/2000`}
                        />

                        <FormControl fullWidth>
                            <InputLabel>モデル</InputLabel>
                            <Select
                                value={formData.model}
                                label="モデル"
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                            >
                                {AVAILABLE_MODELS.map((model) => (
                                    <MenuItem key={model} value={model}>
                                        {model}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="創造性"
                            type="number"
                            value={formData.temperature}
                            onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value >= 0 && value <= 1) {
                                    setFormData({ ...formData, temperature: value });
                                }
                            }}
                            inputProps={{
                                step: 0.1,
                                min: 0,
                                max: 1,
                            }}
                            fullWidth
                        />

                        <TextField
                            label="最大トークン数"
                            type="number"
                            value={formData.max_tokens}
                            onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (value >= 1000 && value <= 3000) {
                                    setFormData({ ...formData, max_tokens: value });
                                }
                            }}
                            inputProps={{
                                step: 100,
                                min: 1000,
                                max: 3000,
                            }}
                            fullWidth
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant='outlined' onClick={handleClose}>キャンセル</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={!formData.prompt}
                    >
                        追加
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
