import { useState, FormEvent, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Box,
  Skeleton,
  ButtonProps,
} from '@mui/material';
import { NodeType, Workflow } from '../types';
import { addNode, uploadPdf } from '../api';
import { useSnackbar } from '../contexts/SnackbarContext';

interface ExtractTextButtonProps extends ButtonProps {
  currentWorkflow: Workflow;
  onRefetch: () => Promise<void>;
}

export default function ExtractTextButton({ currentWorkflow, onRefetch, ...props }: ExtractTextButtonProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showSnackbar } = useSnackbar();

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    setFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      showSnackbar('PDFファイルを選択してください', 'error');
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > MAX_FILE_SIZE) {
      showSnackbar('ファイルサイズは10MB以下にしてください', 'error');
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) {
      showSnackbar('ファイルを選択してください', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const { text } = await uploadPdf(currentWorkflow.id, file);

      await addNode(currentWorkflow.id, NodeType.EXTRACT_TEXT, {
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        extracted_text: text,
      });

      await onRefetch();
      showSnackbar('テキスト抽出ノードを追加しました', 'success');
      handleClose();
    } catch (error: any) {
      showSnackbar(error.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <Button
        {...props}
        onClick={handleOpen}
      >
        テキスト抽出
      </Button>

      <Dialog 
        component="form"
        onSubmit={handleSubmit}
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>PDFファイルをアップロード</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {isUploading
                ? <Skeleton variant="rectangular" height={76} />
                : (
                <Box
                    sx={{
                        border: '2px dashed',
                        borderColor: 'primary.main',
                        borderRadius: 1,
                        p: 3,
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                        borderColor: 'primary.dark',
                        },
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    >
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                    />
                    {file ? (
                        <Typography>
                        選択されたファイル: {file.name}
                        </Typography>
                    ) : (
                        <Typography>
                        PDFファイルをクリックして選択
                        </Typography>
                    )}
                </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleClose}>キャンセル</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!file || isUploading}
          >
            {isUploading ? 'アップロード中...' : '追加'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 