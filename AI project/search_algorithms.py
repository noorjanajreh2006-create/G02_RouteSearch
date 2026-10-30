import math
from collections import deque
import heapq

def compute_heuristic(city_a, city_b, cities_dict):
    c1, c2 = cities_dict[city_a], cities_dict[city_b]
    dx = c1['x'] - c2['x']
    dy = c1['y'] - c2['y']
    return math.floor(math.sqrt(dx * dx + dy * dy))

def reconstruct_path(came_from, current):
    path = [current]
    while came_from[current] is not None:
        current = came_from[current]
        path.append(current)
    path.reverse()
    return path

def build_graph(roads):
    graph = {}
    for r in roads:
        u, v, cost = r['from'], r['to'], r['km']
        graph.setdefault(u, []).append((v, cost))
        graph.setdefault(v, []).append((u, cost))
    return graph

def run_search(start, goal, algo, graph, cities_dict):
    if start not in cities_dict or goal not in cities_dict:
        return {"path": [], "cost": 0, "steps": 0}

    visited = set()
    came_from = {start: None}
    g_cost = {start: 0}
    steps = 0

    if algo == 'BFS':
        frontier = deque([start])
    elif algo == 'DFS':
        frontier = [start]
    else:  
        frontier = []
        h_start = compute_heuristic(start, goal, cities_dict)
        if algo == 'UCS':
            heapq.heappush(frontier, (0, start))
        elif algo == 'Greedy':
            heapq.heappush(frontier, (h_start, start))
        elif algo == 'A*':
            heapq.heappush(frontier, (h_start, start))

    while frontier:
        if algo == 'BFS':
            frontier_list = list(frontier)
            frontier_list.sort()
            current = frontier_list.pop(0)
            frontier = deque(frontier_list)
        elif algo == 'DFS':
            current = frontier.pop()
        else:
            _, current = heapq.heappop(frontier)

        if current in visited:
            continue

        visited.add(current)
        steps += 1

        if current == goal:
            return {
                "path": reconstruct_path(came_from, goal),
                "cost": g_cost[goal],
                "steps": steps
            }

        neighbors = sorted(graph.get(current, []), key=lambda x: x[0], reverse=(algo == 'DFS'))
        for next_node, km in neighbors:
            new_g = g_cost[current] + km
            if next_node not in visited:
                if next_node not in g_cost or new_g < g_cost[next_node]:
                    g_cost[next_node] = new_g
                    came_from[next_node] = current
                    
                    if algo == 'BFS':
                        frontier.append(next_node)
                    elif algo == 'DFS':
                        frontier.append(next_node)
                    elif algo == 'UCS':
                        heapq.heappush(frontier, (new_g, next_node))
                    elif algo == 'Greedy':
                        h_val = compute_heuristic(next_node, goal, cities_dict)
                        heapq.heappush(frontier, (h_val, next_node))
                    elif algo == 'A*':
                        h_val = compute_heuristic(next_node, goal, cities_dict)
                        heapq.heappush(frontier, (new_g + h_val, next_node))

    return {"path": [], "cost": float('inf'), "steps": steps}