import { useState, FormEvent, useEffect } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Stack,
    Slider,
    Typography,
    ButtonProps,
    FormControlLabel,
    Checkbox,
    Box,
    IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { EdgeConfig, AgentConfig, NodeConfig, NodeType, Workflow } from '../types';
import { addNode } from '../api';
import { useSnackbar } from '../contexts/SnackbarContext';

interface AgentButtonProps extends ButtonProps {
    currentWorkflow: Workflow;
    nodeTemplate: NodeConfig;
    edgeTemplate: EdgeConfig | null;
    onRefetch: () => Promise<void>;
}

export default function AgentButton(props: AgentButtonProps) {
    const { currentWorkflow, nodeTemplate, edgeTemplate, onRefetch } = props;
    const [open, setOpen] = useState(false);
    const { showSnackbar } = useSnackbar();
    const defaultFormData = {
        goal: '',
        constraints: [''],
        capabilities: {
            planning: true,
            web_search: true,
            execution: true,
            review: true
        },
        behavior: {
            aggressiveness: 0.7,
            caution: 0.3
        },
        node: nodeTemplate,
        edge: edgeTemplate,
        operation: 'agent_operation'
    };
    const [formData, setFormData] = useState<AgentConfig>(defaultFormData);

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await addNode(currentWorkflow.id, NodeType.AGENT, formData);
            await onRefetch();
            showSnackbar('エージェントノードを追加しました', 'success');
            handleClose();
        } catch (error: any) {
            showSnackbar(error.message, 'error');
        }
    };

    const handleAddConstraint = () => {
        setFormData(prev => ({
            ...prev,
            constraints: [...prev.constraints, '']
        }));
    };

    const handleRemoveConstraint = (index: number) => {
        setFormData(prev => ({
            ...prev,
            constraints: prev.constraints.filter((_, i) => i !== index)
        }));
    };

    const handleConstraintChange = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            constraints: prev.constraints.map((c, i) => i === index ? value : c)
        }));
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
            <Button {...props} onClick={handleOpen}>
                エージェント
            </Button>

            <Dialog
                component="form"
                onSubmit={handleSubmit}
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>エージェント設定</DialogTitle>
                <DialogContent>
                    <Box p={1}>
                        <TextField
                            label="具体的な目的や課題を入力してください"
                            value={formData.goal}
                            onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                            fullWidth
                            multiline
                            minRows={2}
                            required
                            sx={{ mb: 2 }}
                        />
                        <Stack spacing={2} sx={{ mb: 2 }}>
                            <Typography variant="subtitle1">制約条件</Typography>
                                {formData.constraints.map((constraint, index) => (
                                    <Stack key={index} direction="row" spacing={1}>
                                        <TextField
                                            size="small"
                                            value={constraint}
                                            onChange={(e) => handleConstraintChange(index, e.target.value)}
                                            fullWidth
                                            required
                                        />
                                        <IconButton sx={{ width: 40, height: 40 }} onClick={() => handleRemoveConstraint(index)} disabled={formData.constraints.length === 1}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Stack>
                                ))}
                            <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={handleAddConstraint}>
                                制約を追加
                            </Button>
                        </Stack>

                        <Typography variant="subtitle1">能力</Typography>
                        <Stack mb={2} flexDirection="row" justifyContent="flex-start">
                            <FormControlLabel
                                label="計画"
                                control={
                                    <Checkbox
                                        checked={formData.capabilities.planning}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            capabilities: {
                                                ...prev.capabilities,
                                                planning: e.target.checked
                                            }
                                        }))}
                                    />
                                }

                            />
                            <FormControlLabel
                                label="Web検索"
                                control={
                                    <Checkbox
                                        checked={formData.capabilities.web_search}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            capabilities: {
                                                ...prev.capabilities,
                                                web_search: e.target.checked
                                            }
                                        }))}
                                    />
                                }
                            />
                            <FormControlLabel
                                label="実行"
                                control={
                                    <Checkbox
                                        checked={formData.capabilities.execution}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            capabilities: {
                                                ...prev.capabilities,
                                                execution: e.target.checked
                                            }
                                        }))}
                                    />
                                }
                            />
                            <FormControlLabel
                                label="評価"
                                control={
                                    <Checkbox
                                        checked={formData.capabilities.review}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            capabilities: {
                                                ...prev.capabilities,
                                                review: e.target.checked
                                            }
                                        }))}
                                    />
                                }
                            />
                        </Stack>

                        <Stack spacing={2}>
                            <Typography variant="subtitle1">行動特性</Typography>
                            <Typography variant="subtitle2" gutterBottom>
                                積極性: {formData.behavior.aggressiveness}
                            </Typography>
                            <Slider
                                value={formData.behavior.aggressiveness}
                                onChange={(_, value) => setFormData(prev => ({
                                    ...prev,
                                    behavior: {
                                        ...prev.behavior,
                                        aggressiveness: value as number
                                    }
                                }))}
                                min={0}
                                max={1}
                                step={0.1}
                            />
                            <Typography variant="subtitle2" gutterBottom>
                                慎重さ: {formData.behavior.caution}
                            </Typography>
                            <Slider
                                value={formData.behavior.caution}
                                onChange={(_, value) => setFormData(prev => ({
                                    ...prev,
                                    behavior: {
                                        ...prev.behavior,
                                        caution: value as number
                                    }
                                }))}
                                min={0}
                                max={1}
                                step={0.1}
                            />
                        </Stack>
                    </Box>

                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>キャンセル</Button>
                    <Button disabled={!formData.goal || formData.constraints.length === 0} type="submit" variant="contained">追加</Button>
                </DialogActions>
            </Dialog>
        </>
    );
} 