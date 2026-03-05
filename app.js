document.addEventListener('DOMContentLoaded', () => {
    const state = {
        data: [],
        charts: {}
    };

    // DOM References
    const input = document.getElementById('data-input');
    const log = document.getElementById('status-log');

    // UI Updates
    const setLog = (msg, isErr = false) => {
        log.textContent = msg;
        log.style.color = isErr ? 'var(--magenta)' : 'var(--cyan)';
    };

    // Statistical Engine
    const calculateStats = (data) => {
        const n = data.length;
        const sum = data.reduce((a, b) => a + b, 0);
        const mean = sum / n;
        
        const sorted = [...data].sort((a, b) => a - b);
        const median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[Math.floor(n/2)];
        
        const freq = {};
        data.forEach(x => freq[x] = (freq[x] || 0) + 1);
        let maxF = 0; let modes = [];
        for (let k in freq) {
            if (freq[k] > maxF) { maxF = freq[k]; modes = [k]; }
            else if (freq[k] === maxF) modes.push(k);
        }
        
        const min = sorted[0];
        const max = sorted[n - 1];

        document.getElementById('val-mean').textContent = mean.toFixed(2);
        document.getElementById('val-median').textContent = median.toFixed(2);
        document.getElementById('val-mode').textContent = maxF > 1 ? modes.join(',') : 'N/A';
        document.getElementById('val-min').textContent = min;
        document.getElementById('val-max').textContent = max;
        document.getElementById('val-range').textContent = (max - min).toFixed(2);

        return { n, min, max, sorted };
    };

    const generateTable = (stats) => {
        const { n, min, max, sorted } = stats;
        const k = Math.ceil(1 + 3.322 * Math.log10(n)); // Sturges
        const range = max - min;
        const amplitude = range / k;
        
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '';
        
        const intervals = [];
        let currentLower = min;
        let Fi = 0;

        for (let i = 0; i < k; i++) {
            const upper = i === k - 1 ? max : currentLower + amplitude;
            const fi = sorted.filter(x => x >= currentLower && (i === k - 1 ? x <= upper : x < upper)).length;
            const fr = (fi / n) * 100;
            Fi += fi;
            const Fr = (Fi / n) * 100;

            intervals.push({ 
                label: `${currentLower.toFixed(1)} - ${upper.toFixed(1)}`, 
                fi, fr, Fi, Fr,
                mid: (currentLower + upper) / 2
            });

            tableBody.innerHTML += `<tr>
                <td>${currentLower.toFixed(1)} - ${upper.toFixed(1)}</td>
                <td>${fi}</td>
                <td>${fr.toFixed(2)}%</td>
                <td>${Fi}</td>
                <td>${Fr.toFixed(2)}%</td>
            </tr>`;
            currentLower = upper;
        }
        return intervals;
    };

    const initCharts = (intervals) => {
        const labels = intervals.map(i => i.label);
        const fis = intervals.map(i => i.fi);
        const Fis = intervals.map(i => i.Fi);

        if (state.charts.hist) Object.values(state.charts).forEach(c => c.destroy());

        const baseOpts = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: '#222' }, ticks: { color: '#666' } },
                y: { grid: { color: '#222' }, ticks: { color: '#666' } }
            }
        };

        // Hist & Poly
        state.charts.hist = new Chart(document.getElementById('chart-hist-poly'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'fi', data: fis, backgroundColor: 'rgba(0, 243, 255, 0.3)', borderColor: '#00f3ff', borderWidth: 1 },
                    { label: 'Polígono', data: fis, type: 'line', borderColor: '#ff00ff', tension: 0.4 }
                ]
            },
            options: baseOpts
        });

        // Ogive
        state.charts.ogive = new Chart(document.getElementById('chart-ogive'), {
            type: 'line',
            data: {
                labels,
                datasets: [{ data: Fis, borderColor: '#00f3ff', backgroundColor: 'rgba(0,243,255,0.1)', fill: true }]
            },
            options: baseOpts
        });

        // Pareto
        const sortedIntervals = [...intervals].sort((a, b) => b.fi - a.fi);
        let accFr = 0;
        const paretoAcc = sortedIntervals.map(i => {
            accFr += i.fr;
            return accFr;
        });

        state.charts.pareto = new Chart(document.getElementById('chart-pareto'), {
            type: 'bar',
            data: {
                labels: sortedIntervals.map(i => i.label),
                datasets: [
                    { data: sortedIntervals.map(i => i.fi), backgroundColor: '#ff00ff' },
                    { data: paretoAcc, type: 'line', borderColor: '#00f3ff', yAxisID: 'y2' }
                ]
            },
            options: {
                ...baseOpts,
                scales: { 
                    ...baseOpts.scales, 
                    y2: { position: 'right', max: 100, grid: { display: false } }
                }
            }
        });
    };

    // Event Listeners
    document.getElementById('process-btn').onclick = () => {
        const data = input.value.split(',').map(Number).filter(n => !isNaN(n));
        if (data.length < 20) return setLog('MÍNIMO 20 DATOS REQUERIDOS', true);
        
        state.data = data;
        setLog(`PROCESADOS ${data.length} DATOS`);
        const stats = calculateStats(data);
        const intervals = generateTable(stats);
        initCharts(intervals);
    };

    document.getElementById('random-btn').onclick = () => {
        const data = Array.from({ length: 25 }, () => Math.floor(Math.random() * 100));
        input.value = data.join(', ');
        document.getElementById('process-btn').click();
    };

    document.getElementById('clear-btn').onclick = () => location.reload();

    // Probability & Sets
    const getSets = () => ({
        a: new Set(document.getElementById('set-a').value.split(',').map(s => s.trim())),
        b: new Set(document.getElementById('set-b').value.split(',').map(s => s.trim()))
    });

    document.getElementById('union-btn').onclick = () => {
        const { a, b } = getSets();
        document.getElementById('set-res').textContent = `A ∪ B = { ${[...new Set([...a, ...b])].sort().join(', ')} }`;
    };

    document.getElementById('inter-btn').onclick = () => {
        const { a, b } = getSets();
        document.getElementById('set-res').textContent = `A ∩ B = { ${[...a].filter(x => b.has(x)).sort().join(', ')} }`;
    };

    const fact = n => (n <= 1 ? 1 : n * fact(n - 1));
    document.getElementById('perm-btn').onclick = () => {
        const n = +document.getElementById('n-val').value;
        const r = +document.getElementById('r-val').value;
        document.getElementById('comb-res').textContent = n < r ? 'n < r' : `P = ${fact(n) / fact(n - r)}`;
    };

    document.getElementById('comb-btn').onclick = () => {
        const n = +document.getElementById('n-val').value;
        const r = +document.getElementById('r-val').value;
        document.getElementById('comb-res').textContent = n < r ? 'n < r' : `C = ${fact(n) / (fact(r) * fact(n - r))}`;
    };

    document.getElementById('tree-btn').onclick = () => {
        const pa = +document.getElementById('p-a').value;
        const pba = +document.getElementById('p-b-a').value;
        const res = (pa * pba).toFixed(4);
        document.getElementById('tree-res').textContent = 
            `INICIO\n └── P(A): ${pa}\n      └── P(B|A): ${pba}  ──► P(A∩B): ${res}\n └── P(A'): ${(1-pa).toFixed(2)}`;
    };
});
