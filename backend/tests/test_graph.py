from app.services.graph import detect_cycle, would_create_cycle


def test_detect_cycle_false_for_dag():
    nodes = {1, 2, 3, 4}
    edges = [(1, 2), (2, 3), (1, 4)]
    assert detect_cycle(nodes, edges) is False


def test_detect_cycle_true_for_simple_cycle():
    nodes = {1, 2, 3}
    edges = [(1, 2), (2, 3), (3, 1)]
    assert detect_cycle(nodes, edges) is True


def test_would_create_cycle():
    edges = [(1, 2), (2, 3)]
    assert would_create_cycle(edges, (3, 1)) is True
    assert would_create_cycle(edges, (1, 4)) is False
