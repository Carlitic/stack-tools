/**
 * STACK-TOOLS APP LOGIC
 * Re-structured for reliability
 */

// ===============================================
// 1. GLOBAL NAVIGATION FUNCTION (Must be top level)
// ===============================================
window.MapsTo = function (targetId) {
    console.log("MapsTo called for:", targetId);

    // Get elements freshly to avoid loading issues
    const loader = document.getElementById('loader');
    const loaderBar = document.querySelector('.loader-bar');
    const views = document.querySelectorAll('.view');
    const navLinks = document.querySelectorAll('.nav-link');

    // 1. Show Loader
    if (loader && loaderBar) {
        loader.style.display = 'block';
        setTimeout(() => { loaderBar.style.width = '60%'; }, 50);
        setTimeout(() => { loaderBar.style.width = '100%'; }, 500);
    }

    // 2. Switch View after delay
    setTimeout(() => {
        // Toggle Active Class on Views
        views.forEach(view => {
            if (view.id === targetId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        // Toggle Active Class on Nav Links
        navLinks.forEach(link => {
            if (link.dataset.target === targetId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Hide Loader
        if (loader && loaderBar) {
            loader.style.display = 'none';
            loaderBar.style.width = '0%';
        }

        // Specific Logic for Dashboard
        if (targetId === 'dashboard' && typeof checkAuthAndRender === 'function') {
            checkAuthAndRender();
        }

    }, 800);
};

// ===============================================
// 2. INITIALIZATION & SETUP
// ===============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Loaded, initializing app...");

    // Init Elements
    const themeToggle = document.getElementById('theme-toggle');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const addToolBtn = document.getElementById('add-tool-btn');
    const closeModalBtn = document.getElementById('close-modal');
    const cancelModalBtn = document.getElementById('cancel-modal');
    const addToolForm = document.getElementById('add-tool-form');
    const modalOverlay = document.getElementById('modal-overlay');
    const flipCard = document.querySelector('.flip-card');
    const goToRegister = document.getElementById('go-to-register');
    const goToLogin = document.getElementById('go-to-login');
    const exportBtn = document.getElementById('export-pdf');

    // Mobile Nav Elements
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const closeMobileNavBtn = document.getElementById('close-mobile-nav');

    // --- Configuración Supabase ---
    const SUPABASE_URL = 'YOUR_SUPABASE_URL';
    const SUPABASE_KEY = 'YOUR_SUPABASE_KEY';

    window.supabaseClient = null; // Global reference

    // Attempt to init Supabase
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && typeof supabase !== 'undefined') {
        try {
            window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        } catch (err) {
            console.error("Supabase init error:", err);
        }
    } else {
        console.warn("Supabase not configured or library missing. Using DEMO MODE.");
    }

    // --- State ---
    let currentUser = null;
    let currentTools = [];

    // --- Event Listeners ---
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);

    if (loginForm) loginForm.addEventListener('submit', (e) => handleLogin(e));
    if (registerForm) registerForm.addEventListener('submit', (e) => handleRegister(e));
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    if (addToolBtn) addToolBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (addToolForm) addToolForm.addEventListener('submit', (e) => addTool(e));

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    if (goToRegister) {
        goToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            if (flipCard) flipCard.classList.add('flipped');
        });
    }

    if (goToLogin) {
        goToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (flipCard) flipCard.classList.remove('flipped');
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', exportPDF);
    }

    // --- Mobile Nav Functions ---
    window.MobileMapsTo = function (targetId) {
        window.MapsTo(targetId);
        if (mobileNavOverlay) mobileNavOverlay.classList.add('hidden');
    };

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            if (mobileNavOverlay) mobileNavOverlay.classList.remove('hidden');
        });
    }

    if (closeMobileNavBtn) {
        closeMobileNavBtn.addEventListener('click', () => {
            if (mobileNavOverlay) mobileNavOverlay.classList.add('hidden');
        });
    }

    // --- Functions ---

    function toggleTheme() {
        const body = document.body;
        const isDark = body.getAttribute('data-theme') !== 'light';
        const newTheme = isDark ? 'light' : 'dark';
        body.setAttribute('data-theme', newTheme);
        themeToggle.innerHTML = newTheme === 'light' ? "<i class='bx bx-sun'></i>" : "<i class='bx bx-moon'></i>";
        localStorage.setItem('theme', newTheme);
    }

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') toggleTheme(); // toggle once if saved is light (default is dark)


    // --- Auth Functions ---

    window.checkAuthAndRender = function () {
        // Shared View Check
        const urlParams = new URLSearchParams(window.location.search);
        const sharedUserId = urlParams.get('user');

        if (sharedUserId) {
            showDashboardContent(true, true); // showContent, isShared
            fetchSharedTools(sharedUserId);
            return;
        }

        updateAuthUI();
    };

    function updateAuthUI() {
        const authContainer = document.getElementById('auth-container');
        const dashboardContent = document.getElementById('dashboard-content');
        const userProfile = document.getElementById('user-profile');
        const loginBtnHeader = document.getElementById('login-btn-header');
        const userEmailSpan = document.getElementById('user-email');

        if (currentUser) {
            // Logged In
            if (loginBtnHeader) loginBtnHeader.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');
            if (userEmailSpan) userEmailSpan.textContent = currentUser.email;

            if (authContainer) authContainer.classList.add('hidden');
            if (dashboardContent) dashboardContent.classList.remove('hidden');
        } else {
            // Logged Out
            if (loginBtnHeader) loginBtnHeader.classList.remove('hidden');
            if (userProfile) userProfile.classList.add('hidden');
            if (userEmailSpan) userEmailSpan.textContent = '';

            if (authContainer) authContainer.classList.remove('hidden');
            if (dashboardContent) dashboardContent.classList.add('hidden');
        }
    }

    function showDashboardContent(show, isShared = false) {
        const authContainer = document.getElementById('auth-container');
        const dashboardContent = document.getElementById('dashboard-content');
        const addToolBtn = document.getElementById('add-tool-btn');
        const dashTitle = document.querySelector('.dash-title h2');

        if (show) {
            if (authContainer) authContainer.classList.add('hidden');
            if (dashboardContent) dashboardContent.classList.remove('hidden');
        } else {
            if (authContainer) authContainer.classList.remove('hidden');
            if (dashboardContent) dashboardContent.classList.add('hidden');
        }

        if (isShared) {
            if (addToolBtn) addToolBtn.classList.add('hidden');
            if (dashTitle) dashTitle.textContent = "Herramientas de Usuario";
        }
    }

    async function handleLogin(e) {
        e.preventDefault();

        // DEMO BYPASS
        if (!window.supabaseClient) {
            const emailEntry = document.getElementById('login-email');
            const emailVal = emailEntry ? emailEntry.value : 'demo@user.com';

            currentUser = { id: 'demo-123', email: emailVal || 'demo@user.com' };
            currentTools = getDemoTools();

            alert("⚠️ MODO DEMO: Sesión iniciada localmente.");
            updateAuthUI();
            renderTools();
            return;
        }

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
            alert("Error: " + error.message);
        } else {
            currentUser = data.user;
            updateAuthUI();
            fetchTools();
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        if (!window.supabaseClient) {
            alert("Registro no disponible en Modo Demo.");
            return;
        }
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
        if (error) {
            alert("Error: " + error.message);
        } else {
            alert("Registro exitoso. Comprueba tu email.");
        }
    }

    async function handleLogout() {
        if (window.supabaseClient) await window.supabaseClient.auth.signOut();
        currentUser = null;
        currentTools = [];
        updateAuthUI();
    }


    // --- Data Functions ---

    function getDemoTools() {
        return [
            { id: 1, name: 'React', url: 'https://react.dev', category: 'Frontend' },
            { id: 2, name: 'MDN Web Docs', url: 'https://developer.mozilla.org', category: 'Utils' },
            { id: 3, name: 'Supabase', url: 'https://supabase.com', category: 'Backend' },
            { id: 4, name: 'Uiverse', url: 'https://uiverse.io', category: 'Design' }
        ];
    }

    async function fetchTools() {
        if (!window.supabaseClient) return; // demo handled in login
        const { data, error } = await window.supabaseClient.from('tools').select('*').eq('user_id', currentUser.id);
        if (!error) {
            currentTools = data;
            renderTools();
        }
    }

    async function fetchSharedTools(uid) {
        if (!window.supabaseClient) {
            alert("Modo Demo: Vista compartida no disponible.");
            return;
        }
        const { data, error } = await window.supabaseClient.from('tools').select('*').eq('user_id', uid);
        if (!error) {
            currentTools = data;
            renderTools(true);
        }
    }

    async function addTool(e) {
        e.preventDefault();
        if (!currentUser) return;

        const name = document.getElementById('tool-name').value;
        const url = document.getElementById('tool-url').value;
        const category = document.getElementById('tool-category').value;

        if (!window.supabaseClient) {
            // Demo Add
            currentTools.unshift({ id: Date.now(), name, url, category });
            renderTools();
            closeModal();
            addToolForm.reset();
            return;
        }

        const { error } = await window.supabaseClient.from('tools').insert([{ name, url, category, user_id: currentUser.id }]);
        if (error) alert(error.message);
        else {
            closeModal();
            addToolForm.reset();
            fetchTools();
        }
    }

    // Expose delete to global scope for onclick in HTML string
    window.deleteTool = async function (id) {
        if (!confirm("¿Eliminar herramienta?")) return;

        if (!window.supabaseClient) {
            currentTools = currentTools.filter(t => t.id !== id);
            renderTools();
            return;
        }

        const { error } = await window.supabaseClient.from('tools').delete().eq('id', id);
        if (!error) fetchTools();
        else alert(error.message);
    };

    function renderTools(readOnly = false) {
        const grid = document.getElementById('tools-grid');
        const count = document.getElementById('tools-count');
        const empty = document.getElementById('empty-state');

        if (grid) grid.innerHTML = '';
        if (count) count.textContent = `${currentTools.length} items`;

        if (currentTools.length === 0) {
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        currentTools.forEach(tool => {
            const card = document.createElement('div');
            card.className = 'tool-card glass';

            // Safe favicon
            let fav = 'https://unpkg.com/boxicons@2.1.4/svg/regular/bx-globe.svg';
            try { fav = `https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=64`; } catch (e) { }

            card.innerHTML = `
                <div class="tool-content">
                    <div class="tool-header">
                        <div class="tool-info">
                            <img src="${fav}" alt="" class="tool-favicon">
                            <span class="tool-name">${tool.name}</span>
                        </div>
                        <span class="tool-category">${tool.category}</span>
                    </div>
                    <a href="${tool.url}" target="_blank" class="tool-url hover-line">${tool.url}</a>
                </div>
                ${!readOnly ? `
                <div class="tool-footer">
                    <button onclick="deleteTool(${tool.id})" class="icon-btn delete-btn"><i class='bx bx-trash'></i></button>
                    <a href="${tool.url}" target="_blank" class="icon-btn"><i class='bx bx-link-external'></i></a>
                </div>` : ''}
            `;
            grid.appendChild(card);
        });
    }

    // --- Modals ---
    function openModal() { if (modalOverlay) modalOverlay.classList.remove('hidden'); }
    function closeModal() { if (modalOverlay) modalOverlay.classList.add('hidden'); }

    function exportPDF() {
        const el = document.getElementById('tools-grid');
        if (typeof html2pdf !== 'undefined') {
            html2pdf().set({ margin: 1, filename: 'stack-tools.pdf' }).from(el).save();
        } else {
            alert("Librería PDF no cargada.");
        }
    }

    // --- Init Session Check ---
    if (window.supabaseClient) {
        window.supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                currentUser = session.user;
                updateAuthUI();
                const params = new URLSearchParams(window.location.search);
                if (!params.get('user')) fetchTools();
            }
        });
    }

});
