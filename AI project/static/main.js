let currentMapData = null;
let currentPath = [];
const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');
const container = document.getElementById('map-container');

function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawMap();
}

window.addEventListener('resize', resizeCanvas);

function loadDefaultMap() {
    fetch('/api/map')
        .then(res => res.json())
        .then(data => {
            currentMapData = data;
            document.getElementById('map-title').innerText = data.name || "Road Map";
            populateCityDropdowns(data.cities);
            resizeCanvas();
        });
}

function populateCityDropdowns(cities) {
    const startSelect = document.getElementById('start-city');
    const goalSelect = document.getElementById('goal-city');
    
    startSelect.innerHTML = '<option value="">-- Select Start --</option>';
    goalSelect.innerHTML = '<option value="">-- Select Goal --</option>';

    cities.forEach(c => {
        const opt1 = document.createElement('option');
        opt1.value = c.name;
        opt1.textContent = c.name;
        startSelect.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = c.name;
        opt2.textContent = c.name;
        goalSelect.appendChild(opt2);
    });
}

document.getElementById('map-upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const data = JSON.parse(event.target.result);
            currentMapData = data;
            currentPath = [];
            
            document.getElementById('map-title').innerText = data.name || "Custom Map";
            document.getElementById('single-result').classList.add('hidden');
            document.getElementById('compare-section').classList.add('hidden');
            
            populateCityDropdowns(data.cities);
            resizeCanvas();
        } catch (err) {
            alert("Invalid JSON file format!");
        }
    };
    reader.readAsText(file);
});

function getTransformedCoordinates(cities) {
    if (!cities || cities.length === 0) return {};

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    cities.forEach(c => {
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;
    });

    const padding = 60;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;

    const coords = {};
    cities.forEach(c => {
        const nx = (c.x - minX) / rangeX;
        const ny = (c.y - minY) / rangeY;

        const screenX = padding + nx * width;
        const screenY = canvas.height - (padding + ny * height);

        coords[c.name] = { x: screenX, y: screenY };
    });

    return coords;
}

function drawMap() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!currentMapData) return;

    const coords = getTransformedCoordinates(currentMapData.cities);

    currentMapData.roads.forEach(r => {
        const p1 = coords[r.from];
        const p2 = coords[r.to];
        if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 2;
            ctx.stroke();

            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.fillStyle = '#888888';
            ctx.font = '11px Segoe UI';
            ctx.fillText(r.km + ' km', midX, midY);
        }
    });

    if (currentPath && currentPath.length > 1) {
        for (let i = 0; i < currentPath.length - 1; i++) {
            const u = coords[currentPath[i]];
            const v = coords[currentPath[i + 1]];
            if (u && v) {
                ctx.beginPath();
                ctx.moveTo(u.x, u.y);
                ctx.lineTo(v.x, v.y);
                ctx.strokeStyle = '#2fb344';
                ctx.lineWidth = 5;
                ctx.stroke();
            }
        }
    }

    currentMapData.cities.forEach(c => {
        const p = coords[c.name];
        if (p) {
            const isPathNode = currentPath.includes(c.name);
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, isPathNode ? 8 : 6, 0, Math.PI * 2);
            ctx.fillStyle = isPathNode ? '#2fb344' : '#4da6ff';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Segoe UI';
            ctx.fillText(c.name, p.x + 10, p.y + 4);
        }
    });
}

document.getElementById('btn-search').addEventListener('click', function () {
    const start = document.getElementById('start-city').value;
    const goal = document.getElementById('goal-city').value;
    const algo = document.getElementById('algorithm').value;

    if (!start || !goal) {
        alert("Please select both start and goal cities.");
        return;
    }

    fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            start: start,
            goal: goal,
            algo: algo,
            map_data: currentMapData
        })
    })
    .then(res => res.json())
    .then(data => {
        currentPath = data.path;
        drawMap();

        document.getElementById('res-path').innerText = data.path.length > 0 ? data.path.join(' → ') : 'No path found';
        document.getElementById('res-cost').innerText = data.cost;
        document.getElementById('res-steps').innerText = data.steps;

        document.getElementById('single-result').classList.remove('hidden');
        document.getElementById('compare-section').classList.add('hidden');
    });
});

document.getElementById('btn-compare').addEventListener('click', function () {
    const start = document.getElementById('start-city').value;
    const goal = document.getElementById('goal-city').value;

    if (!start || !goal) {
        alert("Please select both start and goal cities.");
        return;
    }

    fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            start: start,
            goal: goal,
            map_data: currentMapData
        })
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.querySelector('#compare-table tbody');
        tbody.innerHTML = '';

        data.forEach(item => {
            const tr = document.createElement('tr');
            if (item.is_optimal) {
                tr.classList.add('optimal-row');
            }

            const pathStr = item.path.length > 0 ? item.path.join(' → ') : 'No path';
            const optimalBadge = item.is_optimal ? '<span class="optimal-badge">YES</span>' : 'NO';

            tr.innerHTML = `
                <td><strong>${item.algo}</strong></td>
                <td>${pathStr}</td>
                <td>${item.cost}</td>
                <td>${item.steps}</td>
                <td>${optimalBadge}</td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('compare-section').classList.remove('hidden');
        document.getElementById('single-result').classList.add('hidden');
    });
});

loadDefaultMap();