export interface Node {
  id: string;
  name: string;
  type: string;
  description: string;
  config: {
    [key: string]: any;
  };
  position: {
    x: number;
    y: number;
  };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type: 'hard' | 'soft';
  config?: {
    [key: string]: any;
  };
}

export interface GraphConfig {
  nodes: Node[];
  edges: Edge[];
  metadata?: {
    [key: string]: any;
  };
}

export interface NodeType {
  value: string;
  label: string;
  description: string;
  configSchema: ConfigField[];
}

export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean';
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  placeholder?: string;
}

export interface RunningStatus {
  isRunning: boolean;
  activeNodes: string[];
  currentStep?: string;
  progress?: number;
}