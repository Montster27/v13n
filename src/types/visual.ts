/**
 * Visual Editor Types - Node-based storylet editor
 */

export interface Position {
  x: number;
  y: number;
}

export interface NodeConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromHandle: string;
  toHandle: string;
  label?: string;
}

export type NodeType = 'start' | 'storylet' | 'end' | 'choice' | 'condition';

export interface StoryletNode {
  id: string;
  type: NodeType;
  position: Position;
  data: {
    storyletId?: string;
    title: string;
    description?: string;
    arcName?: string;
    isEntry?: boolean;
    isExit?: boolean;
  };
  selected?: boolean;
  dragging?: boolean;
}

export interface VisualEditorState {
  nodes: StoryletNode[];
  connections: NodeConnection[];
  selectedNode?: string;
  selectedConnection?: string;
  scale: number;
  offset: Position;
  mode: 'select' | 'connect' | 'pan';
  dragStart?: Position;
  connecting?: {
    fromNodeId: string;
    fromHandle: string;
  };
}

export interface ArcVisualization {
  id: string;
  name: string;
  description: string;
  nodes: StoryletNode[];
  connections: NodeConnection[];
  startNodeIds: string[];
  endNodeIds: string[];
  progress: {
    totalNodes: number;
    completedNodes: number;
    percentage: number;
  };
}

export interface NodeHandle {
  id: string;
  type: 'input' | 'output';
  position: 'top' | 'bottom' | 'left' | 'right';
  label?: string;
}

export type ConnectionRule = {
  fromType: NodeType;
  toType: NodeType;
  maxConnections?: number;
  required?: boolean;
};