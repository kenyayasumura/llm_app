export enum NodeType {
    EXTRACT_TEXT = "extract_text",
    GENERATIVE_AI = "generative_ai",
    FORMATTER = "formatter"
}

export interface NodeConfig {
    id: string;
    type: string;
    position: {
        x: number;
        y: number;
    };
}

export interface EdgeConfig {
    id: string;
    type: string;
    source: string;
    target: string;
    animated: boolean;
}

interface WorkflowConfig {
    node: NodeConfig;
    edge: EdgeConfig | null;
}

export interface ExtractTextConfig extends WorkflowConfig {
    file_name: string;
    file_size: number;
    file_type: string;
    extracted_text: string;
}

export interface GenerativeAIConfig extends WorkflowConfig {
    prompt: string;
    model: string;
    temperature: number;
    max_tokens: number;
}

export interface FormatterConfig extends WorkflowConfig {
    operation: "to_upper" | "to_lower" | "to_full_width" | "to_half_width";
    kana?: boolean;
    digit?: boolean;
    ascii?: boolean;
}

export interface Node {
    id: string;
    node_type: NodeType;
    config: ExtractTextConfig | GenerativeAIConfig | FormatterConfig;
}

export interface Workflow {
    id: string;
    name: string;
    nodes: Node[];
}

export interface CreateWorkflowRequest {
    name: string;
}

export type CreateWorkflowResponse = Omit<Workflow, "nodes">;

export interface AddNodeRequest {
    node_type: NodeType;
    config: ExtractTextConfig | GenerativeAIConfig | FormatterConfig;
}

export interface WorkflowDetailResponse {
    id: string;
    name: string;
    nodes: Node[];
}
