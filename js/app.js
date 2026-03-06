// App Router & View Controller

let currentView = null;
let currentUserData = null;

// ──────────────────────────────────────
// Router
// ──────────────────────────────────────
function initRouter() {
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
}

async function handleRoute() {
    const hash = window.location.hash || '#login';

    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

    if (hash === '#login') {
        showView('login-view');
        initLoginView();
    } else if (hash === '#compare') {
        const user = await requireAuth();
        if (!user) return;
        currentUserData = user;
        showView('compare-view');
        await initCompareView();
    } else if (hash === '#dashboard') {
        const user = await requireAuth();
        if (!user) return;
        currentUserData = user;
        showView('dashboard-view');
        await initDashboardView();
    } else {
        window.location.hash = '#login';
    }
}

function showView(viewId) {
    currentView = viewId;
    const el = document.getElementById(viewId);
    if (el) el.classList.remove('hidden');
}

// ──────────────────────────────────────
// Login View
// ──────────────────────────────────────
function initLoginView() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');

    form.onsubmit = async (e) => {
        e.preventDefault();
        errorEl.textContent = '';
        errorEl.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Signing in...';

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await loginWithEmail(email, password);
            window.location.hash = '#compare';
        } catch (err) {
            errorEl.textContent = err.message || 'Login failed. Please check your credentials.';
            errorEl.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Login</span><span class="material-symbols-outlined text-sm">arrow_forward</span>';
        }
    };
}

// ──────────────────────────────────────
// Compare View
// ──────────────────────────────────────
let _currentPair = [];

async function initCompareView() {
    await loadNewPair();

    document.getElementById('skip-btn').onclick = () => loadNewPair();
    document.getElementById('rankings-link').onclick = () => { window.location.hash = '#dashboard'; };
}

async function loadNewPair() {
    const container = document.getElementById('compare-cards');
    const loading = document.getElementById('compare-loading');

    container.classList.add('opacity-0', 'scale-95');
    loading.classList.remove('hidden');

    try {
        _currentPair = await getTwoRandomStudents();
        renderCompareCards(_currentPair);
    } catch (err) {
        console.error('Error loading students:', err);
        container.innerHTML = '<p class="text-center text-red-400">Failed to load students. Please try again.</p>';
    } finally {
        loading.classList.add('hidden');
        setTimeout(() => container.classList.remove('opacity-0', 'scale-95'), 50);
    }
}

function renderCompareCards(students) {
    const [s1, s2] = students;
    renderStudentCard('student-1', s1, s2);
    renderStudentCard('student-2', s2, s1);
}

function renderStudentCard(elementId, student, opponent) {
    const card = document.getElementById(elementId);
    const photoEl = card.querySelector('.student-photo');
    const nameEl = card.querySelector('.student-name');
    const bioEl = card.querySelector('.student-bio');
    const fbLink = card.querySelector('.student-fb');

    // Set photo
    if (student._photoUrl) {
        photoEl.style.backgroundImage = `url("${student._photoUrl}")`;
    } else {
        photoEl.style.backgroundImage = 'none';
        photoEl.style.backgroundColor = '#3f1219';
    }

    // Set name and age
    const ageStr = student._age ? `, ${student._age}` : '';
    nameEl.textContent = `${student._fullName}${ageStr}`;

    // Set FB link or hide it
    if (student.facebook_profile_url) {
        fbLink.href = student.facebook_profile_url;
        fbLink.classList.remove('hidden');
    } else {
        fbLink.classList.add('hidden');
    }

    // Bio: use a generic one
    bioEl.textContent = student.middlename ? `${student.firstname} ${student.middlename} ${student.lastname}` : `${student.firstname} ${student.lastname}`;

    // Click handler: vote for this student
    card.onclick = async () => {
        card.classList.add('ring-4', 'ring-primary', 'scale-105');
        try {
            await recordVote(student.id, opponent.id);
        } catch (err) {
            console.error('Error recording vote:', err);
        }
        setTimeout(() => {
            card.classList.remove('ring-4', 'ring-primary', 'scale-105');
            loadNewPair();
        }, 400);
    };
}

// ──────────────────────────────────────
// Dashboard View
// ──────────────────────────────────────
async function initDashboardView() {
    const dashLoading = document.getElementById('dash-loading');
    dashLoading.classList.remove('hidden');

    // Set admin info
    if (currentUserData) {
        document.getElementById('admin-email').textContent = currentUserData.adminUser.email || 'Admin';
        document.getElementById('admin-role').textContent = currentUserData.adminUser.role || 'admin';
    }

    // Wire up navigation
    document.getElementById('nav-overview').onclick = () => { window.location.hash = '#dashboard'; };
    document.getElementById('nav-match').onclick = () => { window.location.hash = '#compare'; };
    document.getElementById('nav-logout').onclick = () => logout();

    try {
        // Load stats
        const stats = await getDashboardStats();
        document.getElementById('stat-total-comparisons').textContent = stats.totalComparisons.toLocaleString();
        document.getElementById('stat-total-students').textContent = stats.totalStudents.toLocaleString();

        // Load rankings
        const rankings = await getRankings(20);

        // Top 3 podium
        renderPodium(rankings.slice(0, 3));

        // Rankings table
        renderRankingsTable(rankings);
    } catch (err) {
        console.error('Error loading dashboard:', err);
    } finally {
        dashLoading.classList.add('hidden');
    }
}

function renderPodium(top3) {
    const positions = ['podium-1', 'podium-2', 'podium-3'];
    const orderMap = [1, 0, 2]; // Display order: 2nd, 1st, 3rd

    for (let i = 0; i < 3; i++) {
        const displayIdx = orderMap[i];
        const el = document.getElementById(positions[i]);
        if (!el) continue;

        if (displayIdx < top3.length) {
            const r = top3[displayIdx];
            el.classList.remove('hidden');
            el.querySelector('.podium-name').textContent = r.student?._fullName || 'Unknown';
            el.querySelector('.podium-winrate').textContent = `${r.winRate}% Win Rate`;
            el.querySelector('.podium-total').textContent = r.total.toLocaleString();

            const photoEl = el.querySelector('.podium-photo');
            if (r.student?._photoUrl) {
                photoEl.style.backgroundImage = `url("${r.student._photoUrl}")`;
            }
        } else {
            el.querySelector('.podium-name').textContent = 'No data';
            el.querySelector('.podium-winrate').textContent = '-';
            el.querySelector('.podium-total').textContent = '0';
        }
    }
}

function renderRankingsTable(rankings) {
    const tbody = document.getElementById('rankings-tbody');
    tbody.innerHTML = '';

    if (rankings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-8 text-center text-slate-400">No ranking data yet. Start comparing students!</td></tr>';
        return;
    }

    rankings.forEach((r, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors';

        const photoUrl = r.student?._photoUrl || '';
        const photoStyle = photoUrl
            ? `background-image: url('${photoUrl}')`
            : 'background-color: #3f1219';

        tr.innerHTML = `
      <td class="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">#${idx + 1}</td>
      <td class="px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-cover bg-center shrink-0" style="${photoStyle}"></div>
          <span class="font-bold text-slate-900 dark:text-slate-100">${r.student?._fullName || 'Unknown'}</span>
        </div>
      </td>
      <td class="px-6 py-4 font-medium text-green-500">${r.winRate}%</td>
      <td class="px-6 py-4 font-medium">${r.total.toLocaleString()}</td>
      <td class="px-6 py-4 font-medium">${r.wins.toLocaleString()}</td>
      <td class="px-6 py-4">
        ${r.student?.facebook_profile_url ? `<a href="${r.student.facebook_profile_url}" target="_blank" class="text-blue-400 hover:text-blue-300 transition-colors"><span class="material-symbols-outlined text-[20px]">open_in_new</span></a>` : '<span class="text-slate-500">-</span>'}
      </td>
    `;
        tbody.appendChild(tr);
    });

    document.getElementById('rankings-count').textContent = `Showing ${rankings.length} entries`;
}

// ──────────────────────────────────────
// Password Visibility Toggle
// ──────────────────────────────────────
function togglePasswordVisibility() {
    const input = document.getElementById('login-password');
    const icon = document.getElementById('password-toggle-icon');
    if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility_off';
    } else {
        input.type = 'password';
        icon.textContent = 'visibility';
    }
}

// ──────────────────────────────────────
// Init
// ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', initRouter);
