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

    // Delete Modal Elements (Moved up to avoid ReferenceError)
    const deleteOverlay = document.getElementById('modal-delete-overlay');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');

    // Mobile Nav Elements
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const closeMobileNavBtn = document.getElementById('close-mobile-nav');

    // --- Configuración Supabase ---
    const SUPABASE_URL = 'https://nifpxepjxxglgaasnynn.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_dUEzt76F3ssVVPsHAhmorg_E-xKtThg';

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

    if (addToolBtn) addToolBtn.addEventListener('click', () => openModal());
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);
    if (addToolForm) addToolForm.addEventListener('submit', (e) => addTool(e));



    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) closeModal();
            if (deleteOverlay && e.target === deleteOverlay) closeDeleteModal();
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

    // --- Global Helpers (Hoisted for reliability) ---
    window.editTool = function (id) {
        // defined in closure
        const tool = currentTools.find(t => t.id == id);
        if (tool) openModal(tool);
    };

    window.deleteTool = function (id) {
        openDeleteModal(id);
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
        const { data, error } = await window.supabaseClient.from('tools').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
        if (!error) {
            currentTools = data;
            renderTools(); // Render all initial
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
            renderTools(currentTools, true);
        }
    }

    // --- Category Logic ---
    async function fetchCategories() {
        if (!window.supabaseClient) return ['Frontend', 'Backend', 'DevOps', 'Design', 'Utils', 'Learning'];

        const { data, error } = await window.supabaseClient
            .from('categories')
            .select('name')
            .order('name');

        if (error) {
            console.error(error);
            return [];
        }
        return data.map(c => c.name);
    }

    async function updateCategoryDropdown() {
        const select = document.getElementById('tool-category');
        const filterSelect = document.getElementById('filter-category');

        // Base Options
        const loadingOp = '<option value="" disabled selected>Cargando...</option>';
        if (select) select.innerHTML = loadingOp;
        if (filterSelect) filterSelect.innerHTML = '<option value="">Todas</option>' + loadingOp; // Keep 'Todas'

        const categories = await fetchCategories();

        const options = categories.length
            ? categories.map(c => `<option value="${c}">${c}</option>`).join('')
            : '<option value="" disabled>No hay categorías</option>';

        if (select) {
            select.innerHTML = options;
            if (categories.length) select.value = categories[0];
        }

        if (filterSelect) {
            // Keep "Todas" as first option always
            filterSelect.innerHTML = `<option value="">Todas</option>${options}`;
        }
    }

    // --- Category Modal Logic ---
    const categoryOverlay = document.getElementById('modal-category-overlay');
    const categoryForm = document.getElementById('add-category-form');
    const closeCategoryBtn = document.getElementById('close-category-modal');
    const cancelCategoryBtn = document.getElementById('cancel-category-modal');

    function openCategoryModal() {
        if (categoryOverlay) {
            categoryOverlay.classList.remove('hidden');
            setTimeout(() => document.getElementById('new-category-name').focus(), 100);
        }
    }

    function closeCategoryModal() {
        if (categoryOverlay) categoryOverlay.classList.add('hidden');
        if (categoryForm) categoryForm.reset();
    }

    if (closeCategoryBtn) closeCategoryBtn.addEventListener('click', closeCategoryModal);
    if (cancelCategoryBtn) cancelCategoryBtn.addEventListener('click', closeCategoryModal);

    // Initial listener for the (+) button
    const addCategoryBtn = document.getElementById('add-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.removeEventListener('click', handleAddCategory); // Remove old listener if exists
        addCategoryBtn.addEventListener('click', openCategoryModal);
    }

    // Handle Form Submit
    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('new-category-name');
            const newCat = nameInput.value;

            if (!newCat || !newCat.trim()) return;

            if (!window.supabaseClient) {
                alert("Modo Demo: No se pueden crear categorías.");
                return;
            }

            const { error } = await window.supabaseClient.from('categories').insert([{ name: newCat.trim(), user_id: currentUser.id }]);

            if (error) showToast("Error al crear categoría: " + error.message, "error");
            else {
                showToast("Categoría creada", "success");
                // Refresh dropdown
                await updateCategoryDropdown();

                // Explicitly set the value on the select element inside the OTHER modal
                const catSelect = document.getElementById('tool-category');
                if (catSelect) catSelect.value = newCat.trim();

                closeCategoryModal();
            }
        });
        // Old handleAddCategory removed as replaced by form logic above
        async function handleAddCategory() { /* Replaced */ }

    }
    // --- Toast Logic ---
    function showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const iconMap = {
            success: 'bx-check-circle',
            error: 'bx-error',
            info: 'bx-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class='bx ${iconMap[type]}'></i><span>${message}</span>`;

        container.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'fadeOutToast 0.5s ease forwards';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // --- Search & Filter Logic ---
    const searchInput = document.getElementById('search-tools');
    const filterSelect = document.getElementById('filter-category');

    function applyFilters() {
        const term = searchInput ? searchInput.value.toLowerCase() : '';
        const cat = filterSelect ? filterSelect.value : '';

        const filtered = currentTools.filter(t => {
            const matchesTerm = t.name.toLowerCase().includes(term) ||
                t.category.toLowerCase().includes(term) ||
                (t.url && t.url.toLowerCase().includes(term));

            const matchesCat = cat === '' || t.category === cat;

            return matchesTerm && matchesCat;
        });

        renderTools(filtered);
    }

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    if (filterSelect) {
        filterSelect.addEventListener('change', applyFilters);
    }

    // --- Tool Logic ---

    async function addTool(e) {
        e.preventDefault();
        if (!currentUser) return;

        const id = document.getElementById('tool-id').value;
        const name = document.getElementById('tool-name').value;
        const url = document.getElementById('tool-url').value;
        const category = document.getElementById('tool-category').value;

        if (!window.supabaseClient) {
            // Demo Add/Edit
            if (id) {
                const idx = currentTools.findIndex(t => t.id == id);
                if (idx !== -1) currentTools[idx] = { ...currentTools[idx], name, url, category };
                showToast("Herramienta actualizada (Demo)", "success");
            } else {
                currentTools.unshift({ id: Date.now(), name, url, category });
                showToast("Herramienta creada (Demo)", "success");
            }
            renderTools();
            closeModal();
            return;
        }

        let error;
        let data = null;

        if (id) {
            // EDIT
            // Include user_id in update just in case RLS checks it, though usually not needed.
            // Check if rows matched specific ID and user_id via filter
            const { data: updatedData, error: updateError } = await window.supabaseClient
                .from('tools')
                .update({ name, url, category })
                .eq('id', id)
                .select();

            error = updateError;
            data = updatedData;

            if (!error && (!data || data.length === 0)) {
                showToast("No se pudo actualizar. ¿Tal vez no es tuya?", "error");
                return;
            }
        } else {
            // CREATE
            const { error: insertError } = await window.supabaseClient
                .from('tools')
                .insert([{ name, url, category, user_id: currentUser.id }]);

            error = insertError;
        }

        if (error) {
            showToast("Error: " + error.message, "error");
        } else {
            showToast(id ? "Cambios guardados correctamente" : "Herramienta añadida éxito", "success");
            closeModal();
            fetchTools();
            if (searchInput) searchInput.value = '';
        }
    }

    // --- Delete Modal Logic ---
    let toolToDelete = null;

    function openDeleteModal(id) {
        toolToDelete = id;
        if (deleteOverlay) deleteOverlay.classList.remove('hidden');
    }

    function closeDeleteModal() {
        toolToDelete = null;
        if (deleteOverlay) deleteOverlay.classList.add('hidden');
    }

    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);

    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!toolToDelete) return;

            if (!window.supabaseClient) {
                // Demo
                currentTools = currentTools.filter(t => t.id !== toolToDelete);
                renderTools();
                closeDeleteModal();
                return;
            }

            const { error } = await window.supabaseClient.from('tools').delete().eq('id', toolToDelete);
            if (!error) {
                showToast("Eliminado correctamente", "success");
                fetchTools();
                closeDeleteModal();
            } else {
                showToast(error.message, "error");
                closeDeleteModal();
            }
        });
    }




    function renderTools(toolsToRender = currentTools, readOnly = false) {
        const grid = document.getElementById('tools-grid');
        const count = document.getElementById('tools-count');
        const empty = document.getElementById('empty-state');

        if (grid) grid.innerHTML = '';
        if (count) count.textContent = `${toolsToRender.length} items`;

        if (toolsToRender.length === 0) {
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        toolsToRender.forEach(tool => {
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
                    <button onclick="editTool('${tool.id}')" class="icon-btn edit-btn" title="Editar"><i class='bx bx-pencil'></i></button>
                    <button onclick="deleteTool('${tool.id}')" class="icon-btn delete-btn" title="Eliminar"><i class='bx bx-trash'></i></button>
                    <a href="${tool.url}" target="_blank" class="icon-btn" title="Abrir"><i class='bx bx-link-external'></i></a>
                </div>` : ''}
            `;
            grid.appendChild(card);
        });
    }

    // --- Modals ---
    // --- Modals ---
    async function openModal(toolToEdit = null) {
        if (modalOverlay) modalOverlay.classList.remove('hidden');

        // Refresh categories whenever modal opens
        await updateCategoryDropdown();

        const title = document.getElementById('modal-title');
        const form = document.getElementById('add-tool-form');

        if (toolToEdit && toolToEdit.id) {
            // EDIT MODE
            if (title) title.textContent = "Editar Herramienta";
            document.getElementById('tool-id').value = toolToEdit.id;
            document.getElementById('tool-name').value = toolToEdit.name;
            document.getElementById('tool-url').value = toolToEdit.url;
            // Wait for dropdown to update then set value? 
            // updateCategoryDropdown is awaited, so secure.
            document.getElementById('tool-category').value = toolToEdit.category;
        } else {
            // ADD MODE
            if (title) title.textContent = "Nueva Herramienta";
            form.reset();
            document.getElementById('tool-id').value = '';
        }
    }

    function closeModal() {
        if (modalOverlay) modalOverlay.classList.add('hidden');
        document.getElementById('add-tool-form').reset();
    }

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
