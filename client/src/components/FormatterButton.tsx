import { useState, FormEvent, useEffect } from 'react';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    FormControlLabel,
    Checkbox,
    ButtonProps,
} from '@mui/material';
import { EdgeConfig, FormatterConfig, NodeConfig, NodeType, Workflow } from '../types';
import { addNode } from '../api';
import { useSnackbar } from '../contexts/SnackbarContext';
import { FORMAT_OPERATIONS } from '../lib';

interface FormatterButtonProps extends ButtonProps {
    currentWorkflow: Workflow;
    nodeTemplate: NodeConfig;
    edgeTemplate: EdgeConfig | null;
    onRefetch: () => Promise<void>;
}

export default function FormatterButton(props: FormatterButtonProps) {
    const { currentWorkflow, nodeTemplate, edgeTemplate, onRefetch } = props
    const [open, setOpen] = useState(false);
    const { showSnackbar } = useSnackbar();
    const defaultFormData: FormatterConfig = {
        operation: 'to_upper',
        kana: true,
        digit: true,
        ascii: true,
        node: nodeTemplate,
        edge: edgeTemplate,
    };
    const [formData, setFormData] = useState<FormatterConfig>(defaultFormData);

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await addNode(currentWorkflow.id, NodeType.FORMATTER, formData);
            await onRefetch();
            setFormData(defaultFormData);
            showSnackbar('フォーマッターノードを追加しました', 'success');
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
                disabled={currentWorkflow.nodes.length === 0}
                onClick={handleOpen}
            >
                フォーマッター
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
                        <FormControl fullWidth>
                            <InputLabel>変換操作</InputLabel>
                            <Select
                                value={formData.operation}
                                label="変換操作"
                                onChange={(e) => setFormData({ ...formData, operation: e.target.value as FormatterConfig['operation'] })}
                            >
                                {FORMAT_OPERATIONS.map((op) => (
                                    <MenuItem key={op.value} value={op.value}>
                                        {op.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {(formData.operation === 'to_full_width' || formData.operation === 'to_half_width') && (
                            <Stack>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.kana}
                                            onChange={(e) => setFormData({ ...formData, kana: e.target.checked })}
                                        />
                                    }
                                    label="カナを変換"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.digit}
                                            onChange={(e) => setFormData({ ...formData, digit: e.target.checked })}
                                        />
                                    }
                                    label="数字を変換"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={formData.ascii}
                                            onChange={(e) => setFormData({ ...formData, ascii: e.target.checked })}
                                        />
                                    }
                                    label="ASCII文字を変換"
                                />
                            </Stack>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button variant='outlined' onClick={handleClose}>キャンセル</Button>
                    <Button
                        type="submit"
                        variant="contained"
                    >
                        追加
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
} 