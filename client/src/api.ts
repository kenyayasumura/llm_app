import { CreateWorkflowRequest, CreateWorkflowResponse, WorkflowDetailResponse, NodeType, Node, AddNodeRequest, FormatterConfig, GenerativeAIConfig, ExtractTextConfig, AgentConfig, Workflow } from './types';

const API_BASE_URL = 'http://localhost:8000';

export async function createWorkflow(requestBody: CreateWorkflowRequest): Promise<CreateWorkflowResponse> {
    const response = await fetch(`${API_BASE_URL}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok)
        throw new Error('ワークフロー作成失敗');

    return response.json();
}

export async function getWorkflow(workflowId: string): Promise<WorkflowDetailResponse> {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}`);

    if (!response.ok)
        throw new Error('ワークフロー取得失敗');

    return response.json();
}

export async function addNode(workflowId: string, nodeType: NodeType, config: ExtractTextConfig | GenerativeAIConfig | FormatterConfig | AgentConfig): Promise<void> {
    const requestBody: AddNodeRequest = { node_type: nodeType, config };
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok)
        throw new Error('ノード追加失敗');
}

export async function uploadPdf(workflowId: string, file: File): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok)
        throw new Error('PDFアップロード失敗');

    return response.json();
}

export async function runWorkflow(workflowId: string): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/run`, {
        method: 'POST',
    });

    if (!response.ok)
        throw new Error('ワークフロー実行失敗');

    return response.json();
}

export const updateNodes = async (workflowId: string, nodes: Node[]) => {
    const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/nodes`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(nodes),
    });

    if (!response.ok)
        throw new Error('Failed to update nodes');

    return response.json();
};

export const runWorkflowWithSSE = (
    workflowId: string,
    onNodeUpdate: (nodeId: string, status: 'success' | 'error' | 'running', result: string, execution_log?: any[]) => void
) => {
    const eventSource = new EventSource(`${API_BASE_URL}/workflows/${workflowId}/run/stream`);

    eventSource.addEventListener('node_start', (event) => {
        const data = JSON.parse(event.data);
        onNodeUpdate(data.nodeId, 'running', data.result, data.execution_log);
    });

    eventSource.addEventListener('node_complete', (event) => {
        const data = JSON.parse(event.data);
        onNodeUpdate(data.nodeId, 'success', data.result, data.execution_log);
    });

    eventSource.addEventListener('node_error', (event) => {
        const data = JSON.parse(event.data);
        onNodeUpdate(data.nodeId, 'error', data.result, data.execution_log);
    });

    eventSource.addEventListener('node_update', (event) => {
        const data = JSON.parse(event.data);
        onNodeUpdate(data.nodeId, data.status, data.result, data.execution_log);
    });

    eventSource.addEventListener('workflow_error', (event) => {
        const data = JSON.parse(event.data);
        onNodeUpdate('workflow', 'error', data.result, data.execution_log);
    });

    eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
    };

    return () => {
        eventSource.close();
    };
};