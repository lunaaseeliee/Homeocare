/**
 * HomeoCare - Shri Siddhivinayak Clinic Management System
 * Doctor: Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)
 * Staff: Clinic Staff (Logged in)
 *
 * PHASE 3: Functional Navigation & Multi-Page Client-Side Routing
 * - Zero navigation popups/toasts when clicking sidebar items
 * - Client-side URL hash routing (#dashboard, #patients, #repertory, #cases, #dispensary, #appointments, #invoices, #analytics)
 * - Beautiful glassmorphism empty states for all pages
 * - Real data source only (0 initial records, dynamically synchronized counts)
 * - Full interactive functionality for registration, booking, dispensaries, and billing
 */

// --- Pure Data Store (Zero Initial Records) ---
const CLINIC_STATE = {
  clinicName: "Shri Siddhivinayak Clinic",
  doctor: "Dr. Suraj D. Panigrahi",
  qualification: "B.H.M.S. (Mum.)",
  staffRole: "Clinic Staff (Logged in)",
  patients: [],      // Array of registered patients
  appointments: [],  // Array of scheduled visits
  invoices: [],      // Array of billing invoices
  medicines: [],     // Array of dispensary medicines
  pendingApprovals: 0,
  completedCases: 0,
  notificationsCount: 0,
  selectedPatientId: null
};

// --- DOM References ---
const htmlRoot = document.documentElement;
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeTextLabel = document.getElementById("themeTextLabel");
const globalSearch = document.getElementById("globalSearch");
const toastContainer = document.getElementById("toastContainer");

// KPIs
const kpiTotalPatients = document.getElementById("kpiTotalPatients");
const kpiActiveCasesSub = document.getElementById("kpiActiveCasesSub");
const kpiPatientsTrend = document.getElementById("kpiPatientsTrend");
const kpiPendingApprovals = document.getElementById("kpiPendingApprovals");
const kpiCompletedCases = document.getElementById("kpiCompletedCases");
const kpiTodayVisits = document.getElementById("kpiTodayVisits");
const kpiUpcomingAppointments = document.getElementById("kpiUpcomingAppointments");
const kpiRevenue = document.getElementById("kpiRevenue");
const kpiPendingInvoices = document.getElementById("kpiPendingInvoices");
const kpiMedicineInventory = document.getElementById("kpiMedicineInventory");
const notifBadge = document.getElementById("notifBadge");
const topbarClinicStatus = document.getElementById("topbarClinicStatus");
const navPatientCount = document.getElementById("navPatientCount");
const navAppointmentsCount = document.getElementById("navAppointmentsCount");
const navDispensaryCount = document.getElementById("navDispensaryCount");
const navInvoicesCount = document.getElementById("navInvoicesCount");
const queueRemainingBadge = document.getElementById("queueRemainingBadge");

// Page Containers
const patientWorkspaceContent = document.getElementById("patientWorkspaceContent");
const patientSelectorWrap = document.getElementById("patientSelectorWrap");
const patientSelect = document.getElementById("patientSelect");
const activePulse = document.getElementById("activePulse");
const timelineList = document.getElementById("timelineList");
const appointmentsList = document.getElementById("appointmentsList");
const cureGraphicContainer = document.getElementById("cureGraphicContainer");
const vitalStatusPill = document.getElementById("vitalStatusPill");

const patientRegistryTableContainer = document.getElementById("patientRegistryTableContainer");
const registryFilterStats = document.getElementById("registryFilterStats");
const registrySearchInput = document.getElementById("registrySearchInput");
const casesContainer = document.getElementById("casesContainer");
const dispensaryContainer = document.getElementById("dispensaryContainer");
const schedulesContainer = document.getElementById("schedulesContainer");
const invoicesContainer = document.getElementById("invoicesContainer");
const analyticsContainer = document.getElementById("analyticsContainer");

// Doctor Notes Input
const doctorNotesInput = document.getElementById("doctorNotesInput");
const saveNoteBtn = document.getElementById("saveNoteBtn");

// Modals
const patientModalOverlay = document.getElementById("patientModalOverlay");
const patientModalCloseBtn = document.getElementById("patientModalCloseBtn");
const patientModalCancelBtn = document.getElementById("patientModalCancelBtn");
const patientRegistrationForm = document.getElementById("patientRegistrationForm");

const symptomModalOverlay = document.getElementById("symptomModalOverlay");
const symptomModalCloseBtn = document.getElementById("symptomModalCloseBtn");
const symptomModalCancelBtn = document.getElementById("symptomModalCancelBtn");
const symptomForm = document.getElementById("symptomForm");

const appointmentModalOverlay = document.getElementById("appointmentModalOverlay");
const aptModalCloseBtn = document.getElementById("aptModalCloseBtn");
const aptModalCancelBtn = document.getElementById("aptModalCancelBtn");
const appointmentForm = document.getElementById("appointmentForm");
const aptPatientSelect = document.getElementById("aptPatientSelect");

const dispensaryModalOverlay = document.getElementById("dispensaryModalOverlay");
const dispModalCloseBtn = document.getElementById("dispModalCloseBtn");
const dispModalCancelBtn = document.getElementById("dispModalCancelBtn");
const dispensaryForm = document.getElementById("dispensaryForm");

const invoiceModalOverlay = document.getElementById("invoiceModalOverlay");
const invoiceModalCloseBtn = document.getElementById("invoiceModalCloseBtn");
const invoiceModalCancelBtn = document.getElementById("invoiceModalCancelBtn");
const invoiceForm = document.getElementById("invoiceForm");
const invPatientSelect = document.getElementById("invPatientSelect");

// Action Triggers
const quickIntakeBtn = document.getElementById("quickIntakeBtn");
const quickIntakeLabel = document.getElementById("quickIntakeLabel");
const registerPatientHeroBtn = document.getElementById("registerPatientHeroBtn");
const newAppointmentQuickBtn = document.getElementById("newAppointmentQuickBtn");
const bookVisitFooterBtn = document.getElementById("bookVisitFooterBtn");
const registryNewPatientBtn = document.getElementById("registryNewPatientBtn");
const casesRegisterBtn = document.getElementById("casesRegisterBtn");
const dispensaryAddMedicineBtn = document.getElementById("dispensaryAddMedicineBtn");
const schedulesBookVisitBtn = document.getElementById("schedulesBookVisitBtn");
const newInvoiceBtn = document.getElementById("newInvoiceBtn");
const importRepertoryNoticeBtn = document.getElementById("importRepertoryNoticeBtn");

const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebar = document.getElementById("sidebar");

// ==========================================================================
// 1. Theme Management (Dark Glass <-> Peach Light)
// ==========================================================================
function initTheme() {
  const savedTheme = localStorage.getItem("homeocare_theme") || "dark";
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  htmlRoot.setAttribute("data-theme", theme);
  localStorage.setItem("homeocare_theme", theme);

  const label = theme === "dark" ? "Dark Glass" : "Peach Light";
  if (themeTextLabel) themeTextLabel.textContent = label;
  const authLabel = document.getElementById("authThemeTextLabel");
  if (authLabel) authLabel.textContent = label;

  // Redraw CAPTCHA canvas with proper theme contrast if auth visible
  if (typeof drawCaptchaChallenge === "function") {
    drawCaptchaChallenge();
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

function toggleTheme() {
  const current = htmlRoot.getAttribute("data-theme") || "dark";
  const target = current === "dark" ? "light" : "dark";
  applyTheme(target);
  showToast(`Switched to ${target === "dark" ? "Dark Glass" : "Peach Light"} Theme`, "info");
}

themeToggleBtn.addEventListener("click", toggleTheme);
const authThemeToggleBtn = document.getElementById("authThemeToggleBtn");
if (authThemeToggleBtn) {
  authThemeToggleBtn.addEventListener("click", toggleTheme);
}

// ==========================================================================
// 2. Client-Side Routing (NO TOASTS ON NAVIGATION)
// ==========================================================================
const VALID_PAGES = ["dashboard", "patients", "repertory", "cases", "dispensary", "appointments", "invoices", "invoice-create", "analytics"];

function navigateTo(pageId, pushState = true) {
  if (!VALID_PAGES.includes(pageId)) {
    pageId = "dashboard";
  }

  // Update Active Link in Sidebar
  document.querySelectorAll(".nav-item").forEach(item => {
    const pageAttr = item.getAttribute("data-page");
    if (pageAttr === pageId || (pageId === "invoice-create" && pageAttr === "invoices")) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Switch Active Page View with smooth transition
  document.querySelectorAll(".page-view").forEach(view => {
    if (view.id === `page-${pageId}`) {
      view.classList.add("active");
    } else {
      view.classList.remove("active");
    }
  });

  // Update URL Hash without reload
  if (pushState && window.location.hash !== `#${pageId}`) {
    window.location.hash = pageId;
  }

  // Close mobile sidebar if open
  if (sidebar.classList.contains("mobile-open")) {
    sidebar.classList.remove("mobile-open");
  }

  // Render the specific page data
  renderCurrentPage(pageId);

  // Scroll viewport smoothly to top
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (window.lucide) {
    lucide.createIcons();
  }
}

// Router hash change listener
window.addEventListener("hashchange", () => {
  const pageId = window.location.hash.replace("#", "");
  navigateTo(pageId, false);
});

// Sidebar links click binding (no toast notifications)
document.querySelectorAll(".nav-item").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetPage = link.getAttribute("data-page");
    navigateTo(targetPage);
  });
});

function renderCurrentPage(pageId) {
  switch (pageId) {
    case "dashboard":
      renderPatientWorkspace();
      renderAppointments();
      break;
    case "patients":
      renderPatientRegistry();
      break;
    case "cases":
      renderActiveCaseRecord();
      break;
    case "dispensary":
      renderPotencyDispensary();
      break;
    case "appointments":
      renderSchedulesPage();
      break;
    case "invoices":
      renderInvoicesPage();
      break;
    case "invoice-create":
      initInvoiceCreator();
      break;
    case "analytics":
      renderAnalyticsPage();
      break;
    default:
      break;
  }
}

// ==========================================================================
// 3. Metrics & Dashboard Statistics Calculation (Single Source of Truth)
// ==========================================================================
function updateDashboardMetrics() {
  const totalPatientsCount = CLINIC_STATE.patients.length;
  const totalAppointmentsCount = CLINIC_STATE.appointments.length;
  const pendingInvoicesCount = CLINIC_STATE.invoices.filter(i => i.status === "Pending").length;
  const totalInvoicesCount = CLINIC_STATE.invoices.length;
  const totalMedicinesCount = CLINIC_STATE.medicines.reduce((acc, m) => acc + (m.qty || 0), 0);

  // Calculate actual revenue from Paid invoices only
  const totalRevenueSum = CLINIC_STATE.invoices
    .filter(i => i.status === "Paid")
    .reduce((acc, inv) => acc + (inv.amount || 0), 0);

  // Update KPI counters
  kpiTotalPatients.textContent = totalPatientsCount;
  kpiActiveCasesSub.textContent = totalPatientsCount;
  navPatientCount.textContent = totalPatientsCount;
  kpiPatientsTrend.textContent = totalPatientsCount > 0 ? `${totalPatientsCount} active` : `0 new`;

  kpiPendingApprovals.textContent = CLINIC_STATE.pendingApprovals;
  kpiCompletedCases.textContent = CLINIC_STATE.completedCases;

  kpiTodayVisits.textContent = totalAppointmentsCount;
  kpiUpcomingAppointments.textContent = totalAppointmentsCount;
  navAppointmentsCount.textContent = totalAppointmentsCount;
  queueRemainingBadge.textContent = `Queue: ${totalAppointmentsCount}`;

  kpiRevenue.textContent = `₹${totalRevenueSum.toLocaleString("en-IN")}`;
  kpiPendingInvoices.textContent = pendingInvoicesCount;
  kpiMedicineInventory.textContent = totalMedicinesCount;
  navDispensaryCount.textContent = CLINIC_STATE.medicines.length;
  navInvoicesCount.textContent = totalInvoicesCount;

  // Sublines in cards
  const kpiPatientSubLine = document.getElementById("kpiPatientSubLine");
  if (kpiPatientSubLine) {
    kpiPatientSubLine.textContent = totalPatientsCount > 0 ? `${totalPatientsCount} registered in directory` : `No patient records yet`;
  }

  const kpiVisitsSubLine = document.getElementById("kpiVisitsSubLine");
  if (kpiVisitsSubLine) {
    kpiVisitsSubLine.textContent = totalAppointmentsCount > 0 ? `${totalAppointmentsCount} consultations booked` : `No visits queued today`;
  }

  // Notification badge
  if (CLINIC_STATE.notificationsCount > 0) {
    notifBadge.style.display = "flex";
    notifBadge.textContent = CLINIC_STATE.notificationsCount;
  } else {
    notifBadge.style.display = "none";
  }

  // Clinic topbar queue summary
  topbarClinicStatus.innerHTML = totalAppointmentsCount > 0
    ? `Active • ${totalAppointmentsCount} In-Queue`
    : `Ready • 0 In-Queue`;

  // Top action button text
  if (totalPatientsCount === 0) {
    quickIntakeLabel.textContent = "Register First Patient";
  } else {
    quickIntakeLabel.textContent = "New Patient Intake";
  }
}

// ==========================================================================
// 4. Clinical Desk (Dashboard) Workspace
// ==========================================================================
function renderPatientWorkspace() {
  const patients = CLINIC_STATE.patients;

  if (patients.length === 0) {
    activePulse.classList.remove("active");
    patientSelectorWrap.style.display = "none";
    doctorNotesInput.disabled = true;
    doctorNotesInput.placeholder = "Enter patient symptom changes (register a patient first)...";
    doctorNotesInput.value = "";
    document.querySelectorAll(".symptom-chip").forEach(c => c.disabled = true);

    patientWorkspaceContent.innerHTML = `
      <div class="glass-empty-state">
        <div class="empty-state-icon-wrap">
          <i data-lucide="users"></i>
        </div>
        <h3 class="empty-state-title">No patients registered yet.</h3>
        <p class="empty-state-desc">Your clinical registry is currently empty. Register your first patient to begin constitutional case-taking, repertorization, and remedy formulation.</p>
        <button class="interactive-btn primary-btn" id="emptyStateRegisterBtn">
          <i data-lucide="user-plus"></i>
          <span>Register First Patient</span>
        </button>
      </div>
    `;

    document.getElementById("emptyStateRegisterBtn").addEventListener("click", () => {
      openPatientModal();
    });

    renderCureVectorEmptyState();
    renderTimelineEmptyState();
    return;
  }

  // Populated state
  activePulse.classList.add("active");
  patientSelectorWrap.style.display = "flex";
  doctorNotesInput.disabled = false;
  doctorNotesInput.placeholder = "Enter patient consultation observations, tongue color, and pulse qualities...";
  document.querySelectorAll(".symptom-chip").forEach(c => c.disabled = false);

  patientSelect.innerHTML = patients
    .map(p => `<option value="${p.id}" ${p.id === CLINIC_STATE.selectedPatientId ? 'selected' : ''}>${p.name} (${p.age}y) - ${p.chiefComplaint}</option>`)
    .join("");

  const activePatient = patients.find(p => p.id === CLINIC_STATE.selectedPatientId) || patients[0];
  CLINIC_STATE.selectedPatientId = activePatient.id;

  const initials = activePatient.name
    .split(" ")
    .map(n => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  patientWorkspaceContent.innerHTML = `
    <!-- Patient Profile Header -->
    <div class="patient-profile-banner">
      <div class="patient-identity-cluster">
        <div class="patient-portrait">${initials}</div>
        <div class="patient-main-meta">
          <div class="p-title-row">
            <h3 class="patient-name">${activePatient.name}</h3>
            <span class="constitution-badge">${activePatient.constitution || 'Constitutional Intake'}</span>
            <span class="miasm-tag">${activePatient.miasm} Miasm</span>
          </div>
          <div class="p-sub-specs">
            <span><i data-lucide="fingerprint"></i> ID: <strong>${activePatient.id}</strong></span>
            <span><i data-lucide="user"></i> Age/Gender: <strong>${activePatient.age} yrs (${activePatient.gender})</strong></span>
            <span><i data-lucide="phone"></i> Phone: <strong>${activePatient.phone}</strong></span>
          </div>
        </div>
      </div>

      <div class="patient-quick-actions">
        <button class="interactive-btn peach-solid-btn" id="recordSymptomBtn">
          <i data-lucide="plus-circle"></i>
          <span>Log Rubric</span>
        </button>
      </div>
    </div>

    <!-- Totality & Modalities Matrix -->
    <div class="totality-matrix">
      <div class="matrix-card">
        <div class="matrix-head">
          <i data-lucide="activity"></i>
          <span>Chief Clinical Complaint</span>
        </div>
        <p class="matrix-body">${activePatient.chiefComplaint}</p>
        <div class="matrix-tags">
          <span class="spec-tag">Registered: ${activePatient.registeredDate}</span>
        </div>
      </div>

      <div class="matrix-card">
        <div class="matrix-head">
          <i data-lucide="compass"></i>
          <span>Modalities & Generals</span>
        </div>
        <p class="matrix-body">${activePatient.rubrics.length > 0 ? activePatient.rubrics.map(r => r.modality).filter(Boolean).join("; ") : "No specific aggravations or ameliorations recorded yet."}</p>
        <div class="matrix-tags">
          <span class="spec-tag">${activePatient.rubrics.length} Rubrics Recorded</span>
        </div>
      </div>

      <div class="matrix-card">
        <div class="matrix-head">
          <i data-lucide="flask-conical"></i>
          <span>Active Similimum Prescription</span>
        </div>
        <p class="matrix-body">${activePatient.prescription || "Initial case intake under evaluation by Dr. Suraj D. Panigrahi."}</p>
        <div class="matrix-tags">
          <span class="spec-tag mod-better">Dr. Suraj D. Panigrahi</span>
        </div>
      </div>
    </div>

    <!-- Repertorial Totality Grid -->
    <div class="repertory-workbench">
      <div class="workbench-header">
        <div>
          <h3 class="panel-section-title">Repertorial Totality Grid (Boenninghausen / Kent)</h3>
          <p class="panel-section-subtitle">Real-time symptom rubrics recorded for this patient</p>
        </div>
        <button class="interactive-btn secondary-btn" id="logRubricSecondaryBtn">
          <i data-lucide="plus"></i>
          <span>Add Rubric</span>
        </button>
      </div>

      <div id="rubricsTableWrap">
        ${renderRubricsTableHTML(activePatient.rubrics)}
      </div>
    </div>
  `;

  document.getElementById("recordSymptomBtn").addEventListener("click", openSymptomModal);
  document.getElementById("logRubricSecondaryBtn").addEventListener("click", openSymptomModal);

  renderCureVector(activePatient);
  renderTimeline(activePatient);

  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderRubricsTableHTML(rubrics) {
  if (rubrics.length === 0) {
    return `
      <div class="glass-empty-state compact">
        <p class="empty-state-desc" style="margin-bottom: 0;">No rubrics recorded for this case yet. Click <strong>"Log Rubric"</strong> to record key symptoms and candidate remedies.</p>
      </div>
    `;
  }

  return `
    <div class="rubrics-table-container">
      <table class="rubrics-table">
        <thead>
          <tr>
            <th>Rubric / Key Symptom</th>
            <th>Intensity</th>
            <th>Modality Grade</th>
            <th>Candidate Remedies</th>
          </tr>
        </thead>
        <tbody>
          ${rubrics.map(r => `
            <tr>
              <td><strong>${r.rubric}</strong></td>
              <td><span class="grade-badge ${r.intensity.includes('3') ? 'grade-3' : 'grade-2'}">${r.intensity}</span></td>
              <td><span style="font-size: 0.8rem; color: var(--text-muted);">${r.modality || '—'}</span></td>
              <td><span style="color: var(--peach-300); font-weight: 600;">${r.remedies || 'Pending review'}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCureVectorEmptyState() {
  vitalStatusPill.textContent = "Standby";
  vitalStatusPill.className = "pill-indicator pill-neutral";
  cureGraphicContainer.innerHTML = `
    <div class="glass-empty-state compact" style="width: 100%;">
      <p class="empty-state-desc" style="margin-bottom: 0;">No active cases. Vital force index will be calculated upon patient follow-up.</p>
    </div>
  `;
}

function renderCureVector(patient) {
  vitalStatusPill.textContent = "Active Record";
  vitalStatusPill.className = "pill-indicator pill-good";
  cureGraphicContainer.innerHTML = `
    <div class="hering-rules-list">
      <div class="hering-rule-item checked">
        <i data-lucide="shield-check"></i>
        <span>Case Registered under Dr. Suraj D. Panigrahi</span>
      </div>
      <div class="hering-rule-item in-progress">
        <i data-lucide="hourglass"></i>
        <span>Follow-up audit pending clinical review</span>
      </div>
    </div>
  `;
}

function renderTimelineEmptyState() {
  timelineList.innerHTML = `
    <div class="glass-empty-state compact">
      <p class="empty-state-desc" style="margin-bottom: 0;">No patient history available.</p>
    </div>
  `;
}

function renderTimeline(patient) {
  if (!patient.history || patient.history.length === 0) {
    renderTimelineEmptyState();
    return;
  }

  timelineList.innerHTML = patient.history.map(item => `
    <div class="timeline-event-item">
      <div class="timeline-event-dot">
        <i data-lucide="clipboard-check"></i>
      </div>
      <div class="timeline-event-content">
        <div class="timeline-event-top">
          <h4 class="timeline-event-title">${item.title}</h4>
          <span class="timeline-event-date">${item.date}</span>
        </div>
        <p class="timeline-event-desc">${item.desc}</p>
      </div>
    </div>
  `).join("");
}

function renderAppointments() {
  const appointments = CLINIC_STATE.appointments;

  if (appointments.length === 0) {
    appointmentsList.innerHTML = `
      <div class="glass-empty-state compact">
        <p class="empty-state-desc" style="margin-bottom: 0;">No visits queued today.</p>
      </div>
    `;
    return;
  }

  appointmentsList.innerHTML = appointments.map(apt => `
    <div class="appointment-item">
      <div class="apt-time">${apt.time}</div>
      <div class="apt-details">
        <span class="apt-patient">${apt.patientName}</span>
        <span class="apt-purpose">${apt.type}</span>
      </div>
      <span class="apt-status-pill upcoming">Scheduled</span>
    </div>
  `).join("");

  if (window.lucide) {
    lucide.createIcons();
  }
}

// ==========================================================================
// 5. Patient Registry Page
// ==========================================================================
function renderPatientRegistry(filterText = "") {
  let list = CLINIC_STATE.patients;
  if (filterText) {
    const q = filterText.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q) ||
      p.miasm.toLowerCase().includes(q)
    );
  }

  registryFilterStats.textContent = `${list.length} of ${CLINIC_STATE.patients.length} registered patients`;

  if (CLINIC_STATE.patients.length === 0) {
    patientRegistryTableContainer.innerHTML = `
      <div class="glass-empty-state" style="margin: 24px;">
        <div class="empty-state-icon-wrap">
          <i data-lucide="user-x"></i>
        </div>
        <h3 class="empty-state-title">No patients registered yet.</h3>
        <p class="empty-state-desc">The patient directory is clean and ready. Register your first patient to begin tracking constitutional health profiles.</p>
        <button class="interactive-btn primary-btn" id="regEmptyBtn">
          <i data-lucide="user-plus"></i>
          <span>Register First Patient</span>
        </button>
      </div>
    `;
    document.getElementById("regEmptyBtn").addEventListener("click", openPatientModal);
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (list.length === 0) {
    patientRegistryTableContainer.innerHTML = `
      <div class="glass-empty-state compact" style="margin: 24px;">
        <p class="empty-state-desc" style="margin-bottom: 0;">No patients matching "${filterText}". Try another search term.</p>
      </div>
    `;
    return;
  }

  patientRegistryTableContainer.innerHTML = `
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Patient ID</th>
            <th>Name</th>
            <th>Age / Gender</th>
            <th>Contact</th>
            <th>Chief Complaint</th>
            <th>Miasm</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(p => `
            <tr>
              <td><span style="font-weight: 700; color: var(--peach-300);">${p.id}</span></td>
              <td><strong style="color: var(--text-primary);">${p.name}</strong></td>
              <td>${p.age} yrs (${p.gender})</td>
              <td>${p.phone}</td>
              <td style="max-width: 240px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.chiefComplaint}</td>
              <td><span class="miasm-tag">${p.miasm}</span></td>
              <td>
                <button class="interactive-btn text-link-btn" onclick="openPatientProfile('${p.id}')">
                  View Dossier →
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

registrySearchInput.addEventListener("input", (e) => {
  renderPatientRegistry(e.target.value.trim());
});

// Window-accessible helper to view patient dossier from any page
window.openPatientProfile = function(patientId) {
  CLINIC_STATE.selectedPatientId = patientId;
  navigateTo("dashboard");
  showToast(`Opened case record for ${CLINIC_STATE.patients.find(p => p.id === patientId)?.name}`, "info");
};

// ==========================================================================
// 6. Active Case Record Page
// ==========================================================================
function renderActiveCaseRecord() {
  const patients = CLINIC_STATE.patients;

  if (patients.length === 0) {
    casesContainer.innerHTML = `
      <div class="glass-empty-state">
        <div class="empty-state-icon-wrap">
          <i data-lucide="clipboard-x"></i>
        </div>
        <h3 class="empty-state-title">No active cases.</h3>
        <p class="empty-state-desc">There are currently no active patient cases undergoing constitutional treatment at Shri Siddhivinayak Clinic.</p>
        <button class="interactive-btn primary-btn" id="caseEmptyRegisterBtn">
          <i data-lucide="user-plus"></i>
          <span>Open First Clinical Case</span>
        </button>
      </div>
    `;
    document.getElementById("caseEmptyRegisterBtn").addEventListener("click", openPatientModal);
    if (window.lucide) lucide.createIcons();
    return;
  }

  casesContainer.innerHTML = `
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Patient Name</th>
            <th>Chief Complaint</th>
            <th>Constitution / Similimum</th>
            <th>Rubrics Count</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${patients.map(p => `
            <tr>
              <td><span style="font-weight: 700; color: var(--peach-300);">${p.id}</span></td>
              <td><strong style="color: var(--text-primary);">${p.name}</strong></td>
              <td>${p.chiefComplaint}</td>
              <td>${p.constitution || 'Evaluating'}</td>
              <td><span class="spec-tag">${p.rubrics.length} logged</span></td>
              <td><span class="pill-indicator pill-good">Active Case</span></td>
              <td>
                <button class="interactive-btn text-link-btn" onclick="openPatientProfile('${p.id}')">
                  Open Desk →
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

// ==========================================================================
// 7. Potency Dispensary Page
// ==========================================================================
function renderPotencyDispensary() {
  const meds = CLINIC_STATE.medicines;

  if (meds.length === 0) {
    dispensaryContainer.innerHTML = `
      <div class="glass-empty-state" style="margin: 28px;">
        <div class="empty-state-icon-wrap">
          <i data-lucide="flask-round"></i>
        </div>
        <h3 class="empty-state-title">Dispensary inventory is empty.</h3>
        <p class="empty-state-desc">No homeopathic remedies, dilutions, or mother tinctures have been inventoried yet. Add medicines with potencies and stock counts.</p>
        <button class="interactive-btn primary-btn" id="dispEmptyAddBtn">
          <i data-lucide="plus"></i>
          <span>Add First Medicine Item</span>
        </button>
      </div>
    `;
    document.getElementById("dispEmptyAddBtn").addEventListener("click", openDispensaryModal);
    if (window.lucide) lucide.createIcons();
    return;
  }

  dispensaryContainer.innerHTML = `
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Remedy Name</th>
            <th>Potency</th>
            <th>Dosage Form</th>
            <th>Quantity in Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${meds.map(m => `
            <tr>
              <td><strong style="color: var(--text-primary);">${m.name}</strong></td>
              <td><span class="potency-pill">${m.potency}</span></td>
              <td>${m.form}</td>
              <td><strong style="font-size: 1rem; color: var(--peach-300);">${m.qty}</strong> units</td>
              <td><span class="pill-indicator ${m.qty > 2 ? 'pill-good' : 'pill-neutral'}">${m.qty > 2 ? 'In Stock' : 'Low Stock'}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function openDispensaryModal() {
  dispensaryModalOverlay.classList.add("active");
  if (window.lucide) lucide.createIcons();
}

function closeDispensaryModal() {
  dispensaryModalOverlay.classList.remove("active");
}

dispModalCloseBtn.addEventListener("click", closeDispensaryModal);
dispModalCancelBtn.addEventListener("click", closeDispensaryModal);
dispensaryModalOverlay.addEventListener("click", (e) => {
  if (e.target === dispensaryModalOverlay) closeDispensaryModal();
});

dispensaryForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("medNameInput").value.trim();
  const potency = document.getElementById("medPotencyInput").value.trim();
  const form = document.getElementById("medFormSelect").value;
  const qty = parseInt(document.getElementById("medQtyInput").value, 10) || 1;

  CLINIC_STATE.medicines.push({ name, potency, form, qty });
  dispensaryForm.reset();
  closeDispensaryModal();
  updateDashboardMetrics();
  renderPotencyDispensary();
  showToast(`Added ${name} (${potency}) to dispensary stock.`, "success");
});

dispensaryAddMedicineBtn.addEventListener("click", openDispensaryModal);

// ==========================================================================
// 8. Schedules & Visits Page
// ==========================================================================
function renderSchedulesPage() {
  const apts = CLINIC_STATE.appointments;

  if (apts.length === 0) {
    schedulesContainer.innerHTML = `
      <div class="glass-empty-state" style="margin: 28px;">
        <div class="empty-state-icon-wrap">
          <i data-lucide="calendar-x"></i>
        </div>
        <h3 class="empty-state-title">No appointments scheduled.</h3>
        <p class="empty-state-desc">There are no clinic visits booked for today. Schedule a case-taking consultation or follow-up review for Dr. Suraj D. Panigrahi.</p>
        <button class="interactive-btn primary-btn" id="schedEmptyBookBtn">
          <i data-lucide="calendar-plus"></i>
          <span>Schedule Visit</span>
        </button>
      </div>
    `;
    document.getElementById("schedEmptyBookBtn").addEventListener("click", openAppointmentModal);
    if (window.lucide) lucide.createIcons();
    return;
  }

  schedulesContainer.innerHTML = `
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Patient Name</th>
            <th>Patient ID</th>
            <th>Consultation Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${apts.map(a => `
            <tr>
              <td><span style="font-weight: 700; color: var(--peach-300);">${a.time}</span></td>
              <td><strong style="color: var(--text-primary);">${a.patientName}</strong></td>
              <td>${a.patientId}</td>
              <td>${a.type}</td>
              <td><span class="apt-status-pill upcoming">Confirmed</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

schedulesBookVisitBtn.addEventListener("click", openAppointmentModal);

// ==========================================================================
// 9. Invoices & Billing Page
// ==========================================================================
// ==========================================================================
// 9. Invoices & Billing Page & Automated Receipt Generator Engine
// ==========================================================================

// Current in-memory working invoice state
let ACTIVE_INVOICE_STATE = {
  id: null,
  isDraft: false,
  isApproved: false,
  approvedBy: null,
  approvalTime: null,
  patientId: "",
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientPhone: "",
  patientAddress: "",
  date: new Date().toISOString().split("T")[0],
  consultDate: new Date().toISOString().split("T")[0],
  followupDate: "",
  chiefComplaint: "",
  diagnosis: "",
  treatmentPlan: "",
  consultDuration: "",
  treatmentDurationDays: 30,
  showClinicalDetails: true,
  items: [
    { desc: "Constitutional Consultation & Case Evaluation", potency: "—", qty: 1, days: 30, rate: 1000, total: 1000 },
    { desc: "Homeopathic Remedy Dispensation (Pellets / Dilution)", potency: "200 CH", qty: 1, days: 30, rate: 500, total: 500 }
  ],
  consultFee: 1000,
  medicinesTotal: 500,
  otherCharges: 0,
  discount: 0,
  grandTotal: 1500,
  amountPaid: 1500,
  remainingBalance: 0,
  paymentMethod: "UPI / QR Code",
  paymentStatus: "Paid",
  doctorNote: "Strict avoidance of raw onion, garlic, coffee, and camphorated oils during active treatment."
};

function renderInvoicesPage(filterText = "") {
  let list = CLINIC_STATE.invoices;
  if (filterText) {
    const q = filterText.toLowerCase();
    list = list.filter(i =>
      (i.id && i.id.toLowerCase().includes(q)) ||
      (i.patientName && i.patientName.toLowerCase().includes(q)) ||
      (i.patientId && i.patientId.toLowerCase().includes(q)) ||
      (i.date && i.date.toLowerCase().includes(q))
    );
  }

  const invoicesFilterStats = document.getElementById("invoicesFilterStats");
  if (invoicesFilterStats) {
    invoicesFilterStats.textContent = `${list.length} of ${CLINIC_STATE.invoices.length} invoices`;
  }

  if (CLINIC_STATE.invoices.length === 0) {
    invoicesContainer.innerHTML = `
      <div class="glass-empty-state" style="margin: 28px;">
        <div class="empty-state-icon-wrap">
          <i data-lucide="receipt"></i>
        </div>
        <h3 class="empty-state-title">No invoices generated yet.</h3>
        <p class="empty-state-desc">No billing invoices have been issued. Create an itemized medical invoice with automated patient data autofill and live A4 receipt generation.</p>
        <button class="interactive-btn primary-btn" id="invEmptyCreateBtn">
          <i data-lucide="plus"></i>
          <span>Create Itemized Invoice</span>
        </button>
      </div>
    `;
    document.getElementById("invEmptyCreateBtn").addEventListener("click", () => openInvoiceCreator());
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (list.length === 0) {
    invoicesContainer.innerHTML = `
      <div class="glass-empty-state compact" style="margin: 24px;">
        <p class="empty-state-desc" style="margin-bottom: 0;">No invoices matching "${filterText}". Try another search term.</p>
      </div>
    `;
    return;
  }

  invoicesContainer.innerHTML = `
    <div class="data-table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Patient</th>
            <th>Services & Medicines</th>
            <th>Grand Total</th>
            <th>Paid</th>
            <th>Status</th>
            <th>Approval</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(inv => `
            <tr>
              <td><strong style="color: var(--peach-300);">${inv.id}</strong></td>
              <td>${inv.date}</td>
              <td>
                <strong style="color: var(--text-primary);">${inv.patientName}</strong>
                <div style="font-size: 0.72rem; color: var(--text-dim);">${inv.patientId}</div>
              </td>
              <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${inv.items && inv.items.length > 0 ? inv.items.map(it => it.desc).join(", ") : inv.particulars || 'Medical Consultation'}
              </td>
              <td><strong style="color: var(--text-primary);">₹${(inv.grandTotal || inv.amount || 0).toLocaleString("en-IN")}</strong></td>
              <td>₹${(inv.amountPaid !== undefined ? inv.amountPaid : inv.amount || 0).toLocaleString("en-IN")}</td>
              <td>
                <span class="status-badge ${inv.paymentStatus === 'Paid' ? 'paid' : (inv.paymentStatus === 'Partially Paid' ? 'partially' : 'unpaid')}">
                  ${inv.paymentStatus || inv.status || 'Paid'}
                </span>
              </td>
              <td>
                <span class="approval-tag ${inv.isApproved ? 'approved' : (inv.isDraft ? 'draft' : 'pending')}">
                  ${inv.isApproved ? 'Approved' : (inv.isDraft ? 'Draft' : 'Pending')}
                </span>
              </td>
              <td>
                <div style="display: flex; gap: 8px;">
                  <button class="interactive-btn text-link-btn" onclick="viewExistingInvoice('${inv.id}')" title="View & Print">
                    Preview / Print →
                  </button>
                  ${!inv.isApproved ? `<button class="interactive-btn text-link-btn" onclick="editExistingDraft('${inv.id}')" style="color: var(--emerald-cure);">Edit</button>` : ''}
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

const invoiceSearchInput = document.getElementById("invoiceSearchInput");
if (invoiceSearchInput) {
  invoiceSearchInput.addEventListener("input", (e) => {
    renderInvoicesPage(e.target.value.trim());
  });
}

// --------------------------------------------------------------------------
// Invoice Creator Setup & Real-Time Sync
// --------------------------------------------------------------------------
function openInvoiceCreator(invoiceToEdit = null) {
  if (CLINIC_STATE.patients.length === 0) {
    showToast("Please register a patient first before generating an invoice.", "info");
    openPatientModal();
    return;
  }

  if (invoiceToEdit) {
    ACTIVE_INVOICE_STATE = JSON.parse(JSON.stringify(invoiceToEdit));
    document.getElementById("invoiceCreatorHeading").textContent = `Edit Invoice ${invoiceToEdit.id}`;
  } else {
    // Fresh invoice state
    const todayStr = new Date().toISOString().split("T")[0];
    const defaultPatient = CLINIC_STATE.selectedPatientId
      ? CLINIC_STATE.patients.find(p => p.id === CLINIC_STATE.selectedPatientId) || CLINIC_STATE.patients[0]
      : CLINIC_STATE.patients[0];

    const newInvoiceNo = `SSC-INV-${new Date().getFullYear()}-${String(CLINIC_STATE.invoices.length + 1).padStart(4, "0")}`;

    ACTIVE_INVOICE_STATE = {
      id: newInvoiceNo,
      isDraft: false,
      isApproved: false,
      approvedBy: null,
      approvalTime: null,
      patientId: defaultPatient.id,
      patientName: defaultPatient.name,
      patientAge: defaultPatient.age,
      patientGender: defaultPatient.gender,
      patientPhone: defaultPatient.phone,
      patientAddress: "Dadar (W), Mumbai",
      date: todayStr,
      consultDate: todayStr,
      followupDate: "",
      chiefComplaint: defaultPatient.chiefComplaint || "",
      diagnosis: defaultPatient.constitution ? `Constitutional evaluation: ${defaultPatient.constitution}` : "Classical Homeopathic Management",
      treatmentPlan: defaultPatient.prescription || "Constitutional Homeopathic Dilution + Supportive Sac-Lac",
      consultDuration: "45 Mins",
      treatmentDurationDays: 30,
      showClinicalDetails: true,
      items: [
        { desc: "Homeopathic Case Evaluation & Consultation", potency: "—", qty: 1, days: 30, rate: 800, total: 800 },
        { desc: defaultPatient.prescription ? `Prescribed Remedy: ${defaultPatient.prescription}` : "Individualized Homeopathic Remedy Dispensary", potency: "200 CH", qty: 1, days: 30, rate: 450, total: 450 }
      ],
      consultFee: 800,
      medicinesTotal: 450,
      otherCharges: 0,
      discount: 0,
      grandTotal: 1250,
      amountPaid: 1250,
      remainingBalance: 0,
      paymentMethod: "UPI / QR Code",
      paymentStatus: "Paid",
      doctorNote: "Strict avoidance of raw onion, garlic, coffee, and strong camphorated products during treatment."
    };
    document.getElementById("invoiceCreatorHeading").textContent = "Create Itemized Medical Invoice";
  }

  navigateTo("invoice-create");
}

function initInvoiceCreator() {
  const patientSelect = document.getElementById("invFormPatientSelect");
  patientSelect.innerHTML = CLINIC_STATE.patients
    .map(p => `<option value="${p.id}" ${p.id === ACTIVE_INVOICE_STATE.patientId ? 'selected' : ''}>${p.name} (${p.id})</option>`)
    .join("");

  // Populate input fields
  document.getElementById("invFormDate").value = ACTIVE_INVOICE_STATE.date;
  document.getElementById("invFormConsultDate").value = ACTIVE_INVOICE_STATE.consultDate;
  document.getElementById("invFormFollowupDate").value = ACTIVE_INVOICE_STATE.followupDate;
  document.getElementById("invFormAddress").value = ACTIVE_INVOICE_STATE.patientAddress;
  document.getElementById("invFormChiefComplaint").value = ACTIVE_INVOICE_STATE.chiefComplaint;
  document.getElementById("invFormDiagnosis").value = ACTIVE_INVOICE_STATE.diagnosis;
  document.getElementById("invFormTreatmentPlan").value = ACTIVE_INVOICE_STATE.treatmentPlan;
  document.getElementById("invFormConsultDuration").value = ACTIVE_INVOICE_STATE.consultDuration;
  document.getElementById("invFormTreatmentDuration").value = ACTIVE_INVOICE_STATE.treatmentDurationDays;
  document.getElementById("invFormShowClinicalDetails").checked = ACTIVE_INVOICE_STATE.showClinicalDetails;

  document.getElementById("invFormConsultFee").value = ACTIVE_INVOICE_STATE.consultFee;
  document.getElementById("invFormOtherCharges").value = ACTIVE_INVOICE_STATE.otherCharges;
  document.getElementById("invFormDiscount").value = ACTIVE_INVOICE_STATE.discount;
  document.getElementById("invFormAmountPaid").value = ACTIVE_INVOICE_STATE.amountPaid;
  document.getElementById("invFormPaymentMethod").value = ACTIVE_INVOICE_STATE.paymentMethod;
  document.getElementById("invFormPaymentStatus").value = ACTIVE_INVOICE_STATE.paymentStatus;
  document.getElementById("invFormDoctorNote").value = ACTIVE_INVOICE_STATE.doctorNote;

  renderInvoiceItemsTable();
  recalculateTotals();
  updateLiveDocumentPreview();
  attachInvoiceBuilderListeners();
}

function attachInvoiceBuilderListeners() {
  const patientSelect = document.getElementById("invFormPatientSelect");
  patientSelect.onchange = (e) => {
    const selected = CLINIC_STATE.patients.find(p => p.id === e.target.value);
    if (selected) {
      ACTIVE_INVOICE_STATE.patientId = selected.id;
      ACTIVE_INVOICE_STATE.patientName = selected.name;
      ACTIVE_INVOICE_STATE.patientAge = selected.age;
      ACTIVE_INVOICE_STATE.patientGender = selected.gender;
      ACTIVE_INVOICE_STATE.patientPhone = selected.phone;
      ACTIVE_INVOICE_STATE.chiefComplaint = selected.chiefComplaint || "";
      document.getElementById("invFormChiefComplaint").value = selected.chiefComplaint || "";
      if (selected.constitution) {
        ACTIVE_INVOICE_STATE.diagnosis = `Constitutional evaluation: ${selected.constitution}`;
        document.getElementById("invFormDiagnosis").value = ACTIVE_INVOICE_STATE.diagnosis;
      }
      if (selected.prescription) {
        ACTIVE_INVOICE_STATE.treatmentPlan = selected.prescription;
        document.getElementById("invFormTreatmentPlan").value = selected.prescription;
      }
      updateLiveDocumentPreview();
    }
  };

  const syncField = (elemId, stateProp) => {
    const el = document.getElementById(elemId);
    if (el) {
      el.oninput = (e) => {
        ACTIVE_INVOICE_STATE[stateProp] = e.target.value;
        updateLiveDocumentPreview();
      };
    }
  };

  syncField("invFormDate", "date");
  syncField("invFormConsultDate", "consultDate");
  syncField("invFormFollowupDate", "followupDate");
  syncField("invFormAddress", "patientAddress");
  syncField("invFormChiefComplaint", "chiefComplaint");
  syncField("invFormDiagnosis", "diagnosis");
  syncField("invFormTreatmentPlan", "treatmentPlan");
  syncField("invFormConsultDuration", "consultDuration");
  syncField("invFormTreatmentDuration", "treatmentDurationDays");
  syncField("invFormDoctorNote", "doctorNote");

  document.getElementById("invFormShowClinicalDetails").onchange = (e) => {
    ACTIVE_INVOICE_STATE.showClinicalDetails = e.target.checked;
    updateLiveDocumentPreview();
  };

  const numberSync = (elemId, stateProp) => {
    const el = document.getElementById(elemId);
    if (el) {
      el.oninput = (e) => {
        ACTIVE_INVOICE_STATE[stateProp] = Math.max(0, parseFloat(e.target.value) || 0);
        recalculateTotals();
        updateLiveDocumentPreview();
      };
    }
  };

  numberSync("invFormConsultFee", "consultFee");
  numberSync("invFormOtherCharges", "otherCharges");
  numberSync("invFormDiscount", "discount");
  numberSync("invFormAmountPaid", "amountPaid");

  document.getElementById("invFormPaymentMethod").onchange = (e) => {
    ACTIVE_INVOICE_STATE.paymentMethod = e.target.value;
    updateLiveDocumentPreview();
  };

  document.getElementById("invFormPaymentStatus").onchange = (e) => {
    ACTIVE_INVOICE_STATE.paymentStatus = e.target.value;
    updateLiveDocumentPreview();
  };
}

// --------------------------------------------------------------------------
// Itemized Medicines Table in Builder
// --------------------------------------------------------------------------
function renderInvoiceItemsTable() {
  const tbody = document.getElementById("invoiceItemsTableBody");
  tbody.innerHTML = ACTIVE_INVOICE_STATE.items.map((item, idx) => `
    <tr>
      <td style="text-align: center; color: var(--text-dim);">${idx + 1}</td>
      <td>
        <input type="text" value="${item.desc}" oninput="updateItemField(${idx}, 'desc', this.value)" placeholder="Medicine / Service name" required>
      </td>
      <td>
        <input type="text" value="${item.potency}" oninput="updateItemField(${idx}, 'potency', this.value)" placeholder="e.g. 200 CH">
      </td>
      <td>
        <input type="number" value="${item.qty}" min="1" oninput="updateItemField(${idx}, 'qty', this.value)" style="text-align: center;">
      </td>
      <td>
        <input type="number" value="${item.days}" min="1" oninput="updateItemField(${idx}, 'days', this.value)" style="text-align: center;">
      </td>
      <td>
        <input type="number" value="${item.rate}" min="0" oninput="updateItemField(${idx}, 'rate', this.value)" style="text-align: right;">
      </td>
      <td>
        <span class="item-row-total">₹${item.total.toLocaleString("en-IN")}</span>
      </td>
      <td style="text-align: center;">
        ${ACTIVE_INVOICE_STATE.items.length > 1 ? `
          <button type="button" class="delete-row-btn" onclick="removeInvoiceItem(${idx})" title="Remove item">
            <i data-lucide="trash-2"></i>
          </button>
        ` : ''}
      </td>
    </tr>
  `).join("");

  if (window.lucide) lucide.createIcons();
}

window.updateItemField = function(idx, field, value) {
  const item = ACTIVE_INVOICE_STATE.items[idx];
  if (!item) return;

  if (field === "qty" || field === "days" || field === "rate") {
    item[field] = Math.max(0, parseFloat(value) || 0);
    item.total = item.qty * item.rate;
  } else {
    item[field] = value;
  }

  recalculateTotals();
  renderInvoiceItemsTable();
  updateLiveDocumentPreview();
};

window.removeInvoiceItem = function(idx) {
  if (ACTIVE_INVOICE_STATE.items.length > 1) {
    ACTIVE_INVOICE_STATE.items.splice(idx, 1);
    recalculateTotals();
    renderInvoiceItemsTable();
    updateLiveDocumentPreview();
  }
};

document.getElementById("invAddRowBtn").onclick = () => {
  ACTIVE_INVOICE_STATE.items.push({
    desc: "Homeopathic Remedy (Dispensary Dispensation)",
    potency: "30C",
    qty: 1,
    days: 15,
    rate: 250,
    total: 250
  });
  recalculateTotals();
  renderInvoiceItemsTable();
  updateLiveDocumentPreview();
};

function recalculateTotals() {
  const medicinesTotal = ACTIVE_INVOICE_STATE.items.reduce((acc, it) => acc + (it.total || 0), 0);
  ACTIVE_INVOICE_STATE.medicinesTotal = medicinesTotal;

  const subtotal = ACTIVE_INVOICE_STATE.consultFee + medicinesTotal + ACTIVE_INVOICE_STATE.otherCharges;
  const grandTotal = Math.max(0, subtotal - ACTIVE_INVOICE_STATE.discount);
  ACTIVE_INVOICE_STATE.grandTotal = grandTotal;

  const remaining = Math.max(0, grandTotal - ACTIVE_INVOICE_STATE.amountPaid);
  ACTIVE_INVOICE_STATE.remainingBalance = remaining;

  // Auto-sync status
  if (ACTIVE_INVOICE_STATE.amountPaid >= grandTotal && grandTotal > 0) {
    ACTIVE_INVOICE_STATE.paymentStatus = "Paid";
  } else if (ACTIVE_INVOICE_STATE.amountPaid > 0 && ACTIVE_INVOICE_STATE.amountPaid < grandTotal) {
    ACTIVE_INVOICE_STATE.paymentStatus = "Partially Paid";
  } else if (grandTotal > 0 && ACTIVE_INVOICE_STATE.amountPaid === 0) {
    ACTIVE_INVOICE_STATE.paymentStatus = "Unpaid";
  }
  document.getElementById("invFormPaymentStatus").value = ACTIVE_INVOICE_STATE.paymentStatus;
}

// --------------------------------------------------------------------------
// Update Official Live A4 Preview Document
// --------------------------------------------------------------------------
function updateLiveDocumentPreview() {
  const inv = ACTIVE_INVOICE_STATE;

  document.getElementById("docInvoiceNo").textContent = inv.id || "INV-NEW";
  document.getElementById("docInvoiceDate").textContent = formatDateIN(inv.date);

  const approvalBadge = document.getElementById("docApprovalBadge");
  const approvalAuditLine = document.getElementById("docApprovalAuditLine");

  if (inv.isApproved) {
    approvalBadge.className = "approval-tag approved";
    approvalBadge.textContent = "APPROVED";
    approvalAuditLine.innerHTML = `<i data-lucide="check-check"></i> Approved by ${inv.approvedBy || 'Dr. Suraj D. Panigrahi'}`;
    approvalAuditLine.style.color = "#15803d";
  } else if (inv.isDraft) {
    approvalBadge.className = "approval-tag draft";
    approvalBadge.textContent = "DRAFT";
    approvalAuditLine.textContent = "Draft Copy • Awaiting Doctor Approval";
    approvalAuditLine.style.color = "#6b7280";
  } else {
    approvalBadge.className = "approval-tag pending";
    approvalBadge.textContent = "PENDING APPROVAL";
    approvalAuditLine.textContent = "Pending Final Doctor Approval";
    approvalAuditLine.style.color = "#b45309";
  }

  document.getElementById("docPatientName").textContent = inv.patientName || "—";
  document.getElementById("docPatientId").textContent = inv.patientId || "—";
  document.getElementById("docPatientAddress").textContent = inv.patientAddress || "—";
  document.getElementById("docPatientAgeGender").textContent = inv.patientAge ? `${inv.patientAge} yrs / ${inv.patientGender}` : "—";
  document.getElementById("docPatientPhone").textContent = inv.patientPhone || "—";
  document.getElementById("docConsultDate").textContent = formatDateIN(inv.consultDate);

  // Clinical Details Box
  const clinicalBox = document.getElementById("docClinicalBox");
  if (inv.showClinicalDetails && (inv.chiefComplaint || inv.diagnosis || inv.treatmentPlan)) {
    clinicalBox.style.display = "flex";
    document.getElementById("docChiefComplaint").textContent = inv.chiefComplaint || "Under review";
    document.getElementById("docDiagnosis").textContent = inv.diagnosis || "Homeopathic Evaluation";
    document.getElementById("docManagementPlan").textContent = inv.treatmentPlan || "Constitutional Similimum";
  } else {
    clinicalBox.style.display = "none";
  }

  // Items table in preview
  const docTbody = document.getElementById("docItemsTableBody");
  docTbody.innerHTML = inv.items.map((it, i) => `
    <tr>
      <td style="text-align: center;">${i + 1}</td>
      <td><strong>${it.desc}</strong></td>
      <td style="text-align: center;">${it.potency || '—'}</td>
      <td style="text-align: center;">${it.qty}</td>
      <td style="text-align: center;">${it.days || '—'}</td>
      <td style="text-align: right;">₹${it.rate.toLocaleString("en-IN")}</td>
      <td style="text-align: right;"><strong>₹${it.total.toLocaleString("en-IN")}</strong></td>
    </tr>
  `).join("");

  // Payment specs
  document.getElementById("docPaymentMethod").textContent = inv.paymentMethod || "UPI / Digital";
  const statusBadge = document.getElementById("docPaymentStatusBadge");
  const pStatus = inv.paymentStatus || inv.status || "Paid";
  statusBadge.textContent = pStatus.toUpperCase();
  statusBadge.className = `status-badge ${pStatus === 'Paid' ? 'paid' : (pStatus === 'Partially Paid' ? 'partially' : 'unpaid')}`;

  const followupRow = document.getElementById("docFollowupRow");
  if (inv.followupDate) {
    followupRow.style.display = "flex";
    document.getElementById("docFollowupDate").textContent = formatDateIN(inv.followupDate);
  } else {
    followupRow.style.display = "none";
  }

  document.getElementById("docSpecialInstructions").textContent = inv.doctorNote || "Follow prescribed dosage schedule.";

  // Financial breakdown
  document.getElementById("docConsultFee").textContent = `₹${(inv.consultFee || 0).toLocaleString("en-IN")}`;
  document.getElementById("docMedicinesTotal").textContent = `₹${(inv.medicinesTotal || 0).toLocaleString("en-IN")}`;

  const otherRow = document.getElementById("docOtherChargesRow");
  if (inv.otherCharges > 0) {
    otherRow.style.display = "table-row";
    document.getElementById("docOtherCharges").textContent = `₹${inv.otherCharges.toLocaleString("en-IN")}`;
  } else {
    otherRow.style.display = "none";
  }

  const discountRow = document.getElementById("docDiscountRow");
  if (inv.discount > 0) {
    discountRow.style.display = "table-row";
    document.getElementById("docDiscount").textContent = `- ₹${inv.discount.toLocaleString("en-IN")}`;
  } else {
    discountRow.style.display = "none";
  }

  document.getElementById("docGrandTotal").textContent = `₹${inv.grandTotal.toLocaleString("en-IN")}`;
  document.getElementById("docAmountPaid").textContent = `₹${inv.amountPaid.toLocaleString("en-IN")}`;
  document.getElementById("docRemainingBalance").textContent = `₹${inv.remainingBalance.toLocaleString("en-IN")}`;

  if (window.lucide) lucide.createIcons();
}

function formatDateIN(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// --------------------------------------------------------------------------
// Save Draft, Approval Workflow, and PDF/Print
// --------------------------------------------------------------------------
document.getElementById("invoiceBackToListBtn").onclick = () => {
  navigateTo("invoices");
};

document.getElementById("invoiceSaveDraftBtn").onclick = () => {
  ACTIVE_INVOICE_STATE.isDraft = true;
  ACTIVE_INVOICE_STATE.isApproved = false;
  saveInvoiceToState(false);
  showToast(`Invoice ${ACTIVE_INVOICE_STATE.id} saved as draft.`, "info");
  updateLiveDocumentPreview();
};

document.getElementById("invoiceSubmitApprovalBtn").onclick = () => {
  ACTIVE_INVOICE_STATE.isDraft = false;
  ACTIVE_INVOICE_STATE.isApproved = false;
  saveInvoiceToState(false);
  showToast(`Invoice ${ACTIVE_INVOICE_STATE.id} submitted for Dr. Suraj D. Panigrahi's approval.`, "info");
  updateLiveDocumentPreview();
};

document.getElementById("invoiceDoctorApproveBtn").onclick = async () => {
  if (!isCurrentUserVerifiedDoctor()) {
    showToast(
      "Access Denied: Only Dr. Suraj D. Panigrahi (Verified Doctor) can approve and finalize invoices. Please use 'Submit for Approval'.",
      "error"
    );
    return;
  }

  try {
    if (ACTIVE_INVOICE_STATE.dbUuid && window.HomeoCareAPI?.isConfigured()) {
      await window.HomeoCareAPI.invoices.doctorApprove(
        ACTIVE_INVOICE_STATE.dbUuid,
        ACTIVE_INVOICE_STATE.doctorNote || "Verified and approved by Dr. Suraj D. Panigrahi"
      );
    }
    ACTIVE_INVOICE_STATE.isDraft = false;
    ACTIVE_INVOICE_STATE.isApproved = true;
    ACTIVE_INVOICE_STATE.approvedBy = "Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)";
    ACTIVE_INVOICE_STATE.approvalTime = new Date().toLocaleString("en-IN");
    saveInvoiceToState(true);
    updateDashboardMetrics();
    updateLiveDocumentPreview();
    showToast(`Invoice ${ACTIVE_INVOICE_STATE.id} approved & finalized by Dr. Suraj D. Panigrahi!`, "success");
  } catch (err) {
    showToast(err.message || "Invoice approval rejected by server security policy.", "error");
  }
};

function saveInvoiceToState(isFinal) {
  const existingIdx = CLINIC_STATE.invoices.findIndex(i => i.id === ACTIVE_INVOICE_STATE.id);
  const snapshot = JSON.parse(JSON.stringify(ACTIVE_INVOICE_STATE));

  if (existingIdx >= 0) {
    CLINIC_STATE.invoices[existingIdx] = snapshot;
  } else {
    CLINIC_STATE.invoices.unshift(snapshot);
  }

  // Also preserve invoice in patient record
  const patient = CLINIC_STATE.patients.find(p => p.id === snapshot.patientId);
  if (patient) {
    if (!patient.invoices) patient.invoices = [];
    const pInvIdx = patient.invoices.findIndex(i => i.id === snapshot.id);
    if (pInvIdx >= 0) patient.invoices[pInvIdx] = snapshot;
    else patient.invoices.unshift(snapshot);

    if (isFinal) {
      patient.history.unshift({
        title: `Medical Receipt Issued (${snapshot.id})`,
        date: formatDateIN(snapshot.date),
        desc: `Amount: ₹${snapshot.grandTotal.toLocaleString("en-IN")} • Status: ${snapshot.paymentStatus} • Approved by Dr. Suraj D. Panigrahi`
      });
    }
  }

  updateDashboardMetrics();
}

// --------------------------------------------------------------------------
// Print & High-Fidelity PDF Export
// --------------------------------------------------------------------------
document.getElementById("previewPrintBtn").onclick = () => {
  window.print();
};

document.getElementById("previewDownloadPdfBtn").onclick = () => {
  const element = document.getElementById("officialInvoiceDocument");
  const invoiceId = ACTIVE_INVOICE_STATE.id || "INVOICE";
  const patientNameClean = (ACTIVE_INVOICE_STATE.patientName || "Patient").replace(/\s+/g, "_");

  showToast(`Generating official PDF for ${invoiceId}...`, "info");

  const opt = {
    margin: [6, 6, 6, 6],
    filename: `Shri_Siddhivinayak_Clinic_${invoiceId}_${patientNameClean}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  if (window.html2pdf) {
    html2pdf().set(opt).from(element).save().then(() => {
      showToast(`Medical invoice PDF downloaded successfully!`, "success");
    }).catch(err => {
      console.error(err);
      window.print();
    });
  } else {
    window.print();
  }
};

window.viewExistingInvoice = function(invoiceId) {
  const inv = CLINIC_STATE.invoices.find(i => i.id === invoiceId);
  if (inv) {
    openInvoiceCreator(inv);
  }
};

window.editExistingDraft = function(invoiceId) {
  const inv = CLINIC_STATE.invoices.find(i => i.id === invoiceId);
  if (inv) {
    openInvoiceCreator(inv);
  }
};

newInvoiceBtn.addEventListener("click", () => openInvoiceCreator());

// ==========================================================================
// 10. Practice Analytics Page (Real Data Only - Zero Invented Metrics)
// ==========================================================================
function renderAnalyticsPage() {
  const patientCount = CLINIC_STATE.patients.length;
  const visitCount = CLINIC_STATE.appointments.length;
  const revenueTotal = CLINIC_STATE.invoices.filter(i => i.status === "Paid").reduce((acc, i) => acc + (i.amount || 0), 0);

  if (patientCount === 0 && visitCount === 0 && revenueTotal === 0) {
    analyticsContainer.innerHTML = `
      <div class="glass-empty-state">
        <div class="empty-state-icon-wrap">
          <i data-lucide="bar-chart-2"></i>
        </div>
        <h3 class="empty-state-title">Analytics not available yet.</h3>
        <p class="empty-state-desc">Statistical analytics and clinical cure indices are generated strictly from authenticated patient visits and follow-up outcomes. No fabricated statistics or simulated percentages are displayed.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Real breakdown from genuine data
  const miasmCounts = {};
  CLINIC_STATE.patients.forEach(p => {
    miasmCounts[p.miasm] = (miasmCounts[p.miasm] || 0) + 1;
  });

  analyticsContainer.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
      <div class="matrix-card">
        <div class="matrix-head"><i data-lucide="pie-chart"></i><span>Miasmatic Distribution</span></div>
        <p class="matrix-body">Calculated from ${patientCount} registered constitutional cases:</p>
        <div class="matrix-tags">
          ${Object.entries(miasmCounts).map(([miasm, count]) => `
            <span class="spec-tag">${miasm}: <strong>${count}</strong> (${Math.round((count / patientCount) * 100)}%)</span>
          `).join("")}
        </div>
      </div>

      <div class="matrix-card">
        <div class="matrix-head"><i data-lucide="wallet"></i><span>Financial Realization</span></div>
        <p class="matrix-body">Realized Revenue: <strong>₹${revenueTotal.toLocaleString("en-IN")}</strong> across ${CLINIC_STATE.invoices.length} invoices generated.</p>
        <div class="matrix-tags">
          <span class="spec-tag mod-better">Paid Invoices: ${CLINIC_STATE.invoices.filter(i => i.status === "Paid").length}</span>
          <span class="spec-tag mod-worse">Pending: ${CLINIC_STATE.invoices.filter(i => i.status === "Pending").length}</span>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

// Notice on unconfigured reference import
importRepertoryNoticeBtn.addEventListener("click", () => {
  showToast("Reference import endpoint will connect to Supabase/authorized repository.", "info");
});

// ==========================================================================
// 11. Modal Intake & Appointments Handling
// ==========================================================================
function openPatientModal() {
  patientModalOverlay.classList.add("active");
  if (window.lucide) lucide.createIcons();
}

function closePatientModal() {
  patientModalOverlay.classList.remove("active");
}

function openSymptomModal() {
  symptomModalOverlay.classList.add("active");
  if (window.lucide) lucide.createIcons();
}

function closeSymptomModal() {
  symptomModalOverlay.classList.remove("active");
}

function openAppointmentModal() {
  if (CLINIC_STATE.patients.length === 0) {
    showToast("Please register a patient first before scheduling an appointment.", "info");
    openPatientModal();
    return;
  }

  aptPatientSelect.innerHTML = CLINIC_STATE.patients
    .map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`)
    .join("");

  appointmentModalOverlay.classList.add("active");
  if (window.lucide) lucide.createIcons();
}

function closeAppointmentModal() {
  appointmentModalOverlay.classList.remove("active");
}

// Action button bindings
quickIntakeBtn.addEventListener("click", openPatientModal);
registerPatientHeroBtn.addEventListener("click", openPatientModal);
registryNewPatientBtn.addEventListener("click", openPatientModal);
casesRegisterBtn.addEventListener("click", openPatientModal);
newAppointmentQuickBtn.addEventListener("click", openAppointmentModal);
bookVisitFooterBtn.addEventListener("click", openAppointmentModal);

patientModalCloseBtn.addEventListener("click", closePatientModal);
patientModalCancelBtn.addEventListener("click", closePatientModal);
patientModalOverlay.addEventListener("click", (e) => {
  if (e.target === patientModalOverlay) closePatientModal();
});

symptomModalCloseBtn.addEventListener("click", closeSymptomModal);
symptomModalCancelBtn.addEventListener("click", closeSymptomModal);
symptomModalOverlay.addEventListener("click", (e) => {
  if (e.target === symptomModalOverlay) closeSymptomModal();
});

aptModalCloseBtn.addEventListener("click", closeAppointmentModal);
aptModalCancelBtn.addEventListener("click", closeAppointmentModal);
appointmentModalOverlay.addEventListener("click", (e) => {
  if (e.target === appointmentModalOverlay) closeAppointmentModal();
});

// Patient Registration Form Submit
patientRegistrationForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("pRegName").value.trim();
  const phone = document.getElementById("pRegPhone").value.trim();
  const age = document.getElementById("pRegAge").value.trim();
  const gender = document.getElementById("pRegGender").value;
  const miasm = document.getElementById("pRegMiasm").value;
  const chiefComplaint = document.getElementById("pRegChiefComplaint").value.trim();
  const constitution = document.getElementById("pRegConstitution").value.trim();

  const newPatientId = `SSC-${new Date().getFullYear()}-${1001 + CLINIC_STATE.patients.length}`;
  const todayStr = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

  const newPatient = {
    id: newPatientId,
    name,
    phone,
    age,
    gender,
    miasm,
    chiefComplaint,
    constitution,
    prescription: "",
    registeredDate: todayStr,
    rubrics: [],
    history: [
      {
        title: "Initial Case Registration",
        date: todayStr,
        desc: `Registered by Clinic Staff for Dr. Suraj D. Panigrahi. Chief complaint: ${chiefComplaint}`
      }
    ]
  };

  CLINIC_STATE.patients.push(newPatient);
  CLINIC_STATE.selectedPatientId = newPatientId;

  patientRegistrationForm.reset();
  closePatientModal();
  updateDashboardMetrics();
  renderPatientWorkspace();

  showToast(`Patient "${name}" registered successfully with ID ${newPatientId}.`, "success");
});

// Add Symptom Rubric to Active Patient
symptomForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const rubric = document.getElementById("rubricInput").value.trim();
  const intensity = document.getElementById("intensitySelect").value;
  const modality = document.getElementById("modalitiesInput").value.trim();
  const remedies = document.getElementById("candidateRemedyInput").value.trim();

  const activePatient = CLINIC_STATE.patients.find(p => p.id === CLINIC_STATE.selectedPatientId);
  if (!activePatient) return;

  const todayStr = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

  activePatient.rubrics.push({
    rubric,
    intensity,
    modality,
    remedies
  });

  activePatient.history.unshift({
    title: `Rubric Logged: ${rubric}`,
    date: todayStr,
    desc: `Intensity: ${intensity} • Modality: ${modality || 'None'} • Candidate Remedies: ${remedies || 'Under review'}`
  });

  symptomForm.reset();
  closeSymptomModal();
  renderPatientWorkspace();
  showToast(`Rubric "${rubric}" added to case record.`, "success");
});

// Schedule Appointment Form Submit
appointmentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const patientId = document.getElementById("aptPatientSelect").value;
  const time = document.getElementById("aptTimeInput").value;
  const type = document.getElementById("aptTypeSelect").value;

  const patient = CLINIC_STATE.patients.find(p => p.id === patientId);
  if (!patient) return;

  CLINIC_STATE.appointments.push({
    patientId,
    patientName: patient.name,
    time: formatTime12h(time),
    type
  });

  appointmentForm.reset();
  closeAppointmentModal();
  updateDashboardMetrics();
  renderAppointments();

  showToast(`Appointment scheduled for ${patient.name} at ${formatTime12h(time)}.`, "success");
});

function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour.toString().padStart(2, "0")}:${m} ${ampm}`;
}

// Patient dropdown switcher
patientSelect.addEventListener("change", (e) => {
  CLINIC_STATE.selectedPatientId = e.target.value;
  renderPatientWorkspace();
});

// Save Doctor Note
saveNoteBtn.addEventListener("click", () => {
  const note = doctorNotesInput.value.trim();
  if (!note) {
    showToast("Please enter an observation before saving.", "info");
    return;
  }
  const activePatient = CLINIC_STATE.patients.find(p => p.id === CLINIC_STATE.selectedPatientId);
  if (activePatient) {
    const todayStr = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
    activePatient.history.unshift({
      title: "Doctor Clinical Note",
      date: todayStr,
      desc: note
    });
    renderTimeline(activePatient);
    doctorNotesInput.value = "";
    showToast("Clinical note recorded in patient history.", "success");
  }
});

// Quick symptom chip click
document.querySelectorAll(".symptom-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    const rubricText = chip.getAttribute("data-rubric");
    doctorNotesInput.value = doctorNotesInput.value
      ? `${doctorNotesInput.value}\n[Rubric]: ${rubricText}`
      : `[Rubric]: ${rubricText}`;
  });
});

// Global Search (Searches across all pages and records)
globalSearch.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const query = globalSearch.value.trim().toLowerCase();
    if (!query) return;

    const matched = CLINIC_STATE.patients.find(p =>
      p.name.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      p.phone.toLowerCase().includes(query)
    );

    if (matched) {
      CLINIC_STATE.selectedPatientId = matched.id;
      navigateTo("dashboard");
      renderPatientWorkspace();
      showToast(`Located patient: ${matched.name} (${matched.id})`, "success");
    } else {
      showToast(`No patient record found for "${query}".`, "info");
    }
  }
});

// Cmd/Ctrl + K shortcut
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    globalSearch.focus();
  }
});

// Mobile menu
if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.toggle("mobile-open");
  });
}

// ==========================================================================
// 12. Toast Notifications (Action-based only, not navigation)
// ==========================================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconName = type === "success" ? "check-circle-2" : (type === "error" ? "alert-circle" : "info");
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    try { window.lucide.createIcons(); } catch (_) {}
  }

  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s forwards";
    setTimeout(() => {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, 3200);
}

// ==========================================================================
// 13. PHASE 6 & 7: REAL SUPABASE AUTHENTICATION & CAPTCHA SECURITY SYSTEM
// ==========================================================================

const AUTH_CONFIG = {
  // Cached session metadata in sessionStorage (never stores passwords or secret keys)
  sessionKey: "homeocare_auth_session"
};

// Working CAPTCHA state backed by server-issued single-use challengeId (`GET /api/auth/captcha`)
let CURRENT_CAPTCHA = {
  challengeId: "",
  text: "",
  generatedAt: 0,
  expiryMs: 180000 // 3 minutes validity
};

function getAuthenticatedUser() {
  try {
    const raw = sessionStorage.getItem(AUTH_CONFIG.sessionKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function isCurrentUserVerifiedDoctor() {
  const user = getAuthenticatedUser();
  if (!user) return false;
  if (user.dbRole) return user.dbRole === "doctor";
  return Boolean(user.isDoctor || (user.role && user.role.includes("Dr. Suraj")));
}

// ==========================================================================
// PRESENTATION DEMO MODE (Monday, November 2, 2026)
// Safe, isolated demo mode using entirely fictional sample records.
// Zero Supabase database operations; pure in-memory clinical presentation.
// ==========================================================================
const PRESENTATION_CONFIG = {
  enableDemoMode: true,
  demoLabel: "Demo Mode (Sample Data)"
};

function getPresentationDemoData() {
  return {
    clinicName: "Shri Siddhivinayak Clinic",
    doctor: "Dr. Suraj D. Panigrahi",
    qualification: "B.H.M.S. (Mum.)",
    staffRole: "Dr. Suraj D. Panigrahi [Presentation Demo]",
    patients: [
      {
        id: "HOM-2026-001",
        name: "Aarav Sharma [Sample]",
        age: 34,
        gender: "Male",
        phone: "+91 98201 00001",
        address: "Dadar West, Mumbai",
        chiefComplaint: "Chronic Dyspepsia & Right-sided Hypochondriac Fullness with Performance Anxiety",
        modalities: "Worse: 4 PM - 8 PM, cold food, tight collar. Better: warm drinks, gentle motion. Desires sweets.",
        similimum: "Lycopodium Clavatum 200C — 4 pills twice weekly, followed by Placebo 30 daily.",
        miasm: "Psora-Sycosis",
        createdAt: "2026-10-12T10:00:00.000Z",
        rubrics: [
          {
            rubric: "Stomach - Fullness, early satiety after few mouthfuls",
            intensity: "High / Characteristic",
            modality: "< Cold eating, > Warm tea",
            remedies: "Lyc., Chin., Nux-v., Carb-v.",
            date: "Oct 12, 2026"
          },
          {
            rubric: "Mind - Anticipatory anxiety before meetings, lack of self-confidence",
            intensity: "Moderate / Guiding",
            modality: "< Stress, > When speaking begins",
            remedies: "Lyc., Gels., Sil., Arg-n.",
            date: "Oct 12, 2026"
          },
          {
            rubric: "Abdomen - Flatulence, rumbling in right lower quadrant",
            intensity: "High / Characteristic",
            modality: "< 4-8 PM, > Eructations",
            remedies: "Lyc., Aloe, Pod.",
            date: "Oct 26, 2026"
          }
        ],
        timeline: [
          {
            type: "Consultation Intake",
            date: "Oct 12, 2026",
            title: "Constitutional Case Taking",
            desc: "Presenting with 8 months of epigastric fullness and anticipatory anxiety. Detailed generals and modalities recorded.",
            status: "Checked"
          },
          {
            type: "Remedy Formulation",
            date: "Oct 12, 2026",
            title: "Classical Similimum Prescribed",
            desc: "Prescribed Lycopodium 200C (2 doses/week) based on totality of symptoms.",
            status: "Checked"
          },
          {
            type: "Clinical Follow-up",
            date: "Oct 26, 2026",
            title: "Two-Week Progress Review",
            desc: "Bloating reduced by 60%. Early satiety improving steadily. Bowel habits regularized.",
            status: "In-Progress"
          }
        ],
        doctorNotes: "Constitutional response is very favorable. Continue current potency without repetition for 3 weeks."
      },
      {
        id: "HOM-2026-002",
        name: "Priya Patel [Sample]",
        age: 28,
        gender: "Female",
        phone: "+91 98202 00002",
        address: "Bandra, Mumbai",
        chiefComplaint: "Recurrent Allergic Rhinitis with Mild Wandering Arthralgia",
        modalities: "Worse: stuffy warm room, evening, fatty foods. Better: open cool air, gentle walking, sympathy.",
        similimum: "Pulsatilla Nigricans 30C — 4 pills alternate mornings for 14 days.",
        miasm: "Sycosis",
        createdAt: "2026-10-18T11:15:00.000Z",
        rubrics: [
          {
            rubric: "Nose - Coryza, bland thick yellowish-green discharge",
            intensity: "High / Characteristic",
            modality: "< Warm room, > Open cool air",
            remedies: "Puls., Kali-s., All-c.",
            date: "Oct 18, 2026"
          },
          {
            rubric: "Extremities - Wandering pains shifting rapidly from joint to joint",
            intensity: "Moderate / Guiding",
            modality: "< Evening rest, > Slow motion",
            remedies: "Puls., Kali-bi., Lac-c.",
            date: "Oct 18, 2026"
          }
        ],
        timeline: [
          {
            type: "Consultation Intake",
            date: "Oct 18, 2026",
            title: "Intake & Repertorization",
            desc: "Nasal catarrh with mild migratory joint discomfort. Emotional disposition mild and tearful.",
            status: "Checked"
          },
          {
            type: "Remedy Formulation",
            date: "Oct 19, 2026",
            title: "Similimum Dispensed",
            desc: "Dispensed Pulsatilla 30C globules with dietary advice to avoid rich foods.",
            status: "Checked"
          }
        ],
        doctorNotes: "Nasal discharge clearing rapidly. Advised patient to maintain daily open-air walks."
      },
      {
        id: "HOM-2026-003",
        name: "Vikram Malhotra [Sample]",
        age: 52,
        gender: "Male",
        phone: "+91 98203 00003",
        address: "Colaba, Mumbai",
        chiefComplaint: "Executive Dyspepsia, Sour Pyrosis & Insomnia from Mental Overwork",
        modalities: "Worse: early morning (wakes at 3 AM), excessive coffee, spices, stress. Better: warmth, undisturbed rest.",
        similimum: "Nux Vomica 1M — Single dry dose on tongue at bedtime, followed by Passiflora Q 10 drops at night.",
        miasm: "Psora",
        createdAt: "2026-10-24T14:30:00.000Z",
        rubrics: [
          {
            rubric: "Sleep - Sleeplessness waking at 3 AM with crowding business ideas",
            intensity: "High / Characteristic",
            modality: "< Coffee, mental fatigue",
            remedies: "Nux-v., Coff., Lyc.",
            date: "Oct 24, 2026"
          },
          {
            rubric: "Stomach - Sour pyrosis, bitter eructations after dietary indiscretion",
            intensity: "Moderate / Guiding",
            modality: "< Fast food, stimulants",
            remedies: "Nux-v., Iris, Robin.",
            date: "Oct 24, 2026"
          }
        ],
        timeline: [
          {
            type: "Consultation Intake",
            date: "Oct 24, 2026",
            title: "Executive Case Intake",
            desc: "Chronic corporate stress, stimulant reliance, and disturbed sleep architecture.",
            status: "Checked"
          }
        ],
        doctorNotes: "Administered Nux Vomica 1M single dose in dispensary. Follow up in 10 days."
      }
    ],
    appointments: [
      {
        id: "APT-2026-001",
        patientId: "HOM-2026-001",
        patientName: "Aarav Sharma [Sample]",
        patientPhone: "+91 98201 00001",
        date: "2026-11-02",
        time: "10:30",
        type: "Follow-up Review",
        doctor: "Dr. Suraj D. Panigrahi",
        status: "Confirmed",
        notes: "Evaluate Lycopodium 200C constitutional response"
      },
      {
        id: "APT-2026-002",
        patientId: "HOM-2026-002",
        patientName: "Priya Patel [Sample]",
        patientPhone: "+91 98202 00002",
        date: "2026-11-02",
        time: "11:45",
        type: "Remedy Evaluation",
        doctor: "Dr. Suraj D. Panigrahi",
        status: "Confirmed",
        notes: "Nasal allergy audit"
      },
      {
        id: "APT-2026-003",
        patientId: "HOM-2026-003",
        patientName: "Vikram Malhotra [Sample]",
        patientPhone: "+91 98203 00003",
        date: "2026-11-02",
        time: "16:30",
        type: "Case Review",
        doctor: "Dr. Suraj D. Panigrahi",
        status: "Confirmed",
        notes: "Sleep and dyspepsia follow-up"
      }
    ],
    medicines: [
      { name: "Lycopodium Clavatum", potency: "200C", form: "Dilution", qty: 15 },
      { name: "Pulsatilla Nigricans", potency: "30C", form: "Globules", qty: 22 },
      { name: "Nux Vomica", potency: "1M", form: "Dilution", qty: 8 },
      { name: "Arnica Montana", potency: "30C", form: "Globules", qty: 30 },
      { name: "Calcarea Carbonica", potency: "200C", form: "Trituration", qty: 12 },
      { name: "Passiflora Incarnata", potency: "Mother Tincture (Q)", form: "Liquid", qty: 18 },
      { name: "Silicea", potency: "6X", form: "Biochemic Tablets", qty: 25 }
    ],
    invoices: [
      {
        id: "INV-2026-001",
        patientId: "HOM-2026-001",
        patientName: "Aarav Sharma [Sample]",
        patientPhone: "+91 98201 00001",
        patientAge: 34,
        patientGender: "Male",
        patientAddress: "Dadar West, Mumbai",
        doctorName: "Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)",
        date: "2026-10-26",
        consultDate: "2026-10-26",
        dueDate: "2026-10-26",
        followupDate: "2026-11-09",
        status: "Paid",
        paymentStatus: "Paid",
        isDraft: false,
        isApproved: true,
        approvedBy: "Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)",
        approvalTime: "26/10/2026, 11:30:00",
        amount: 1200,
        paidAmount: 1200,
        amountPaid: 1200,
        remainingBalance: 0,
        subtotal: 1200,
        grandTotal: 1200,
        consultFee: 800,
        medicinesTotal: 400,
        otherCharges: 0,
        discount: 0,
        tax: 0,
        paymentMethod: "UPI / Digital",
        doctorNote: "Constitutional case evaluation and 200C prescription dispensed.",
        chiefComplaint: "Chronic Dyspepsia & Right-sided Hypochondriac Fullness",
        diagnosis: "Dyspeptic Psora-Sycosis (Similimum: Lycopodium)",
        treatmentPlan: "Lycopodium Clavatum 200C + Placebo 30",
        consultDuration: "45 Mins",
        treatmentDurationDays: 30,
        showClinicalDetails: true,
        items: [
          { desc: "Comprehensive Constitutional Case Consultation", potency: "Classical Intake", qty: 1, days: 30, rate: 800, total: 800 },
          { desc: "Lycopodium Clavatum (200C) + Placebo Vials", potency: "200C / 30", qty: 1, days: 30, rate: 400, total: 400 }
        ]
      },
      {
        id: "INV-2026-002",
        patientId: "HOM-2026-002",
        patientName: "Priya Patel [Sample]",
        patientPhone: "+91 98202 00002",
        patientAge: 28,
        patientGender: "Female",
        patientAddress: "Andheri West, Mumbai",
        doctorName: "Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)",
        date: "2026-10-28",
        consultDate: "2026-10-28",
        dueDate: "2026-10-28",
        followupDate: "2026-11-12",
        status: "Paid",
        paymentStatus: "Paid",
        isDraft: false,
        isApproved: true,
        approvedBy: "Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)",
        approvalTime: "28/10/2026, 12:15:00",
        amount: 850,
        paidAmount: 850,
        amountPaid: 850,
        remainingBalance: 0,
        subtotal: 850,
        grandTotal: 850,
        consultFee: 500,
        medicinesTotal: 350,
        otherCharges: 0,
        discount: 0,
        tax: 0,
        paymentMethod: "Cash",
        doctorNote: "Follow-up consultation and Pulsatilla 30C dispensed.",
        chiefComplaint: "Perennial Allergic Rhinitis & Sinus Congestion",
        diagnosis: "Hypersensitive Rhinitis (Similimum: Pulsatilla)",
        treatmentPlan: "Pulsatilla Nigricans 30C Globules",
        consultDuration: "30 Mins",
        treatmentDurationDays: 14,
        showClinicalDetails: true,
        items: [
          { desc: "Clinical Follow-up Consultation", potency: "Follow-up", qty: 1, days: 14, rate: 500, total: 500 },
          { desc: "Pulsatilla Nigricans (30C) Globules Dispensed", potency: "30C", qty: 1, days: 14, rate: 350, total: 350 }
        ]
      },
      {
        id: "INV-2026-003",
        patientId: "HOM-2026-003",
        patientName: "Vikram Malhotra [Sample]",
        patientPhone: "+91 98203 00003",
        patientAge: 52,
        patientGender: "Male",
        patientAddress: "Bandra Kurla Complex, Mumbai",
        doctorName: "Dr. Suraj D. Panigrahi, B.H.M.S. (Mum.)",
        date: "2026-10-30",
        consultDate: "2026-10-30",
        dueDate: "2026-11-02",
        followupDate: "2026-11-16",
        status: "Pending",
        paymentStatus: "Pending",
        isDraft: false,
        isApproved: false,
        approvedBy: null,
        approvalTime: null,
        amount: 1500,
        paidAmount: 0,
        amountPaid: 0,
        remainingBalance: 1500,
        subtotal: 1500,
        grandTotal: 1500,
        consultFee: 1000,
        medicinesTotal: 500,
        otherCharges: 0,
        discount: 0,
        tax: 0,
        paymentMethod: "Bank Transfer",
        doctorNote: "Initial executive case workup, Nux Vomica 1M and Passiflora Q mother tincture.",
        chiefComplaint: "Insomnia with Gastric Irritability & Sedentary Stress",
        diagnosis: "Executive Stress Dyspepsia (Similimum: Nux Vomica)",
        treatmentPlan: "Nux Vomica 1M + Passiflora Incarnata Q",
        consultDuration: "60 Mins",
        treatmentDurationDays: 30,
        showClinicalDetails: true,
        items: [
          { desc: "Executive Chronic Consultation & Repertorization", potency: "Detailed Intake", qty: 1, days: 30, rate: 1000, total: 1000 },
          { desc: "Passiflora Incarnata Mother Tincture (30 ml)", potency: "Q (Mother Tincture)", qty: 1, days: 30, rate: 500, total: 500 }
        ]
      }
    ],
    pendingApprovals: 1,
    completedCases: 2,
    notificationsCount: 1,
    selectedPatientId: "HOM-2026-001"
  };
}



function setAuthenticatedUser(user) {
  sessionStorage.setItem(AUTH_CONFIG.sessionKey, JSON.stringify(user));
  applyAuthenticatedSession(user);
}

async function logoutUser() {
  const currentUser = getAuthenticatedUser();
  sessionStorage.removeItem(AUTH_CONFIG.sessionKey);

  // If real Supabase session, sign out cleanly
  if (currentUser) {
    try {
      if (window.HomeoCareAPI?.auth?.logout) {
        await window.HomeoCareAPI.auth.logout();
      }
    } catch (_) {
      // Offline fallback
    }
  }

  // Reset CLINIC_STATE baseline
  CLINIC_STATE.patients = [];
  CLINIC_STATE.appointments = [];
  CLINIC_STATE.invoices = [];
  CLINIC_STATE.medicines = [];
  CLINIC_STATE.pendingApprovals = 0;
  CLINIC_STATE.completedCases = 0;
  CLINIC_STATE.selectedPatientId = null;

  const authEntrance = document.getElementById("authEntrance");
  const appShell = document.getElementById("appShell");
  if (authEntrance) authEntrance.style.display = "flex";
  if (appShell) appShell.style.display = "none";

  // Reset auth forms & generate fresh CAPTCHA
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  if (loginForm) loginForm.reset();
  if (registerForm) registerForm.reset();
  setAuthTab("login");
  generateNewCaptcha();
  showToast("Logged out securely. Supabase session terminated.", "info");
}

function applyAuthenticatedSession(user) {
  const authEntrance = document.getElementById("authEntrance");
  const appShell = document.getElementById("appShell");
  if (authEntrance) authEntrance.style.display = "none";
  if (appShell) appShell.style.display = "flex";

  // Update practitioner footer with verified staff_profiles identity
  const staffRole = document.getElementById("staffRole");
  const practitionerName = document.getElementById("practitionerName");
  const practitionerInitials = document.getElementById("practitionerAvatarInitials");

  if (user) {
    const isDoc = user.dbRole === "doctor" || (user.role && user.role.includes("Dr. Suraj"));
    CLINIC_STATE.staffRole = `${user.role} (Logged in)`;
    if (staffRole) {
      staffRole.textContent = `${user.role} (Logged in: ${user.username})`;
    }
    if (isDoc) {
      if (practitionerName) practitionerName.textContent = user.name || "Dr. Suraj D. Panigrahi";
      if (practitionerInitials) practitionerInitials.textContent = "SP";
    } else {
      const displayName = user.name || user.username.toUpperCase();
      if (practitionerName) practitionerName.textContent = displayName;
      if (practitionerInitials) {
        practitionerInitials.textContent = user.username.substring(0, 2).toUpperCase();
      }
    }

    // Reflect role permissions on Doctor-Only Invoice Approval button
    const approveBtn = document.getElementById("invoiceDoctorApproveBtn");
    if (approveBtn) {
      approveBtn.title = isDoc
        ? "Verified Doctor: Authorize and finalize invoice"
        : "Doctor-only action: Receptionists & Admins must use 'Submit for Approval'";
      approveBtn.style.opacity = isDoc ? "1" : "0.65";
    }
  }

  // Update metrics and render all module workspaces
  updateDashboardMetrics();
  renderPatientWorkspace();
  renderPatientRegistry();
  renderPotencyDispensary();
  renderSchedulesPage();
  renderInvoicesPage();
  renderActiveCaseRecord();
  renderAnalyticsPage();

  // Refresh icons and page routing
  refreshIcons();
  const initialHash = window.location.hash.replace("#", "") || "dashboard";
  navigateTo(initialHash, false);
}

// --------------------------------------------------------------------------
// Administrator Staff Approval Oversight
// --------------------------------------------------------------------------
async function checkPendingStaffApprovals() {
  const user = getAuthenticatedUser();
  if (!user || (!user.isDoctor && user.role !== "doctor")) return;

  try {
    if (window.HomeoCareAPI?.auth?.getPendingStaff) {
      const data = await window.HomeoCareAPI.auth.getPendingStaff();
      if (data?.ok && Array.isArray(data.pendingStaff) && data.pendingStaff.length > 0) {
        renderPendingStaffApprovalsWidget(data.pendingStaff);
      } else {
        removePendingStaffApprovalsWidget();
      }
    }
  } catch (_) {}
}

function renderPendingStaffApprovalsWidget(pendingList) {
  let widget = document.getElementById("pendingStaffApprovalsWidget");
  if (!widget) {
    widget = document.createElement("div");
    widget.id = "pendingStaffApprovalsWidget";
    widget.className = "glass-card";
    widget.style.margin = "1rem 2rem";
    widget.style.padding = "1.25rem 1.5rem";
    widget.style.border = "1px solid var(--peach-400)";
    widget.style.background = "rgba(255, 140, 66, 0.08)";
    widget.style.borderRadius = "12px";

    const mainContent = document.querySelector(".main-content") || document.querySelector("main") || document.getElementById("appShell");
    if (mainContent) {
      mainContent.insertBefore(widget, mainContent.firstChild);
    }
  }

  widget.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <i data-lucide="shield-alert" style="color: var(--peach-400);"></i>
        <strong style="color: var(--text-main); font-size: 15px;">Pending Staff Authorizations (${pendingList.length})</strong>
      </div>
      <span style="font-size: 12px; color: var(--text-muted);">Clinic Doctor / Administrator Authorization Required</span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${pendingList.map(s => `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 10px 14px; border-radius: 8px; flex-wrap: wrap; gap: 10px;">
          <div>
            <strong style="color: var(--text-main); font-size: 14px;">${escapeHtml(s.username)}</strong>
            <span style="font-size: 12px; color: var(--text-muted); margin-left: 8px;">Role: Receptionist</span>
            <span style="font-size: 11px; color: var(--amber-warn); margin-left: 8px; padding: 2px 6px; background: rgba(245,158,11,0.15); border-radius: 4px;">Authorization Pending</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-primary" style="padding: 4px 12px; font-size: 12px;" onclick="handleApproveStaff('${escapeHtml(s.username)}')">
              Approve as Receptionist
            </button>
            <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 12px;" onclick="handleRejectStaff('${escapeHtml(s.username)}')">
              Reject
            </button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
  refreshIcons();
}

function removePendingStaffApprovalsWidget() {
  const widget = document.getElementById("pendingStaffApprovalsWidget");
  if (widget) widget.remove();
}

window.handleApproveStaff = async function(username) {
  try {
    const res = await window.HomeoCareAPI.auth.approveStaff(username);
    showToast(res.message || `Staff member "${username}" approved successfully as Receptionist!`, "success");
    await checkPendingStaffApprovals();
  } catch (err) {
    showToast(err.message || "Approval failed.", "error");
  }
};

window.handleRejectStaff = async function(username) {
  try {
    const res = await window.HomeoCareAPI.auth.rejectStaff(username);
    showToast(res.message || `Registration for "${username}" was rejected.`, "info");
    await checkPendingStaffApprovals();
  } catch (err) {
    showToast(err.message || "Rejection failed.", "error");
  }
};

// --------------------------------------------------------------------------
// Auth Tabs Switcher: Login vs Register
// --------------------------------------------------------------------------
function setAuthTab(mode) {
  const tabLoginBtn = document.getElementById("tabLoginBtn");
  const tabRegisterBtn = document.getElementById("tabRegisterBtn");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const alertBox = document.getElementById("authAlertBox");

  if (alertBox) alertBox.style.display = "none";

  if (mode === "login") {
    if (tabLoginBtn) tabLoginBtn.classList.add("active");
    if (tabRegisterBtn) tabRegisterBtn.classList.remove("active");
    if (loginForm) loginForm.style.display = "flex";
    if (registerForm) registerForm.style.display = "none";
  } else {
    if (tabLoginBtn) tabLoginBtn.classList.remove("active");
    if (tabRegisterBtn) tabRegisterBtn.classList.add("active");
    if (loginForm) loginForm.style.display = "none";
    if (registerForm) registerForm.style.display = "flex";
    generateNewCaptcha();
  }

  refreshIcons();
}

// --------------------------------------------------------------------------
// Password Visibility Toggles
// --------------------------------------------------------------------------
function setupPasswordToggle(inputId, toggleBtnId, eyeIconId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(toggleBtnId);
  if (!input || !btn) return;

  btn.addEventListener("click", () => {
    const isPass = input.type === "password";
    input.type = isPass ? "text" : "password";
    btn.innerHTML = isPass ? `<i data-lucide="eye-off"></i>` : `<i data-lucide="eye"></i>`;
    refreshIcons();
  });
}

// --------------------------------------------------------------------------
// Common & Easily Guessed Password Denylist
// --------------------------------------------------------------------------
const COMMONLY_USED_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "password", "passphrase",
  "password123", "password1", "admin123", "administrator", "clinic123",
  "homeocare", "homeocare123", "homeopathy", "doctor123", "reception123",
  "qwerty123", "qwertyuiop", "welcome1", "welcome123", "letmein123",
  "iloveyou1", "sunshine1", "monkey123", "dragon123", "master123",
  "shadow123", "football1", "trustno1", "suraj123", "panigrahi"
]);

function isCommonPassword(password) {
  if (!password) return false;
  const clean = String(password).trim().toLowerCase();
  return COMMONLY_USED_PASSWORDS.has(clean);
}

// --------------------------------------------------------------------------
// Password Strength Meter & Passphrase Validator (Min 8 Chars)
// --------------------------------------------------------------------------
function evaluatePasswordStrength(password) {
  const fill = document.getElementById("strengthBarFill");
  const text = document.getElementById("strengthText");
  if (!fill || !text) return;

  if (!password) {
    fill.style.width = "0%";
    text.textContent = "Password must be at least 8 characters";
    text.style.color = "var(--text-muted)";
    return;
  }

  if (isCommonPassword(password)) {
    fill.style.width = "20%";
    fill.style.background = "var(--red-accent)";
    text.textContent = "Commonly used password - easily compromised";
    text.style.color = "var(--red-accent)";
    return;
  }

  if (password.length < 8) {
    const pct = Math.min(25, Math.round((password.length / 8) * 25));
    fill.style.width = `${pct}%`;
    fill.style.background = "var(--red-accent)";
    text.textContent = `Too short (${password.length}/8 chars) - Min 8 required`;
    text.style.color = "var(--red-accent)";
    return;
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 3) {
    fill.style.width = "40%";
    fill.style.background = "var(--amber-warn)";
    text.textContent = "Fair - Add uppercase, digits & symbols";
    text.style.color = "var(--amber-warn)";
  } else if (score <= 5) {
    fill.style.width = "75%";
    fill.style.background = "var(--peach-400)";
    text.textContent = "Good password (suitable for clinic access)";
    text.style.color = "var(--peach-400)";
  } else {
    fill.style.width = "100%";
    fill.style.background = "var(--emerald-cure)";
    text.textContent = "Very Strong passphrase / high security";
    text.style.color = "var(--emerald-cure)";
  }
}

// --------------------------------------------------------------------------
// Random Text CAPTCHA System (Server-Grade Canvas Rendering)
// Avoids confusing characters: O, 0, I, 1
// --------------------------------------------------------------------------
const CAPTCHA_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function generateNewCaptcha() {
  try {
    if (window.HomeoCareAPI?.auth?.fetchServerCaptcha) {
      const serverChallenge = await window.HomeoCareAPI.auth.fetchServerCaptcha();
      if (serverChallenge && serverChallenge.challengeId && serverChallenge.challengeText) {
        CURRENT_CAPTCHA = {
          challengeId: serverChallenge.challengeId,
          text: serverChallenge.challengeText,
          generatedAt: Date.now(),
          expiryMs: serverChallenge.expiryMs || 180000
        };
        drawCaptchaChallenge();
        return;
      }
    }
  } catch (_) {
    // Fallback if server endpoint is temporarily unreachable
  }

  let challenge = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * CAPTCHA_CHARSET.length);
    challenge += CAPTCHA_CHARSET[idx];
  }

  CURRENT_CAPTCHA = {
    challengeId: "",
    text: challenge,
    generatedAt: Date.now(),
    expiryMs: 180000
  };

  drawCaptchaChallenge();
}

function drawCaptchaChallenge() {
  const canvas = document.getElementById("captchaCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const isLight = htmlRoot.getAttribute("data-theme") === "light";

  // Clean canvas
  ctx.clearRect(0, 0, w, h);

  // Background gradient tint
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  if (isLight) {
    bgGrad.addColorStop(0, "#ffe8dc");
    bgGrad.addColorStop(1, "#ffd8c4");
  } else {
    bgGrad.addColorStop(0, "rgba(40, 32, 45, 0.9)");
    bgGrad.addColorStop(1, "rgba(25, 20, 32, 0.9)");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle diagonal noise lines
  ctx.lineWidth = 1.2;
  for (let i = -w; i < w * 2; i += 14) {
    ctx.strokeStyle = isLight ? "rgba(152, 85, 90, 0.22)" : "rgba(255, 208, 186, 0.18)";
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
  }

  // Draw 6 characters with distinct rotation and high contrast
  const charWidth = w / 6;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  for (let i = 0; i < CURRENT_CAPTCHA.text.length; i++) {
    const char = CURRENT_CAPTCHA.text[i];
    ctx.save();

    const x = charWidth * i + charWidth / 2;
    const y = h / 2 + (Math.random() * 4 - 2);
    const angle = (Math.random() * 0.35 - 0.175); // -10 to +10 degrees

    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.font = "bold 24px 'Plus Jakarta Sans', monospace";
    ctx.fillStyle = isLight ? "#402B31" : "#FFF4EF";
    ctx.shadowColor = isLight ? "rgba(152, 85, 90, 0.4)" : "rgba(255, 208, 186, 0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText(char, 0, 0);

    ctx.restore();
  }
}

function showAuthAlert(message, type = "error") {
  const alertBox = document.getElementById("authAlertBox");
  if (!alertBox) return;
  alertBox.className = `auth-alert-message ${type}`;
  alertBox.textContent = message;
  alertBox.style.display = "flex";
}

// --------------------------------------------------------------------------
// Form Event Handlers: Real Supabase Login & Invite-Gated Registration
// --------------------------------------------------------------------------
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    try {
      window.lucide.createIcons();
    } catch (_) {}
  }
}

function setupAuthForms() {
  const tabLoginBtn = document.getElementById("tabLoginBtn");
  const tabRegisterBtn = document.getElementById("tabRegisterBtn");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const captchaRefreshBtn = document.getElementById("captchaRefreshBtn");
  const logoutSidebarBtn = document.getElementById("logoutSidebarBtn");

  if (tabLoginBtn) tabLoginBtn.onclick = () => setAuthTab("login");
  if (tabRegisterBtn) tabRegisterBtn.onclick = () => setAuthTab("register");
  if (captchaRefreshBtn) captchaRefreshBtn.onclick = () => generateNewCaptcha();
  if (logoutSidebarBtn) logoutSidebarBtn.onclick = () => logoutUser();

  setupPasswordToggle("loginPassword", "loginPasswordToggle", "loginEyeIcon");
  setupPasswordToggle("regPassword", "regPasswordToggle", "regEyeIcon");
  setupPasswordToggle("regConfirmPassword", "regConfirmPasswordToggle", "regConfirmEyeIcon");

  const regPassInput = document.getElementById("regPassword");
  if (regPassInput) {
    regPassInput.oninput = (e) => evaluatePasswordStrength(e.target.value);
  }

  const regConfirmInput = document.getElementById("regConfirmPassword");
  const confirmMsg = document.getElementById("confirmValidationMsg");
  if (regConfirmInput && confirmMsg) {
    const checkMatch = () => {
      const p1 = regPassInput ? regPassInput.value : "";
      const p2 = regConfirmInput.value;
      if (p2 && p1 !== p2) {
        confirmMsg.textContent = "Passwords do not match";
        confirmMsg.style.color = "var(--red-accent)";
      } else if (p2 && p1 === p2) {
        confirmMsg.textContent = "Passwords match ✓";
        confirmMsg.style.color = "var(--emerald-cure)";
      } else {
        confirmMsg.textContent = "";
      }
    };
    regConfirmInput.oninput = checkMatch;
    if (regPassInput) regPassInput.addEventListener("input", checkMatch);
  }

  // Handle Real Supabase Login Submit (Username + Password)
  if (loginForm) {
    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById("authAlertBox");
      if (alertBox) {
        alertBox.style.display = "none";
        alertBox.textContent = "";
      }
      const identifier = document.getElementById("loginUsername").value.trim();
      const password = document.getElementById("loginPassword").value;
      const submitBtn = document.getElementById("loginSubmitBtn");

      if (!identifier || !password) {
        showAuthAlert("Please enter both username and password.", "error");
        return;
      }

      if (!window.HomeoCareAPI || !window.HomeoCareAPI.isConfigured()) {
        showAuthAlert("Supabase is not configured. Please check SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env.");
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      try {
        const authenticatedUser = await window.HomeoCareAPI.auth.login(identifier, password);
        setAuthenticatedUser(authenticatedUser);
        showToast(`Welcome back, ${authenticatedUser.name}!`, "success");
      } catch (err) {
        const msg =
          err?.message === "Invalid login credentials"
            ? "Invalid username or password. Please verify your credentials."
            : err?.message || "Authentication failed. Please verify your credentials.";
        showAuthAlert(msg, "error");
        showToast("Login failed.", "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    };
  }

  // Handle Real Supabase Registration Submit (Username + Password + Confirm Password + CAPTCHA)
  if (registerForm) {
    registerForm.onsubmit = async (e) => {
      e.preventDefault();
      const alertBox = document.getElementById("authAlertBox");
      if (alertBox) {
        alertBox.style.display = "none";
        alertBox.textContent = "";
      }
      const username = document.getElementById("regUsername").value.trim();
      const password = document.getElementById("regPassword").value;
      const confirmPassword = document.getElementById("regConfirmPassword").value;
      const captchaEntered = document.getElementById("captchaInput").value.trim().toUpperCase();
      const submitBtn = document.getElementById("registerSubmitBtn");

      if (!username || !/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
        showAuthAlert("Username must be 3 to 32 characters (letters, numbers, dots, hyphens, or underscores).", "error");
        return;
      }

      if (password.length < 8) {
        showAuthAlert("Password must be at least 8 characters long.", "error");
        return;
      }

      if (isCommonPassword(password)) {
        showAuthAlert(
          "This password is too common or easily compromised. Please choose a more secure password.",
          "error"
        );
        return;
      }

      if (password !== confirmPassword) {
        showAuthAlert("Passwords do not match. Please re-enter.", "error");
        return;
      }

      if (!captchaEntered || captchaEntered.length !== 6) {
        showAuthAlert("Please enter the complete 6-character Security Verification code.", "error");
        return;
      }

      if (!window.HomeoCareAPI || !window.HomeoCareAPI.isConfigured()) {
        showAuthAlert("Supabase is not configured. Please check SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in .env.");
        return;
      }

      const activeChallengeId = CURRENT_CAPTCHA.challengeId;

      if (submitBtn) submitBtn.disabled = true;
      try {
        const result = await window.HomeoCareAPI.auth.register({
          username,
          password,
          confirmPassword,
          challengeId: activeChallengeId,
          captchaInput: captchaEntered
        });

        // Reset registration fields
        registerForm.reset();
        const msgEl = document.getElementById("confirmValidationMsg");
        if (msgEl) msgEl.textContent = "";
        const strFill = document.getElementById("strengthBarFill");
        if (strFill) strFill.style.width = "0%";
        const strText = document.getElementById("strengthText");
        if (strText) strText.textContent = "Minimum 8 characters";

        // Generate fresh challenge for next time
        await generateNewCaptcha();

        // Switch smoothly to Login tab and populate username
        setAuthTab("login");
        const loginUsernameInput = document.getElementById("loginUsername");
        if (loginUsernameInput) loginUsernameInput.value = username;
        const loginPasswordInput = document.getElementById("loginPassword");
        if (loginPasswordInput) loginPasswordInput.focus();

        const alertMsg = result.message || "Registration successful! You may now sign in.";
        showAuthAlert(alertMsg, "success");
        showToast("Registration successful! Sign in to enter your workspace.", "success");
      } catch (err) {
        // Always generate a fresh CAPTCHA on failure
        await generateNewCaptcha();
        const captchaInp = document.getElementById("captchaInput");
        if (captchaInp) captchaInp.value = "";
        showAuthAlert(err?.message || "Registration rejected. Please verify your details and try again.", "error");
        showToast("Registration failed.", "error");
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    };
  }
}

// Initialize on DOM load and restore verified Supabase session on refresh
window.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  setupAuthForms();
  updateDashboardMetrics();

  const authEntrance = document.getElementById("authEntrance");
  const appShell = document.getElementById("appShell");

  // Fast initial paint if cached session exists
  const cachedUser = getAuthenticatedUser();
  if (cachedUser) {
    applyAuthenticatedSession(cachedUser);
  } else {
    if (authEntrance) authEntrance.style.display = "flex";
    if (appShell) appShell.style.display = "none";
    generateNewCaptcha();
  }

  refreshIcons();

  // Authoritative session verification against Supabase Auth
  if (cachedUser && window.HomeoCareAPI?.auth?.restoreSession) {
    try {
      const verifiedUser = await window.HomeoCareAPI.auth.restoreSession();
      if (verifiedUser) {
        setAuthenticatedUser(verifiedUser);
      } else {
        sessionStorage.removeItem(AUTH_CONFIG.sessionKey);
        if (authEntrance) authEntrance.style.display = "flex";
        if (appShell) appShell.style.display = "none";
        generateNewCaptcha();
      }
    } catch (_) {
      // Keep UI responsive if offline
    }
  }
});

window.addEventListener("load", refreshIcons);
setTimeout(refreshIcons, 300);
setTimeout(refreshIcons, 1000);

