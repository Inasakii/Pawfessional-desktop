document.addEventListener('DOMContentLoaded', () => {
    // Define chart variables at the top to avoid ReferenceError on initial theme application
    let monthlyProductivityChart = null;
    let appointmentsPerDayChart = null;
    let appointmentStatusPieChart = null;
    let appointmentStatusChart = null;

    // ===============================================
    // SECTION: Theme Management (Dark Mode)
    // ===============================================
    const themeToggle = document.getElementById('theme-toggle');
    
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            if(themeToggle) themeToggle.checked = true;
        } else {
            document.body.classList.remove('dark-mode');
            if(themeToggle) themeToggle.checked = false;
        }
        // Update charts with new theme colors
        updateAllChartThemes(theme);
    };

    const getChartThemeColors = (theme) => {
        const isDark = theme === 'dark';
        return {
            ticksColor: isDark ? '#ccc' : '#666',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            legendColor: isDark ? '#eee' : '#666',
            tooltipTitleColor: isDark ? '#fff' : '#000',
            tooltipBodyColor: isDark ? '#ddd' : '#333',
            tooltipBgColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
        };
    };

    const updateAllChartThemes = (theme) => {
        const colors = getChartThemeColors(theme);
        
        // Set Chart.js global defaults
        Chart.defaults.color = colors.legendColor;
        
        const charts = [monthlyProductivityChart, appointmentsPerDayChart, appointmentStatusPieChart, appointmentStatusChart];
        charts.forEach(chart => {
            if (chart) {
                // Update scales for bar and line charts
                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(scale => {
                        if(scale.ticks) scale.ticks.color = colors.ticksColor;
                        if(scale.grid) scale.grid.color = colors.gridColor;
                    });
                }
                // Update legend and tooltips for all charts
                if(chart.options.plugins.legend) chart.options.plugins.legend.labels.color = colors.legendColor;
                if(chart.options.plugins.tooltip) {
                    chart.options.plugins.tooltip.titleColor = colors.tooltipTitleColor;
                    chart.options.plugins.tooltip.bodyColor = colors.tooltipBodyColor;
                    chart.options.plugins.tooltip.backgroundColor = colors.tooltipBgColor;
                }
                chart.update();
            }
        });
    };
    
    themeToggle?.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // Load saved theme on startup
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));


    // ===============================================
    // SECTION: Authentication & Initialization
    // ===============================================
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
        window.location.href = 'login.html';
        return; // Stop script execution if not logged in
    }

    // Personalize header
    const userNameEl = document.getElementById('userName');
    const userAvatarEl = document.getElementById('userAvatar');
    if (userNameEl) userNameEl.textContent = user.name;
    if (userAvatarEl) userAvatarEl.textContent = user.name ? user.name[0].toUpperCase() : 'U';

    // Role-Based Access Control
    if (user.role) {
        const userRole = user.role.toLowerCase();
        const teamNavItem = document.querySelector('.nav-item[data-target="team"]');
        const teamContentSection = document.getElementById('team');
        const staffRoleSelect = document.getElementById('staffRole');

        if (userRole === 'staff') {
            // Staff cannot see the team section at all
            if (teamNavItem) teamNavItem.style.display = 'none';
            if (teamContentSection) teamContentSection.style.display = 'none';
        } else if (userRole === 'manager') {
            // Managers can only create other Staff members, not other Managers
            if (staffRoleSelect) {
                const managerOption = staffRoleSelect.querySelector('option[value="Manager"]');
                if (managerOption) {
                    managerOption.remove();
                }
            }
        }
        // Admin role has no restrictions, so no 'else' block is needed.
    }


    const API_BASE_URL = 'https://pawfessional-api-server.onrender.com/api/desktop';
    const SERVER_URL_ROOT = 'https://pawfessional-api-server.onrender.com';
    const socket = io(SERVER_URL_ROOT);

    // ===============================================
    // SECTION: DOM Element Selectors
    // ===============================================
    const contentTitle = document.getElementById('contentTitle');
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');
    
    // --- Modals ---
    const logoutModal = document.getElementById('logoutModal');
    const eventModal = document.getElementById('eventModal');
    const eventDetailsModal = document.getElementById('eventDetails');
    const confirmDeleteEventModal = document.getElementById('confirmDeleteEventModal');
    const confirmDeleteAnalyticsModal = document.getElementById('confirmDeleteAnalyticsModal');
    const successModal = document.getElementById('successModal');
    const confirmDeleteStaffModal = document.getElementById('confirmDeleteStaffModal');
    const confirmDeleteProductModal = document.getElementById('confirmDeleteProductModal');
    const rescheduleModal = document.getElementById('rescheduleModal');
    const walkInModal = document.getElementById('walkInModal');
    const followUpModal = document.getElementById('followUpModal');

    // --- Forms ---
    const walkInForm = document.getElementById('walkInForm');
    const followUpForm = document.getElementById('followUpForm');
    const rescheduleForm = document.getElementById('rescheduleForm');
    
    // --- Modal-specific Elements ---
    const walkInClientSelect = document.getElementById('walkInClientSelect');
    const walkInPetSelect = document.getElementById('walkInPetSelect');
    const scheduleFollowUpToggle = document.getElementById('scheduleFollowUpToggle');
    const followUpFormFields = document.getElementById('followUpFormFields');

    // --- Dashboard Stats ---
    const totalProductsEl = document.getElementById('totalProductsCount');
    const totalUsersEl = document.getElementById('totalUsersCount');
    const totalStaffEl = document.getElementById('totalStaffCount');
    const totalPetsEl = document.getElementById('totalPetsCount');
    const appointmentsTodayEl = document.getElementById('appointmentsTodayCount');

    // --- Analytics ---
    let analyticsRecordToDeleteId = null;
    const todaysBookedEl = document.getElementById('todaysBooked');
    const todaysApprovedEl = document.getElementById('todaysApproved');
    const todaysCompletedEl = document.getElementById('todaysCompleted');
    const analyticsRecordsTableBody = document.getElementById('analyticsRecordsTableBody');
    const recentCancellationsTableBody = document.getElementById('recentCancellationsTableBody');


    // --- Appointments ---
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    const conflictsList = document.getElementById('conflictsList');
    const conflictsCard = document.getElementById('conflictsCard');

    // --- Products ---
    let selectedProductIds = [];
    let allProducts = []; // To store the master list of products
    const productsGrid = document.getElementById("productsGrid");
    const addProductBtn = document.getElementById("addProductBtn");
    const editProductBtn = document.getElementById("editProductBtn");
    const deleteProductBtn = document.getElementById("deleteProductBtn");
    const addProductForm = document.getElementById("addProductForm");
    const productForm = document.getElementById("productForm");
    const productFormTitle = document.getElementById("productFormTitle");
    const productSubmitBtn = document.getElementById("productSubmitBtn");
    const cancelProductFormBtn = document.getElementById("cancelBtn");
    const priceInput = document.getElementById('price');
    const discountInput = document.getElementById('disc');
    const discountDisplayInput = document.getElementById('disc_disp');
    const stockInput = document.getElementById('stock');
    const stockDisplayInput = document.getElementById('stock_disp');
    const productSearchInput = document.querySelector('#product #searchInput');
    const productSearchBtn = document.querySelector('#product #searchBtn');
    const productFilterBtns = document.querySelectorAll('#product .filters .filter-btn');


    // --- Team / Staff ---
    let staffToDelete = null;
    let onlineStaffIds = []; // To store online staff IDs
    const staffTableBody = document.querySelector("#staffTable tbody");
    const staffSearch = document.getElementById("staffSearch");
    const staffStatusFilter = document.getElementById("staffStatusFilter");
    const signupForm = document.getElementById('signupForm');

    // --- Calendar ---
    let calendar = null;
    let allHolidays = []; // To store the master list of holidays
    let eventToDeleteId = null;
    const calendarEl = document.getElementById("calendar");
    const eventForm = document.getElementById("calendarEventForm");
    
    // --- Logs ---
    const logsTableBody = document.getElementById('logsTableBody');
    const logWalkInBtn = document.getElementById('logWalkInBtn');
    let currentAppointments = [];


    // ===============================================
    // SECTION: API & Data Fetching
    // ===============================================
    async function fetchData(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP Error: ${response.status}` }));
                throw new Error(errorData.message || `Failed to fetch from ${endpoint}`);
            }
             // Handle responses that might not have a JSON body (e.g., DELETE with 204 No Content)
            if (response.status === 204) {
                return { success: true };
            }
            return response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            throw error;
        }
    }

    // New dedicated function for handling file uploads with FormData.
    async function fetchWithFormData(endpoint, method, formData) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: method,
                body: formData,
                // DO NOT explicitly set 'Content-Type' header here.
                // The browser will automatically set it to 'multipart/form-data'
                // with the correct boundary when the body is a FormData object.
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP Error: ${response.status}` }));
                throw new Error(errorData.message || `Request failed`);
            }

            if (response.status === 204) {
                return { success: true };
            }
            return response.json();
        } catch (error) {
            console.error(`Error with FormData fetch to ${endpoint}:`, error);
            throw error;
        }
    }


    const fetchDashboardStats = async () => {
        try {
            const stats = await fetchData('/dashboard-stats');
            if(totalProductsEl) totalProductsEl.textContent = stats.totalProducts ?? '0';
            if(totalUsersEl) totalUsersEl.textContent = stats.totalUsers ?? '0';
            if(totalStaffEl) totalStaffEl.textContent = stats.totalStaff ?? '0';
            if(totalPetsEl) totalPetsEl.textContent = stats.totalPets ?? '0';
            if(appointmentsTodayEl) appointmentsTodayEl.textContent = stats.appointmentsToday ?? '0';
        } catch (e) { /* ignore */ }
    };

    const fetchTodaysAnalytics = async () => {
        try {
            const todayStats = await fetchData('/analytics/today');
            renderTodaysAnalytics(todayStats);
        } catch (error) {
            console.error("Failed to fetch today's analytics stats:", error);
        }
    };

    const fetchAnalyticsData = async () => {
        try {
            const [todayStats, records, cancellations] = await Promise.all([
                fetchData('/analytics/today'),
                fetchData('/analytics/records'),
                fetchData('/analytics/recent-cancellations')
            ]);
            renderTodaysAnalytics(todayStats);
            renderAnalyticsRecords(records);
            renderRecentCancellations(cancellations);
            renderMonthlyProductivityChart();
            renderAppointmentsPerDayChart();
            renderAppointmentStatusPieChart();
        } catch (error) {
            console.error("Failed to load analytics data:", error);
        }
    };

    const fetchAppointments = async () => {
        try {
            const appointments = await fetchData('/appointments/all');
            currentAppointments = appointments; // Store for later use
            renderAppointmentsTable(appointments.filter(a => a.status && a.status.toLowerCase() === 'pending'));
            findAndRenderConflicts(appointments);
            updateAppointmentChart(appointments);
            renderVisitLogs(appointments);
        } catch(e) {
            if(appointmentsTableBody) appointmentsTableBody.innerHTML = `<tr><td colspan="7" class="error-message">Could not load appointments.</td></tr>`;
        }
    };

    const loadProducts = async () => {
        try {
            const products = await fetchData('/products');
            allProducts = products; // Store the master list
            filterAndRenderProducts(); // Initial render with filters
        } catch (e) { 
             if(productsGrid) productsGrid.innerHTML = `<p class="no-data-message">Error loading products.</p>`;
        }
    };

    const loadStaff = async () => {
        try {
            const search = staffSearch?.value || "";
            const status = staffStatusFilter?.value || "active";
            const staff = await fetchData(`/staff?search=${encodeURIComponent(search)}&status=${status}`);
            renderStaffTable(staff);
        } catch(e) {
            if(staffTableBody) staffTableBody.innerHTML = `<tr><td colspan="7">Failed to load staff.</td></tr>`;
        }
    };

    const loadCalendarEvents = async () => {
        if (!calendar) return;
        try {
            const events = await fetchData('/events');
            
            // Remove only the specific source for regular events before re-adding it
            const existingEventSource = calendar.getEventSourceById('regular-events');
            if (existingEventSource) {
                existingEventSource.remove();
            }

            calendar.addEventSource({
                id: 'regular-events', // Assign a unique ID to this event source
                events: events.map(ev => ({
                    ...ev, 
                    backgroundColor: getEventColor(ev.title), 
                    borderColor: getEventColor(ev.title)
                }))
            });

        } catch (e) { 
            console.error("Failed to load calendar events:", e);
        }
    };

    const loadHolidays = async () => {
        if (!calendar) return;
        try {
            const holidays = await fetchData('/holidays');
            allHolidays = holidays;
            
            // Remove the old holiday source before adding the new one to prevent duplication
            const existingHolidaySource = calendar.getEventSourceById('holiday-events');
            if (existingHolidaySource) {
                existingHolidaySource.remove();
            }

            // Add holidays to calendar as styled events with a unique source ID
            calendar.addEventSource({
                id: 'holiday-events',
                events: holidays.map(holiday => ({
                    title: holiday.title,
                    start: holiday.start,
                    allDay: true,
                    className: 'fc-event-holiday' // Apply our custom class
                }))
            });

            // Initially render holidays for the current month
            updateHolidaySidebar(new Date());

        } catch (e) {
            console.error("Failed to load holidays:", e);
            const holidaysListEl = document.getElementById('holidaysList');
            if (holidaysListEl) {
                holidaysListEl.innerHTML = `<li class="no-data-message">Could not load holidays.</li>`;
            }
        }
    };
    
    // ===============================================
    // SECTION: UI Rendering & Initialization
    // ===============================================

    function renderTodaysAnalytics(stats) {
        if(todaysBookedEl) todaysBookedEl.textContent = stats.total_booked || '0';
        if(todaysApprovedEl) todaysApprovedEl.textContent = stats.approved || '0';
        if(todaysCompletedEl) todaysCompletedEl.textContent = stats.completed || '0';
    }

    function renderAnalyticsRecords(records) {
        if (!analyticsRecordsTableBody) return;
        analyticsRecordsTableBody.innerHTML = records.length === 0 
            ? `<tr><td colspan="5" class="no-data-message">No historical records found.</td></tr>`
            : records.map(record => `
                <tr>
                    <td>${new Date(record.record_date).toLocaleDateString()}</td>
                    <td>${record.total_booked}</td>
                    <td>${record.total_approved}</td>
                    <td>${record.total_completed}</td>
                    <td>
                        <button class="action-btn delete" data-id="${record.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
    }

    function renderRecentCancellations(cancellations) {
        if (!recentCancellationsTableBody) return;
        recentCancellationsTableBody.innerHTML = cancellations.length === 0
            ? `<tr><td colspan="5" class="no-data-message">No recent cancellations found.</td></tr>`
            : cancellations.map(cancel => `
                <tr>
                    <td>${formatClientName(cancel.client_name) || 'N/A'}</td>
                    <td>${cancel.pet_name || 'N/A'}</td>
                    <td>${(cancel.services || []).join(', ')}</td>
                    <td>${new Date(cancel.appointment_date).toLocaleDateString()}</td>
                    <td>${cancel.cancelled_on ? new Date(cancel.cancelled_on).toLocaleString() : 'N/A'}</td>
                </tr>
            `).join('');
    }

    async function renderMonthlyProductivityChart() {
        const ctx = document.getElementById('monthlyProductivityChart')?.getContext('2d');
        if (!ctx) return;
        try {
            const { labels, data } = await fetchData('/analytics/monthly-productivity');
            if (monthlyProductivityChart) monthlyProductivityChart.destroy();
            
            const average = data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
            const backgroundColors = data.map(val => val >= average ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)');
            const borderColors = data.map(val => val >= average ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)');
            
            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            const colors = getChartThemeColors(currentTheme);

            monthlyProductivityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Completed Appointments',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1,
                        borderRadius: 5,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: colors.ticksColor }, grid: { color: colors.gridColor } },
                        x: { ticks: { color: colors.ticksColor }, grid: { color: 'transparent' } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        } catch (e) { console.error("Failed to render monthly chart", e); }
    }
    
    async function renderAppointmentsPerDayChart() {
        const ctx = document.getElementById('appointmentsPerDayChart')?.getContext('2d');
        if (!ctx) return;
        try {
            const { labels, data } = await fetchData('/analytics/daily-appointments');
            if (appointmentsPerDayChart) appointmentsPerDayChart.destroy();

            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            const colors = getChartThemeColors(currentTheme);

            appointmentsPerDayChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Total Appointments',
                        data: data,
                        fill: true,
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        tension: 0.4,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: colors.ticksColor }, grid: { color: colors.gridColor } },
                        x: { ticks: { color: colors.ticksColor }, grid: { color: 'transparent' } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        } catch (e) { console.error("Failed to render daily chart", e); }
    }
    
    async function renderAppointmentStatusPieChart() {
        const ctx = document.getElementById('appointmentStatusPieChart')?.getContext('2d');
        if (!ctx) return;
        try {
            const statusData = await fetchData('/analytics/status-distribution');
            if (appointmentStatusPieChart) appointmentStatusPieChart.destroy();
    
            const labels = statusData.map(s => s.status);
            const data = statusData.map(s => s.count);
    
            const colorsMap = {
                Pending: '#f59e0b', Approved: '#10b981', Cancelled: '#ef4444', 
                Completed: '#3b82f6', 'No Show': '#64748b'
            };
            const backgroundColors = labels.map(label => colorsMap[label] || '#a8a29e');
            
            const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            const colors = getChartThemeColors(currentTheme);
            const borderColor = currentTheme === 'dark' ? '#1e1e1e' : '#fff';

            appointmentStatusPieChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Appointments',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColor,
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: colors.legendColor } } }
                }
            });
        } catch (e) { console.error("Failed to render status pie chart", e); }
    }

    function renderAppointmentsTable(appointments) {
        if (!appointmentsTableBody) return;
        const pendingAppointments = appointments.filter(a => a.status && a.status.toLowerCase() === 'pending');
        
        appointmentsTableBody.innerHTML = pendingAppointments.length === 0
            ? `<tr><td colspan="7" class="no-data-message">No pending appointments found.</td></tr>`
            : pendingAppointments.map(app => {
                const status = app.status || '';
                const statusClass = `status-${status.toLowerCase()}`;
                const formattedDate = new Date(app.appointment_date).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
                
                const actionsHtml = `<button class="action-btn approve" data-id="${app.appointment_id}" title="Approve"><i class="fas fa-check-circle"></i></button>
                                     <button class="action-btn cancel" data-id="${app.appointment_id}" title="Cancel"><i class="fas fa-times-circle"></i></button>`;
    
                return `<tr>
                    <td>${formatClientName(app.client_name) || 'N/A'}</td> <td>${app.pet_name || 'N/A'}</td>
                    <td>${(app.services || []).join(', ')}</td> <td>${formattedDate}</td>
                    <td>${app.appointment_time || 'N/A'}</td> <td><span class="status-badge ${statusClass}">${status || 'N/A'}</span></td>
                    <td><div class="action-buttons">${actionsHtml}</div></td>
                </tr>`;
            }).join('');
    }

    function findAndRenderConflicts(appointments) {
        if (!conflictsList) return;
        const APPOINTMENT_DURATION_MINS = 30;
        const pending = appointments.filter(a => a.status && a.status.toLowerCase() === 'pending');
        const conflicts = new Map();
    
        const pendingByDate = pending.reduce((acc, curr) => {
            const date = curr.appointment_date.split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(curr);
            return acc;
        }, {});
    
        for (const date in pendingByDate) {
            const dayAppointments = pendingByDate[date].sort((a,b) => a.appointment_time.localeCompare(b.appointment_time));
            for (let i = 0; i < dayAppointments.length; i++) {
                const app1 = dayAppointments[i];
                if (!app1.appointment_time) continue;
                const app1Start = new Date(`${date}T${app1.appointment_time}`);
                const app1End = new Date(app1Start.getTime() + APPOINTMENT_DURATION_MINS * 60000);
    
                for (let j = i + 1; j < dayAppointments.length; j++) {
                    const app2 = dayAppointments[j];
                    if (!app2.appointment_time) continue;
                    const app2Start = new Date(`${date}T${app2.appointment_time}`);
    
                    if (app2Start < app1End) { // Overlap detected
                        if (!conflicts.has(app1.appointment_id)) conflicts.set(app1.appointment_id, app1);
                        if (!conflicts.has(app2.appointment_id)) conflicts.set(app2.appointment_id, app2);
                    }
                }
            }
        }
        
        const conflictArray = Array.from(conflicts.values());
        if (conflictArray.length === 0) {
            conflictsList.innerHTML = `<li class="no-data-message">No conflicts detected.</li>`;
            return;
        }

        conflictsList.innerHTML = conflictArray.map(c => `
            <li class="conflict-item">
                <div class="conflict-info">
                    <strong>${c.pet_name}</strong> (${formatClientName(c.client_name)})
                    <small>${new Date(c.appointment_date).toLocaleDateString()} at ${c.appointment_time}</small>
                </div>
                <button class="action-btn reschedule" data-id="${c.appointment_id}" title="Reschedule">
                    <i class="fas fa-edit"></i>
                </button>
            </li>
        `).join('');
    }

    function updateAppointmentChart(appointments) {
        const ctx = document.getElementById("appointmentStatusChart")?.getContext("2d");
        if (!ctx) return;
    
        const statusCounts = appointments.reduce((acc, curr) => {
            const knownStatuses = ['Pending', 'Approved', 'Completed', 'No Show', 'Cancelled'];
            let status = curr.status || 'Unknown'; 
    
            let capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    
            if (!knownStatuses.includes(capitalizedStatus)) {
                capitalizedStatus = 'Cancelled'; // Map 'Rejected' and others to 'Cancelled' for the chart
            }
    
            acc[capitalizedStatus] = (acc[capitalizedStatus] || 0) + 1;
            return acc;
        }, {});
    
        const labels = Object.keys(statusCounts);
        const data = Object.values(statusCounts);
        
        const colorsMap = {
            Pending: '#f59e0b',
            Approved: '#10b981',
            Cancelled: '#ef4444', 
            Completed: '#3b82f6',
            'No Show': '#64748b'
        };
        const backgroundColors = labels.map(label => colorsMap[label] || '#a8a29e');
        
        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        const colors = getChartThemeColors(currentTheme);
        const borderColor = currentTheme === 'dark' ? '#1e1e1e' : '#fff';
    
        if (appointmentStatusChart) {
            appointmentStatusChart.data.labels = labels;
            appointmentStatusChart.data.datasets[0].data = data;
            appointmentStatusChart.data.datasets[0].backgroundColor = backgroundColors;
            appointmentStatusChart.data.datasets[0].borderColor = borderColor;
            appointmentStatusChart.options.plugins.legend.labels.color = colors.legendColor;
            appointmentStatusChart.update();
        } else {
            appointmentStatusChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Appointments',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColor,
                        borderWidth: 3,
                        hoverOffset: 8,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: colors.legendColor,
                                usePointStyle: true,
                                pointStyle: 'circle',
                                boxWidth: 8,
                                padding: 20,
                                font: { size: 12 }
                            }
                        },
                        tooltip: {
                            backgroundColor: colors.tooltipBgColor,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 12 },
                            padding: 10,
                            cornerRadius: 8,
                            titleColor: colors.tooltipTitleColor,
                            bodyColor: colors.tooltipBodyColor,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                    return `${label}: ${value} (${percentage})`;
                                }
                            }
                        }
                    },
                    animation: {
                        animateScale: true,
                        animateRotate: true
                    }
                }
            });
        }
    }

    function filterAndRenderProducts() {
        if (!productsGrid) return;
    
        const searchQuery = productSearchInput.value.toLowerCase().trim();
        const activeFilterBtn = document.querySelector('#product .filters .filter-btn.active');
        const petTypeFilter = activeFilterBtn ? activeFilterBtn.textContent.trim() : 'All';
    
        let filteredProducts = allProducts.filter(product => {
            const matchesSearch = !searchQuery || 
                                  product.pname.toLowerCase().includes(searchQuery) ||
                                  (product.brand && product.brand.toLowerCase().includes(searchQuery));
    
            let matchesPetType = true;
            if (petTypeFilter === 'Dogs') {
                matchesPetType = product.petType === 'Dog' || product.petType === 'Dog and Cat';
            } else if (petTypeFilter === 'Cats') {
                matchesPetType = product.petType === 'Cat' || product.petType === 'Dog and Cat';
            }
    
            return matchesSearch && matchesPetType;
        });
    
        displayProducts(filteredProducts);
    }

    function displayProducts(products) {
        if (!productsGrid) return;
        if (totalProductsEl) totalProductsEl.textContent = allProducts.length; // Show total count, not filtered
    
        if (products.length === 0) {
            productsGrid.innerHTML = `<p class="no-data-message">No products match the current filters.</p>`;
            return;
        }

        productsGrid.innerHTML = products.map(product => {
            const formattedDate = product.created_at ? new Date(product.created_at).toLocaleDateString('en-US') : 'N/A';
            const petTypeClass = product.petType ? product.petType.toLowerCase().replace(/\s+/g, '-') : 'general';
            
            let priceHtml = `₱${product.price ? parseFloat(product.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}`;
            if (product.disc && parseFloat(product.disc) > 0) {
                const discountedPrice = product.price * (1 - product.disc / 100);
                priceHtml = `
                    <span class="price-original">₱${parseFloat(product.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <span class="price-discounted">₱${discountedPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                `;
            }

            // Since Cloudinary now provides a full, valid URL, we can use it directly.
            const imageUrl = product.image || 'https://placehold.co/300x200/EEE/31343C?text=Image+Not+Found';

            const stock = product.stock;
            let stockHtml;
            if (stock === null || stock === undefined) {
                stockHtml = `<span class="product-stock">Stock: N/A</span>`;
            } else if (stock <= 0) {
                stockHtml = `<span class="product-stock stock-out">Out of Stock</span>`;
            } else if (stock <= 10) {
                stockHtml = `<span class="product-stock stock-low">Low Stock (${stock})</span>`;
            } else {
                stockHtml = `<span class="product-stock stock-in">Stock: ${stock}</span>`;
            }

            return `
            <div class="product-card" data-id="${product.id}">
                <div class="img-prod-box">
                    <img src="${imageUrl}" 
                         alt="${product.pname}" 
                         class="product-image"
                         onerror="this.onerror=null; this.src='https://placehold.co/300x200/EEE/31343C?text=Image+Not+Found';"/>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.pname}</h3>
                    <p class="product-description">${product.description || 'No description available.'}</p>
                    <div class="product-details">
                        <p><strong>Brand:</strong> ${product.brand || 'N/A'}</p>
                        <p><strong>Category:</strong> ${product.category || 'N/A'}</p>
                    </div>
                    <div class="product-meta">
                        <div class="product-tags">
                            <span class="pet-tag pet-tag-${petTypeClass}">${product.petType || 'General'}</span>
                        </div>
                        <div class="price">${priceHtml}</div>
                    </div>
                </div>
                 <div class="product-footer">
                    <span class="product-date">Added: ${formattedDate}</span>
                    ${stockHtml}
                </div>
            </div>`;
        }).join('');
    }

    function renderStaffTable(staffList) {
        if (!staffTableBody) return;
        staffTableBody.innerHTML = staffList.length === 0
        ? `<tr><td colspan="7">No staff found.</td></tr>`
        : staffList.map(staff => {
            // An inactive staff member in the DB cannot be online.
            const isOnline = staff.status === 'active' && onlineStaffIds.includes(staff.id);
            return `
            <tr data-staff-id="${staff.id}" data-db-status="${staff.status}">
                <td>${staff.id}</td>
                <td>${staff.name}</td>
                <td>${staff.role}</td>
                <td>${staff.contact}</td>
                <td>
                    <div class="staff-status-cell">
                        <span class="status-indicator ${isOnline ? 'online' : 'offline'}" title="${isOnline ? 'Online' : 'Offline'}"></span>
                        <span class="status-text">${isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                </td>
                <td>${new Date(staff.hired_date).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn delete" data-id="${staff.id}"><i class="fas fa-trash"></i> Delete</button>
                </td>
            </tr>
        `}).join('');
    }

    function renderVisitLogs(appointments) {
        if (!logsTableBody) return;
    
        const relevantStatuses = ['approved', 'cancelled', 'completed', 'no show'];
        const relevantLogs = appointments.filter(log => log.status && relevantStatuses.includes(log.status.toLowerCase()));
    
        logsTableBody.innerHTML = relevantLogs.length === 0
            ? `<tr><td colspan="6" class="no-data-message">No relevant visit logs found.</td></tr>`
            : relevantLogs.map(log => {
                const formattedDate = new Date(log.appointment_date).toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
                const status = log.status.toLowerCase();
                const services = (log.services || []).map(s => s.toLowerCase());
                
                let actionsHtml = '-';
                 if (status === 'approved') {
                    actionsHtml = `
                        <button class="action-btn confirm-arrival" data-id="${log.appointment_id}" title="Confirm Arrival"><i class="fas fa-check-square"></i> Confirm</button>
                        <button class="action-btn no-show" data-id="${log.appointment_id}" title="Mark as No Show"><i class="fas fa-user-slash"></i> No Show</button>
                    `;
                } else if (status === 'completed') {
                    if (services.includes('vaccination') || services.includes('check up')) {
                         actionsHtml = `<button class="btn btn-secondary book-follow-up-btn" 
                                            data-user-id="${log.user_id}" 
                                            data-pet-id="${log.pet_id}"
                                            data-client-name="${formatClientName(log.client_name) || 'Client'}"
                                            data-pet-name="${log.pet_name || 'Pet'}">
                                            <i class="fas fa-calendar-plus"></i> Book Follow-up
                                        </button>`;
                    } else {
                        actionsHtml = `<span class="action-completed"><i class="fas fa-check-circle"></i> Completed</span>`;
                    }
                }
    
                return `
                    <tr data-appointment-id="${log.appointment_id}" data-status="${status}">
                        <td>${formatClientName(log.client_name) || 'N/A'}</td>
                        <td>${log.pet_name || 'N/A'}</td>
                        <td>${(log.services || []).join(', ')}</td>
                        <td>${formattedDate}</td>
                        <td><span class="status-badge status-${status}">${log.status}</span></td>
                        <td><div class="action-buttons">${actionsHtml}</div></td>
                    </tr>
                `;
            }).join('');
    }

    // New function to update the holiday sidebar for a given month
    function updateHolidaySidebar(date) {
        const holidaysListEl = document.getElementById('holidaysList');
        if (!holidaysListEl || allHolidays.length === 0) return;

        const currentMonth = date.getMonth();
        const currentYear = date.getFullYear();

        const holidaysForMonth = allHolidays
            .filter(h => {
                const holidayDate = new Date(h.start + 'T00:00:00');
                return holidayDate.getMonth() === currentMonth && holidayDate.getFullYear() === currentYear;
            })
            .sort((a, b) => new Date(a.start) - new Date(b.start));

        if (holidaysForMonth.length === 0) {
            holidaysListEl.innerHTML = `<li class="no-data-message">No holidays this month.</li>`;
        } else {
            holidaysListEl.innerHTML = holidaysForMonth.map(h => `
                <li class="holiday-item">
                    <span class="holiday-name">${h.title}</span>
                    <span class="holiday-date">${new Date(h.start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </li>
            `).join('');
        }
    }

    function initializeCalendar() {
        if (!calendarEl) return;
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: "dayGridMonth",
            headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" },
            selectable: true, dayMaxEvents: 3,
            dateClick: (info) => openEventModal(info.date),
            select: (info) => openEventModal(info.start, info.end),
            eventClick: (info) => showEventDetailsModal(info.event),
            height: "auto", aspectRatio: 1.8,
            datesSet: function(dateInfo) {
                updateHolidaySidebar(dateInfo.view.currentStart);
            },
            eventContent: function(arg) {
                // Don't add icons to holiday events
                if (arg.event.classNames.includes('fc-event-holiday')) {
                    return {
                        html: `<div class="fc-event-title">${arg.event.title}</div>`
                    };
                }

                // For regular events, add an icon
                const iconClass = getIconForEvent(arg.event.title);
                const timeText = arg.timeText ? `<span class="fc-event-time">${arg.timeText}</span>` : '';

                return {
                    html: `
                        <div class="fc-event-main-content">
                            <i class="${iconClass} event-icon"></i>
                            <div class="fc-event-title-container">
                                ${timeText}
                                <div class="fc-event-title">${arg.event.title}</div>
                            </div>
                        </div>
                    `
                };
            }
        });
        calendar.render();
        loadCalendarEvents();
        loadHolidays();
    }
    
    // ===============================================
    // SECTION: Modals & UI Helpers
    // ===============================================
    function toggleModal(modal, show) { if (modal) modal.style.display = show ? 'flex' : 'none'; }

    function formatAmPm(date) {
        if (!(date instanceof Date) || isNaN(date)) return '';
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutesStr} ${ampm}`;
    }

    function formatClientName(fullName) {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length <= 2) {
            return fullName;
        }
        const firstName = parts[0];
        const lastName = parts[parts.length - 1];
        const middleInitials = parts.slice(1, -1).map(name => `${name.charAt(0)}.`).join(' ');
        return `${firstName} ${middleInitials} ${lastName}`;
    }

    function openEventModal(start, end) {
        if (!eventForm) return;
        eventForm.reset();
        
        const startDate = new Date(start);
        let endDate;

        // Is this a selection on the day grid (where times are 00:00)?
        const isDayGridSelection = end && startDate.getHours() === 0 && startDate.getMinutes() === 0;

        if (isDayGridSelection) {
            // For any day grid selection (single or multi-day), default to a convenient time on the start date.
            startDate.setHours(8, 0, 0, 0);
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1-hour duration.
        } else if (end) {
            // This is likely a time-grid selection where start/end times are meaningful.
            endDate = new Date(end);
        } else {
            // This is a click on a day ('dateClick' callback, end is null).
            // Default to 8 AM on the clicked day.
            if (startDate.getHours() === 0 && startDate.getMinutes() === 0) {
                 startDate.setHours(8, 0, 0, 0);
            }
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1-hour duration.
        }
        
        // Manually trigger change event to reset fields to editable state
        document.getElementById('calendarEventTitle').dispatchEvent(new Event('change'));

        eventForm.querySelector('#calendarEventStart').value = formatForDatetimeLocal(startDate);
        eventForm.querySelector('#calendarEventEnd').value = formatForDatetimeLocal(endDate);
        toggleModal(eventModal, true);
    }
    
    function showEventDetailsModal(event) {
        const infoEl = document.getElementById("eventInfo");
        const deleteBtn = document.getElementById("deleteEventBtn");
        if (!infoEl || !deleteBtn) return;
        
        // Prevent showing details for holiday background events
        if (event.classNames.includes('fc-event-holiday')) {
            return;
        }
    
        eventToDeleteId = event.id;
    
        const start = event.start; // These are already Date objects from FullCalendar
        const end = event.end;
        
        if (!start) return;
    
        // Check if the event should be treated as an all-day event for display purposes.
        const isAllDay = event.allDay || (
            start.getHours() === 0 && start.getMinutes() === 0 &&
            end && end.getHours() === 0 && end.getMinutes() === 0 &&
            end.getTime() > start.getTime()
        );
        
        const dateStr = start.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        
        let timeStr;
        if (isAllDay) {
            timeStr = 'All-day event';
        } else {
            const startTime = formatAmPm(start);
            const endTime = (end && end.getTime() > start.getTime()) 
                          ? formatAmPm(end) 
                          : null;
            timeStr = endTime ? `${startTime} - ${endTime}` : startTime;
        }
    
        const pet = event.extendedProps?.pet || "Any";
        const notes = event.extendedProps?.notes || "No additional notes.";
        const eventColor = getEventColor(event.title);
        const iconClass = getIconForEvent(event.title);
    
        infoEl.innerHTML = `
            <div class="event-details-header" style="background-color: ${eventColor};">
                <h3 class="event-details-title">
                    <i class="${iconClass}"></i>
                    ${event.title}
                </h3>
            </div>
            <div class="eventDetails-body">
                <p class="eventDetails-form">
                    <i class="fas fa-clock"></i>
                    <span><strong>Time:</strong> ${timeStr}</span>
                </p>
                <p class="eventDetails-form">
                    <i class="fas fa-paw"></i>
                    <span><strong>Pet Type:</strong> ${pet}</span>
                </p>
                <p class="eventDetails-form">
                    <i class="fas fa-sticky-note"></i>
                    <span><strong>Notes:</strong> ${notes}</span>
                </p>
            </div>
            <div class="eventModal-footer">
                <strong>Date:</strong> ${dateStr}
            </div>`;
        toggleModal(eventDetailsModal, true);
    }
    
function getEventColor(title) {
    const colors = {
        "Consultation": "#28a745",
        "Vaccination": "#17a2b8",
        "Deworming": "#84cc16",
        "Grooming": "#e83e8c",
        "Ultrasound": "#8b5cf6",
        "Confinement": "#4f46e5",
        "Surgery": "#dc3545",
        "Retail Only": "#3b82f6",
        "Clinic Closed": "#64748b"
    };
    return colors[title] || "#4f46e5";
}

function getIconForEvent(title) {
    const iconMap = {
        "Consultation": "fa-stethoscope",
        "Vaccination": "fa-syringe",
        "Deworming": "fa-pills",
        "Grooming": "fa-cut",
        "Ultrasound": "fa-wave-square",
        "Confinement": "fa-bed",
        "Surgery": "fa-scalpel",
        "Retail Only": "fa-shopping-bag",
        "Clinic Closed": "fa-door-closed"
    };
    // Use a solid icon set prefix 'fas' for consistency
    return `fas ${iconMap[title] || "fa-calendar-check"}`;
}


function formatForDatetimeLocal(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}


    // ===============================================
    // SECTION: Event Handlers
    // ===============================================
    
    toggleSidebarBtn?.addEventListener('click', () => sidebar?.classList.toggle('collapsed'));

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.classList.contains('logout')) {
                 toggleModal(logoutModal, true); 
                 return;
            }
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            if (contentTitle) contentTitle.textContent = `${targetId.charAt(0).toUpperCase() + targetId.slice(1)} Overview`;
            contentSections.forEach(section => section.classList.toggle('active', section.id === targetId));
            if (targetId === 'calendar' && calendar) setTimeout(() => calendar.updateSize(), 200);
            if (targetId === 'analytics') fetchAnalyticsData();
        });
    });

    document.getElementById('cancelLogout')?.addEventListener('click', () => toggleModal(logoutModal, false));
    document.getElementById('confirmLogout')?.addEventListener('click', async () => {
        try {
            await fetchData('/logout', { method: 'POST' });
        } finally {
            localStorage.removeItem('currentUser');
            window.location.href = 'login.html';
        }
    });
    
    appointmentsTableBody?.addEventListener('click', (event) => {
        const button = event.target.closest('.action-btn');
        if (!button) return;
        const id = button.dataset.id;
        const status = button.classList.contains('approve') ? 'Approved' : 'Cancelled';
        if (confirm(`Are you sure you want to ${status.toLowerCase()} this appointment?`)) {
            fetchData(`/appointments/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        }
    });

    // --- Analytics ---
    analyticsRecordsTableBody?.addEventListener('click', (e) => {
        const button = e.target.closest('button.delete');
        if (button) {
            analyticsRecordToDeleteId = button.dataset.id;
            toggleModal(confirmDeleteAnalyticsModal, true);
        }
    });

    document.getElementById('cancelDeleteAnalyticsBtn')?.addEventListener('click', () => {
        toggleModal(confirmDeleteAnalyticsModal, false);
    });

    document.getElementById('confirmDeleteAnalyticsBtn')?.addEventListener('click', async () => {
        if (!analyticsRecordToDeleteId) return;
        try {
            await fetchData(`/analytics/records/${analyticsRecordToDeleteId}`, { method: 'DELETE' });
            toggleModal(confirmDeleteAnalyticsModal, false);
        } catch (error) {
            alert('Failed to delete record.');
        } finally {
            analyticsRecordToDeleteId = null;
        }
    });

    // --- Walk-in Logic ---
    logWalkInBtn?.addEventListener('click', async () => {
        walkInForm.reset();
        
        // Reset toggle and hide follow-up form
        if (scheduleFollowUpToggle) scheduleFollowUpToggle.checked = false;
        if (followUpFormFields) followUpFormFields.style.display = 'none';

        walkInClientSelect.innerHTML = '<option value="">Loading clients...</option>';
        walkInPetSelect.innerHTML = '<option value="">Select a client first</option>';
        walkInPetSelect.disabled = true;
        
        toggleModal(walkInModal, true);

        try {
            const users = await fetchData('/users/list');
            walkInClientSelect.innerHTML = '<option value="">Select a client</option>' + users.map(u => `<option value="${u.user_id}">${formatClientName(u.fullname)}</option>`).join('');
        } catch (error) {
            walkInClientSelect.innerHTML = '<option value="">Could not load clients</option>';
        }
    });

    scheduleFollowUpToggle?.addEventListener('change', (e) => {
        followUpFormFields.style.display = e.target.checked ? 'block' : 'none';
        if (!e.target.checked) {
            // Clear follow-up fields when toggled off to avoid submitting old data
            document.getElementById('walkInFollowUpService').value = '';
            document.getElementById('walkInFollowUpDate').value = '';
            document.getElementById('walkInFollowUpTime').value = '';
            document.getElementById('walkInFollowUpNotes').value = '';
        }
    });

    walkInClientSelect?.addEventListener('change', async (e) => {
        const userId = e.target.value;
        walkInPetSelect.innerHTML = '<option value="">Loading pets...</option>';
        walkInPetSelect.disabled = true;

        if (!userId) {
            walkInPetSelect.innerHTML = '<option value="">Select a client first</option>';
            return;
        }

        try {
            const pets = await fetchData(`/pets/list/${userId}`);
            walkInPetSelect.innerHTML = '<option value="">Select a pet</option>' + pets.map(p => `<option value="${p.pet_id}">${p.pet_name}</option>`).join('');
            walkInPetSelect.disabled = false;
        } catch (error) {
            walkInPetSelect.innerHTML = '<option value="">Could not load pets</option>';
        }
    });

    walkInForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const isFollowUpScheduled = scheduleFollowUpToggle && scheduleFollowUpToggle.checked;
        const followUpService = document.getElementById('walkInFollowUpService').value;
        const followUpDate = document.getElementById('walkInFollowUpDate').value;
        const followUpTime = document.getElementById('walkInFollowUpTime').value;

        if (isFollowUpScheduled && (!followUpService || !followUpDate || !followUpTime)) {
            alert("For a follow-up, please provide a service, date, and time.");
            return;
        }

        const payload = {
            userId: document.getElementById('walkInClientSelect').value,
            petId: document.getElementById('walkInPetSelect').value,
            todayServices: Array.from(document.querySelectorAll('#walkInServices input:checked')).map(cb => cb.value),
            followUpService: isFollowUpScheduled ? followUpService : '',
            followUpDate: isFollowUpScheduled ? followUpDate : '',
            followUpTime: isFollowUpScheduled ? followUpTime : '',
            followUpNotes: isFollowUpScheduled ? document.getElementById('walkInFollowUpNotes').value : '',
        };

        if(!payload.userId || !payload.petId || payload.todayServices.length === 0) {
            alert('Please select a client, pet, and at least one service for today\'s visit.');
            return;
        }

        try {
            await fetchData('/log-walk-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert('Walk-in visit logged successfully!');
            toggleModal(walkInModal, false);
        } catch (error) {
            alert('Failed to log walk-in visit. ' + error.message);
        }
    });

    document.getElementById('cancelWalkInBtn')?.addEventListener('click', () => toggleModal(walkInModal, false));

    // --- Visit Logs & Follow-up Logic ---
    logsTableBody?.addEventListener('click', async (event) => {
        const arrivalButton = event.target.closest('.action-btn.confirm-arrival');
        if (arrivalButton) {
            const id = arrivalButton.dataset.id;
            if (confirm('Confirm this client has arrived? This will complete the visit.')) {
                fetchData(`/appointments/${id}/confirm-visit`, { method: 'POST' })
                    .catch(err => alert('An error occurred: ' + err.message));
            }
            return; 
        }

        const noShowButton = event.target.closest('.action-btn.no-show');
        if (noShowButton) {
            const id = noShowButton.dataset.id;
            if (confirm('Are you sure you want to mark this appointment as a "No Show"? This cannot be undone.')) {
                fetchData(`/appointments/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'No Show' })
                }).catch(err => alert('An error occurred: ' + err.message));
            }
            return;
        }

        const followUpButton = event.target.closest('.book-follow-up-btn');
        if(followUpButton) {
            const { userId, petId, clientName, petName } = followUpButton.dataset;
            
            document.getElementById('followUpUserId').value = userId;
            document.getElementById('followUpPetId').value = petId;
            document.getElementById('followUpInfo').innerHTML = `Booking for <strong>${petName}</strong> (Owner: ${clientName})`;
            followUpForm.reset();
            toggleModal(followUpModal, true);
        }
    });

    followUpForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            user_id: document.getElementById('followUpUserId').value,
            pet_id: document.getElementById('followUpPetId').value,
            services: [document.getElementById('followUpServiceSelect').value],
            appointment_date: document.getElementById('followUpDateInput').value,
            appointment_time: document.getElementById('followUpTimeInput').value,
            notes: document.getElementById('followUpNotesInput').value,
        };

        if(!payload.user_id || !payload.pet_id || !payload.services[0] || !payload.appointment_date || !payload.appointment_time) {
            alert('Please fill out all required fields for the follow-up, including time.');
            return;
        }

        try {
            await fetchData('/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            alert('Follow-up booked successfully! The client has been notified.');
            toggleModal(followUpModal, false);
        } catch (error) {
            alert('Failed to book follow-up. ' + error.message);
        }
    });
    
    document.getElementById('cancelFollowUpBtn')?.addEventListener('click', () => toggleModal(followUpModal, false));
    
    // --- Conflict Rescheduling ---
    conflictsCard?.addEventListener('click', async (e) => {
        const button = e.target.closest('button.reschedule');
        if (!button) return;
        const id = button.dataset.id;
        const appointment = currentAppointments.find(a => a.appointment_id == id);
        if (appointment) {
            document.getElementById('rescheduleAppointmentId').value = id;
            document.getElementById('rescheduleInfo').textContent = `Rescheduling for ${appointment.pet_name} (${formatClientName(appointment.client_name)}).`;
            const [year, month, day] = appointment.appointment_date.split('T')[0].split('-');
            document.getElementById('rescheduleDate').value = `${year}-${month}-${day}`;
            document.getElementById('rescheduleTime').value = appointment.appointment_time;
            document.getElementById('rescheduleNotes').value = '';
            toggleModal(rescheduleModal, true);
        }
    });

    rescheduleForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('rescheduleAppointmentId').value;
        const payload = {
            appointment_date: document.getElementById('rescheduleDate').value,
            appointment_time: document.getElementById('rescheduleTime').value,
            admin_notes: document.getElementById('rescheduleNotes').value
        };
        await fetchData(`/appointments/${id}/reschedule`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        toggleModal(rescheduleModal, false);
    });
    document.getElementById('cancelRescheduleBtn')?.addEventListener('click', () => toggleModal(rescheduleModal, false));


    // --- Products ---
    function updateProductActionButtons() {
        const selectedCount = selectedProductIds.length;
        if (deleteProductBtn) deleteProductBtn.style.display = selectedCount > 0 ? "inline-block" : "none";
        if (editProductBtn) {
            editProductBtn.style.display = selectedCount === 1 ? "inline-block" : "none";
            editProductBtn.disabled = selectedCount !== 1;
        }
    }

    productsGrid?.addEventListener("click", (e) => {
        if (e.target.closest('.action-btn')) return;
        const card = e.target.closest('.product-card');
        if (!card) return;
    
        const id = parseInt(card.dataset.id, 10);
        const isSelected = card.classList.toggle('selected');
    
        if (isSelected) {
            if (!selectedProductIds.includes(id)) selectedProductIds.push(id);
        } else {
            selectedProductIds = selectedProductIds.filter(i => i !== id);
        }
        updateProductActionButtons();
    });

    document.addEventListener('click', (e) => {
        const productSection = document.getElementById('product');
        if (productSection && !productSection.contains(e.target) && !e.target.closest('.modal')) {
            if (selectedProductIds.length > 0) {
                 selectedProductIds = [];
                 document.querySelectorAll('.product-card.selected').forEach(card => card.classList.remove('selected'));
                 updateProductActionButtons();
            }
        }
    });

    addProductBtn?.addEventListener("click", () => {
        productForm.reset();
        document.getElementById('productId').value = '';
        productFormTitle.textContent = 'Add New Product';
        productSubmitBtn.textContent = 'Save Product';
        addProductForm.style.display = "block";
        if(discountDisplayInput) discountDisplayInput.value = '';
        if(stockDisplayInput) stockDisplayInput.value = '';
    });
    
    editProductBtn?.addEventListener("click", async () => {
        if (selectedProductIds.length !== 1) return;
        const productId = selectedProductIds[0];
        try {
            const product = await fetchData(`/products/${productId}`);
            document.getElementById('productId').value = product.id;
            document.getElementById('pname').value = product.pname;
            document.getElementById('brand').value = product.brand;
            document.getElementById('category').value = product.category;
            document.getElementById('life_stage').value = product.life_stage;
            document.getElementById('price').value = product.price;
            document.getElementById('petType').value = product.petType;
            document.getElementById('disc').value = product.disc;
            document.getElementById('description').value = product.description;
            document.getElementById('stock').value = product.stock;
            updateDiscountDisplay();
            updateStockDisplay();
            productFormTitle.textContent = 'Edit Product';
            productSubmitBtn.textContent = 'Update Product';
            addProductForm.style.display = 'block';
        } catch (error) {
            alert('Failed to fetch product details.');
        }
    });

    cancelProductFormBtn?.addEventListener("click", () => {
        addProductForm.style.display = "none";
        productForm.reset();
    });

    productForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData(productForm);
        const productId = formData.get('id');
        
        try {
            if (productId) {
                await fetchWithFormData(`/products/${productId}`, "PATCH", formData);
            } else {
                await fetchWithFormData('/add-product', "POST", formData);
            }
            addProductForm.style.display = "none";
            productForm.reset();
            selectedProductIds = [];
            document.querySelectorAll('.product-card.selected').forEach(c => c.classList.remove('selected'));
            updateProductActionButtons();
        } catch (error) {
            alert(`Failed to ${productId ? 'update' : 'add'} product. Error: ${error.message}`);
        }
    });

    deleteProductBtn?.addEventListener("click", () => toggleModal(confirmDeleteProductModal, true));
    document.getElementById('cancelDeleteProductBtn')?.addEventListener('click', () => toggleModal(confirmDeleteProductModal, false));
    document.getElementById('confirmDeleteProductBtn')?.addEventListener('click', async () => {
        await fetchData('/delete-products', { method: "DELETE", headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedProductIds }) });
        toggleModal(confirmDeleteProductModal, false);
        selectedProductIds = [];
        updateProductActionButtons();
    });

    const updateDiscountDisplay = () => {
        const price = parseFloat(priceInput.value);
        const discount = parseFloat(discountInput.value);
        if (!isNaN(price) && !isNaN(discount) && discount >= 0 && discount <= 100) {
            const finalPrice = price * (1 - discount / 100);
            discountDisplayInput.value = finalPrice.toFixed(2);
        } else {
            discountDisplayInput.value = '';
        }
    };

    const updateStockDisplay = () => {
        const stock = parseInt(stockInput.value, 10);
        if (isNaN(stock) || stock < 0) {
            stockDisplayInput.value = 'Invalid Quantity';
        } else if (stock === 0) {
            stockDisplayInput.value = 'Out of Stock';
        } else if (stock <= 10) {
            stockDisplayInput.value = `Low Stock (${stock})`;
        } else {
            stockDisplayInput.value = `In Stock (${stock})`;
        }
    };

    priceInput?.addEventListener('input', updateDiscountDisplay);
    discountInput?.addEventListener('input', updateDiscountDisplay);
    stockInput?.addEventListener('input', updateStockDisplay);

    productSearchInput?.addEventListener('input', filterAndRenderProducts);
    productSearchBtn?.addEventListener('click', filterAndRenderProducts);

    productFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            productFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            filterAndRenderProducts();
        });
    });

    
    // --- Staff Delete ---
    staffTableBody?.addEventListener('click', e => {
        const button = e.target.closest('button.delete');
        if (button) {
            staffToDelete = button.dataset.id;
            toggleModal(confirmDeleteStaffModal, true);
        }
    });
    
    document.getElementById('cancelDeleteStaffBtn')?.addEventListener('click', () => toggleModal(confirmDeleteStaffModal, false));
    document.getElementById('confirmDeleteStaffBtn')?.addEventListener('click', async () => {
        if (!staffToDelete) return;
        await fetchData(`/staff/${staffToDelete}`, { method: 'DELETE' });
        toggleModal(confirmDeleteStaffModal, false);
    });
    
    staffSearch?.addEventListener('input', loadStaff);
    staffStatusFilter?.addEventListener('change', loadStaff);

    // ===============================================
    // SECTION: Team Management Form Enhancements
    // ===============================================

    // Get all form elements
    const staffFnameInput = document.getElementById('staffFname');
    const staffLnameInput = document.getElementById('staffLname');
    const staffMiInput = document.getElementById('staffMi');
    const staffEmailInput = document.getElementById('staffEmail');
    const phoneInput = document.getElementById('phoneNumber');
    const staffRoleInput = document.getElementById('staffRole');
    const addressInput = document.getElementById('address');
    const staffUserInput = document.getElementById('staffUser');
    const passwordInput = document.getElementById('staffPass');
    const confirmPassInput = document.getElementById('confirmPass');
    const togglePassword = document.getElementById('togglePassword');
    const strengthMeter = document.getElementById('strengthMeter');
    const strengthText = document.getElementById('strengthText');
    const passwordStrengthIndicator = document.getElementById('passwordStrengthIndicator');

    // --- Validation Helper Functions ---
    const showError = (inputEl, message) => {
        const inputGroup = inputEl.closest('.input-group');
        inputGroup.classList.add('error');
        const errorEl = inputGroup.querySelector('.error-message');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    };

    const hideError = (inputEl) => {
        const inputGroup = inputEl.closest('.input-group');
        inputGroup.classList.remove('error');
        const errorEl = inputGroup.querySelector('.error-message');
        if (errorEl) {
            errorEl.style.display = 'none';
        }
    };

    // --- Password Strength Logic ---
    const checkPasswordStrength = (pass) => {
        let score = 0;
        const hasLength = pass.length >= 8;
        const hasLowercase = /[a-z]/.test(pass);
        const hasUppercase = /[A-Z]/.test(pass);
        const hasNumber = /[0-9]/.test(pass);
        const hasSpecial = /[^a-zA-Z0-9]/.test(pass);

        if (hasLength) score++;
        if (hasLowercase && hasUppercase) score++;
        if (hasNumber) score++;
        if (hasSpecial) score++;
        if (pass.length > 12) score++;
        
        return { score, allMet: hasLength && hasLowercase && hasUppercase && hasNumber }; // Simplified requirement for 'allMet'
    };

    const updatePasswordStrengthUI = (score) => {
        const meterBar = document.querySelector('#strengthMeter .strength-meter-bar');
        if (!meterBar) return;

        switch (score) {
            case 0: case 1:
                meterBar.style.width = '20%';
                meterBar.style.backgroundColor = '#ef4444'; // red
                strengthText.textContent = 'Very Weak';
                strengthText.style.color = '#ef4444';
                break;
            case 2:
                meterBar.style.width = '40%';
                meterBar.style.backgroundColor = '#f97316'; // orange
                strengthText.textContent = 'Weak';
                strengthText.style.color = '#f97316';
                break;
            case 3:
                meterBar.style.width = '60%';
                meterBar.style.backgroundColor = '#f59e0b'; // amber
                strengthText.textContent = 'Medium';
                strengthText.style.color = '#f59e0b';
                break;
            case 4:
                meterBar.style.width = '80%';
                meterBar.style.backgroundColor = '#84cc16'; // lime
                strengthText.textContent = 'Good';
                strengthText.style.color = '#84cc16';
                break;
            case 5:
                meterBar.style.width = '100%';
                meterBar.style.backgroundColor = '#10b981'; // green
                strengthText.textContent = 'Strong';
                strengthText.style.color = '#10b981';
                break;
            default:
                meterBar.style.width = '0%';
                strengthText.textContent = '';
        }
    };
    
    const validateSignupForm = () => {
        let isValid = true;
        
        if (staffFnameInput.value.trim() === '') { showError(staffFnameInput, 'First name is required.'); isValid = false; } else { hideError(staffFnameInput); }
        if (staffLnameInput.value.trim() === '') { showError(staffLnameInput, 'Last name is required.'); isValid = false; } else { hideError(staffLnameInput); }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (staffEmailInput.value.trim() === '' || !emailRegex.test(staffEmailInput.value.trim())) { showError(staffEmailInput, 'Please enter a valid email.'); isValid = false; } else { hideError(staffEmailInput); }
        
        if (phoneInput.value.trim().length < 10) { showError(phoneInput, 'Please enter a valid 10-digit number.'); isValid = false; } else { hideError(phoneInput); }
        if (staffRoleInput.value === '') { showError(staffRoleInput, 'Please select a role.'); isValid = false; } else { hideError(staffRoleInput); }
        if (staffUserInput.value.trim().length < 4) { showError(staffUserInput, 'Username must be at least 4 characters.'); isValid = false; } else { hideError(staffUserInput); }

        const { allMet } = checkPasswordStrength(passwordInput.value);
        if (!allMet) { showError(passwordInput, 'Password must be 8+ characters with uppercase, lowercase, and a number.'); isValid = false; } else { hideError(passwordInput); }
        if (confirmPassInput.value !== passwordInput.value) { showError(confirmPassInput, 'Passwords do not match.'); isValid = false; } else { hideError(confirmPassInput); }
        
        return isValid;
    };

    // --- Event Listeners ---
    passwordInput?.addEventListener('input', () => {
        const pass = passwordInput.value;
        if (pass.length === 0) {
            passwordStrengthIndicator.style.display = 'none';
        } else {
            passwordStrengthIndicator.style.display = 'block';
            const { score } = checkPasswordStrength(pass);
            updatePasswordStrengthUI(score);
        }
        if (confirmPassInput.value.length > 0) {
            if (confirmPassInput.value !== pass) showError(confirmPassInput, 'Passwords do not match.');
            else hideError(confirmPassInput);
        }
    });

    confirmPassInput?.addEventListener('input', () => {
        if (confirmPassInput.value !== passwordInput.value) showError(confirmPassInput, 'Passwords do not match.');
        else hideError(confirmPassInput);
    });

    const capitalizeWords = (str) => str ? str.replace(/\b\w/g, char => char.toUpperCase()) : '';
    const capitalizeInputHandler = e => {
        const input = e.target;
        const pos = input.selectionStart;
        input.value = capitalizeWords(input.value);
        input.setSelectionRange(pos, pos);
    };

    [staffFnameInput, staffLnameInput, staffMiInput, addressInput].forEach(input => {
        if(input) input.addEventListener('input', capitalizeInputHandler);
    });

    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => e.target.value = e.target.value.replace(/[^0-9]/g, ''));
    }

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }

    signupForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateSignupForm()) return;

        const submitButton = signupForm.querySelector('button[type="submit"]');
        const originalButtonHTML = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="loader"></span> Creating...`;
        
        const formData = new FormData(signupForm);
        const payload = Object.fromEntries(formData.entries());
        
        try {
            await fetchData('/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            toggleModal(successModal, true);
            setTimeout(() => toggleModal(successModal, false), 2000);
            signupForm.reset();
        } catch (error) {
            alert('Failed to create account. ' + error.message);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonHTML;
        }
    });

    signupForm?.addEventListener('reset', () => {
        signupForm.querySelectorAll('.input-group.error').forEach(g => g.classList.remove('error'));
        passwordStrengthIndicator.style.display = 'none';
    });

    // ===============================================
    // SECTION: Calendar
    // ===============================================
    eventForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(eventForm);
        const payload = Object.fromEntries(formData.entries());
        await fetchData('/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        toggleModal(eventModal, false);
    });

    document.getElementById('calendarEventTitle')?.addEventListener('change', (e) => {
        const serviceType = e.target.value;
        const startInput = document.getElementById('calendarEventStart');
        const endInput = document.getElementById('calendarEventEnd');
        const petInput = document.getElementById('calendarEventPet');

        if (!startInput || !endInput || !petInput) return;

        if (serviceType === 'Clinic Closed') {
            const datePart = startInput.value.split('T')[0];
            
            // Set to full day
            startInput.value = `${datePart}T00:00`;
            endInput.value = `${datePart}T23:59`;
            
            // Clear and disable pet input
            petInput.value = '';

            // Make inputs readonly to prevent editing but allow submission
            startInput.readOnly = true;
            endInput.readOnly = true;
            petInput.readOnly = true;

        } else {
            // Re-enable inputs
            startInput.readOnly = false;
            endInput.readOnly = false;
            petInput.readOnly = false;

            // Restore default times for convenience if the user switches back
            const datePart = startInput.value.split('T')[0] || new Date().toISOString().split('T')[0];
            startInput.value = `${datePart}T08:00`;
            endInput.value = `${datePart}T09:00`;
        }
    });

    document.getElementById('deleteEventBtn')?.addEventListener('click', () => {
        toggleModal(eventDetailsModal, false);
        toggleModal(confirmDeleteEventModal, true);
    });

    document.getElementById('cancelDeleteEventBtn')?.addEventListener('click', () => {
        toggleModal(confirmDeleteEventModal, false);
    });

    document.getElementById('confirmDeleteEventBtn')?.addEventListener('click', async () => {
        if (!eventToDeleteId) return;
        try {
            await fetchData(`/events/${eventToDeleteId}`, { method: 'DELETE' });
            toggleModal(confirmDeleteEventModal, false);
            eventToDeleteId = null;
        } catch (error) {
            alert('Failed to delete event.');
        }
    });

    document.getElementById('cancelEventModalBtn')?.addEventListener('click', () => toggleModal(eventModal, false));
    document.getElementById('closeEventDetailsBtn')?.addEventListener('click', () => toggleModal(eventDetailsModal, false));
    
    // ===============================================
    // SECTION: Initial Load & Socket Listeners
    // ===============================================
    
    function initialLoad() {
        fetchDashboardStats();
        fetchAppointments();
        loadProducts();
        loadStaff();
        initializeCalendar();
        // Don't fetch analytics by default, only when tab is clicked
        // fetchAnalyticsData();
    }
    
    // Announce online status to server
    socket.emit('staff_online', user.id);

    socket.on('appointment_update', () => { 
        console.log('appointment_update received'); 
        fetchAppointments(); 
        fetchDashboardStats();
        fetchTodaysAnalytics();
    });
    socket.on('analytics_update', () => { 
        console.log('analytics_update received');
        // Only refetch analytics if the tab is currently active
        if (document.getElementById('analytics')?.classList.contains('active')) {
            fetchAnalyticsData();
        }
    });
    socket.on('products_update', () => { console.log('products_update received'); loadProducts(); });
    socket.on('staff_update', () => { console.log('staff_update received'); loadStaff(); });
    socket.on('events_update', () => { console.log('events_update received'); loadCalendarEvents(); });
    
    socket.on('online_staff_update', (onlineIds) => {
        onlineStaffIds = onlineIds;
        // Find all staff rows and update their status indicator and text without a full reload
        document.querySelectorAll('#staffTable tbody tr[data-staff-id]').forEach(row => {
            const staffId = parseInt(row.dataset.staffId, 10);
            const dbStatus = row.dataset.dbStatus;
            
            // An inactive staff member in the DB cannot be online
            const isOnline = dbStatus === 'active' && onlineStaffIds.includes(staffId);
            
            const indicator = row.querySelector('.status-indicator');
            const statusText = row.querySelector('.status-text');

            if (indicator) {
                // Use className to overwrite previous state completely
                indicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
                indicator.title = isOnline ? 'Online' : 'Offline';
            }
            if (statusText) {
                statusText.textContent = isOnline ? 'Online' : 'Offline';
            }
        });
    });

    initialLoad();
});