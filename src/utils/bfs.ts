import { toPairs } from 'ramda';

export type GraphNodes = Set<string>;
export type GraphEdgeCost = number;
export interface GraphEdges<T> {
  [start: string]: {
    [end: string]: T; // [start_end]
  };
}

export interface Graph<T> {
  nodes: GraphNodes;
  edges: GraphEdges<T>;
}

export function bfs<T>(graph: Graph<T>, start, end): T[] {
  const { nodes, edges } = graph;
  const visited = new Set();
  const queue = [];
  const meta = {};
  visited.add(start);
  queue.push(start);

  while (queue.length > 0) {
    const current = queue.shift();

    for (const [node, action] of toPairs<string, T>(edges[current])) {
      if (visited.has(node)) continue;

      meta[node] = [current, action];

      if (node === end) {
        return constructPath(node, meta);
      }

      queue.push(node);
    }

    visited.add(current);
  }
}

function constructPath(node, meta) {
  const path = [];

  let current = node;
  let action;
  while (true) {
    const data = meta[current];
    if (data) {
      current = data[0];
      action = data[1];
      path.push(action);
    } else {
      break;
    }
  }

  return path.reverse();
}
