// ==================== STAFF PORTAL INDEX.JS ====================
// Alternative vanilla JS version (if not using React)

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

let staffAuthToken = null;
let staffRefreshToken = null;
let staffUser = null;

// ==================== AUTHENTICATION ====================

async function staffLogin(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const data = await response.json();
    
    // Check if user is staff
    if (!data.user.is_staff) {
      throw new Error('Access denied. Staff access only.');
    }

    staffAuthToken = data.access_token;
    staffRefreshToken = data.refresh_token;
    staffUser = data.user;

    localStorage.setItem('staffAuthToken', staffAuthToken);
    localStorage.setItem('staffRefreshToken', staffRefreshToken);
    localStorage.setItem('staffUser', JSON.stringify(staffUser));

    showPage('dashboardPage');
    loadStaffDashboard();
  } catch (error) {
    showError('loginError', error.message);
  }
}

async function staffLogout() {
  staffAuthToken = null;
  staffRefreshToken = null;
  staffUser = null;
  localStorage.removeItem('staffAuthToken');
  localStorage.removeItem('staffRefreshToken');
  localStorage.removeItem('staffUser');
  showPage('loginPage');
}

// ==================== API FETCH ====================

async function staffApiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (staffAuthToken) {
    headers['Authorization'] = `Bearer ${staffAuthToken}`;
  }

  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && staffRefreshToken) {
    const refreshed = await refreshStaffToken();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${staffAuthToken}`;
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

async function refreshStaffToken() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${staffRefreshToken}`,
      },
    });

    if (!response.ok) throw new Error('Token refresh failed');

    const data = await response.json();
    staffAuthToken = data.access_token;
    localStorage.setItem('staffAuthToken', staffAuthToken);
    return true;
  } catch (error) {
    staffLogout();
    return false;
  }
}

// ==================== DASHBOARD ====================

async function loadStaffDashboard() {
  try {
    const data = await staffApiFetch('/staff/dashboard');
    document.getElementById('openTickets').textContent = data.open_tickets;
    document.getElementById('inProgressTickets').textContent = data.in_progress_tickets;
    document.getElementById('closedToday').textContent = data.closed_today;
    document.getElementById('totalArticles').textContent = data.total_articles;
  } catch (error) {
    showError('dashboardError', error.message);
  }
}

// ==================== TICKET MANAGEMENT ====================

async function loadStaffTickets(status = 'all') {
  try {
    const endpoint = status === 'all' ? '/staff/tickets' : `/staff/tickets?status=${status}`;
    const data = await staffApiFetch(endpoint);
    renderStaffTickets(data);
  } catch (error) {
    showError('ticketsError', error.message);
  }
}

function renderStaffTickets(tickets) {
  const container = document.getElementById('ticketsList');
  container.innerHTML = '';

  if (tickets.length === 0) {
    container.innerHTML = '<p>No tickets found</p>';
    return;
  }

  tickets.forEach(ticket => {
    const ticketEl = document.createElement('div');
    ticketEl.className = 'card mb-8';
    ticketEl.innerHTML = `
      <div class="card__body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-12);">
          <div>
            <h3>#${ticket.id} - ${ticket.title}</h3>
            <small style="color: var(--color-text-secondary);">From: ${ticket.user_email}</small>
          </div>
          <select class="form-control" style="width: 150px; font-size: var(--font-size-sm);" onchange="updateTicketStatus(${ticket.id}, this.value)">
            <option value="open" ${ticket.status === 'open' ? 'selected' : ''}>Open</option>
            <option value="in_progress" ${ticket.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="closed" ${ticket.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
        <p>${ticket.description}</p>
        <span class="status status--${ticket.priority === 'high' ? 'error' : ticket.priority === 'medium' ? 'warning' : 'info'}">${ticket.priority}</span>
      </div>
    `;
    container.appendChild(ticketEl);
  });
}

async function updateTicketStatus(ticketId, status) {
  try {
    await staffApiFetch(`/staff/tickets/${ticketId}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    loadStaffTickets();
  } catch (error) {
    showError('ticketError', error.message);
  }
}

// ==================== KNOWLEDGE BASE ====================

async function loadStaffArticles() {
  try {
    const data = await staffApiFetch('/staff/kb/articles');
    renderStaffArticles(data);
  } catch (error) {
    showError('articlesError', error.message);
  }
}

function renderStaffArticles(articles) {
  const container = document.getElementById('articlesList');
  container.innerHTML = '';

  articles.forEach(article => {
    const articleEl = document.createElement('div');
    articleEl.className = 'card mb-8';
    articleEl.innerHTML = `
      <div class="card__body">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-12);">
          <div>
            <h3>${article.title}</h3>
            <span class="status status--info">${article.category}</span>
          </div>
          <span class="status ${article.is_published ? 'status--success' : 'status--warning'}">${article.is_published ? 'Published' : 'Draft'}</span>
        </div>
        <p>${article.content.substring(0, 150)}...</p>
        <div style="display: flex; gap: var(--space-8);">
          <button class="btn btn--secondary btn--sm" onclick="editArticle(${article.id})">Edit</button>
          ${!article.is_published ? `<button class="btn btn--success btn--sm" onclick="publishArticle(${article.id})">Publish</button>` : ''}
          <button class="btn btn--danger btn--sm" onclick="deleteArticle(${article.id})">Delete</button>
        </div>
      </div>
    `;
    container.appendChild(articleEl);
  });
}

async function submitArticle(e) {
  e.preventDefault();

  const title = document.getElementById('articleTitle').value;
  const category = document.getElementById('articleCategory').value;
  const content = document.getElementById('articleContent').value;

  try {
    await staffApiFetch('/staff/kb/articles', {
      method: 'POST',
      body: JSON.stringify({ title, category, content }),
    });

    document.getElementById('articleForm').reset();
    showSuccess('articleSuccess', 'Article created successfully!');
    loadStaffArticles();
  } catch (error) {
    showError('articleError', error.message);
  }
}

async function publishArticle(articleId) {
  try {
    await staffApiFetch(`/staff/kb/articles/${articleId}/publish`, {
      method: 'POST',
    });
    showSuccess('articleSuccess', 'Article published!');
    loadStaffArticles();
  } catch (error) {
    showError('articleError', error.message);
  }
}

async function deleteArticle(articleId) {
  if (confirm('Delete this article?')) {
    try {
      await staffApiFetch(`/staff/kb/articles/${articleId}`, {
        method: 'DELETE',
      });
      showSuccess('articleSuccess', 'Article deleted!');
      loadStaffArticles();
    } catch (error) {
      showError('articleError', error.message);
    }
  }
}

// ==================== UI UTILITIES ====================

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(pageId).classList.remove('hidden');

  if (pageId === 'dashboardPage') loadStaffDashboard();
  if (pageId === 'ticketsPage') loadStaffTickets();
  if (pageId === 'kbPage') loadStaffArticles();
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  }
}

function showSuccess(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  }
}

// ==================== INITIALIZATION ====================

function initStaffApp() {
  const storedToken = localStorage.getItem('staffAuthToken');
  const storedUser = localStorage.getItem('staffUser');

  if (storedToken && storedUser) {
    staffAuthToken = storedToken;
    staffRefreshToken = localStorage.getItem('staffRefreshToken');
    staffUser = JSON.parse(storedUser);
    showPage('dashboardPage');
    loadStaffDashboard();
  } else {
    showPage('loginPage');
  }

  // Event listeners
  document.getElementById('staffLoginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    staffLogin(
      document.getElementById('staffLoginEmail').value,
      document.getElementById('staffLoginPassword').value
    );
  });

  document.getElementById('articleForm')?.addEventListener('submit', submitArticle);

  document.getElementById('staffLogoutBtn')?.addEventListener('click', staffLogout);

  document.querySelectorAll('[data-page-link]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      showPage(e.target.getAttribute('data-page-link'));
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStaffApp);
} else {
  initStaffApp();
}
