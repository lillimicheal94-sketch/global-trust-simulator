const demoUsers = [
  {
    id: 'admin-1',
    name: 'Global Trust Admin',
    email: 'admin@globaltrustsimulator.demo',
    password: 'admin123!',
    role: 'admin',
    verified: true,
    status: 'active',
    balance: 0,
    transactions: []
  }
];

const state = {
  currentUser: null,
  currentView: 'dashboard',
  activeTab: 'login',
  selectedCustomerId: null,
  seed: 1
};

const storageKey = 'global-trust-simulator-demo';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
};

const loadUsers = () => {
  const users = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (!users || !Array.isArray(users) || users.length === 0) {
    localStorage.setItem(storageKey, JSON.stringify(demoUsers));
    return [...demoUsers];
  }
  return users;
};

const saveUsers = (users) => {
  localStorage.setItem(storageKey, JSON.stringify(users));
};

const getUsers = () => loadUsers();

const showMessage = (text, type = '') => {
  const el = document.getElementById('message');
  if (!el) return;
  el.textContent = text;
  el.className = 'form-message';
  if (type) el.classList.add(type);
};

const showAdminMessage = (text, type = '') => {
  const el = document.getElementById('admin-message');
  if (!el) return;
  el.textContent = text;
  el.className = 'form-message';
  if (type) el.classList.add(type);
};

const setView = (screenId) => {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === screenId);
  });

  document.querySelectorAll('.nav-item').forEach((nav) => {
    nav.classList.toggle('active', nav.dataset.view === state.currentView);
  });
};

const updateHeader = () => {
  const name = state.currentUser ? state.currentUser.name : 'Customer Account';
  document.getElementById('account-name').textContent = name;
  const profile = document.getElementById('profile-button');
  if (profile) {
    profile.innerHTML = `<span>${name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'JD'}</span>`;
  }
};

const getCurrentBalance = (user) => {
  return (user.transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
};

const renderTransactions = () => {
  const list = document.getElementById('transaction-list');
  if (!list) return;
  const user = state.currentUser;
  const transactions = Array.isArray(user?.transactions) ? user.transactions : [];

  if (!transactions.length) {
    list.innerHTML = `<li class="transaction-row"><div class="transaction-meta"><div class="transaction-icon">0</div><div class="transaction-text"><strong>No transactions yet</strong><span>New accounts start at $0.00</span></div></div><div class="transaction-amount">$0.00</div></li>`;
    return;
  }

  list.innerHTML = transactions
    .slice()
    .reverse()
    .slice(0, 5)
    .map((tx) => {
      const isExpense = tx.type === 'withdrawal' || tx.type === 'transfer';
      const amount = tx.amount;
      const sign = isExpense ? '-' : '+';
      return `
        <li class="transaction-row">
          <div class="transaction-meta">
            <div class="transaction-icon">${tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '-' : '↔'}</div>
            <div class="transaction-text">
              <strong>${tx.label}</strong>
              <span>${tx.date} • ${tx.description || 'Simulated transfer'}</span>
            </div>
          </div>
          <div class="transaction-amount ${isExpense ? 'expense' : 'income'}">${sign}${formatCurrency(amount)}</div>
        </li>
      `;
    })
    .join('');
};

const renderBalance = () => {
  const user = state.currentUser;
  const balance = user ? getCurrentBalance(user) : 0;
  const totalDisplay = document.getElementById('total-balance');
  if (totalDisplay) totalDisplay.textContent = formatCurrency(balance);

  const savings = document.getElementById('savings-balance');
  if (savings) savings.textContent = formatCurrency(Math.max(balance, 2540));
};

const renderCustomerList = () => {
  const list = document.getElementById('customer-list');
  if (!list) return;

  const users = getUsers().filter((user) => user.role === 'customer');
  const query = (document.getElementById('admin-search')?.value || '').trim().toLowerCase();
  const filtered = query
    ? users.filter((user) => user.email.toLowerCase().includes(query))
    : users;

  if (!filtered.length) {
    list.innerHTML = '<li class="customer-item"><div><strong>No matching customer</strong><span>Try a different email address.</span></div></li>';
    return;
  }

  list.innerHTML = filtered.map((user) => `
    <li class="customer-item">
      <div>
        <strong>${user.name}</strong>
        <span>${user.email}</span>
        <span>Status: ${user.status || 'active'} • Balance: ${formatCurrency(getCurrentBalance(user))}</span>
      </div>
      <div class="customer-actions">
        <button class="secondary" type="button" data-customer-action="credit" data-customer-id="${user.id}">Add credit</button>
        <button class="secondary" type="button" data-customer-action="toggle-status" data-customer-id="${user.id}">${user.status === 'suspended' ? 'Reactivate' : 'Suspend'}</button>
      </div>
    </li>
  `).join('');
};

const openTransactionModal = (mode) => {
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const title = mode === 'deposit' ? 'Add simulated money' : 'Withdraw simulated money';
  const actionLabel = mode === 'deposit' ? 'Add credit' : 'Submit withdrawal';

  modalRoot.innerHTML = `
    <div class="modal">
      <div class="modal-card">
        <h3>${title}</h3>
        <form id="transaction-form">
          <label>
            <span>Amount</span>
            <input id="transaction-amount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
          </label>
          <label>
            <span>Description</span>
            <input id="transaction-description" type="text" maxlength="120" placeholder="Optional description" />
          </label>
          <div class="modal-actions">
            <button type="button" class="secondary-btn" data-close-modal="true">Cancel</button>
            <button type="submit" class="primary-btn">${actionLabel}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('transaction-form');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const amountField = document.getElementById('transaction-amount');
    const descriptionField = document.getElementById('transaction-description');
    const amount = Number(amountField.value);

    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage('Enter a valid amount greater than $0.00.', 'error');
      return;
    }

    const users = getUsers();
    const updatedUser = users.find((user) => user.id === state.currentUser.id);
    if (!updatedUser) return;

    const changedAmount = mode === 'deposit' ? amount : -amount;
    const nextBalance = getCurrentBalance(updatedUser) + changedAmount;
    if (nextBalance < 0) {
      showMessage('Withdrawal exceeds the available simulated balance.', 'error');
      return;
    }

    const transaction = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: mode === 'deposit' ? 'deposit' : 'withdrawal',
      label: mode === 'deposit' ? 'Simulated deposit' : 'Simulated withdrawal',
      amount: amount,
      description: descriptionField.value.trim() || 'Demo money movement',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString()
    };

    updatedUser.transactions = [...(updatedUser.transactions || []), transaction];
    saveUsers(users);
    state.currentUser = updatedUser;
    renderBalance();
    renderTransactions();
    showMessage(mode === 'deposit' ? 'Simulated deposit created.' : 'Simulated withdrawal processed.', 'success');
    closeModal();
  });

  modalRoot.addEventListener('click', (event) => {
    if (event.target.matches('[data-close-modal="true"]')) closeModal();
    if (event.target.classList.contains('modal')) closeModal();
  });
};

const closeModal = () => {
  const modalRoot = document.getElementById('modal-root');
  if (modalRoot) modalRoot.innerHTML = '';
};

const handleAuthModeToggle = (button) => {
  document.querySelectorAll('.toggle-btn').forEach((btn) => btn.classList.toggle('active', btn === button));
  const mode = button.dataset.mode;
  state.activeTab = mode;
  document.querySelectorAll('.auth-form').forEach((form) => form.classList.toggle('active', form.id === `${mode}-form`));
};

const ensureDemoCustomer = () => {
  const users = getUsers();
  const hasCustomer = users.some((user) => user.email === 'demo.customer@example.com');
  if (!hasCustomer) {
    users.push({
      id: 'customer-1',
      name: 'Jane Doe',
      email: 'demo.customer@example.com',
      password: 'password123',
      role: 'customer',
      verified: true,
      status: 'active',
      balance: 0,
      transactions: [
        { id: 'seed-1', type: 'deposit', label: 'Welcome credit', amount: 2500, description: 'Initial demo funding', date: 'May 14, 2026' },
        { id: 'seed-2', type: 'withdrawal', label: 'Savings transfer', amount: 200, description: 'Demo transfer', date: 'May 16, 2026' }
      ]
    });
    saveUsers(users);
  }
};

const loginUser = (email, password) => {
  const users = getUsers();
  const found = users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password);
  if (!found) {
    showMessage('Incorrect email or password. Please try again.', 'error');
    return;
  }

  if (found.role === 'admin') {
    state.currentUser = found;
    setView('admin-screen');
    state.currentView = 'admin';
    renderCustomerList();
    showAdminMessage('Admin access granted. Review and manage simulator accounts.', 'success');
    return;
  }

  if (found.status === 'suspended') {
    showMessage('This simulator account has been suspended. Please contact support.', 'error');
    return;
  }

  state.currentUser = found;
  updateHeader();
  renderBalance();
  renderTransactions();
  setView('dashboard-screen');
  state.currentView = 'dashboard';
  showMessage('Signed in successfully.', 'success');
  document.getElementById('auth-screen').classList.remove('active');
};

const registerUser = (name, email, password) => {
  const users = getUsers();
  const exists = users.some((user) => user.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    showMessage('An account already exists for this email address.', 'error');
    return;
  }

  if (!name || !email || !password) {
    showMessage('Please complete every field before creating an account.', 'error');
    return;
  }

  const code = String(100000 + Math.floor(Math.random() * 900000));
  const user = {
    id: `customer-${Date.now()}`,
    name,
    email,
    password,
    role: 'customer',
    verified: false,
    verificationCode: code,
    status: 'active',
    balance: 0,
    transactions: []
  };

  users.push(user);
  saveUsers(users);

  state.currentUser = user;
  updateHeader();
  renderBalance();
  renderTransactions();
  showMessage(`Secure verification code sent to ${email}. Enter the exact code below to continue.`, 'success');

  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
  state.activeTab = 'login';
  document.querySelectorAll('.toggle-btn').forEach((btn) => btn.classList.toggle('active', btn.dataset.mode === 'login'));
  document.querySelectorAll('.auth-form').forEach((form) => form.classList.toggle('active', form.id === 'login-form'));

  const codePrompt = window.prompt(`For demo verification only: Enter the code sent to ${email} (${code})`);
  if (codePrompt === null) {
    showMessage('Verification was not completed. Please sign in and try again.', 'error');
    return;
  }

  if (codePrompt.trim() !== code) {
    showMessage('Verification failed. The code does not match the one we sent.', 'error');
    return;
  }

  const userIndex = users.findIndex((item) => item.id === user.id);
  if (userIndex >= 0) {
    users[userIndex].verified = true;
    delete users[userIndex].verificationCode;
    saveUsers(users);
  }

  state.currentUser = users[userIndex] || user;
  renderBalance();
  renderTransactions();
  setView('dashboard-screen');
  state.currentView = 'dashboard';
  showMessage('Verification succeeded. Your account is ready.', 'success');
};

const handleAdminCustomerAction = (event) => {
  const target = event.target.closest('[data-customer-action]');
  if (!target) return;

  const customerId = target.dataset.customerId;
  const action = target.dataset.customerAction;
  const users = getUsers();
  const customer = users.find((user) => user.id === customerId);
  if (!customer) return;

  if (action === 'toggle-status') {
    customer.status = customer.status === 'suspended' ? 'active' : 'suspended';
    saveUsers(users);
    renderCustomerList();
    showAdminMessage(`${customer.name} account ${customer.status === 'suspended' ? 'suspended' : 'reactivated'} successfully.`, 'success');
    return;
  }

  if (action === 'credit') {
    const amount = Number(window.prompt(`Add a fictional credit to ${customer.name}. Enter amount in USD:`));
    if (!Number.isFinite(amount) || amount <= 0) {
      showAdminMessage('The amount must be a positive number.', 'error');
      return;
    }

    const description = window.prompt('Add an optional description for this admin credit:', 'Fictional test credit') || 'Fictional test credit';
    const transaction = {
      id: `admin-${Date.now()}`,
      type: 'deposit',
      label: 'Admin credit',
      amount,
      description,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      createdAt: new Date().toISOString(),
      actor: state.currentUser.email,
      admin: state.currentUser.name
    };

    customer.transactions = [...(customer.transactions || []), transaction];
    saveUsers(users);
    renderCustomerList();
    showAdminMessage(`Added ${formatCurrency(amount)} to ${customer.email}.`, 'success');
  }
};

const bindEvents = () => {
  document.querySelectorAll('.toggle-btn').forEach((button) => {
    button.addEventListener('click', () => handleAuthModeToggle(button));
  });

  document.getElementById('login-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    loginUser(email, password);
  });

  document.getElementById('register-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    registerUser(name, email, password);
  });

  document.getElementById('add-money-btn').addEventListener('click', () => openTransactionModal('deposit'));
  document.getElementById('withdraw-btn').addEventListener('click', () => openTransactionModal('withdrawal'));
  document.getElementById('profile-button').addEventListener('click', () => {
    const users = getUsers();
    const current = users.find((user) => user.id === state.currentUser?.id);
    if (current) {
      showMessage(`Signed in as ${current.name} (${current.email}).`, 'success');
    }
  });

  document.getElementById('admin-logout-btn').addEventListener('click', () => {
    state.currentUser = null;
    setView('dashboard-screen');
    state.currentView = 'dashboard';
    showMessage('Signed out successfully.', 'success');
  });

  document.getElementById('customer-list').addEventListener('click', handleAdminCustomerAction);

  document.getElementById('admin-search').addEventListener('input', renderCustomerList);
  document.getElementById('admin-search-btn').addEventListener('click', renderCustomerList);

  document.querySelectorAll('.nav-item').forEach((nav) => {
    nav.addEventListener('click', () => {
      const view = nav.dataset.view;
      state.currentView = view;
      if (view === 'dashboard') {
        setView('dashboard-screen');
      } else if (view === 'search') {
        setView('dashboard-screen');
        showMessage('Search is available in the customer dashboard prototype.', 'success');
      } else if (view === 'history') {
        setView('dashboard-screen');
        renderTransactions();
      }
    });
  });

  document.getElementById('view-more-btn').addEventListener('click', () => {
    renderTransactions();
  });
};

const init = () => {
  ensureDemoCustomer();
  setView('auth-screen');
  state.currentUser = null;
  updateHeader();
  renderBalance();
  renderTransactions();
  renderCustomerList();
  bindEvents();
  document.getElementById('login-email').value = 'demo.customer@example.com';
  document.getElementById('login-password').value = 'password123';
};

window.addEventListener('DOMContentLoaded', init);

