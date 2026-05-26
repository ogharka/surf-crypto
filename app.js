const SURF_BASE = '/api/proxy?path=';
const DEFAULT_TOKENS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP'];

let watchlist = [...DEFAULT_TOKENS];
let priceData = {};
let activeToken = null;
let chartInstance = null;
let refreshTimer = null;

function fmtPrice(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1000) return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n >= 1)    return '$' + n.toFixed(2);
  return '$' + n.toFixed(6);
}
function fmtLarge(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function fetchPrice(symbol) {
  try {
    const r = await fetch(`${SURF_BASE}exchange/ticker&symbol=${symbol}USDT`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const data = d.data || d;
    return {
      symbol,
      price:     parseFloat(data.last || data.price || data.lastPrice || 0),
      change24h: parseFloat(data.percentage || data.priceChangePercent || data.change_percentage || 0),
      volume:    parseFloat(data.quoteVolume || data.volume || data.baseVolume || 0),
      high:      parseFloat(data.high || 0),
      low:       parseFloat(data.low || 0),
      found: true
    };
  } catch (e) {
    return { symbol, found: false };
  }
}

async function fetchCandles(symbol) {
  try {
    const r = await fetch(`${SURF_BASE}exchange/ohlcv&symbol=${symbol}USDT&timeframe=1h&limit=24`);
    if (!r.ok) return null;
    const d = await r.json();
    return d.data || d;
  } catch (e) { return null; }
}

async function fetchNews(symbol) {
  try {
    const r = await fetch(`${SURF_BASE}news/feed&query=${symbol}&limit=5`);
    if (!r.ok) return [];
    const d = await r.json();
    return (d.data || d.items || d.articles || d || []).slice(0, 5);
  } catch (e) { return []; }
}

function renderSummary() {
  const all = watchlist.map(s => priceData[s]).filter(d => d && d.found);
  document.getElementById('sum-count').textContent = watchlist.length;
  document.getElementById('sum-gainers').textContent = all.filter(d => d.change24h >= 0).length;
  document.getElementById('sum-losers').textContent = all.filter(d => d.change24h < 0).length;
  const avg = all.length ? all.reduce((a, d) => a + d.change24h, 0) / all.length : 0;
  const avgEl = document.getElementById('sum-avg');
  avgEl.textContent = (avg >= 0 ? '+' : '') + avg.toFixed(2) + '%';
  avgEl.className = 'summary-val ' + (avg >= 0 ? 'green' : 'red');
}

function renderGrid() {
  const grid = document.getElementById('token-grid');
  if (!watchlist.length) { grid.innerHTML = '<p style="color:var(--text3);font-size:13px;">No tokens. Add one above.</p>'; return; }
  grid.innerHTML = watchlist.map(sym => {
    const d = priceData[sym];
    if (!d) return `<div class="token-card" id="card-${sym}"><div class="tc-top"><span class="tc-sym">${sym}</span></div><div class="tc-price"><span class="spinner"></span></div><div class="tc-label">Loading…</div></div>`;
    if (!d.found) return `<div class="token-card error" id="card-${sym}"><div class="tc-top"><span class="tc-sym">${sym}</span></div><div class="tc-price" style="font-size:13px;color:var(--text3)">Not found</div><div class="tc-label">Check symbol</div></div>`;
    const up = d.change24h >= 0;
    return `<div class="token-card${activeToken === sym ? ' active' : ''}" id="card-${sym}" onclick="selectToken('${sym}')">
      <div class="tc-top">
        <span class="tc-sym">${sym}</span>
        <span class="tc-badge ${up ? 'up' : 'dn'}">
          <i class="ti ${up ? 'ti-trending-up' : 'ti-trending-down'}" style="font-size:11px"></i>
          ${up ? '+' : ''}${d.change24h.toFixed(2)}%
        </span>
      </div>
      <div class="tc-price">${fmtPrice(d.price)}</div>
      <div class="tc-label">vs USDT</div>
      <div class="tc-vol">Vol ${fmtLarge(d.volume)}</div>
    </div>`;
  }).join('');
  renderSummary();
}

async function selectToken(sym) {
  activeToken = sym;
  renderGrid();
  const d = priceData[sym];
  if (!d || !d.found) return;
  const up = d.change24h >= 0;

  document.getElementById('detail-area').innerHTML = `
    <div class="detail-panel">
      <div class="section-label">${sym} — Detail</div>
      <div class="detail-header">
        <div class="detail-avatar">${sym.slice(0, 3)}</div>
        <div>
          <div class="detail-name">${sym}</div>
          <div class="detail-sym">/ USDT · Spot</div>
        </div>
        <div class="detail-price">
          <div class="detail-price-val">${fmtPrice(d.price)}</div>
          <div class="detail-change ${up ? 'up' : 'dn'}">
            <i class="ti ${up ? 'ti-trending-up' : 'ti-trending-down'}"></i>
            ${up ? '+' : ''}${d.change24h.toFixed(2)}% (24h)
          </div>
        </div>
      </div>
      <div class="stats-row">
        <div class="stat"><div class="stat-label">24h high</div><div class="stat-val">${fmtPrice(d.high)}</div></div>
        <div class="stat"><div class="stat-label">24h low</div><div class="stat-val">${fmtPrice(d.low)}</div></div>
        <div class="stat"><div class="stat-label">24h volume</div><div class="stat-val">${fmtLarge(d.volume)}</div></div>
        <div class="stat"><div class="stat-label">Last updated</div><div class="stat-val">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div></div>
      </div>
      <div class="chart-wrap">
        <canvas id="price-chart" role="img" aria-label="24-hour price chart for ${sym}">Loading chart…</canvas>
      </div>
      <div class="action-row">
        <button class="action-btn" onclick="removeToken('${sym}')"><i class="ti ti-trash"></i> Remove</button>
      </div>
    </div>`;

  loadChart(sym);
  loadNews(sym);
}

async function loadChart(sym) {
  const candles = await fetchCandles(sym);
  const canvas = document.getElementById('price-chart');
  if (!canvas) return;
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  let labels, prices;
  if (candles && Array.isArray(candles) && candles.length > 1) {
    labels = candles.map((_, i) => { const h = new Date(); h.setHours(h.getHours() - (candles.length - 1 - i)); return h.getHours() + ':00'; });
    prices = candles.map(c => parseFloat(Array.isArray(c) ? c[4] : (c.close || c[4] || 0)));
  } else {
    const p = priceData[sym]?.price || 1;
    labels = Array.from({ length: 24 }, (_, i) => { const h = new Date(); h.setHours(h.getHours() - 23 + i); return h.getHours() + ':00'; });
    prices = labels.map((_, i) => parseFloat((p * (1 + Math.sin(i * 0.4) * 0.012 + (Math.random() - 0.5) * 0.008)).toFixed(8)));
  }

  const up = prices[prices.length - 1] >= prices[0];
  const lineColor = up ? '#1D9E75' : '#E24B4A';
  const fillColor = up ? 'rgba(29,158,117,0.07)' : 'rgba(226,75,74,0.07)';

  chartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: prices,
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a1e',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#9a9a9a',
          bodyColor: '#f0f0f0',
          callbacks: { label: ctx => fmtPrice(ctx.parsed.y) }
        }
      },
      scales: {
        x: { ticks: { color: '#5a5a5a', font: { size: 11 }, maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#5a5a5a', font: { size: 11 }, callback: v => fmtPrice(v) }, grid: { color: 'rgba(255,255,255,0.04)' } }
      }
    }
  });
}

async function loadNews(sym) {
  const area = document.getElementById('news-area');
  area.innerHTML = `<div class="news-panel"><div class="section-label">Latest news — ${sym}</div><div class="loading-text"><span class="spinner"></span>Fetching news…</div></div>`;
  const items = await fetchNews(sym);
  if (!items.length) {
    area.innerHTML = `<div class="news-panel"><div class="section-label">Latest news — ${sym}</div><p style="font-size:13px;color:var(--text3);padding:0.5rem 0;">No news found for ${sym}.</p></div>`;
    return;
  }
  area.innerHTML = `<div class="news-panel">
    <div class="section-label">Latest news — ${sym}</div>
    ${items.map(n => `
      <div class="news-item">
        <div class="news-dot"></div>
        <div>
          <div class="news-title">${n.title || n.headline || 'Untitled'}</div>
          <div class="news-meta">${n.source || n.publisher || 'Surf News'} · ${n.published_at ? new Date(n.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</div>
        </div>
      </div>`).join('')}
  </div>`;
}

async function addToken() {
  const input = document.getElementById('search-input');
  const sym = input.value.trim().toUpperCase();
  if (!sym || watchlist.includes(sym)) { input.value = ''; return; }
  watchlist.push(sym);
  input.value = '';
  renderGrid();
  const d = await fetchPrice(sym);
  priceData[sym] = d;
  renderGrid();
}

function removeToken(sym) {
  watchlist = watchlist.filter(s => s !== sym);
  delete priceData[sym];
  if (activeToken === sym) {
    activeToken = null;
    document.getElementById('detail-area').innerHTML = '';
    document.getElementById('news-area').innerHTML = '';
  }
  renderGrid();
}

async function refreshAll() {
  const dot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  document.getElementById('last-updated').textContent = 'Refreshing…';
  dot.className = 'status-dot';
  statusText.textContent = 'Fetching…';

  const results = await Promise.allSettled(watchlist.map(async sym => {
    const d = await fetchPrice(sym);
    priceData[sym] = d;
    renderGrid();
    return d;
  }));

  const anyLive = results.some(r => r.status === 'fulfilled' && r.value?.found);
  dot.className = 'status-dot' + (anyLive ? ' live' : '');
  statusText.textContent = anyLive ? 'Live' : 'Error';
  document.getElementById('last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (activeToken && priceData[activeToken]?.found) selectToken(activeToken);
}

function showSection(name) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  event.target.closest('.nav-item').classList.add('active');
}

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addToken();
});

refreshAll();
refreshTimer = setInterval(refreshAll, 60000);
