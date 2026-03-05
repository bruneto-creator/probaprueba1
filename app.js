document.addEventListener('DOMContentLoaded', () => {
    // Referencias DOM - Entrada y Datos
    const rawDataInput = document.getElementById('raw-data');
    const btnProcess = document.getElementById('btn-process');
    const btnRandom = document.getElementById('btn-random');
    const btnClear = document.getElementById('btn-clear');
    const statusMsg = document.getElementById('data-status');

    // Referencias DOM - Operaciones
    const btnUnion = document.getElementById('btn-union');
    const btnIntersection = document.getElementById('btn-intersection');
    const btnDifference = document.getElementById('btn-difference');
    const btnPerm = document.getElementById('btn-perm');
    const btnComb = document.getElementById('btn-comb');
    const btnTree = document.getElementById('btn-tree');

    // Variables de Gráficas
    let charts = {};

    // 1. Generación de Datos Aleatorios
    btnRandom.addEventListener('click', () => {
        const count = 25 + Math.floor(Math.random() * 25);
        const data = Array.from({ length: count }, () => Math.floor(Math.random() * 100));
        rawDataInput.value = data.join(', ');
        processData();
    });

    // 2. Limpiar Todo
    btnClear.addEventListener('click', () => {
        rawDataInput.value = '';
        statusMsg.textContent = '';
        ['mean', 'median', 'mode', 'range'].forEach(s => document.getElementById(`stat-${s}`).textContent = '-');
        document.getElementById('table-body').innerHTML = '';
        Object.values(charts).forEach(c => c.destroy());
        charts = {};
        document.getElementById('set-result').textContent = '';
        document.getElementById('comb-result').textContent = '';
        document.getElementById('tree-display').textContent = '';
    });

    // 3. Procesar Datos Principales
    btnProcess.addEventListener('click', processData);

    function processData() {
        const input = rawDataInput.value;
        const data = input.split(',')
            .map(n => parseFloat(n.trim()))
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);

        if (data.length < 20) {
            statusMsg.textContent = "Error: Se requieren al menos 20 datos numéricos.";
            statusMsg.style.color = "var(--neon-magenta)";
            return;
        }

        statusMsg.textContent = `Éxito: ${data.length} datos procesados.`;
        statusMsg.style.color = "var(--neon-green)";

        calculateBasicStats(data);
        const freqMap = generateFrequencyTable(data);
        renderCharts(freqMap, data);
    }

    function calculateBasicStats(data) {
        const n = data.length;
        const sum = data.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        
        let median;
        const mid = Math.floor(n / 2);
        if (n % 2 === 0) median = (data[mid - 1] + data[mid]) / 2;
        else median = data[mid];

        const counts = {};
        data.forEach(x => counts[x] = (counts[x] || 0) + 1);
        let maxFreq = 0;
        let modes = [];
        for (let x in counts) {
            if (counts[x] > maxFreq) {
                maxFreq = counts[x];
                modes = [x];
            } else if (counts[x] === maxFreq) {
                modes.push(x);
            }
        }
        const modaText = maxFreq > 1 ? modes.join(', ') : 'No hay';

        const min = data[0];
        const max = data[n - 1];
        const range = max - min;

        document.getElementById('stat-mean').textContent = mean.toFixed(2);
        document.getElementById('stat-median').textContent = median.toFixed(2);
        document.getElementById('stat-mode').textContent = modaText;
        document.getElementById('stat-range').textContent = range.toFixed(2);
    }

    function generateFrequencyTable(data) {
        const counts = {};
        data.forEach(x => counts[x] = (counts[x] || 0) + 1);
        
        const sortedKeys = Object.keys(counts).map(Number).sort((a, b) => a - b);
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '';

        let Fi = 0;
        const n = data.length;
        const freqMap = [];

        sortedKeys.forEach(x => {
            const fi = counts[x];
            const fr = (fi / n) * 100;
            Fi += fi;
            const Fr = (Fi / n) * 100;

            freqMap.push({ x, fi, fr, Fi, Fr });

            const row = `<tr>
                <td>${x}</td>
                <td>${fi}</td>
                <td>${fr.toFixed(2)}%</td>
                <td>${Fi}</td>
                <td>${Fr.toFixed(2)}%</td>
            </tr>`;
            tableBody.innerHTML += row;
        });

        return freqMap;
    }

    function renderCharts(freqMap, rawData) {
        const labels = freqMap.map(f => f.x);
        const fis = freqMap.map(f => f.fi);
        const Fis = freqMap.map(f => f.Fi);

        Object.values(charts).forEach(c => c.destroy());

        // Configuración común para Gráficas
        const chartOptions = {
            responsive: true,
            plugins: {
                legend: { labels: { color: '#e0e0e0', font: { family: 'Orbitron' } } }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0' } },
                x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0a0a0' } }
            }
        };

        // 1. Histograma y Polígono
        charts.histo = new Chart(document.getElementById('histogramChart'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frecuencia Absoluta (fi)',
                    data: fis,
                    backgroundColor: 'rgba(0, 243, 255, 0.4)',
                    borderColor: '#00f3ff',
                    borderWidth: 2,
                    order: 2
                }, {
                    label: 'Polígono de Frecuencias',
                    data: fis,
                    type: 'line',
                    borderColor: '#ff00ff',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: false,
                    order: 1
                }]
            },
            options: chartOptions
        });

        // 2. Ojiva
        charts.ogive = new Chart(document.getElementById('ogiveChart'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frecuencia Acumulada (Fi)',
                    data: Fis,
                    borderColor: '#39ff14',
                    backgroundColor: 'rgba(57, 255, 20, 0.2)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: chartOptions
        });

        // 3. Pareto
        const paretoData = [...freqMap].sort((a, b) => b.fi - a.fi);
        let acc = 0;
        const paretoAcc = paretoData.map(f => {
            acc += (f.fi / rawData.length) * 100;
            return acc;
        });

        charts.pareto = new Chart(document.getElementById('paretoChart'), {
            type: 'bar',
            data: {
                labels: paretoData.map(f => f.x),
                datasets: [{
                    label: 'fi',
                    data: paretoData.map(f => f.fi),
                    backgroundColor: '#ff00ff'
                }, {
                    label: '% Acumulado',
                    data: paretoAcc,
                    type: 'line',
                    borderColor: '#00f3ff',
                    yAxisID: 'y1'
                }]
            },
            options: {
                ...chartOptions,
                scales: {
                    ...chartOptions.scales,
                    y1: { position: 'right', max: 100, ticks: { color: '#00f3ff' } }
                }
            }
        });
    }

    // --- Operaciones con Conjuntos ---
    function getSets() {
        const a = new Set(document.getElementById('set-a').value.split(',').map(s => s.trim()).filter(s => s !== ''));
        const b = new Set(document.getElementById('set-b').value.split(',').map(s => s.trim()).filter(s => s !== ''));
        return { a, b };
    }

    btnUnion.onclick = () => {
        const { a, b } = getSets();
        const result = [...new Set([...a, ...b])];
        document.getElementById('set-result').textContent = `A ∪ B = { ${result.sort().join(', ')} }`;
    };

    btnIntersection.onclick = () => {
        const { a, b } = getSets();
        const result = [...a].filter(x => b.has(x));
        document.getElementById('set-result').textContent = `A ∩ B = { ${result.sort().join(', ')} }`;
    };

    btnDifference.onclick = () => {
        const { a, b } = getSets();
        const result = [...a].filter(x => !b.has(x));
        document.getElementById('set-result').textContent = `A - B = { ${result.sort().join(', ')} }`;
    };

    // --- Combinatoria ---
    function factorial(n) {
        if (n < 0) return 0;
        if (n === 0) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    }

    btnPerm.onclick = () => {
        const n = parseInt(document.getElementById('calc-n').value);
        const r = parseInt(document.getElementById('calc-r').value);
        if (r > n) { document.getElementById('comb-result').textContent = "r > n!"; return; }
        const res = factorial(n) / factorial(n - r);
        document.getElementById('comb-result').textContent = `P(${n},${r}) = ${res.toLocaleString()}`;
    };

    btnComb.onclick = () => {
        const n = parseInt(document.getElementById('calc-n').value);
        const r = parseInt(document.getElementById('calc-r').value);
        if (r > n) { document.getElementById('comb-result').textContent = "r > n!"; return; }
        const res = factorial(n) / (factorial(r) * factorial(n - r));
        document.getElementById('comb-result').textContent = `C(${n},${r}) = ${res.toLocaleString()}`;
    };

    // --- Árbol de Probabilidad ---
    btnTree.onclick = () => {
        const pa = parseFloat(document.getElementById('prob-a').value) || 0;
        const pba = parseFloat(document.getElementById('prob-b-given-a').value) || 0;
        const pa_not = (1 - pa).toFixed(2);
        const pba_not = (1 - pba).toFixed(2);
        const intersection = (pa * pba).toFixed(4);

        const tree = `
INICIO
├── (A) P(A) = ${pa}
│   ├── (B|A) P(B|A) = ${pba}  ───► P(A∩B) = ${intersection}
│   └── (B'|A) P(B'|A) = ${pba_not}
└── (A') P(A') = ${pa_not}
    ├── (B|A') P(B|A') = ?
    └── (B'|A') P(B'|A') = ?
        `;
        document.getElementById('tree-display').textContent = tree;
    };
});
