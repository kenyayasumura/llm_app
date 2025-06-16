import { NodeType, Node, ExtractTextConfig, GenerativeAIConfig, FormatterConfig } from "./types";

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
            return truncateText((node.config as ExtractTextConfig).extracted_text);
        case NodeType.GENERATIVE_AI:
            return truncateText((node.config as GenerativeAIConfig).prompt);
        case NodeType.FORMATTER:
            const operation = (node.config as FormatterConfig).operation;
            const label = FORMAT_OPERATIONS.find(op => op.value === operation)?.label;
            return label || '';
        default:
            return '';
    }
}

const truncateText = (text: string): string => {
    if (text.length <= 500)
        return text;

    return text.slice(0, 500) + '...';
};
