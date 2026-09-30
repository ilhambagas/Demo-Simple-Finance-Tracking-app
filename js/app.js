/**
 * Expense & Budget Visualizer
 * All-in-one Vanilla JS implementation
 */

// --- 1. State Management & LocalStorage Keys ---
const STORAGE_KEY_TRANSACTIONS = "ebv_transactions";
const STORAGE_KEY_THEME = "ebv_theme";
const STORAGE_KEY_LIMIT = "ebv_spending_limit";

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY_TRANSACTIONS)) || [];
let spendingLimit = parseFloat(localStorage.getItem(STORAGE_KEY_LIMIT)) || 50;
let categoryChart = null;

// --- 2. DOM Elements ---
const totalBalanceEl = document.getElementById("totalBalance");
const transactionListEl = document.getElementById("transactionList");
const transactionForm = document.getElementById("transactionForm");
const itemNameInput = document.getElementById("itemName");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const sortSelect = document.getElementById("sortSelect");
const spendingLimitInput = document.getElementById("spendingLimitInput");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");
const chartCanvas = document.getElementById("categoryChart");
const emptyChartMessage = document.getElementById("emptyChartMessage");

// --- 3. App Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  spendingLimitInput.value = spendingLimit;
  renderApp();

  // Event Listeners
  transactionForm.addEventListener("submit", handleAddTransaction);
  sortSelect.addEventListener("change", renderTransactions);
  spendingLimitInput.addEventListener("input", handleLimitChange);
  themeToggleBtn.addEventListener("click", toggleTheme);
});

// --- 4. Main Render Function ---
function renderApp() {
  renderTotalBalance();
  renderTransactions();
  renderChart();
}

// --- 5. Total Balance Logic ---
function renderTotalBalance() {
  const total = transactions.reduce((sum, item) => sum + parseFloat(item.amount), 0);
  totalBalanceEl.textContent = `$${total.toFixed(2)}`;
}

// --- 6. Transactions Rendering & Sorting ---
function renderTransactions() {
  transactionListEl.innerHTML = "";

  if (transactions.length === 0) {
    transactionListEl.innerHTML = `<p class="empty-msg" style="padding: 20px 0;">No transactions added yet.</p>`;
    return;
  }

  // Optional Challenge 1: Sorting
  const sortedList = [...transactions];
  const sortBy = sortSelect.value;

  if (sortBy === "amount-high") {
    sortedList.sort((a, b) => b.amount - a.amount);
  } else if (sortBy === "amount-low") {
    sortedList.sort((a, b) => a.amount - b.amount);
  } else if (sortBy === "category") {
    sortedList.sort((a, b) => a.category.localeCompare(b.category));
  } else {
    // default: newest first (by id / timestamp)
    sortedList.sort((a, b) => b.id - a.id);
  }

  sortedList.forEach((item) => {
    // Optional Challenge 2: Highlight spending over set limit
    const isExceeded = item.amount > spendingLimit;

    const itemEl = document.createElement("div");
    itemEl.className = `transaction-item ${isExceeded ? "highlight" : ""}`;

    itemEl.innerHTML = `
      <div class="item-left">
        <span class="item-name">${escapeHtml(item.name)}</span>
        <span class="item-amount">$${parseFloat(item.amount).toFixed(2)}</span>
        <div class="item-meta">
          <span class="category-badge badge-${item.category}">${item.category}</span>
          ${isExceeded ? `<span class="limit-warning-tag">⚠️ Over $${spendingLimit}</span>` : ""}
        </div>
      </div>
      <button class="btn-delete" onclick="handleDeleteTransaction(${item.id})">Delete</button>
    `;

    transactionListEl.appendChild(itemEl);
  });
}

// --- 7. Chart.js Logic ---
function renderChart() {
  const categoryTotals = {
    Food: 0,
    Transport: 0,
    Fun: 0,
  };

  transactions.forEach((item) => {
    if (categoryTotals.hasOwnProperty(item.category)) {
      categoryTotals[item.category] += parseFloat(item.amount);
    }
  });

  const totalSpent = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

  // If no spending, show empty notice
  if (totalSpent === 0) {
    if (categoryChart) categoryChart.destroy();
    categoryChart = null;
    chartCanvas.classList.add("hidden");
    emptyChartMessage.classList.remove("hidden");
    return;
  }

  chartCanvas.classList.remove("hidden");
  emptyChartMessage.classList.add("hidden");

  const chartData = {
    labels: ["Food", "Transport", "Fun"],
    datasets: [
      {
        data: [categoryTotals.Food, categoryTotals.Transport, categoryTotals.Fun],
        backgroundColor: ["#f97316", "#06b6d4", "#8b5cf6"],
        borderWidth: 2,
        borderColor: document.body.getAttribute("data-theme") === "dark" ? "#1e293b" : "#ffffff",
      },
    ],
  };

  if (categoryChart) {
    categoryChart.data = chartData;
    categoryChart.update();
  } else {
    const ctx = chartCanvas.getContext("2d");
    categoryChart = new Chart(ctx, {
      type: "pie",
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              boxWidth: 12,
              padding: 16,
              color: document.body.getAttribute("data-theme") === "dark" ? "#cbd5e1" : "#4b5563",
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const val = context.raw || 0;
                return ` ${context.label}: $${val.toFixed(2)}`;
              },
            },
          },
        },
      },
    });
  }
}

// --- 8. Add Transaction & Form Validation ---
function handleAddTransaction(e) {
  e.preventDefault();

  const name = itemNameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;

  let isValid = true;

  // Validate Name
  if (!name) {
    setError(itemNameInput, true);
    isValid = false;
  } else {
    setError(itemNameInput, false);
  }

  // Validate Amount
  if (isNaN(amount) || amount <= 0) {
    setError(amountInput, true);
    isValid = false;
  } else {
    setError(amountInput, false);
  }

  // Validate Category
  if (!category) {
    setError(categorySelect, true);
    isValid = false;
  } else {
    setError(categorySelect, false);
  }

  if (!isValid) return;

  const newTransaction = {
    id: Date.now(),
    name: name,
    amount: amount,
    category: category,
  };

  transactions.push(newTransaction);
  saveTransactions();
  renderApp();

  // Reset form
  transactionForm.reset();
}

function setError(inputElement, hasError) {
  const formGroup = inputElement.closest(".form-group");
  if (hasError) {
    formGroup.classList.add("has-error");
  } else {
    formGroup.classList.remove("has-error");
  }
}

// --- 9. Delete Transaction ---
window.handleDeleteTransaction = function (id) {
  transactions = transactions.filter((item) => item.id !== id);
  saveTransactions();
  renderApp();
};

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
}

// --- 10. Optional Challenge 2: Spending Limit Change ---
function handleLimitChange(e) {
  const val = parseFloat(e.target.value);
  spendingLimit = isNaN(val) ? 0 : val;
  localStorage.setItem(STORAGE_KEY_LIMIT, spendingLimit);
  renderTransactions();
}

// --- 11. Optional Challenge 3: Dark/Light Mode Toggle ---
function initTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || "light";
  applyTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  localStorage.setItem(STORAGE_KEY_THEME, newTheme);

  // Re-render chart to adapt colors
  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
    renderChart();
  }
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.body.setAttribute("data-theme", "dark");
    themeIcon.textContent = "☀️";
  } else {
    document.body.removeAttribute("data-theme");
    themeIcon.textContent = "🌙";
  }
}

// Security: Helper to escape HTML tags to prevent XSS
function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
