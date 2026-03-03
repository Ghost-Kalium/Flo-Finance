/* FLO FINANCE TRACKER — finance-script.js */

const INCOME_CATS = ['Salary','Freelance','Investment','Business','Gift','Other Income'];
const EXPENSE_CATS = ['Housing','Food','Transport','Health','Shopping','Entertainment','Utilities','Education','Other'];
const CAT_COLORS = ['#2563eb','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2','#be185d','#059669','#f59e0b'];

let transactions = JSON.parse(localStorage.getItem('flo-tx') || '[]');
let goals = JSON.parse(localStorage.getItem('flo-goals') || '[]');
let currentType = 'income';
let categoryChart = null;
let monthlyChart = null;

/* ---- INIT ---- */
function init() {
  document.getElementById('txDate').value = new Date().toISOString().split('T')[0];
  const m = new Date().toLocaleString('default',{month:'short'});
  const monthSel = document.getElementById('txMonth');
  for(let o of monthSel.options) if(o.value === m) { o.selected = true; break; }
  populateCategoryDropdowns();
  bindEvents();
  render();
}

function populateCategoryDropdowns() {
  const cats = currentType === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const txCat = document.getElementById('txCategory');
  txCat.innerHTML = '<option value="">Select category</option>';
  cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; txCat.appendChild(o); });

  const goalCat = document.getElementById('goalCategory');
  goalCat.innerHTML = '<option value="">Category</option>';
  EXPENSE_CATS.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; goalCat.appendChild(o); });

  const filterCat = document.getElementById('filterCat');
  const allCats = [...new Set(transactions.map(t => t.category))];
  filterCat.innerHTML = '<option value="all">All Categories</option>';
  allCats.forEach(c => { if(c) { const o = document.createElement('option'); o.value = c; o.textContent = c; filterCat.appendChild(o); }});
}

/* ---- EVENTS ---- */
function bindEvents() {
  document.getElementById('typeIncome').addEventListener('click', () => setType('income'));
  document.getElementById('typeExpense').addEventListener('click', () => setType('expense'));
  document.getElementById('addTxBtn').addEventListener('click', addTransaction);
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('clearBtn').addEventListener('click', () => document.getElementById('modalOverlay').classList.remove('hidden'));
  document.getElementById('modalCancel').addEventListener('click', () => document.getElementById('modalOverlay').classList.add('hidden'));
  document.getElementById('modalConfirm').addEventListener('click', clearAll);
  document.getElementById('addGoalBtn').addEventListener('click', () => document.getElementById('goalForm').classList.toggle('hidden'));
  document.getElementById('saveGoalBtn').addEventListener('click', saveGoal);
  document.getElementById('cancelGoalBtn').addEventListener('click', () => document.getElementById('goalForm').classList.add('hidden'));
  document.getElementById('analyzeBtn').addEventListener('click', analyzeWithAI);
  document.getElementById('filterCat').addEventListener('change', renderTransactions);
}

function setType(type) {
  currentType = type;
  document.getElementById('typeIncome').classList.toggle('active', type === 'income');
  document.getElementById('typeExpense').classList.toggle('active', type === 'expense');
  document.getElementById('typeIncome').classList.toggle('income-mode', type === 'income');
  document.getElementById('typeExpense').classList.toggle('expense-mode', type === 'expense');
  populateCategoryDropdowns();
}

/* ---- TRANSACTIONS ---- */
function addTransaction() {
  const desc = document.getElementById('txDesc').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);
  const category = document.getElementById('txCategory').value;
  const date = document.getElementById('txDate').value;
  const month = document.getElementById('txMonth').value;

  if (!desc) return alert('Please enter a description.');
  if (!amount || amount <= 0) return alert('Please enter a valid amount.');
  if (!category) return alert('Please select a category.');

  const tx = { id: Date.now(), type: currentType, desc, amount, category, date, month };
  transactions.unshift(tx);
  save();
  document.getElementById('txDesc').value = '';
  document.getElementById('txAmount').value = '';
  document.getElementById('txCategory').value = '';
  render();
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  save();
  render();
}

function save() {
  localStorage.setItem('flo-tx', JSON.stringify(transactions));
  localStorage.setItem('flo-goals', JSON.stringify(goals));
}

/* ---- GOALS ---- */
function saveGoal() {
  const cat = document.getElementById('goalCategory').value;
  const amt = parseFloat(document.getElementById('goalAmount').value);
  if (!cat) return alert('Select a category.');
  if (!amt || amt <= 0) return alert('Enter a valid limit.');
  const existing = goals.findIndex(g => g.category === cat);
  if (existing > -1) goals[existing].limit = amt;
  else goals.push({ category: cat, limit: amt });
  save();
  document.getElementById('goalForm').classList.add('hidden');
  document.getElementById('goalCategory').value = '';
  document.getElementById('goalAmount').value = '';
  renderGoals();
}

function deleteGoal(cat) {
  goals = goals.filter(g => g.category !== cat);
  save();
  renderGoals();
}

/* ---- RENDER ---- */
function render() {
  renderSummary();
  renderTransactions();
  renderGoals();
  renderCharts();
  populateCategoryDropdowns();
}

function fmt(n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function renderSummary() {
  const income = transactions.filter(t => t.type === 'income').reduce((s,t) => s+t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s,t) => s+t.amount, 0);
  const balance = income - expense;
  const savingsRate = income > 0 ? ((income - expense) / income * 100) : null;

  document.getElementById('totalIncome').textContent = fmt(income);
  document.getElementById('totalExpense').textContent = fmt(expense);
  document.getElementById('netBalance').textContent = fmt(balance);
  document.getElementById('netBalance').style.color = balance >= 0 ? 'var(--green)' : 'var(--red)';
  document.getElementById('incomeCount').textContent = transactions.filter(t=>t.type==='income').length + ' transactions';
  document.getElementById('expenseCount').textContent = transactions.filter(t=>t.type==='expense').length + ' transactions';
  document.getElementById('balanceStatus').textContent = balance >= 0 ? 'You\'re in the green ✓' : 'Spending exceeds income';
  document.getElementById('savingsRate').textContent = savingsRate !== null ? savingsRate.toFixed(1) + '%' : '—';
  document.getElementById('savingsRate').style.color = savingsRate !== null ? (savingsRate >= 20 ? 'var(--green)' : savingsRate >= 0 ? 'var(--amber)' : 'var(--red)') : 'var(--amber)';
}

function renderTransactions() {
  const filter = document.getElementById('filterCat').value;
  const list = document.getElementById('txList');
  let txs = transactions;
  if (filter !== 'all') txs = txs.filter(t => t.category === filter);
  if (!txs.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">◎</div><p>No transactions yet.</p><p class="empty-sub">Add your first income or expense above.</p></div>`;
    return;
  }
  list.innerHTML = txs.map(t => `
    <div class="tx-item">
      <div class="tx-dot ${t.type}"></div>
      <div class="tx-info">
        <div class="tx-desc">${t.desc}</div>
        <div class="tx-meta">${t.month} · ${t.date}</div>
      </div>
      <span class="tx-cat-chip">${t.category}</span>
      <span class="tx-amount ${t.type}">${t.type==='income'?'+':'-'}${fmt(t.amount)}</span>
      <button class="tx-delete" onclick="deleteTransaction(${t.id})">✕</button>
    </div>
  `).join('');
}

function renderGoals() {
  const container = document.getElementById('goalsContainer');
  if (!goals.length) {
    container.innerHTML = '<div class="empty-state-small">No goals yet. Set a spending limit per category.</div>';
    return;
  }
  container.innerHTML = goals.map(g => {
    const spent = transactions.filter(t => t.type === 'expense' && t.category === g.category).reduce((s,t) => s+t.amount, 0);
    const pct = Math.min((spent / g.limit) * 100, 100);
    const cls = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'safe';
    return `<div class="goal-item">
      <div class="goal-header">
        <span class="goal-name">${g.category}</span>
        <div style="display:flex;gap:0.5rem;align-items:center">
          <span class="goal-amounts">${fmt(spent)} / ${fmt(g.limit)}</span>
          <button class="goal-delete" onclick="deleteGoal('${g.category}')">✕</button>
        </div>
      </div>
      <div class="goal-bar-track"><div class="goal-bar-fill ${cls}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

/* ---- CHARTS ---- */
function renderCharts() {
  renderCategoryChart();
  renderMonthlyChart();
}

function renderCategoryChart() {
  const expenses = transactions.filter(t => t.type === 'expense');
  const catMap = {};
  expenses.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const labels = Object.keys(catMap);
  const data = Object.values(catMap);
  const colors = labels.map((_,i) => CAT_COLORS[i % CAT_COLORS.length]);

  const ctx = document.getElementById('categoryChart');
  if (categoryChart) { categoryChart.destroy(); categoryChart = null; }

  if (!labels.length) {
    ctx.parentElement.innerHTML = '<div class="empty-state-small" style="text-align:center;padding:2rem">No expense data yet.</div>';
    return;
  }

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 3, borderColor: '#ffffff', hoverOffset: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.parsed)}` } }
      }
    }
  });

  const legend = document.getElementById('categoryLegend');
  legend.innerHTML = labels.map((l,i) => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${colors[i]}"></div>
      <span>${l}</span>
    </div>`).join('');
}

function renderMonthlyChart() {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const incomeByMonth = {};
  const expenseByMonth = {};
  MONTHS.forEach(m => { incomeByMonth[m] = 0; expenseByMonth[m] = 0; });
  transactions.forEach(t => {
    if (t.type === 'income') incomeByMonth[t.month] = (incomeByMonth[t.month]||0) + t.amount;
    else expenseByMonth[t.month] = (expenseByMonth[t.month]||0) + t.amount;
  });
  const usedMonths = MONTHS.filter(m => incomeByMonth[m] > 0 || expenseByMonth[m] > 0);
  const labels = usedMonths.length ? usedMonths : MONTHS.slice(0, 6);

  const ctx = document.getElementById('monthlyChart');
  if (monthlyChart) { monthlyChart.destroy(); monthlyChart = null; }

  monthlyChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Income', data: labels.map(m => incomeByMonth[m]||0), backgroundColor: 'rgba(22,163,74,0.75)', borderRadius: 5, borderSkipped: false },
        { label: 'Expenses', data: labels.map(m => expenseByMonth[m]||0), backgroundColor: 'rgba(220,38,38,0.65)', borderRadius: 5, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { labels: { font: { family: 'Geist', size: 11 }, usePointStyle: true, pointStyleWidth: 8, padding: 16 } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` } }
      },
      scales: {
        x: { grid: { color: '#f1f3f7' }, ticks: { font: { family: 'Geist', size: 11 }, color: '#6b7280' }, border: { color: 'transparent' } },
        y: { grid: { color: '#f1f3f7' }, ticks: { font: { family: 'Geist', size: 11 }, color: '#6b7280', callback: v => '$'+v.toLocaleString() }, border: { color: 'transparent' } }
      }
    }
  });
}

/* ---- AI ANALYSIS ---- */
async function analyzeWithAI() {
  if (!transactions.length) return alert('Add some transactions first.');
  const btn = document.getElementById('analyzeBtn');
  const output = document.getElementById('aiOutput');
  btn.disabled = true;
  output.innerHTML = `<div class="ai-thinking"><div class="ai-dots"><span></span><span></span><span></span></div><span>Analyzing your finances…</span></div>`;

  const income = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const expense = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const catMap = {};
  transactions.filter(t=>t.type==='expense').forEach(t=>{ catMap[t.category]=(catMap[t.category]||0)+t.amount; });
  const topCats = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}: $${v.toFixed(2)}`).join(', ');
  const savingsRate = income > 0 ? ((income-expense)/income*100).toFixed(1) : 0;
  const txCount = transactions.length;

  const prompt = `You are a friendly personal finance advisor. Analyze this user's financial data and give clear, actionable insights in 3-4 short paragraphs. Be specific and encouraging. Do not use markdown headers or bullet points — just clean plain paragraphs.

User's Financial Summary:
- Total Income: $${income.toFixed(2)}
- Total Expenses: $${expense.toFixed(2)}
- Net Balance: $${(income-expense).toFixed(2)}
- Savings Rate: ${savingsRate}%
- Total Transactions: ${txCount}
- Top Expense Categories: ${topCats || 'None yet'}

Provide: 1) Overall assessment, 2) Key spending observation, 3) One concrete saving tip, 4) Encouraging closing remark. Keep it under 180 words total.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await res.json();
    const text = data.content?.[0]?.text || 'Could not get insights. Please try again.';
    const paras = text.split('\n').filter(p => p.trim());
    output.innerHTML = `<div class="ai-result">${paras.map(p => `<p>${p}</p>`).join('')}</div>`;
  } catch(e) {
    output.innerHTML = `<div class="ai-result"><p>⚠ Could not connect to AI. Make sure you're using this via Claude's interface or check your connection.</p></div>`;
  }
  btn.disabled = false;
}

/* ---- EXPORT ---- */
function exportCSV() {
  if (!transactions.length) return alert('No transactions to export.');
  const rows = [['Type','Description','Amount','Category','Month','Date']];
  transactions.forEach(t => rows.push([t.type, t.desc, t.amount.toFixed(2), t.category, t.month, t.date]));
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'flo-transactions.csv';
  a.click();
}

/* ---- CLEAR ---- */
function clearAll() {
  transactions = []; goals = [];
  save();
  document.getElementById('modalOverlay').classList.add('hidden');
  render();
}

init();
