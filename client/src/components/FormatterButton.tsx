import { useState, FormEvent } from 'react';
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
import { FormatterConfig, NodeType, Workflow } from '../types';
import { addNode } from '../api';
import { useSnackbar } from '../contexts/SnackbarContext';

interface FormatterButtonProps extends ButtonProps {
  currentWorkflow: Workflow;
  onRefetch: () => Promise<void>;
}

const FORMAT_OPERATIONS = [
  { value: 'to_upper', label: '大文字に変換' },
  { value: 'to_lower', label: '小文字に変換' },
  { value: 'to_full_width', label: '全角に変換' },
  { value: 'to_half_width', label: '半角に変換' },
] as const;

export default function FormatterButton({ currentWorkflow, onRefetch, ...props }: FormatterButtonProps) {
  const [open, setOpen] = useState(false);
  const { showSnackbar } = useSnackbar();
  const defaultFormData: FormatterConfig = {
    operation: 'to_upper',
    kana: true,
    digit: true,
    ascii: true,
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

  return (
    <>
      <Button
        {...props}
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