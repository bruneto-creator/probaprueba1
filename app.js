document.addEventListener('DOMContentLoaded', () => {
    // Estado global de la App
    const state = {
        data: [],
        charts: {
            hist: null,
            ogive: null,
            pareto: null
        }
    };

    // --- UTILIDADES ---
    const setLog = (msg, isErr = false) => {
        const log = document.getElementById('status-log');
        log.textContent = msg;
        log.style.color = isErr ? '#ff00ff' : '#00f3ff';
    };

    // Función de redondeo estandarizada
    const round = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

    // --- CÁLCULOS ESTADÍSTICOS ---
    const processStats = () => {
        const inputStr = document.getElementById('data-input').value;
        const data = inputStr.split(',')
            .map(n => parseFloat(n.trim()))
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);

        if (data.length < 20) {
            setLog('ERROR: SE REQUIEREN MÍNIMO 20 DATOS', true);
            return;
        }

        state.data = data;
        setLog(`SISTEMA OPERATIVO: ${data.length} DATOS CARGADOS`);

        // Básicos
        const n = data.length;
        const min = data[0];
        const max = data[n - 1];
        const range = max - min;
        const sum = data.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        
        // Mediana
        const mid = Math.floor(n / 2);
        const median = n % 2 !== 0 ? data[mid] : (data[mid - 1] + data[mid]) / 2;

        // Moda
        const freqMap = {};
        data.forEach(x => freqMap[x] = (freqMap[x] || 0) + 1);
        let maxF = 0; let modes = [];
        for (let x in freqMap) {
            if (freqMap[x] > maxF) { maxF = freqMap[x]; modes = [x]; }
            else if (freqMap[x] === maxF) modes.push(x);
        }

        // Mostrar en UI con REDONDEO
        document.getElementById('val-mean').textContent = round(mean).toFixed(2);
        document.getElementById('val-median').textContent = round(median).toFixed(2);
        document.getElementById('val-mode').textContent = maxF > 1 ? modes.map(m => round(parseFloat(m)).toFixed(2)).join(', ') : 'N/A';
        document.getElementById('val-min').textContent = round(min).toFixed(2);
        document.getElementById('val-max').textContent = round(max).toFixed(2);
        document.getElementById('val-range').textContent = round(range).toFixed(2);

        // Tabla de Frecuencias (Sturges)
        const k = Math.ceil(1 + 3.322 * Math.log10(n));
        const amplitude = range / k;
        const intervals = generateFrequencyTable(data, k, amplitude, n, min, max);
        
        // Renderizar Gráficas
        renderCharts(intervals, n);
    };

    const generateFrequencyTable = (data, k, amplitude, n, min, max) => {
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '';
        const intervals = [];
        let currLimit = min;
        let Fi = 0;

        for (let i = 0; i < k; i++) {
            const lower = currLimit;
            const upper = (i === k - 1) ? max : currLimit + amplitude;
            
            // Frecuencia absoluta (fi)
            const fi = data.filter(x => (i === k - 1) ? (x >= lower && x <= upper) : (x >= lower && x < upper)).length;
            const fr = (fi / n) * 100;
            Fi += fi;
            const Fr = (Fi / n) * 100;

            const label = `${round(lower).toFixed(2)} - ${round(upper).toFixed(2)}`;
            intervals.push({ label, fi, fr, Fi, Fr });

            tableBody.innerHTML += `
                <tr>
                    <td>${label}</td>
                    <td>${fi}</td>
                    <td>${round(fr).toFixed(2)}%</td>
                    <td>${Fi}</td>
                    <td>${round(Fr).toFixed(2)}%</td>
                </tr>
            `;
            currLimit = upper;
        }
        return intervals;
    };

    // --- GRÁFICAS (CHART.JS) ---
    const renderCharts = (intervals, total) => {
        const labels = intervals.map(i => i.label);
        const fis = intervals.map(i => i.fi);
        const Fis = intervals.map(i => i.Fi);

        if (state.charts.hist) state.charts.hist.destroy();
        if (state.charts.ogive) state.charts.ogive.destroy();
        if (state.charts.pareto) state.charts.pareto.destroy();

        const baseConfig = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { ticks: { color: '#888' }, grid: { color: '#222' } },
                y: { ticks: { color: '#888' }, grid: { color: '#222' } }
            },
            plugins: { legend: { display: false } }
        };

        state.charts.hist = new Chart(document.getElementById('chart-hist-poly'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'fi', data: fis, backgroundColor: 'rgba(0, 243, 255, 0.4)', borderColor: '#00f3ff', borderWidth: 1 },
                    { label: 'Polígono', data: fis, type: 'line', borderColor: '#ff00ff', tension: 0.4, borderWidth: 2 }
                ]
            },
            options: baseConfig
        });

        state.charts.ogive = new Chart(document.getElementById('chart-ogive'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{ data: Fis, borderColor: '#00f3ff', backgroundColor: 'rgba(0,243,255,0.1)', fill: true, tension: 0.3 }]
            },
            options: baseConfig
        });

        const paretoData = [...intervals].sort((a, b) => b.fi - a.fi);
        let accum = 0;
        const paretoAcc = paretoData.map(i => {
            accum += i.fr;
            return accum;
        });

        state.charts.pareto = new Chart(document.getElementById('chart-pareto'), {
            type: 'bar',
            data: {
                labels: paretoData.map(i => i.label),
                datasets: [
                    { data: paretoData.map(i => i.fi), backgroundColor: '#ff00ff' },
                    { data: paretoAcc, type: 'line', borderColor: '#00f3ff', yAxisID: 'y2', pointRadius: 5 }
                ]
            },
            options: {
                ...baseConfig,
                scales: {
                    ...baseConfig.scales,
                    y2: { position: 'right', max: 100, ticks: { color: '#00f3ff' }, grid: { display: false } }
                }
            }
        });
    };

    // --- EVENTOS PRINCIPALES ---
    document.getElementById('process-btn').onclick = processStats;

    document.getElementById('random-btn').onclick = () => {
        const count = 20 + Math.floor(Math.random() * 15);
        const randData = Array.from({ length: count }, () => Math.floor(Math.random() * 100));
        document.getElementById('data-input').value = randData.join(', ');
        processStats();
    };

    document.getElementById('clear-btn').onclick = () => location.reload();

    // --- HERRAMIENTAS DE PROBABILIDAD ---

    // Conjuntos
    const setOp = (type) => {
        const a = document.getElementById('set-a').value.split(',').map(s => s.trim()).filter(s => s !== '');
        const b = document.getElementById('set-b').value.split(',').map(s => s.trim()).filter(s => s !== '');
        const resBox = document.getElementById('set-res');
        
        if (type === 'union') {
            const res = [...new Set([...a, ...b])].sort();
            resBox.textContent = `A ∪ B = { ${res.join(', ')} }`;
        } else {
            const res = a.filter(x => b.includes(x)).sort();
            resBox.textContent = `A ∩ B = { ${res.join(', ')} }`;
        }
    };
    document.getElementById('union-btn').onclick = () => setOp('union');
    document.getElementById('inter-btn').onclick = () => setOp('inter');

    // Combinatoria Robusta
    const getNFactorialRatio = (n, k) => {
        let res = 1;
        for (let i = n; i > k; i--) res *= i;
        return res;
    };

    const factorial = (n) => {
        if (n <= 1) return 1;
        let res = 1;
        for (let i = 2; i <= n; i++) res *= i;
        return res;
    };

    document.getElementById('perm-btn').onclick = () => {
        const n = parseInt(document.getElementById('n-val').value);
        const r = parseInt(document.getElementById('r-val').value);
        if (isNaN(n) || isNaN(r) || n < r || n < 0 || r < 0) {
            document.getElementById('comb-res').textContent = "Error: n ≥ r ≥ 0";
            return;
        }
        const res = getNFactorialRatio(n, n - r);
        document.getElementById('comb-res').textContent = `P(${n},${r}) = ${res.toLocaleString()}`;
    };

    document.getElementById('comb-btn').onclick = () => {
        const n = parseInt(document.getElementById('n-val').value);
        const r = parseInt(document.getElementById('r-val').value);
        if (isNaN(n) || isNaN(r) || n < r || n < 0 || r < 0) {
            document.getElementById('comb-res').textContent = "Error: n ≥ r ≥ 0";
            return;
        }
        // Optimización nCr para evitar desbordamiento: nCr(n, r) = nCr(n, n-r)
        const realR = r > n / 2 ? n - r : r;
        const res = getNFactorialRatio(n, n - realR) / factorial(realR);
        document.getElementById('comb-res').textContent = `C(${n},${r}) = ${Math.round(res).toLocaleString()}`;
    };

    // Probabilidad Básica
    document.getElementById('calc-prob-btn').onclick = () => {
        const f = parseFloat(document.getElementById('prob-f').value);
        const N = parseFloat(document.getElementById('prob-N').value);
        if (isNaN(f) || isNaN(N) || N === 0) return;
        const p = (f / N);
        document.getElementById('prob-res').textContent = `P(E) = ${round(p).toFixed(4)} (${round(p * 100).toFixed(2)}%)`;
    };

    // Regla Multiplicativa (Árbol)
    document.getElementById('tree-btn').onclick = () => {
        const pa = parseFloat(document.getElementById('p-a').value) || 0;
        const pba = parseFloat(document.getElementById('p-b-a').value) || 0;
        const res = round(pa * pba);
        
        document.getElementById('tree-res').textContent = 
`[INICIO]
   ├── P(A) = ${round(pa).toFixed(2)}
   │     └── P(B|A) = ${round(pba).toFixed(2)}  ──► P(A∩B) = ${res.toFixed(4)}
   └── P(A') = ${round(1 - pa).toFixed(2)}
         └── P(B|A') = ?`;
    };
});
