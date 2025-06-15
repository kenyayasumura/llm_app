export enum NodeType {
    EXTRACT_TEXT = "extract_text",
    GENERATIVE_AI = "generative_ai",
    FORMATTER = "formatter"
}

export interface ExtractTextConfig {
    file_name: string;
    file_size: number;
    file_type: string;
    extracted_text: string;
}

export interface GenerativeAIConfig {
    prompt: string;
    model: string;
    temperature: number;
    max_tokens: number;
}

export interface FormatterConfig {
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
