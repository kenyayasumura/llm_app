import { useCallback, useEffect, useState } from 'react';
import {
    ReactFlow,
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    NodeTypes,
    Panel,
    NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Typography } from '@mui/material';
import { Workflow, Node as WorkflowNode } from '../types';
import { updateNodes } from '../api';
import { WorkflowCustomNode } from './WorkflowCustomNode';
import { getNodeDescription, getNodeTypeName } from '../lib';
import { WorkflowFlowSelectedNodeMenu } from './WorkflowFlowSelectedNodeMenu';
import { useSnackbar } from '../contexts/SnackbarContext';

const nodeTypes: NodeTypes = {
    custom: WorkflowCustomNode,
};

interface WorkflowFlowProps {
    currentWorkflow: Workflow;
    onRefetch: () => Promise<void>;
    onNodesChange: (changes: any[]) => void;
    onEdgesChange: (changes: any[]) => void;
}

export const WorkflowFlow = (props: WorkflowFlowProps) => {
    const { currentWorkflow, onRefetch, onNodesChange, onEdgesChange } = props;
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<Node>([]);
    const [flowEdges, setFlowEdges, onFlowEdgesChange] = useEdgesState<Edge>([]);
    const { showSnackbar } = useSnackbar();

    const initializeNodes = useCallback(() => {
        const newNodes: Node[] = currentWorkflow.nodes.map((node) => {
            const label = getNodeTypeName(node.node_type)
            const nodeConfig = node.config.node;
            return {
                ...nodeConfig,
                data: {
                    label: label,
                    type: node.node_type,
                    description: getNodeDescription(node)
                },
            };
        });

        const newEdges: Edge[] = currentWorkflow.nodes
            .filter(node => node.config.edge !== null)
            .map(node => node.config.edge as Edge);

        setFlowNodes(newNodes);
        setFlowEdges(newEdges);
    }, [currentWorkflow.nodes]);

    const onConnect = useCallback(
        (connection: Connection) => {
            setFlowEdges((eds) => addEdge(connection, eds));
            if (onEdgesChange) {
                onEdgesChange([{ type: 'add', item: connection }]);
            }
        },
        [onEdgesChange]
    );

    const onNodeClick = (event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        setSelectedNode(node);
    };

    const handleNodeDragStop = async (event: React.MouseEvent, node: Node, _nodes: Node[]) => {
        event.preventDefault();
        event.stopPropagation();

        try {
            const updatedNodes: WorkflowNode[] = currentWorkflow.nodes.map((n) => {
                if (n.config.node.id === node?.id) {
                    return {
                        ...n,
                        config: { 
                            ...n.config,
                            node: { 
                                ...n.config.node,
                                position: { 
                                    x: node.position.x,
                                    y: node.position.y
                                }
                            }
                        }
                    }
                }

                return n;
            });

            await updateNodes(currentWorkflow.id, updatedNodes);
            await onRefetch();
            showSnackbar('ノードの位置を更新しました', 'success');
        } catch (error: any) {
            showSnackbar(error.message, 'error');
        }
    }

    const handleNodesChange = useCallback((changes: NodeChange[]) => {
        onFlowNodesChange(changes);
    }, [flowNodes, onFlowNodesChange]);

    useEffect(() => {
        initializeNodes();
    }, [initializeNodes]);

    return (
        <Box sx={{ width: '100%', height: 'calc(100vh - 600px)', display: 'flex' }}>
            <Box sx={{ flex: 1 }}>
                <ReactFlow
                    colorMode="dark"
                    nodes={flowNodes}
                    edges={flowEdges}
                    onNodesChange={handleNodesChange}
                    onEdgesChange={onFlowEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onNodeDragStop={handleNodeDragStop}
                    nodeTypes={nodeTypes}
                    fitView
                    attributionPosition="bottom-right"
                >
                    <Background />
                    <Controls />
                    <Panel position="top-right">
                        <Typography variant="caption" color="text.secondary">
                            ノードを引っ張って位置を変更できます
                        </Typography>
                    </Panel>
                </ReactFlow>
            </Box>

            {selectedNode && <WorkflowFlowSelectedNodeMenu selectedNode={selectedNode} />}
        </Box>
    );
};