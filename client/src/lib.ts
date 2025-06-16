import { NodeType, Node, ExtractTextConfig, GenerativeAIConfig, FormatterConfig, AgentConfig } from "./types";

export const FORMAT_OPERATIONS = [
    { value: 'to_upper', label: '大文字に変換' },
    { value: 'to_lower', label: '小文字に変換' },
    { value: 'to_full_width', label: '全角に変換' },
    { value: 'to_half_width', label: '半角に変換' },
] as const;

export const getNodeTypeName = (type: NodeType): string => {
    switch (type) {
        case NodeType.EXTRACT_TEXT:
            return 'PDFからテキストを抽出';
        case NodeType.GENERATIVE_AI:
            return 'AIによるテキスト生成';
        case NodeType.FORMATTER:
            return 'テキストのフォーマット変換';
        default:
            return '';
    }
}

export const getNodeDescription = (node: Node): string => {
    switch (node.node_type) {
        case NodeType.EXTRACT_TEXT:
            const extractConfig = node.config as ExtractTextConfig;
            return extractConfig.extracted_text ? truncateText(extractConfig.extracted_text) : '';
        case NodeType.GENERATIVE_AI:
            const genConfig = node.config as GenerativeAIConfig;
            return genConfig.prompt ? truncateText(genConfig.prompt) : '';
        case NodeType.FORMATTER:
            const formatterConfig = node.config as FormatterConfig;
            const operation = formatterConfig.operation;
            const label = FORMAT_OPERATIONS.find(op => op.value === operation)?.label;
            return label || '';
        case NodeType.AGENT:
            const agentConfig = node.config as AgentConfig;
            return agentConfig.goal ? truncateText(agentConfig.goal) : '';
        default:
            return '';
    }
}

const truncateText = (text: string): string => {
    if (text.length <= 500)
        return text;

    return text.slice(0, 500) + '...';
};
