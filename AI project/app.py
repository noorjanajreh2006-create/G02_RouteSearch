from flask import Flask, render_template, request, jsonify, send_from_directory
import json
from search_algorithms import run_search, build_graph

app = Flask(__name__)

def load_default_map():
    with open('westbank_map.json', 'r') as f:
        return json.load(f)

map_data = load_default_map()

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/api/map', methods=['GET'])
def get_map():
    return jsonify(map_data)

@app.route('/api/search', methods=['POST'])
def search():
    data = request.json
    start = data.get('start')
    goal = data.get('goal')
    algo = data.get('algo')
    custom_map = data.get('map_data', map_data)

    cities_dict = {c['name']: c for c in custom_map['cities']}
    graph = build_graph(custom_map['roads'])

    result = run_search(start, goal, algo, graph, cities_dict)
    return jsonify(result)

@app.route('/api/compare', methods=['POST'])
def compare():
    data = request.json
    start = data.get('start')
    goal = data.get('goal')
    custom_map = data.get('map_data', map_data)

    cities_dict = {c['name']: c for c in custom_map['cities']}
    graph = build_graph(custom_map['roads'])

    algorithms = ['BFS', 'DFS', 'UCS', 'Greedy', 'A*']
    results = []
    min_cost = float('inf')

    for algo in algorithms:
        res = run_search(start, goal, algo, graph, cities_dict)
        if res['cost'] < min_cost:
            min_cost = res['cost']
        results.append({
            'algo': algo,
            'path': res['path'],
            'cost': res['cost'],
            'steps': res['steps']
        })

    for r in results:
        r['is_optimal'] = (r['cost'] == min_cost)

    return jsonify(results)

if __name__ == '__main__':
    app.run(debug=True, port=5000)