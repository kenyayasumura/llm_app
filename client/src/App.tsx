import { ThemeProvider, createTheme, CssBaseline, Container, Box } from '@mui/material';
import WorkflowList from './components/WorkflowList';
import { SnackbarProvider } from './contexts/SnackbarContext';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
    },
});

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <SnackbarProvider>
                <Container maxWidth="lg">
                    <Box sx={{ my: 4 }}>
                        <WorkflowList />
                    </Box>
                </Container>
            </SnackbarProvider>
        </ThemeProvider>
    );
}

export default App;
