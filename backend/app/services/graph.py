from collections import defaultdict, deque


def detect_cycle(nodes: set[int], edges: list[tuple[int, int]]) -> bool:
    indegree: dict[int, int] = {node: 0 for node in nodes}
    adj: dict[int, list[int]] = defaultdict(list)

    for parent, child in edges:
        adj[parent].append(child)
        indegree[child] = indegree.get(child, 0) + 1
        indegree.setdefault(parent, 0)

    queue = deque(sorted(node for node in nodes if indegree.get(node, 0) == 0))
    seen = 0

    while queue:
        node = queue.popleft()
        seen += 1
        for nxt in adj.get(node, []):
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)

    return seen != len(nodes)


def would_create_cycle(existing_edges: list[tuple[int, int]], new_edge: tuple[int, int]) -> bool:
    parent, child = new_edge
    if parent == child:
        return True

    adj: dict[int, list[int]] = defaultdict(list)
    for src, dst in existing_edges:
        adj[src].append(dst)

    queue = deque([child])
    visited = set()
    while queue:
        node = queue.popleft()
        if node in visited:
            continue
        visited.add(node)
        if node == parent:
            return True
        queue.extend(adj.get(node, []))
    return False
