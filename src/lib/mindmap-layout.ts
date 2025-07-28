
import dagre from 'dagre';
import { Edge, Node, Position } from 'reactflow';

export class DagreLayout {
  private dagreGraph: dagre.graphlib.Graph;
  private nodeWidth: number = 172;
  private nodeHeight: number = 36;

  constructor() {
    this.dagreGraph = new dagre.graphlib.Graph();
    this.dagreGraph.setDefaultEdgeLabel(() => ({}));
  }

  private setGraphRankdir(direction: 'TB' | 'LR'): void {
    this.dagreGraph.setGraph({ rankdir: direction });
  }

  private setNodes(nodes: Node[]): void {
    nodes.forEach((node) => {
      this.dagreGraph.setNode(node.id, {
        width: this.nodeWidth,
        height: this.nodeHeight,
      });
    });
  }

  private setEdges(edges: Edge[]): void {
    edges.forEach((edge) => {
      this.dagreGraph.setEdge(edge.source, edge.target);
    });
  }

  private layoutNodes(nodes: Node[], direction: 'TB' | 'LR'): Node[] {
    dagre.layout(this.dagreGraph);

    nodes.forEach((node) => {
      const nodeWithPosition = this.dagreGraph.node(node.id);
      node.targetPosition = direction === 'TB' ? Position.Top : Position.Left;
      node.sourcePosition = direction === 'TB' ? Position.Bottom : Position.Right;

      node.position = {
        x: nodeWithPosition.x - this.nodeWidth / 2,
        y: nodeWithPosition.y - this.nodeHeight / 2,
      };
    });

    return nodes;
  }

  public getLayoutedElements(
    nodes: Node[],
    edges: Edge[],
    direction: 'TB' | 'LR' = 'TB'
  ): { nodes: Node[]; edges: Edge[] } {
    this.setGraphRankdir(direction);
    this.setNodes(nodes);
    this.setEdges(edges);
    const layoutedNodes = this.layoutNodes(nodes, direction);

    return { nodes: layoutedNodes, edges };
  }
}
