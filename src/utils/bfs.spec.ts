import { expect } from 'chai';
import { bfs } from './bfs';

describe('Module: bfs', () => {
  it('should exist', () => {
    expect(bfs).to.exist;
  });

  it('should return undefined when there is no path from a to b', () => {
    const graph = {
      nodes: ['a', 'b'],
      edges: {
        a: {
          b: 'a->b',
        },
      },
    };
    expect(bfs(graph, 'b', 'a')).to.not.exist;
  });

  it('should return the shortest path between nodes', () => {
    const graph = {
      nodes: ['a', 'b', 'c'],
      edges: {
        a: {
          b: 'a->b',
        },
        b: {
          c: 'b->c',
        },
        c: {
          d: 'c->d',
        },
        d: {
          f: 'd->f',
          e: 'd->e',
        },
        f: {
          a: 'f->a',
        },
      },
    };
    expect(bfs(graph, 'a', 'b')).to.eql(['a->b']);
    expect(bfs(graph, 'a', 'c')).to.eql(['a->b', 'b->c']);
    expect(bfs(graph, 'b', 'a')).to.eql(['b->c', 'c->d', 'd->f', 'f->a']);
    expect(bfs(graph, 'a', 'e')).to.eql(['a->b', 'b->c', 'c->d', 'd->e']);
    expect(bfs(graph, 'f', 'e')).to.eql(['f->a', 'a->b', 'b->c', 'c->d', 'd->e']);
  });
});
