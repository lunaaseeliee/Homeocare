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

// ============================================================================
// HomeoCare MVP Specification Feature Flags (HomeoCare MVP Developer Handoff)
// Source of truth: Handwritten requirement letter from Dr. Suraj D. Panigrahi
// All non-MVP features are LOCKED, NOT DELETED. Completely reversible.
// ============================================================================
const MVP_FEATURE_FLAGS = {
  PATIENT_REGISTRATION: true,
  CASE_HISTORY_INTAKE: true,
  PERSONAL_HISTORY: true,
  MIND_HISTORY: true,
  PATIENT_SELF_ENTRY: true,
  DOCTOR_RECORD_REVIEW: true,
  MULTILINGUAL_UI: true,
  BILLING_INVOICES: true,
  APPOINTMENTS_CALENDAR: true,
  PRESCRIPTION_GEN: true,
  DISPENSARY_INVENTORY: true,
  PRACTICE_ANALYTICS: true,
  REPERTORY_MATERIA: true,
  AI_DIAGNOSIS: false,
  WHATSAPP_AUTOMATION: false
};

const LOCKED_PAGE_MAP = {}; // All presentation sections unlocked in HomeoCare 3.0

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
// 1. Theme Management (HomeoCare 2.0 Solid Green & White)
// ==========================================================================
function updateLiveDate() {
  const liveDateElem = document.getElementById("liveDateText");
  if (liveDateElem) {
    const now = new Date();
    liveDateElem.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem("homeocare_theme") || "light";
  applyTheme(savedTheme);
  updateLiveDate();
}

function applyTheme(theme) {
  htmlRoot.setAttribute("data-theme", theme || "light");
  localStorage.setItem("homeocare_theme", theme || "light");

  const label = (theme === "dark") ? "Dark Glass" : "Peach Light";
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

let isThemeTransitioning = false;

async function toggleTheme(event) {
  // Prevent overlapping animations when clicking repeatedly
  if (isThemeTransitioning) return;

  const current = htmlRoot.getAttribute("data-theme") || "dark";
  const target = current === "dark" ? "light" : "dark";

  // Respect user motion preferences
  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 1. Detect exact click / tap coordinates (or fall back to button center for keyboard triggers)
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;

  const triggerBtn =
    event?.currentTarget ||
    (event?.target && event.target.closest && event.target.closest(".theme-toggle-btn")) ||
    themeToggleBtn ||
    document.getElementById("authThemeToggleBtn");

  if (event && typeof event.clientX === "number" && (event.clientX !== 0 || event.clientY !== 0)) {
    x = event.clientX;
    y = event.clientY;
  } else if (triggerBtn) {
    const rect = triggerBtn.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }

  // 2. Calculate circle radius required to cover the farthest viewport corner
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  // 3. Graceful fallback for unsupported browsers or prefers-reduced-motion
  if (!document.startViewTransition || prefersReducedMotion) {
    applyTheme(target);
    showToast(`Switched to ${target === "dark" ? "Dark Glass" : "Peach Light"} Theme`, "info");
    return;
  }

  isThemeTransitioning = true;
  htmlRoot.classList.add("theme-transitioning");

  // Supply origin and radius coordinates to CSS variables
  document.documentElement.style.setProperty("--vt-origin-x", `${x}px`);
  document.documentElement.style.setProperty("--vt-origin-y", `${y}px`);
  document.documentElement.style.setProperty("--vt-radius", `${endRadius}px`);

  try {
    const transition = document.startViewTransition(() => {
      applyTheme(target);
    });

    await transition.ready;

    // Animate ::view-transition-new(root) expanding outward from the click origin
    let anim = null;
    try {
      anim = document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ]
        },
        {
          duration: 750,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)"
        }
      );
    } catch (_) {
      // Fallback to CSS keyframes animation if pseudoElement in Element.animate is not supported
      htmlRoot.classList.add("theme-transitioning-css");
    }

    if (anim) {
      await anim.finished;
    } else {
      await transition.finished;
    }
  } catch (err) {
    applyTheme(target);
  } finally {
    htmlRoot.classList.remove("theme-transitioning", "theme-transitioning-css");
    document.documentElement.style.removeProperty("--vt-origin-x");
    document.documentElement.style.removeProperty("--vt-origin-y");
    document.documentElement.style.removeProperty("--vt-radius");
    isThemeTransitioning = false;
  }

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
  // Handle Patient Self-Entry Mode
  if (pageId === "self-entry") {
    openPatientSelfEntryPortal();
    return;
  }

  // Intercept Locked Features
  if (LOCKED_PAGE_MAP[pageId]) {
    const lockInfo = LOCKED_PAGE_MAP[pageId];
    const lockedTitleElem = document.getElementById("lockedFeatureTitle");
    const lockedDescElem = document.getElementById("lockedFeatureDesc");
    if (lockedTitleElem) lockedTitleElem.textContent = lockInfo.title + " (Locked — Future Phase)";
    if (lockedDescElem) lockedDescElem.textContent = lockInfo.desc;

    // Show locked page view
    document.querySelectorAll(".page-view").forEach(view => {
      view.classList.toggle("active", view.id === "page-locked");
    });
    document.querySelectorAll(".nav-item").forEach(item => {
      const pageAttr = item.getAttribute("data-page");
      item.classList.toggle("active", pageAttr === pageId || (pageAttr && pageAttr.includes(pageId.replace("locked-", ""))));
    });
    if (pushState && window.location.hash !== "#" + pageId) {
      window.location.hash = pageId;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.lucide) lucide.createIcons();
    return;
  }

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
  const navCasesCount = document.getElementById("navCasesCount");
  if (navCasesCount) navCasesCount.textContent = totalPatientsCount;
  const totalConsultationsCount = CLINIC_STATE.patients.reduce((acc, p) => acc + ((p.consultations && p.consultations.length) || 0), 0);
  CLINIC_STATE.completedCases = totalConsultationsCount;
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
    if (quickIntakeLabel) quickIntakeLabel.textContent = "Register First Patient";
  } else {
    if (quickIntakeLabel) quickIntakeLabel.textContent = "New Patient Intake";
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
    <!-- Patient Profile Header (Clean Information Card) -->
    <div class="patient-profile-banner" style="margin-bottom: 0;">
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
    </div>
  `;

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
      <p class="empty-state-desc" style="margin-bottom: 0;">No consultations recorded yet.</p>
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
window.openPatientProfile = function(patientId, initialTab = "overview") {
  CLINIC_STATE.selectedPatientId = patientId;
  window.__ACTIVE_CASE_TAB = initialTab;
  navigateTo("cases");
  const pt = CLINIC_STATE.patients.find(p => p.id === patientId);
  if (pt) {
    showToast(`Opened patient profile for ${pt.name} (${pt.id})`, "info");
  }
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
        <h3 class="empty-state-title">No consultations recorded yet.</h3>
        <p class="empty-state-desc">No patients registered yet. Register a patient to open their structured Case Record, Past/Personal/Mind Histories, and Progress Timeline.</p>
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

  const selectedPatient = patients.find(p => p.id === CLINIC_STATE.selectedPatientId) || patients[0];
  CLINIC_STATE.selectedPatientId = selectedPatient.id;

  casesContainer.innerHTML = `
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; background: #F5F8F6; padding: 12px 18px; border-radius: 10px; border: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <label for="casePatientSelector" style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">Select Patient Case:</label>
        <select id="casePatientSelector" class="clean-select" style="min-width: 240px; padding: 6px 12px; font-size: 13px;">
          ${patients.map(p => `
            <option value="${p.id}" ${p.id === selectedPatient.id ? 'selected' : ''}>
              ${p.name} (${p.id}) — ${p.entry_source === 'patient_self' ? 'Self-Entry' : 'Staff-Entry'}
            </option>
          `).join('')}
        </select>
      </div>
      <div>
        <button class="secondary-btn-outline" id="caseAddAnotherBtn" style="font-size: 13px; padding: 6px 14px;">
          <i data-lucide="user-plus"></i>
          <span>+ Add Patient Case</span>
        </button>
      </div>
    </div>
    ${renderPatientCaseDossier(selectedPatient)}
  `;

  document.getElementById("casePatientSelector")?.addEventListener("change", (e) => {
    CLINIC_STATE.selectedPatientId = e.target.value;
    renderActiveCaseRecord();
  });

  document.getElementById("caseAddAnotherBtn")?.addEventListener("click", openPatientModal);

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
  persistClinicState();
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
      patientAddress: defaultPatient.address || defaultPatient.city || "Tower Bldg., Dadar (W), Mumbai",
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
      ACTIVE_INVOICE_STATE.patientAddress = selected.address || selected.city || "Tower Bldg., Dadar (W), Mumbai";
      const addrInput = document.getElementById("invFormAddress");
      if (addrInput) addrInput.value = ACTIVE_INVOICE_STATE.patientAddress;
      ACTIVE_INVOICE_STATE.chiefComplaint = selected.chiefComplaint || "";
      document.getElementById("invFormChiefComplaint").value = selected.chiefComplaint || "";
      if (selected.constitution) {
        ACTIVE_INVOICE_STATE.diagnosis = `Constitutional evaluation: ${selected.constitution}`;
        document.getElementById("invFormDiagnosis").value = ACTIVE_INVOICE_STATE.diagnosis;
      }
      if (selected.prescription) {
        ACTIVE_INVOICE_STATE.treatmentPlan = selected.prescription;
        const planInput = document.getElementById("invFormTreatmentPlan");
        if (planInput) planInput.value = selected.prescription;
        const remedyItem = ACTIVE_INVOICE_STATE.items.find(it => {
          const d = (it.desc || "").toLowerCase();
          return d.includes("remedy") || d.includes("dispens") || d.includes("prescri");
        });
        if (remedyItem) {
          remedyItem.desc = "Prescribed Remedy: " + selected.prescription;
          renderInvoiceItemsTable();
        }
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

  const consultEl = document.getElementById("invFormConsultFee");
  if (consultEl) {
    consultEl.oninput = (e) => {
      const val = Math.max(0, parseFloat(e.target.value) || 0);
      ACTIVE_INVOICE_STATE.consultFee = val;
      const consultItem = ACTIVE_INVOICE_STATE.items.find(it => {
        const d = (it.desc || "").toLowerCase();
        return d.includes("consult") || d.includes("evaluation") || d.includes("case taking") || d.includes("examination");
      });
      if (consultItem) {
        consultItem.rate = val;
        consultItem.total = (consultItem.qty || 1) * val;
        renderInvoiceItemsTable();
      }
      recalculateTotals();
      updateLiveDocumentPreview();
    };
  }
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
  const isConsultItem = (item) => {
    const desc = (item.desc || "").toLowerCase();
    return desc.includes("consult") || desc.includes("evaluation") || desc.includes("case taking") || desc.includes("examination");
  };

  let itemsConsultTotal = 0;
  let itemsMedicinesTotal = 0;

  ACTIVE_INVOICE_STATE.items.forEach(it => {
    if (isConsultItem(it)) {
      itemsConsultTotal += (it.total || 0);
    } else {
      itemsMedicinesTotal += (it.total || 0);
    }
  });

  // If consultation items exist in table, synchronize consultFee
  if (itemsConsultTotal > 0) {
    ACTIVE_INVOICE_STATE.consultFee = itemsConsultTotal;
    const consultInput = document.getElementById("invFormConsultFee");
    if (consultInput && document.activeElement !== consultInput) {
      consultInput.value = itemsConsultTotal;
    }
  }

  ACTIVE_INVOICE_STATE.medicinesTotal = itemsMedicinesTotal;

  // Single-counting calculation: subtotal = consultFee + medicinesTotal + otherCharges
  const subtotal = ACTIVE_INVOICE_STATE.consultFee + ACTIVE_INVOICE_STATE.medicinesTotal + (ACTIVE_INVOICE_STATE.otherCharges || 0);
  const grandTotal = Math.max(0, subtotal - (ACTIVE_INVOICE_STATE.discount || 0));
  ACTIVE_INVOICE_STATE.grandTotal = grandTotal;

  const remaining = Math.max(0, grandTotal - (ACTIVE_INVOICE_STATE.amountPaid || 0));
  ACTIVE_INVOICE_STATE.remainingBalance = remaining;

  // Auto-sync status
  if (ACTIVE_INVOICE_STATE.amountPaid >= grandTotal && grandTotal > 0) {
    ACTIVE_INVOICE_STATE.paymentStatus = "Paid";
  } else if (ACTIVE_INVOICE_STATE.amountPaid > 0 && ACTIVE_INVOICE_STATE.amountPaid < grandTotal) {
    ACTIVE_INVOICE_STATE.paymentStatus = "Partially Paid";
  } else if (grandTotal > 0 && ACTIVE_INVOICE_STATE.amountPaid === 0) {
    ACTIVE_INVOICE_STATE.paymentStatus = "Unpaid";
  }
  const statusEl = document.getElementById("invFormPaymentStatus");
  if (statusEl) statusEl.value = ACTIVE_INVOICE_STATE.paymentStatus;
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
  setTimeout(() => { if (typeof persistClinicState === "function") persistClinicState(); }, 20);
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
    margin: [8, 8, 8, 8],
    filename: `Shri_Siddhivinayak_Clinic_${invoiceId}_${patientNameClean}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
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
if (quickIntakeBtn) quickIntakeBtn.addEventListener("click", openPatientModal);
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

// Patient Registration Form Submit (Step 1 — Basic Registration Only)
patientRegistrationForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("pRegName")?.value.trim() || "";
  const phone = document.getElementById("pRegPhone")?.value.trim() || "";
  const age = document.getElementById("pRegAge")?.value.trim() || "";
  const gender = document.getElementById("pRegGender")?.value || "Male";
  const address = document.getElementById("pRegAddress")?.value.trim() || "";
  const email = document.getElementById("pRegEmail")?.value.trim() || "";
  const chiefComplaint = document.getElementById("pRegChiefComplaint")?.value.trim() || "";

  if (!name || !phone || !age || !address || !chiefComplaint) {
    showToast("Please complete all required Basic Registration fields.", "error");
    return;
  }

  const patientData = {
    name,
    phone,
    age,
    gender,
    address,
    email,
    chiefComplaint
  };

  const record = savePatientCaseRecord(patientData, "staff_assisted");

  patientRegistrationForm.reset();
  closePatientModal();
  persistClinicState();
  updateDashboardMetrics();
  renderPatientWorkspace();
  renderPatientRegistry();

  // Immediately open Patient Profile & Review view on Overview tab
  window.__ACTIVE_CASE_TAB = "overview";
  navigateTo("cases");

  showToast(`Patient "${name}" registered with ID ${record.id}. Complete Past, Personal, and Mind histories in the profile tabs.`, "success");
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
  persistClinicState();
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

  persistClinicState();
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
    persistClinicState();
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
  // HomeoCare 3.0: Strictly ZERO fake or sample records. All data comes from real persisted records.
  return {
    clinicName: "Shri Siddhivinayak Clinic",
    doctor: "Dr. Suraj D. Panigrahi",
    qualification: "B.H.M.S. (Mum.)",
    staffRole: "Dr. Suraj D. Panigrahi",
    patients: [],
    appointments: [],
    medicines: [],
    invoices: [],
    pendingApprovals: 0,
    completedCases: 0,
    notificationsCount: 0,
    selectedPatientId: null
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

  // Keep persisted storage intact; reset in-memory session view on sign out
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

  // Reset OTP auth forms
  const otpRequestForm = document.getElementById("otpRequestForm");
  const otpVerifyForm = document.getElementById("otpVerifyForm");
  const otpEmailInput = document.getElementById("otpEmailInput");
  const alertBox = document.getElementById("authAlertBox");

  if (otpRequestForm) otpRequestForm.style.display = "block";
  if (otpVerifyForm) otpVerifyForm.style.display = "none";
  if (otpEmailInput) otpEmailInput.value = "homeocareadmin@gmail.com";
  if (alertBox) {
    alertBox.style.display = "none";
    alertBox.textContent = "";
  }
  document.querySelectorAll(".otp-digit-box").forEach(box => {
    box.value = "";
    box.classList.remove("has-val");
  });

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
    const headerDoctorName = document.querySelector("#headerDoctorProfile .header-doctor-name");
    const headerDoctorAvatar = document.querySelector("#headerDoctorProfile .header-doctor-avatar");
    if (isDoc) {
      if (practitionerName) practitionerName.textContent = user.name || "Dr. Suraj D. Panigrahi";
      if (practitionerInitials) practitionerInitials.textContent = "SP";
      if (headerDoctorName) headerDoctorName.textContent = user.name || "Dr. Suraj D. Panigrahi";
      if (headerDoctorAvatar) headerDoctorAvatar.textContent = "SP";
    } else {
      const displayName = user.name || user.username.toUpperCase();
      if (practitionerName) practitionerName.textContent = displayName;
      if (practitionerInitials) {
        practitionerInitials.textContent = user.username.substring(0, 2).toUpperCase();
      }
      if (headerDoctorName) headerDoctorName.textContent = displayName;
      if (headerDoctorAvatar) {
        headerDoctorAvatar.textContent = user.username.substring(0, 2).toUpperCase();
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
  const logoutSidebarBtn = document.getElementById("logoutSidebarBtn");
  if (logoutSidebarBtn) logoutSidebarBtn.onclick = () => logoutUser();

  const otpRequestForm = document.getElementById("otpRequestForm");
  const otpVerifyForm = document.getElementById("otpVerifyForm");
  const otpEmailInput = document.getElementById("otpEmailInput");
  const sendOtpSubmitBtn = document.getElementById("sendOtpSubmitBtn");
  const verifyOtpSubmitBtn = document.getElementById("verifyOtpSubmitBtn");
  const backToEmailBtn = document.getElementById("backToEmailBtn");
  const otpTargetEmailDisplay = document.getElementById("otpTargetEmailDisplay");
  const alertBox = document.getElementById("authAlertBox");
  const digitBoxes = Array.from(document.querySelectorAll(".otp-digit-box"));

  const AUTHORIZED_EMAIL = "homeocareadmin@gmail.com";

  function showOtpAlert(msg, type = "error") {
    if (!alertBox) return;
    alertBox.style.display = "block";
    alertBox.className = `auth-alert-message alert-${type}`;
    alertBox.textContent = msg;
  }

  function hideOtpAlert() {
    if (!alertBox) return;
    alertBox.style.display = "none";
    alertBox.textContent = "";
  }

  // Setup 6-digit box auto-advance, backspace, and paste handlers
  digitBoxes.forEach((box, index) => {
    box.addEventListener("input", (e) => {
      const val = e.target.value.replace(/\D/g, "");
      e.target.value = val ? val[val.length - 1] : "";
      if (e.target.value) {
        box.classList.add("has-val");
        if (index < digitBoxes.length - 1) {
          digitBoxes[index + 1].focus();
        }
      } else {
        box.classList.remove("has-val");
      }

      // Check if all 6 boxes are filled
      const fullCode = digitBoxes.map(b => b.value.trim()).join("");
      if (fullCode.length === 6) {
        handleVerifyPresentationCode(e);
      }
    });

    box.addEventListener("keydown", (e) => {
      if (e.key === "Backspace") {
        if (!box.value && index > 0) {
          digitBoxes[index - 1].focus();
          digitBoxes[index - 1].value = "";
          digitBoxes[index - 1].classList.remove("has-val");
        } else {
          box.value = "";
          box.classList.remove("has-val");
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        digitBoxes[index - 1].focus();
      } else if (e.key === "ArrowRight" && index < digitBoxes.length - 1) {
        digitBoxes[index + 1].focus();
      }
    });

    box.addEventListener("paste", (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

      if (!pasteData) return;
      pasteData.split("").forEach((char, i) => {
        if (digitBoxes[i]) {
          digitBoxes[i].value = char;
          digitBoxes[i].classList.add("has-val");
        }
      });

      const nextFocus = Math.min(pasteData.length, digitBoxes.length - 1);
      digitBoxes[nextFocus].focus();

      if (pasteData.length === 6) {
        handleVerifyPresentationCode(e);
      }
    });
  });

  // Step 1: Proceed to Clinical Verification (Defensive zero-reload handling)
  async function handleProceedToVerification(e) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    hideOtpAlert();

    const email = otpEmailInput ? otpEmailInput.value.trim().toLowerCase() : "";
    if (email !== AUTHORIZED_EMAIL) {
      showOtpAlert(
        `Access restricted: Only the authorized HomeoCare administrator (${AUTHORIZED_EMAIL}) is permitted to log in.`,
        "error"
      );
      return false;
    }

    if (sendOtpSubmitBtn) {
      sendOtpSubmitBtn.disabled = true;
      sendOtpSubmitBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i><span>Verifying access...</span>';
      refreshIcons();
    }

    try {
      // Transition smoothly inside the SAME card to Step 2
      if (otpRequestForm) otpRequestForm.style.display = "none";
      if (otpVerifyForm) otpVerifyForm.style.display = "block";
      if (otpTargetEmailDisplay) otpTargetEmailDisplay.textContent = email;

      digitBoxes.forEach(b => {
        b.value = "";
        b.classList.remove("has-val");
      });
      if (digitBoxes[0]) {
        setTimeout(() => digitBoxes[0].focus(), 60);
      }
      refreshIcons();
    } catch (err) {
      showOtpAlert(err?.message || "Could not switch to verification screen.", "error");
    } finally {
      if (sendOtpSubmitBtn) {
        sendOtpSubmitBtn.disabled = false;
        sendOtpSubmitBtn.innerHTML = '<i data-lucide="arrow-right"></i><span>Proceed to Clinical Verification</span>';
        refreshIcons();
      }
    }
    return false;
  }

  // Step 2: Verify 6-Digit Presentation Access Code & Establish Legitimate Session
  async function handleVerifyPresentationCode(e) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
      e.stopPropagation();
    }
    hideOtpAlert();

    const code = digitBoxes.map(b => b.value.trim()).join("");
    if (code.length !== 6) {
      showOtpAlert("Please enter the complete 6-digit presentation access code.", "error");
      return false;
    }

    if (verifyOtpSubmitBtn) {
      verifyOtpSubmitBtn.disabled = true;
      verifyOtpSubmitBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i><span>Verifying code...</span>';
      refreshIcons();
    }

    try {
      // Authenticate via server-side presentation verification
      const authenticatedUser = await window.HomeoCareAPI.auth.verifyPresentationCode(AUTHORIZED_EMAIL, code);

      // Load real persisted clinic records (never fake demo records)
      if (typeof loadPersistedClinicState === "function") {
        await loadPersistedClinicState();
      }

      // Establish authenticated session
      setAuthenticatedUser(authenticatedUser);
      applyAuthenticatedSession(authenticatedUser);
      updateDashboardMetrics();
      renderPatientWorkspace();
      navigateTo("dashboard");

      showToast(`Welcome back, ${authenticatedUser.name}!`, "success");
    } catch (err) {
      showOtpAlert(
        err?.message || "Invalid presentation access code. Please verify the 6-digit code and try again.",
        "error"
      );
      digitBoxes.forEach(b => {
        b.value = "";
        b.classList.remove("has-val");
      });
      if (digitBoxes[0]) digitBoxes[0].focus();
      showToast("Verification failed.", "error");
    } finally {
      if (verifyOtpSubmitBtn) {
        verifyOtpSubmitBtn.disabled = false;
        verifyOtpSubmitBtn.innerHTML = '<i data-lucide="check-circle"></i><span>Verify & Enter HomeoCare</span>';
        refreshIcons();
      }
    }
    return false;
  }

  // Event Listeners (both onsubmit and onclick wired for 100% reliability)
  if (otpRequestForm) {
    otpRequestForm.onsubmit = handleProceedToVerification;
  }
  if (sendOtpSubmitBtn) {
    sendOtpSubmitBtn.onclick = handleProceedToVerification;
  }

  if (otpVerifyForm) {
    otpVerifyForm.onsubmit = handleVerifyPresentationCode;
  }
  if (verifyOtpSubmitBtn) {
    verifyOtpSubmitBtn.onclick = handleVerifyPresentationCode;
  }

  // Back to Email (returns to Step 1 smoothly without page refresh)
  if (backToEmailBtn) {
    backToEmailBtn.onclick = (e) => {
      if (e && typeof e.preventDefault === "function") {
        e.preventDefault();
        e.stopPropagation();
      }
      hideOtpAlert();
      if (otpVerifyForm) otpVerifyForm.style.display = "none";
      if (otpRequestForm) otpRequestForm.style.display = "block";
      if (otpEmailInput) otpEmailInput.focus();
      refreshIcons();
    };
  }
}

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



// ==========================================================================
// HOMEOCARE MVP: TRILINGUAL PATIENT SELF-ENTRY CONTROLLER
// Languages: English (en), Hindi (hi), Marathi (mr)
// ==========================================================================
let currentSelfEntryLang = "en";
let selfEntryCurrentStep = 1;

function setSelfEntryLanguage(lang) {
  if (!window.HOMEO_I18N || !window.HOMEO_I18N[lang]) return;
  currentSelfEntryLang = lang;
  const strings = window.HOMEO_I18N[lang];

  // Update active state on language buttons
  document.querySelectorAll(".lang-toggle-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
  });

  // Apply translations to self-entry form elements
  const elTitle = document.getElementById("i18n-self-title");
  const elSubtitle = document.getElementById("i18n-self-subtitle");
  const elPrivacy = document.getElementById("i18n-self-privacy");
  if (elTitle) elTitle.textContent = strings.patientSelfEntryTitle;
  if (elSubtitle) elSubtitle.textContent = strings.patientSelfEntrySubtitle;
  if (elPrivacy) elPrivacy.textContent = strings.privacyNotice;

  // Labels
  const mapping = {
    "i18n-step1-head": strings.step1,
    "i18n-step2-head": strings.step2,
    "i18n-step3-head": strings.step3,
    "i18n-step4-head": strings.step4,
    "i18n-step5-head": strings.step5,
    "i18n-lbl-fullname": strings.fullName,
    "i18n-lbl-phone": strings.phone,
    "i18n-lbl-age": strings.age,
    "i18n-lbl-gender": strings.gender,
    "i18n-lbl-dob": strings.dob,
    "i18n-lbl-address": strings.address,
    "i18n-lbl-email": strings.email,
    "i18n-lbl-chief": strings.chiefComplaint,
    "i18n-lbl-assoc": strings.associatedComplaints,
    "i18n-lbl-pasthist": strings.pastHistory,
    "i18n-help-pasthist": strings.pastHistoryHelp,
    "i18n-lbl-famhist": strings.familyHistory,
    "i18n-help-famhist": strings.familyHistoryHelp,
    "i18n-notice-phys": strings.personalHistoryNotice,
    "i18n-lbl-appetite": strings.appetite,
    "i18n-lbl-thirst": strings.thirst,
    "i18n-lbl-craving": strings.craving,
    "i18n-lbl-diet": strings.diet,
    "i18n-lbl-bowel": strings.bowel,
    "i18n-lbl-urine": strings.urine,
    "i18n-lbl-habit": strings.habit,
    "i18n-lbl-thermal": strings.thermalModality,
    "i18n-lbl-sleep": strings.sleep,
    "i18n-lbl-dreams": strings.dreams,
    "i18n-lbl-hobby": strings.hobby,
    "i18n-notice-mind": strings.mindHistoryNotice,
    "i18n-lbl-anxiety": strings.anxiety,
    "i18n-lbl-stress": strings.stress,
    "i18n-lbl-thoughts": strings.thoughts,
    "i18n-lbl-company": strings.company,
    "i18n-lbl-worried": strings.worried,
    "i18n-lbl-happy": strings.happy,
    "i18n-btn-submit": strings.btnSubmit,
    "i18n-success-title": strings.btnSubmitSuccess,
    "i18n-success-msg": strings.submitSuccessMessage
  };

  for (const [id, text] of Object.entries(mapping)) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

function openPatientSelfEntryPortal() {
  const authEntrance = document.getElementById("authEntrance");
  const appShell = document.getElementById("appShell");
  const selfEntryView = document.getElementById("patientSelfEntryView");
  const selfEntrySuccessCard = document.getElementById("selfEntrySuccessCard");
  const selfEntryForm = document.getElementById("selfEntryForm");

  if (authEntrance) authEntrance.style.display = "none";
  if (appShell) appShell.style.display = "none";
  if (selfEntryView) selfEntryView.style.display = "flex";
  if (selfEntryForm) selfEntryForm.style.display = "block";
  if (selfEntrySuccessCard) selfEntrySuccessCard.style.display = "none";

  goToSelfEntryStep(1);
  setSelfEntryLanguage(currentSelfEntryLang);
  if (window.lucide) lucide.createIcons();
}

function closePatientSelfEntryPortal() {
  const authEntrance = document.getElementById("authEntrance");
  const selfEntryView = document.getElementById("patientSelfEntryView");
  const appShell = document.getElementById("appShell");

  if (selfEntryView) selfEntryView.style.display = "none";
  const user = getAuthenticatedUser();
  if (user && appShell) {
    appShell.style.display = "flex";
    navigateTo("dashboard");
  } else if (authEntrance) {
    authEntrance.style.display = "flex";
  }
}

function goToSelfEntryStep(stepNum) {
  selfEntryCurrentStep = stepNum;
  document.querySelectorAll(".wizard-step-pane").forEach((pane, idx) => {
    pane.classList.toggle("active", idx + 1 === stepNum);
  });
  document.querySelectorAll(".wizard-stepper .step-badge").forEach((badge, idx) => {
    badge.classList.toggle("active", idx + 1 === stepNum);
    badge.classList.toggle("completed", idx + 1 < stepNum);
  });

  if (stepNum === 5) {
    populateSelfEntryReview();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function populateSelfEntryReview() {
  const reviewContainer = document.getElementById("selfReviewSummary");
  if (!reviewContainer) return;

  const fullName = document.getElementById("seFullName")?.value.trim() || "—";
  const phone = document.getElementById("sePhone")?.value.trim() || "—";
  const age = document.getElementById("seAge")?.value.trim() || "—";
  const gender = document.getElementById("seGender")?.value || "—";
  const dob = document.getElementById("seDob")?.value || "—";
  const address = document.getElementById("seAddress")?.value.trim() || "—";
  const chief = document.getElementById("seChiefComplaint")?.value.trim() || "—";
  const assoc = document.getElementById("seAssociatedComplaints")?.value.trim() || "None reported";

  const past = document.getElementById("sePastHistory")?.value.trim() || "None reported";
  const family = document.getElementById("seFamilyHistory")?.value.trim() || "None reported";

  const appetite = document.getElementById("seAppetite")?.value.trim() || "—";
  const thirst = document.getElementById("seThirst")?.value.trim() || "—";
  const craving = document.getElementById("seCraving")?.value.trim() || "—";
  const diet = document.getElementById("seDiet")?.value || "—";
  const bowel = document.getElementById("seBowel")?.value.trim() || "—";
  const urine = document.getElementById("seUrine")?.value.trim() || "—";
  const habit = document.getElementById("seHabit")?.value.trim() || "—";
  const thermal = document.getElementById("seThermalModality")?.value || "—";
  const sleep = document.getElementById("seSleep")?.value.trim() || "—";
  const dreams = document.getElementById("seDreams")?.value.trim() || "—";
  const hobby = document.getElementById("seHobby")?.value.trim() || "—";

  const anxiety = document.getElementById("seAnxiety")?.value.trim() || "—";
  const stress = document.getElementById("seStress")?.value.trim() || "—";
  const thoughts = document.getElementById("seThoughts")?.value.trim() || "—";
  const company = document.getElementById("seCompany")?.value || "—";
  const worried = document.getElementById("seWorried")?.value.trim() || "—";
  const happy = document.getElementById("seHappy")?.value.trim() || "—";

  reviewContainer.innerHTML = `
    <div class="review-section-block">
      <h4>1. Patient Identity & Complaints</h4>
      <div class="review-grid">
        <div class="review-item"><strong>Full Name</strong><span>${fullName}</span></div>
        <div class="review-item"><strong>Phone</strong><span>${phone}</span></div>
        <div class="review-item"><strong>Age / Sex</strong><span>${age} yrs (${gender})</span></div>
        <div class="review-item"><strong>Date of Birth</strong><span>${dob}</span></div>
        <div class="review-item" style="grid-column: 1 / -1;"><strong>Residential Address</strong><span>${address}</span></div>
        <div class="review-item" style="grid-column: 1 / -1;"><strong>Chief Complaint (C/C)</strong><span>${chief}</span></div>
        <div class="review-item" style="grid-column: 1 / -1;"><strong>Associated Complaints</strong><span>${assoc}</span></div>
      </div>
    </div>

    <div class="review-section-block">
      <h4>2. Medical & Family History</h4>
      <div class="review-grid">
        <div class="review-item" style="grid-column: 1 / -1;"><strong>Past Medical History</strong><span>${past}</span></div>
        <div class="review-item" style="grid-column: 1 / -1;"><strong>Family History</strong><span>${family}</span></div>
      </div>
    </div>

    <div class="review-section-block">
      <h4>3. Personal History (Physical Modalities)</h4>
      <div class="review-grid">
        <div class="review-item"><strong>Appetite</strong><span>${appetite}</span></div>
        <div class="review-item"><strong>Thirst</strong><span>${thirst}</span></div>
        <div class="review-item"><strong>Cravings</strong><span>${craving}</span></div>
        <div class="review-item"><strong>Diet</strong><span>${diet}</span></div>
        <div class="review-item"><strong>Bowel</strong><span>${bowel}</span></div>
        <div class="review-item"><strong>Urine</strong><span>${urine}</span></div>
        <div class="review-item"><strong>Habits</strong><span>${habit}</span></div>
        <div class="review-item"><strong>Thermal Modality</strong><span>${thermal}</span></div>
        <div class="review-item"><strong>Sleep</strong><span>${sleep}</span></div>
        <div class="review-item"><strong>Dreams</strong><span>${dreams}</span></div>
        <div class="review-item"><strong>Hobby (h)</strong><span>${hobby} (Pending Doctor Confirmation)</span></div>
      </div>
    </div>

    <div class="review-section-block">
      <h4>4. Mind & Emotional State</h4>
      <div class="review-grid">
        <div class="review-item"><strong>Anxiety</strong><span>${anxiety}</span></div>
        <div class="review-item"><strong>Stress</strong><span>${stress}</span></div>
        <div class="review-item"><strong>Thoughts</strong><span>${thoughts}</span></div>
        <div class="review-item"><strong>Company</strong><span>${company}</span></div>
        <div class="review-item" style="grid-column: 1 / -1;"><strong>What makes you worried?</strong><span>${worried}</span></div>
        <div class="review-item" style="grid-column: 1 / -1;"><strong>What makes you happy?</strong><span>${happy}</span></div>
      </div>
    </div>
  `;
}

// ==========================================================================
// HOMEOCARE 3.0 — PERSISTENCE ENGINE, MULTI-TAB PROFILE & PROGRESS TIMELINE
// ==========================================================================
const CLINIC_STORAGE_KEY = "homeocare_v3_clinic_db";
window.__ACTIVE_CASE_TAB = "overview";

function persistClinicState() {
  const payload = {
    patients: CLINIC_STATE.patients || [],
    appointments: CLINIC_STATE.appointments || [],
    invoices: CLINIC_STATE.invoices || [],
    medicines: CLINIC_STATE.medicines || [],
    selectedPatientId: CLINIC_STATE.selectedPatientId || null,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(CLINIC_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem("homeocare_patients_cache", JSON.stringify(CLINIC_STATE.patients || []));
  } catch (_) {}

  // Also persist to server endpoint (/api/clinic-state)
  fetch("/api/clinic-state", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: payload })
  }).catch(() => {});
}

async function loadPersistedClinicState() {
  let loadedState = null;

  // 1. Check localStorage first for immediate zero-latency restore
  try {
    const raw = localStorage.getItem(CLINIC_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        loadedState = parsed;
      }
    }
  } catch (_) {}

  // 2. Also fetch server /api/clinic-state and merge patients by id
  try {
    const res = await fetch("/api/clinic-state", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && data.state) {
        if (!loadedState) {
          loadedState = data.state;
        } else if (Array.isArray(data.state.patients) && data.state.patients.length > 0) {
          const localMap = new Map((loadedState.patients || []).filter(p => p && p.id).map(p => [p.id, p]));
          for (const srvPt of data.state.patients) {
            if (srvPt && srvPt.id) {
              localMap.set(srvPt.id, { ...(localMap.get(srvPt.id) || {}), ...srvPt });
            }
          }
          loadedState.patients = Array.from(localMap.values());
        }
        try {
          localStorage.setItem(CLINIC_STORAGE_KEY, JSON.stringify(loadedState));
        } catch (_) {}
      }
    }
  } catch (_) {}

  // 3. Also merge any authenticated Supabase `public.patients` records if session permits
  if (window.HomeoCareAPI?.patients?.listAll) {
    try {
      const sbPatients = await window.HomeoCareAPI.patients.listAll();
      if (Array.isArray(sbPatients) && sbPatients.length > 0) {
        if (!loadedState) {
          loadedState = { patients: sbPatients, appointments: [], invoices: [], medicines: [] };
        } else {
          const map = new Map((loadedState.patients || []).filter(p => p && p.id).map(p => [p.id, p]));
          for (const sbPt of sbPatients) {
            if (sbPt && sbPt.id && !map.has(sbPt.id)) {
              map.set(sbPt.id, sbPt);
            }
          }
          loadedState.patients = Array.from(map.values());
        }
      }
    } catch (_) {}
  }

  // 4. Apply loaded real records (filtering out any legacy "[Sample]" demo records if ever cached)
  if (loadedState) {
    CLINIC_STATE.patients = (loadedState.patients || []).filter(p => !(p.name && p.name.includes("[Sample]")));
    CLINIC_STATE.appointments = (loadedState.appointments || []).filter(a => !(a.patientName && a.patientName.includes("[Sample]")));
    CLINIC_STATE.invoices = (loadedState.invoices || []).filter(i => !(i.patientName && i.patientName.includes("[Sample]")));
    CLINIC_STATE.medicines = loadedState.medicines || [];
    CLINIC_STATE.selectedPatientId =
      loadedState.selectedPatientId ||
      (CLINIC_STATE.patients[0]?.id || null);
  }

  updateDashboardMetrics();
}

// Global Patient Record Creation (Used by both Step 1 Basic Registration & Patient Self-Entry)
function savePatientCaseRecord(patientData, entrySource = "staff_assisted") {
  const currentYear = new Date().getFullYear();
  const nextNum = 1001 + CLINIC_STATE.patients.length;
  const newPatientId = `SSC-${currentYear}-${nextNum}`;
  const todayStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const todayIso = new Date().toISOString().split("T")[0];
  const timestampIso = new Date().toISOString();

  const initialPast = typeof patientData.pastHistory === "object" && patientData.pastHistory !== null
    ? patientData.pastHistory
    : {
        medicalHistory: patientData.pastHistory || "",
        previousIllnesses: "",
        previousTreatments: "",
        associatedComplaints: patientData.associatedComplaints || "",
        familyFather: patientData.familyHistory || "",
        familyMother: "",
        familyBrother: "",
        familySister: "",
        previousConsultations: ""
      };

  const rawPers = patientData.personalHistory || {};
  const initialPersonal = {
    appetite: rawPers.appetite || "",
    craving: rawPers.craving || "",
    aversion: rawPers.aversion || "",
    thirst: rawPers.thirst || "",
    urine: rawPers.urine || "",
    bowel: rawPers.bowel || "",
    perspiration: rawPers.perspiration || "",
    habits: rawPers.habits || rawPers.habit || "",
    hobbies: rawPers.hobbies || rawPers.hobby || "",
    thermalBath: rawPers.thermalBath || "",
    thermalCovering: rawPers.thermalCovering || "",
    thermalFood: rawPers.thermalFood || "",
    thermalSeason: rawPers.thermalSeason || rawPers.thermalModality || "",
    sleep: rawPers.sleep || "",
    dreams: rawPers.dreams || "",
    menstrualHistory: rawPers.menstrualHistory || ""
  };

  const rawMind = patientData.mindHistory || {};
  const initialMind = {
    workplaceEnv: rawMind.workplaceEnv || "",
    familyEnv: rawMind.familyEnv || "",
    socialPartyEnv: rawMind.socialPartyEnv || "",
    friendsComfort: rawMind.friendsComfort || rawMind.company || "",
    introExtrovert: rawMind.introExtrovert || "",
    emotionsFeelings: rawMind.emotionsFeelings || rawMind.happy || "",
    thoughts: rawMind.thoughts || "",
    fearsCauses: rawMind.fearsCauses || rawMind.worried || "",
    angerCauses: rawMind.angerCauses || "",
    anxiety: rawMind.anxiety || "",
    stressResponses: rawMind.stressResponses || rawMind.stress || "",
    additionalObservations: rawMind.additionalObservations || ""
  };

  const initialConsultationEntry = {
    id: `CONS-${Date.now()}`,
    stage: "Day 1 — Initial Consultation",
    date: todayIso,
    displayDate: todayStr,
    observations: `Initial Registration & Chief Complaint: ${patientData.chiefComplaint}`,
    medicine: patientData.prescription || "Constitutional evaluation in progress",
    status: "Initial Evaluation",
    instructions: "Complete Past, Personal, and Mind History sections for holistic totality.",
    doctor: "Dr. Suraj D. Panigrahi"
  };

  const record = {
    id: newPatientId,
    name: patientData.name,
    phone: patientData.phone,
    age: patientData.age,
    gender: patientData.gender,
    dob: patientData.dob || "",
    address: patientData.address || "",
    email: patientData.email || "",
    chiefComplaint: patientData.chiefComplaint,
    associatedComplaints: initialPast.associatedComplaints || "",
    pastHistoryData: initialPast,
    personalHistory: initialPersonal,
    mindHistory: initialMind,
    consultations: [initialConsultationEntry],
    entry_source: entrySource,
    created_at: timestampIso,
    registeredDate: todayStr,
    miasm: patientData.miasm || "Constitutional Intake",
    constitution: patientData.constitution || "Classical Evaluation",
    prescription: patientData.prescription || "",
    rubrics: [],
    history: [
      {
        title: "Day 1 — Initial Consultation & Registration",
        date: todayStr,
        desc: `Patient registered (${newPatientId}). Chief Complaint: ${patientData.chiefComplaint}`
      }
    ]
  };

  CLINIC_STATE.patients.push(record);
  CLINIC_STATE.selectedPatientId = newPatientId;
  persistClinicState();

  // Attempt Supabase & Server atomic upsert when session permits
  if (window.HomeoCareAPI?.patients?.upsertClinicalRecord) {
    window.HomeoCareAPI.patients.upsertClinicalRecord(record).catch(() => {});
  } else if (window.HomeoCareAPI?.patients?.create) {
    window.HomeoCareAPI.patients.create({
      clinic_patient_id: newPatientId,
      full_name: record.name,
      phone: record.phone,
      age: parseInt(record.age, 10) || 0,
      gender: record.gender,
      address: record.address
    }).catch(() => {});
  }

  updateDashboardMetrics();
  return record;
}

// Helper to escape HTML safely in form values
function escAttr(val) {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ==========================================================================
// APPROVED CLINICAL FORM UI — SMART "+ ADD" SELECTION-CHIP ENGINE
// ==========================================================================
const CLINICAL_FIELD_CATALOG = {
  past: {
    // Section A — Past Medical History
    pastIllnesses: {
      label: "Past Illnesses",
      options: [
        "Typhoid",
        "Jaundice",
        "Asthma",
        "Diabetes",
        "Hypertension",
        "Tuberculosis",
        "Migraine",
        "Allergy",
        "Skin Eruptions",
        "No reported conditions"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["medicalHistory"]
    },
    recurrentInfections: {
      label: "Recurring Infections",
      options: [
        "Recurrent Tonsillitis",
        "Recurrent Cold / Coryza",
        "Sinusitis",
        "Urinary Tract Infection",
        "Fungal / Ringworm Infection",
        "Recurrent Fever",
        "Bronchitis",
        "Ear Infections",
        "Gastric Infections",
        "No reported conditions"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["previousIllnesses"]
    },
    hospitalizationsSurgeries: {
      label: "Hospitalizations & Surgeries",
      options: [
        "Appendectomy",
        "Tonsillectomy",
        "Caesarean Section (C-Section)",
        "Gallbladder Surgery",
        "Hernia Repair",
        "Fracture / Orthopedic Surgery",
        "Kidney Stone Procedure",
        "Hospitalized for Acute Fever",
        "No prior hospitalizations"
      ],
      notePlaceholder: "Notes (optional)"
    },

    // Section B — Treatment History
    previousTreatments: {
      label: "Treatments & Medications",
      options: [
        "Allopathic",
        "Ayurvedic",
        "Homeopathic",
        "Antibiotics",
        "Painkillers",
        "Antihypertensives",
        "Antidiabetics",
        "Steroids / Ointments",
        "Antacids / PPIs",
        "Thyroid Supplement",
        "No prior medications"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["previousTreatments"]
    },
    associatedComplaints: {
      label: "Associated Complaints",
      options: [
        "Acidity / Heartburn",
        "Gas / Bloating",
        "Constipation",
        "Headache",
        "Joint Pain",
        "Hair Fall",
        "Weakness / Fatigue",
        "Sleeplessness",
        "Allergic Rhinitis",
        "Backache",
        "None reported"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["associatedComplaints"]
    },
    previousConsultations: {
      label: "Previous Consultations",
      options: [
        "General Physician Consulted",
        "Specialist / MD Consulted",
        "Dermatologist Consulted",
        "Orthopedic Consulted",
        "ENT Specialist Consulted",
        "Gynaecologist Consulted",
        "Prior Homeopathic Consultation",
        "First Consultation for Complaint"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["previousConsultations"]
    },
    diagnosticReports: {
      label: "Diagnostic Reports",
      options: [
        "CBC / Blood Routine",
        "Blood Sugar (Fasting / PP / HbA1c)",
        "Thyroid Profile (T3, T4, TSH)",
        "Lipid Profile",
        "Liver / Kidney Function Test",
        "Urine Routine",
        "X-Ray",
        "Ultrasound (USG)",
        "MRI / CT Scan",
        "No reports brought"
      ],
      notePlaceholder: "Notes (optional)"
    },

    // Section C — Family Medical History
    familyFather: {
      label: "Father",
      options: [
        "Hypertension",
        "Diabetes",
        "Asthma",
        "Thyroid Disorder",
        "Heart Disease",
        "Arthritis",
        "Migraine",
        "Allergy",
        "Cancer",
        "Healthy",
        "No reported conditions",
        "Information not available"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["familyFather"]
    },
    familyMother: {
      label: "Mother",
      options: [
        "Hypertension",
        "Diabetes",
        "Asthma",
        "Thyroid Disorder",
        "Heart Disease",
        "Arthritis",
        "Migraine",
        "Allergy",
        "Cancer",
        "Healthy",
        "No reported conditions",
        "Information not available"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["familyMother"]
    },
    familyBrother: {
      label: "Brothers",
      options: [
        "Hypertension",
        "Diabetes",
        "Asthma",
        "Thyroid Disorder",
        "Heart Disease",
        "Arthritis",
        "Migraine",
        "Allergy",
        "Cancer",
        "Healthy",
        "No reported conditions",
        "Information not available",
        "Not applicable (No brothers)"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["familyBrother"]
    },
    familySister: {
      label: "Sisters",
      options: [
        "Hypertension",
        "Diabetes",
        "Asthma",
        "Thyroid Disorder",
        "Heart Disease",
        "Arthritis",
        "Migraine",
        "Allergy",
        "Cancer",
        "Healthy",
        "No reported conditions",
        "Information not available",
        "Not applicable (No sisters)"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["familySister"]
    }
  },

  personal: {
    appetite: {
      label: "Appetite",
      options: [
        "Good / Regular",
        "Diminished / Low",
        "Increased / Ravenous",
        "Easily Satiated",
        "Hunger Causes Headache",
        "Variable Appetite"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["appetite"]
    },
    craving: {
      label: "Cravings",
      options: [
        "Sweets",
        "Salty Food",
        "Spicy / Pungent",
        "Sour / Pickles",
        "Warm Food",
        "Cold Drinks / Ice",
        "Milk",
        "Fried / Rich Food",
        "Eggs",
        "No specific craving"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["craving"]
    },
    aversion: {
      label: "Aversions",
      options: [
        "Milk",
        "Fats / Oily Food",
        "Sweets",
        "Sour Food",
        "Meat",
        "Warm Food",
        "Bitter",
        "Garlic / Onion",
        "No specific aversion"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["aversion"]
    },
    thirst: {
      label: "Thirst",
      options: [
        "Normal (2–3L/day)",
        "Thirstless",
        "Large quantities at long intervals",
        "Small quantities frequently",
        "Increased Thirst",
        "Desires Cold Water",
        "Desires Warm Water"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["thirst"]
    },
    urine: {
      label: "Urine",
      options: [
        "Normal / Clear",
        "Frequent Urination",
        "Frequent at Night (Nocturia)",
        "Burning / Scalding",
        "Scanty Flow",
        "Offensive Odor",
        "Urgency"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["urine"]
    },
    bowel: {
      label: "Bowel",
      options: [
        "Regular / Satisfactory",
        "Constipation (Hard Stool)",
        "Unfinished Sensation",
        "Alternating Constipation & Loose",
        "Frequent / Loose Stool",
        "Morning Urgency",
        "Straining Required"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["bowel"]
    },
    perspiration: {
      label: "Perspiration",
      options: [
        "Moderate / Normal",
        "Profuse Perspiration",
        "Scanty / Dry Skin",
        "Palms & Soles",
        "Forehead / Head / Neck",
        "Offensive Odor",
        "Stains Linen Yellow",
        "Sweat on Slight Exertion"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["perspiration"]
    },
    habits: {
      label: "Habits & Addictions",
      options: [
        "Tea (1–2 cups/day)",
        "Tea (Frequent)",
        "Coffee",
        "Tobacco / Smoking",
        "Alcohol (Occasional)",
        "Late Night Sleeping",
        "Irregular Meal Timings",
        "No addictions"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["habits"]
    },
    hobbies: {
      label: "Hobbies",
      options: [
        "Reading",
        "Music",
        "Walking / Exercise",
        "Gardening",
        "Cooking",
        "Sports",
        "Painting / Art",
        "Travelling"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["hobbies"]
    },
    thermalBath: {
      label: "Bath Preference",
      options: [
        "Warm Water All Year",
        "Lukewarm / Tepid Water",
        "Cold Water Bath",
        "Warm in Winter, Cool in Summer"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["thermalBath"]
    },
    thermalCovering: {
      label: "Covering & Air Conditioning",
      options: [
        "Needs Blanket Even in Summer",
        "Prefers Light Covering",
        "Uncovers Feet at Night",
        "Intolerant to Cold Draft / AC",
        "Prefers Fast Fan / Cool Room"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["thermalCovering"]
    },
    thermalFood: {
      label: "Food & Drink Temperature",
      options: [
        "Desires Warm / Hot Food",
        "Desires Cold Food & Drinks",
        "Aggravated by Cold Drinks / Ice",
        "Comfortable with Room Temperature"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["thermalFood"]
    },
    thermalSeason: {
      label: "Season & Weather Reaction",
      options: [
        "Chilly Patient (Worse in Winter)",
        "Hot Patient (Worse in Summer)",
        "Ambithermal (Sensitive to Both)",
        "Worse in Monsoon / Damp Weather",
        "Worse During Weather Change"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["thermalSeason"]
    },
    sleep: {
      label: "Sleep Pattern & Posture",
      options: [
        "Sound & Refreshing",
        "Disturbed / Light Sleep",
        "Unrefreshing Sleep",
        "Difficulty Falling Asleep",
        "Wakes Between 2–4 AM",
        "Sleeps on Left Side",
        "Sleeps on Right Side",
        "Sleeps on Abdomen",
        "Sleeps on Back"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["sleep"]
    },
    dreams: {
      label: "Dreams",
      options: [
        "Unremembered",
        "Anxious / Frightful Dreams",
        "Dreams of Daily Work / Business",
        "Dreams of Falling",
        "Dreams of Water / Snakes",
        "Dreams of Deceased Relatives",
        "Pleasant Dreams"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["dreams"]
    },
    menstrualHistory: {
      label: "Menstrual & Gynaecological History",
      options: [
        "Not Applicable",
        "Regular Cycle (28–30 Days)",
        "Irregular / Delayed Menses",
        "Early / Frequent Menses",
        "Heavy Flow / Clots",
        "Scanty Flow",
        "Painful (Dysmenorrhoea)",
        "Leucorrhoea Present",
        "Menopause Reached"
      ],
      notePlaceholder: "Notes (optional)",
      noteMultiline: true,
      legacyKeys: ["menstrualHistory"]
    }
  },

  mind: {
    workplaceEnv: {
      label: "Workplace Environment",
      options: [
        "Calm & Supportive",
        "High Work Pressure / Deadlines",
        "Competitive Atmosphere",
        "Cordial Colleague Relations",
        "Friction with Superiors",
        "Homemaker / Domestic Work",
        "Student / Academic Pressure",
        "Retired"
      ],
      notePlaceholder: "Notes (optional)",
      noteMultiline: true,
      legacyKeys: ["workplaceEnv"]
    },
    familyEnv: {
      label: "Family Environment",
      options: [
        "Supportive & Harmonious",
        "Close Family Bonding",
        "Domestic Responsibilities Stress",
        "Interpersonal Friction",
        "Financial Worry in Family",
        "Lives Independently"
      ],
      notePlaceholder: "Notes (optional)",
      noteMultiline: true,
      legacyKeys: ["familyEnv"]
    },
    socialPartyEnv: {
      label: "Social Gatherings",
      options: [
        "Enjoys Social Gatherings",
        "Selective Socializing",
        "Avoids Crowds & Parties",
        "Feels Drained in Large Groups",
        "Polite but Reserved"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["socialPartyEnv"]
    },
    friendsComfort: {
      label: "Friends & Social Comfort",
      options: [
        "Few Close Trusted Friends",
        "Large Social Circle",
        "Shares Feelings Openly",
        "Keeps Problems to Self",
        "Prefers Solitude When Upset"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["friendsComfort"]
    },
    introExtrovert: {
      label: "Temperament (Introvert / Extrovert)",
      options: [
        "Introverted & Observant",
        "Balanced (Ambivert)",
        "Extroverted & Expressive",
        "Reserved with Strangers, Open with Family"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["introExtrovert"]
    },
    emotionsFeelings: {
      label: "Emotions & Sensitivity",
      options: [
        "Sensitive & Empathetic",
        "Easily Moved to Tears",
        "Better from Consolation",
        "Aggravated by Consolation",
        "Suppresses Grief / Emotions",
        "Affectionate & Caring",
        "Mood Fluctuations"
      ],
      notePlaceholder: "Notes (optional)",
      noteMultiline: true,
      legacyKeys: ["emotionsFeelings"]
    },
    thoughts: {
      label: "Thought Patterns",
      options: [
        "Calm & Focused",
        "Overthinking / Racing Thoughts",
        "Brooding Over Past Events",
        "Anticipatory Worry About Future",
        "Thoughts Persist at Night",
        "Fastidious / Perfectionist"
      ],
      notePlaceholder: "Notes (optional)",
      noteMultiline: true,
      legacyKeys: ["thoughts"]
    },
    fearsCauses: {
      label: "Fears & Causes",
      options: [
        "Fear of Disease / Health",
        "Fear of Being Alone",
        "Fear of Dark",
        "Fear of Heights",
        "Fear of Failure / Exams",
        "Fear for Family's Safety",
        "Fear of Thunderstorms / Animals",
        "No specific fears reported"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["fearsCauses"]
    },
    angerCauses: {
      label: "Anger & Triggers",
      options: [
        "Rarely Angry / Calm",
        "Anger from Contradiction",
        "Anger at Injustice",
        "Suppressed Anger (Silent Grief)",
        "Quick Temper, Quickly Cools Down",
        "Irritable When Fatigued"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["angerCauses"]
    },
    anxiety: {
      label: "Anxiety",
      options: [
        "Minimal / Calm",
        "Health Anxiety",
        "Anticipatory Anxiety (Before Tasks)",
        "Anxiety for Others / Family",
        "Anxiety About Trifles",
        "Palpitations / Restlessness with Anxiety"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["anxiety"]
    },
    stressResponses: {
      label: "Stress Responses",
      options: [
        "Becomes Quiet & Withdrawn",
        "Seeks Reassurance / Company",
        "Develops Physical Symptoms (Headache/Acidity)",
        "Disturbed Sleep Under Stress",
        "Weeping Relieves Stress",
        "Irritable Under Stress"
      ],
      notePlaceholder: "Notes (optional)",
      legacyKeys: ["stressResponses"]
    },
    additionalObservations: {
      label: "Additional Mental Keynotes",
      options: [
        "Fastidious (Wants Order & Cleanliness)",
        "Strong Willpower",
        "Good Memory",
        "Forgetful Recently",
        "Sensitive to Noise / Light",
        "Religious / Philosophical Disposition",
        "Mild, Gentle, Yielding Disposition"
      ],
      notePlaceholder: "Notes (optional)",
      noteMultiline: true,
      legacyKeys: ["additionalObservations"]
    }
  }
};

function getPatientSectionObject(patient, sectionKey) {
  if (!patient) return {};
  if (sectionKey === "past") {
    if (!patient.pastHistoryData || typeof patient.pastHistoryData !== "object") {
      patient.pastHistoryData = {
        medicalHistory: typeof patient.pastHistory === "string" ? patient.pastHistory : "",
        previousIllnesses: "",
        previousTreatments: "",
        associatedComplaints: patient.associatedComplaints || "",
        familyFather: typeof patient.familyHistory === "string" ? patient.familyHistory : "",
        familyMother: "",
        familyBrother: "",
        familySister: "",
        previousConsultations: ""
      };
    }
    return patient.pastHistoryData;
  }
  if (sectionKey === "personal") {
    if (!patient.personalHistory || typeof patient.personalHistory !== "object") {
      patient.personalHistory = {};
    }
    return patient.personalHistory;
  }
  if (sectionKey === "mind") {
    if (!patient.mindHistory || typeof patient.mindHistory !== "object") {
      patient.mindHistory = {};
    }
    return patient.mindHistory;
  }
  return {};
}

function formatSmartSummaryString(chips, notes) {
  const cleanChips = Array.isArray(chips) ? chips.map(c => String(c || "").trim()).filter(Boolean) : [];
  const cleanNotes = String(notes || "").trim();
  if (cleanChips.length > 0 && cleanNotes) {
    return `${cleanChips.join(", ")} — ${cleanNotes}`;
  }
  if (cleanChips.length > 0) {
    return cleanChips.join(", ");
  }
  return cleanNotes;
}

/**
 * Retrieve or initialize backward-compatible smart field state `{ chips: string[], notes: string }`.
 * Never splits or overwrites legacy free-text notes; preserves them intact in `notes`.
 */
function getSmartFieldState(patient, sectionKey, fieldKey) {
  const sectionObj = getPatientSectionObject(patient, sectionKey);
  if (!sectionObj._smart || typeof sectionObj._smart !== "object") {
    sectionObj._smart = {};
  }

  if (sectionObj._smart[fieldKey] && typeof sectionObj._smart[fieldKey] === "object") {
    const entry = sectionObj._smart[fieldKey];
    if (!Array.isArray(entry.chips)) entry.chips = [];
    if (typeof entry.notes !== "string") entry.notes = String(entry.notes || "");
    return entry;
  }

  // Backward compatibility check: preserve any pre-existing free-text string in `notes`
  const fieldDef = CLINICAL_FIELD_CATALOG[sectionKey]?.[fieldKey];
  let legacyNote = "";
  const candidateKeys = [fieldKey, ...(fieldDef?.legacyKeys || [])];
  for (const k of candidateKeys) {
    const rawVal = sectionObj[k];
    if (typeof rawVal === "string" && rawVal.trim()) {
      legacyNote = rawVal.trim();
      break;
    } else if (Array.isArray(rawVal)) {
      sectionObj._smart[fieldKey] = {
        chips: rawVal.map(v => String(v || "").trim()).filter(Boolean),
        notes: ""
      };
      return sectionObj._smart[fieldKey];
    } else if (rawVal && typeof rawVal === "object" && (Array.isArray(rawVal.chips) || typeof rawVal.notes === "string")) {
      sectionObj._smart[fieldKey] = {
        chips: Array.isArray(rawVal.chips) ? [...rawVal.chips] : [],
        notes: typeof rawVal.notes === "string" ? rawVal.notes : ""
      };
      return sectionObj._smart[fieldKey];
    }
  }

  sectionObj._smart[fieldKey] = {
    chips: [],
    notes: legacyNote
  };
  return sectionObj._smart[fieldKey];
}

function syncSmartSectionSummaries(patient, sectionKey) {
  const sectionObj = getPatientSectionObject(patient, sectionKey);
  const catalog = CLINICAL_FIELD_CATALOG[sectionKey] || {};
  for (const [fieldKey, def] of Object.entries(catalog)) {
    const state = getSmartFieldState(patient, sectionKey, fieldKey);
    const summary = formatSmartSummaryString(state.chips, state.notes);
    sectionObj[fieldKey] = summary;
    if (Array.isArray(def.legacyKeys)) {
      def.legacyKeys.forEach(lk => {
        sectionObj[lk] = summary;
      });
    }
  }

  if (sectionKey === "past") {
    const pastSummaries = [
      sectionObj.pastIllnesses,
      sectionObj.hospitalizationsSurgeries
    ].filter(Boolean).join(" | ");
    sectionObj.medicalHistory = pastSummaries || sectionObj.pastIllnesses || "";
    patient.pastHistory = sectionObj.medicalHistory;
    patient.associatedComplaints = sectionObj.associatedComplaints || "";
    patient.familyHistory = [
      sectionObj.familyFather ? `Father: ${sectionObj.familyFather}` : "",
      sectionObj.familyMother ? `Mother: ${sectionObj.familyMother}` : "",
      sectionObj.familyBrother ? `Brother(s): ${sectionObj.familyBrother}` : "",
      sectionObj.familySister ? `Sister(s): ${sectionObj.familySister}` : ""
    ].filter(Boolean).join("; ");
  }
}

function renderSmartAddField(patient, sectionKey, fieldKey) {
  const fieldDef = CLINICAL_FIELD_CATALOG[sectionKey]?.[fieldKey];
  if (!fieldDef) return "";

  const state = getSmartFieldState(patient, sectionKey, fieldKey);
  const domKey = `${sectionKey}_${fieldKey}`;
  const selectedSet = new Set(state.chips.map(c => c.toLowerCase()));
  const hasChips = state.chips && state.chips.length > 0;
  const hasSavedNote = Boolean(state.notes && state.notes.trim());

  // Selected conditions rendered as compact muted grey text items with delicate remove control
  const chipsHtml = state.chips.map((chipText, idx) => `
    <span class="hc-selected-item" data-chip-value="${escAttr(chipText)}">
      <span class="hc-selected-text">${escAttr(chipText)}</span>
      <button
        type="button"
        class="hc-selected-remove"
        aria-label="Remove ${escAttr(chipText)}"
        title="Remove ${escAttr(chipText)}"
        onclick="removeSmartChip(event, '${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}', ${idx})"
      >&times;</button>
    </span>
  `).join("");

  const optionsHtml = fieldDef.options.map((opt) => {
    const isSelected = selectedSet.has(opt.toLowerCase());
    return `
      <button
        type="button"
        class="hc-popover-option ${isSelected ? 'already-selected' : ''}"
        role="menuitem"
        onclick="selectSmartChipOption(event, '${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}', '${escAttr(opt)}')"
      >
        <span>${escAttr(opt)}</span>
        ${isSelected ? '<span style="font-size:11px;color:#176B46;">Added</span>' : ''}
      </button>
    `;
  }).join("");

  // Saved note displayed cleanly as subtle observation text (no permanently visible empty box)
  const savedNoteHtml = (hasSavedNote && !state.isEditingNote) ? `
    <div class="hc-saved-note-text" id="smartNoteSaved_${domKey}">
      <span class="hc-note-body">${escAttr(state.notes)}</span>
      <button
        type="button"
        class="hc-note-edit-trigger"
        title="Edit observation note"
        onclick="openSmartNoteInput(event, '${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}')"
      >✎ Edit</button>
    </div>
  ` : "";

  // Editing input box appears only when user actively clicks to add/edit a note
  const editingNoteHtml = state.isEditingNote ? `
    <div class="hc-smart-note-wrap active" id="smartNoteWrap_${domKey}">
      <input
        type="text"
        id="smartNote_${domKey}"
        class="hc-smart-note-input"
        placeholder="${escAttr(fieldDef.notePlaceholder || 'Observation note...')}"
        value="${escAttr(state.notes || '')}"
        oninput="handleSmartNoteInput('${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}', this.value)"
        onkeydown="if(event.key==='Enter'){event.preventDefault();closeSmartNoteInput(event,'${escAttr(patient.id)}','${escAttr(sectionKey)}','${escAttr(fieldKey)}');}"
      >
      <button
        type="button"
        class="hc-custom-entry-save"
        onclick="closeSmartNoteInput(event, '${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}')"
      >Done</button>
    </div>
  ` : "";

  return `
    <div class="hc-smart-field ${hasChips || hasSavedNote ? 'has-content' : 'is-empty'}" id="smartField_${domKey}" data-section="${escAttr(sectionKey)}" data-field="${escAttr(fieldKey)}">
      <!-- Field Header: Field Name on Left, + Add Button on Right -->
      <div class="hc-smart-field-head">
        <label class="hc-smart-title" for="smartAddBtn_${domKey}">${escAttr(fieldDef.label)}</label>

        <div class="hc-add-popover-anchor">
          <button
            type="button"
            id="smartAddBtn_${domKey}"
            class="hc-add-chip-btn"
            aria-haspopup="true"
            aria-expanded="false"
            onclick="toggleSmartAddMenu(event, '${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}')"
          >
            <span>+ Add</span>
          </button>

          <div
            class="hc-add-popover"
            id="smartPopover_${domKey}"
            role="menu"
            aria-label="Options for ${escAttr(fieldDef.label)}"
          >
            <div class="hc-popover-title">Select to add</div>
            ${optionsHtml}
            <button
              type="button"
              class="hc-popover-option hc-popover-option-custom"
              role="menuitem"
              onclick="openSmartCustomEntry(event, '${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}')"
            >
              <span>+ Custom Entry...</span>
            </button>
            <button
              type="button"
              class="hc-popover-option hc-popover-option-custom"
              role="menuitem"
              onclick="openSmartNoteInput(event, '${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}')"
            >
              <span>${hasSavedNote ? '✎ Edit Observation...' : '+ Add Observation...'}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Selected conditions: small grey text directly underneath field name -->
      ${hasChips ? `
        <div class="hc-selected-conditions-list" id="smartChipsRow_${domKey}">
          ${chipsHtml}
        </div>
      ` : `<div class="hc-selected-conditions-list" id="smartChipsRow_${domKey}" style="display: none;"></div>`}

      <!-- Custom Entry Row -->
      <div class="hc-custom-entry-row" id="smartCustomRow_${domKey}">
        <input
          type="text"
          id="smartCustomInput_${domKey}"
          class="hc-custom-entry-input"
          placeholder="Add custom entry"
          onkeydown="handleSmartCustomKeydown(event, '${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}')"
        >
        <button
          type="button"
          class="hc-custom-entry-save"
          onclick="submitSmartCustomEntry(event, '${escAttr(patient.id)}', '${escAttr(sectionKey)}', '${escAttr(fieldKey)}')"
        >Add</button>
        <button
          type="button"
          class="hc-custom-entry-cancel"
          onclick="closeSmartCustomEntry(event, '${escAttr(sectionKey)}', '${escAttr(fieldKey)}')"
        >Cancel</button>
      </div>

      ${savedNoteHtml}
      ${editingNoteHtml}
    </div>
  `;
}

function closeAllSmartPopovers() {
  document.querySelectorAll(".hc-add-popover.open").forEach(pop => {
    pop.classList.remove("open");
  });
  document.querySelectorAll(".hc-add-chip-btn[aria-expanded='true']").forEach(btn => {
    btn.setAttribute("aria-expanded", "false");
  });
  document.querySelectorAll(".hc-smart-field.popover-open").forEach(field => {
    field.classList.remove("popover-open");
  });
}

window.toggleSmartAddMenu = function(event, patientId, sectionKey, fieldKey) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const domKey = `${sectionKey}_${fieldKey}`;
  const popover = document.getElementById(`smartPopover_${domKey}`);
  const btn = document.getElementById(`smartAddBtn_${domKey}`);
  const fieldWrap = document.getElementById(`smartField_${domKey}`);
  if (!popover) return;

  const wasOpen = popover.classList.contains("open");
  closeAllSmartPopovers();

  if (!wasOpen) {
    popover.classList.add("open");
    if (btn) btn.setAttribute("aria-expanded", "true");
    if (fieldWrap) fieldWrap.classList.add("popover-open");
    const firstOption = popover.querySelector(".hc-popover-option");
    if (firstOption) {
      setTimeout(() => firstOption.focus(), 20);
    }
  }
};

function refreshSmartFieldDOM(patientId, sectionKey, fieldKey) {
  const patient = CLINIC_STATE.patients.find(p => p.id === patientId);
  if (!patient) return;
  const domKey = `${sectionKey}_${fieldKey}`;
  const existingEl = document.getElementById(`smartField_${domKey}`);
  if (!existingEl) return;

  // Preserve current note input value if user was typing
  const noteEl = document.getElementById(`smartNote_${domKey}`);
  if (noteEl) {
    const state = getSmartFieldState(patient, sectionKey, fieldKey);
    state.notes = noteEl.value;
  }

  const temp = document.createElement("div");
  temp.innerHTML = renderSmartAddField(patient, sectionKey, fieldKey).trim();
  const replacement = temp.firstElementChild;
  if (replacement) {
    existingEl.replaceWith(replacement);
  }
}

window.selectSmartChipOption = function(event, patientId, sectionKey, fieldKey, optionValue) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const patient = CLINIC_STATE.patients.find(p => p.id === patientId);
  if (!patient) return;

  const state = getSmartFieldState(patient, sectionKey, fieldKey);
  const cleanOpt = String(optionValue || "").trim();
  if (!cleanOpt) return;

  const exists = state.chips.some(c => c.toLowerCase() === cleanOpt.toLowerCase());
  if (!exists) {
    state.chips.push(cleanOpt);
  }
  state.showNote = true;

  syncSmartSectionSummaries(patient, sectionKey);
  closeAllSmartPopovers();
  refreshSmartFieldDOM(patientId, sectionKey, fieldKey);
  triggerSmartAutosave(patientId, sectionKey);
};

window.removeSmartChip = function(event, patientId, sectionKey, fieldKey, chipIndex) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const patient = CLINIC_STATE.patients.find(p => p.id === patientId);
  if (!patient) return;

  const state = getSmartFieldState(patient, sectionKey, fieldKey);
  if (chipIndex >= 0 && chipIndex < state.chips.length) {
    state.chips.splice(chipIndex, 1);
  }
  

  syncSmartSectionSummaries(patient, sectionKey);
  refreshSmartFieldDOM(patientId, sectionKey, fieldKey);
  triggerSmartAutosave(patientId, sectionKey);
};

window.openSmartCustomEntry = function(event, patientId, sectionKey, fieldKey) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  closeAllSmartPopovers();
  const domKey = `${sectionKey}_${fieldKey}`;
  const customRow = document.getElementById(`smartCustomRow_${domKey}`);
  const customInput = document.getElementById(`smartCustomInput_${domKey}`);
  if (customRow) {
    customRow.classList.add("active");
  }
  if (customInput) {
    customInput.value = "";
    setTimeout(() => customInput.focus(), 20);
  }
};

window.openSmartNoteInput = function(event, patientId, sectionKey, fieldKey) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const patient = CLINIC_STATE.patients.find(p => p.id === patientId);
  if (!patient) return;
  const state = getSmartFieldState(patient, sectionKey, fieldKey);
  state.isEditingNote = true;
  closeAllSmartPopovers();
  refreshSmartFieldDOM(patientId, sectionKey, fieldKey);
  const domKey = `${sectionKey}_${fieldKey}`;
  const noteEl = document.getElementById(`smartNote_${domKey}`);
  if (noteEl) {
    setTimeout(() => noteEl.focus(), 25);
  }
};

window.closeSmartNoteInput = function(event, patientId, sectionKey, fieldKey) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const patient = CLINIC_STATE.patients.find(p => p.id === patientId);
  if (!patient) return;
  const state = getSmartFieldState(patient, sectionKey, fieldKey);
  const domKey = `${sectionKey}_${fieldKey}`;
  const noteEl = document.getElementById(`smartNote_${domKey}`);
  if (noteEl) {
    state.notes = noteEl.value.trim();
  }
  state.isEditingNote = false;
  syncSmartSectionSummaries(patient, sectionKey);
  refreshSmartFieldDOM(patientId, sectionKey, fieldKey);
  triggerSmartAutosave(patientId, sectionKey);
};

window.closeSmartCustomEntry = function(event, sectionKey, fieldKey) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const domKey = `${sectionKey}_${fieldKey}`;
  const customRow = document.getElementById(`smartCustomRow_${domKey}`);
  const customInput = document.getElementById(`smartCustomInput_${domKey}`);
  if (customRow) customRow.classList.remove("active");
  if (customInput) customInput.value = "";
};

window.submitSmartCustomEntry = function(event, patientId, sectionKey, fieldKey) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const domKey = `${sectionKey}_${fieldKey}`;
  const customInput = document.getElementById(`smartCustomInput_${domKey}`);
  const customVal = customInput ? customInput.value.trim() : "";
  if (!customVal) {
    closeSmartCustomEntry(null, sectionKey, fieldKey);
    return;
  }

  const patient = CLINIC_STATE.patients.find(p => p.id === patientId);
  if (!patient) return;

  const state = getSmartFieldState(patient, sectionKey, fieldKey);
  const exists = state.chips.some(c => c.toLowerCase() === customVal.toLowerCase());
  if (!exists) {
    state.chips.push(customVal);
  }
  state.showNote = true;

  syncSmartSectionSummaries(patient, sectionKey);
  refreshSmartFieldDOM(patientId, sectionKey, fieldKey);
  triggerSmartAutosave(patientId, sectionKey);
};

window.handleSmartCustomKeydown = function(event, patientId, sectionKey, fieldKey) {
  if (!event) return;
  if (event.key === "Enter") {
    event.preventDefault();
    submitSmartCustomEntry(event, patientId, sectionKey, fieldKey);
  } else if (event.key === "Escape") {
    event.preventDefault();
    closeSmartCustomEntry(event, sectionKey, fieldKey);
  }
};

window.handleSmartNoteInput = function(patientId, sectionKey, fieldKey, noteValue) {
  const patient = CLINIC_STATE.patients.find(p => p.id === patientId);
  if (!patient) return;
  const state = getSmartFieldState(patient, sectionKey, fieldKey);
  state.notes = String(noteValue || "");
  syncSmartSectionSummaries(patient, sectionKey);
  triggerSmartAutosave(patientId, sectionKey);
};

// Global click-outside and keyboard navigation (ArrowDown, ArrowUp, Enter, Escape) for + Add popovers
document.addEventListener("click", (e) => {
  if (!e.target.closest(".hc-add-popover-anchor")) {
    closeAllSmartPopovers();
  }
});

document.addEventListener("keydown", (e) => {
  const openPop = document.querySelector(".hc-add-popover.open");
  if (!openPop) return;

  const options = Array.from(openPop.querySelectorAll(".hc-popover-option"));
  if (options.length === 0) return;
  const currentIdx = options.indexOf(document.activeElement);

  if (e.key === "Escape") {
    e.preventDefault();
    const anchor = openPop.closest(".hc-add-popover-anchor");
    const triggerBtn = anchor ? anchor.querySelector(".hc-add-chip-btn") : null;
    closeAllSmartPopovers();
    if (triggerBtn) triggerBtn.focus();
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    const nextIdx = currentIdx < options.length - 1 ? currentIdx + 1 : 0;
    options[nextIdx].focus();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    const prevIdx = currentIdx > 0 ? currentIdx - 1 : options.length - 1;
    options[prevIdx].focus();
  }
});

// Render Multi-Tab Patient Profile & Case Record Dossier
function renderPatientCaseDossier(patient) {
  if (!patient) return "";

  const p = patient;
  // Ensure sections and smart summaries are initialized without overwriting legacy strings
  getPatientSectionObject(p, "past");
  getPatientSectionObject(p, "personal");
  getPatientSectionObject(p, "mind");
  syncSmartSectionSummaries(p, "past");
  syncSmartSectionSummaries(p, "personal");
  syncSmartSectionSummaries(p, "mind");

  const past = p.pastHistoryData;
  const pers = p.personalHistory;
  const mind = p.mindHistory;

  if (!Array.isArray(p.consultations) || p.consultations.length === 0) {
    p.consultations = [
      {
        id: "CONS-INIT",
        stage: "Day 1 — Initial Consultation",
        date: (p.created_at || new Date().toISOString()).split("T")[0],
        displayDate: p.registeredDate || "Recorded",
        observations: `Chief Complaint: ${p.chiefComplaint || "—"}`,
        medicine: p.prescription || "Constitutional evaluation",
        status: "Initial Evaluation",
        instructions: "Follow up as scheduled.",
        doctor: "Dr. Suraj D. Panigrahi"
      }
    ];
  }

  const activeTab = window.__ACTIVE_CASE_TAB || "overview";
  const initials = (p.name || "PT").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  // Check completion status for step indicators and overview summary cards
  const hasPast = Boolean(
    past.pastIllnesses ||
    past.recurrentInfections ||
    past.hospitalizationsSurgeries ||
    past.previousTreatments ||
    past.familyFather ||
    past.familyMother
  );
  const hasPers = Boolean(pers.appetite || pers.thirst || pers.craving || pers.sleep || pers.thermalSeason);
  const hasMind = Boolean(mind.workplaceEnv || mind.familyEnv || mind.anxiety || mind.thoughts || mind.emotionsFeelings);

  // Build Timeline Stage Progression Chips
  const stagesOrder = ["Day 1 — Initial Consultation", "Follow-up 1", "Follow-up 2", "Latest Visit"];
  const recordedStages = new Set(p.consultations.map(c => c.stage));

  return `
    <div class="case-dossier-wrapper" data-patient-id="${escAttr(p.id)}">
      <!-- Compact Patient Summary Card -->
      <div class="dossier-hero-card">
        <div class="dossier-patient-main">
          <div class="dossier-avatar">${initials}</div>
          <div>
            <div class="dossier-name-row">
              <h2>${escAttr(p.name)}</h2>
              <span class="source-badge-staff">ID: ${escAttr(p.id)}</span>
            </div>
            <div class="dossier-meta-sub">
              <strong>Age / Gender:</strong> ${escAttr(p.age)} yrs (${escAttr(p.gender)}) •
              <strong>Phone:</strong> ${escAttr(p.phone)}
              ${p.email ? ` • <strong>Email:</strong> ${escAttr(p.email)}` : ""} •
              <strong>Registered:</strong> ${escAttr(p.registeredDate)}
            </div>
            <div class="dossier-meta-sub" style="margin-top: 4px;">
              <strong>Chief Complaint:</strong> ${escAttr(p.chiefComplaint || "—")} •
              <strong>Physician:</strong> Dr. Suraj D. Panigrahi
            </div>
          </div>
        </div>
        <div class="dossier-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="primary-btn-solid" onclick="openProgressModal('${escAttr(p.id)}')">
            <i data-lucide="plus-circle"></i>
            <span>Record Follow-Up Visit</span>
          </button>
          <button type="button" class="secondary-btn-outline" onclick="window.print()">
            <i data-lucide="printer"></i>
            <span>Print Case</span>
          </button>
        </div>
      </div>

      <!-- Simple Step-Progress Indicator -->
      <div class="hc-step-progress-bar" aria-label="Clinical Case Taking Steps">
        <button type="button" class="hc-step-progress-item ${activeTab === 'overview' ? 'active' : 'completed'}" onclick="switchPatientProfileTab('overview')">
          <span class="hc-step-num-circle">1</span>
          <span>Step 1: Registration</span>
        </button>
        <div class="hc-step-divider-line"></div>
        <button type="button" class="hc-step-progress-item ${activeTab === 'past' ? 'active' : (hasPast ? 'completed' : '')}" onclick="switchPatientProfileTab('past')">
          <span class="hc-step-num-circle">2</span>
          <span>Step 2: Medical History</span>
        </button>
        <div class="hc-step-divider-line"></div>
        <button type="button" class="hc-step-progress-item ${activeTab === 'personal' ? 'active' : (hasPers ? 'completed' : '')}" onclick="switchPatientProfileTab('personal')">
          <span class="hc-step-num-circle">3</span>
          <span>Step 3: Personal History</span>
        </button>
        <div class="hc-step-divider-line"></div>
        <button type="button" class="hc-step-progress-item ${activeTab === 'mind' ? 'active' : (hasMind ? 'completed' : '')}" onclick="switchPatientProfileTab('mind')">
          <span class="hc-step-num-circle">4</span>
          <span>Step 4: Mind History</span>
        </button>
        <div class="hc-step-divider-line"></div>
        <button type="button" class="hc-step-progress-item ${(activeTab === 'consultations' || activeTab === 'timeline') ? 'active' : 'completed'}" onclick="switchPatientProfileTab('timeline')">
          <span class="hc-step-num-circle">5</span>
          <span>Step 5: Timeline</span>
        </button>
      </div>

      <!-- Patient Profile Multi-Tab Navigation Bar -->
      <div class="hc-profile-tabs-bar" role="tablist">
        <button type="button" class="hc-profile-tab-btn ${activeTab === 'overview' ? 'active' : ''}" onclick="switchPatientProfileTab('overview')">
          <i data-lucide="file-text"></i>
          <span>Overview</span>
        </button>
        <button type="button" class="hc-profile-tab-btn ${activeTab === 'past' ? 'active' : ''}" onclick="switchPatientProfileTab('past')">
          <i data-lucide="history"></i>
          <span>Medical History</span>
        </button>
        <button type="button" class="hc-profile-tab-btn ${activeTab === 'personal' ? 'active' : ''}" onclick="switchPatientProfileTab('personal')">
          <i data-lucide="user-check"></i>
          <span>Personal History</span>
        </button>
        <button type="button" class="hc-profile-tab-btn ${activeTab === 'mind' ? 'active' : ''}" onclick="switchPatientProfileTab('mind')">
          <i data-lucide="brain"></i>
          <span>Mind History</span>
        </button>
        <button type="button" class="hc-profile-tab-btn ${activeTab === 'consultations' ? 'active' : ''}" onclick="switchPatientProfileTab('consultations')">
          <i data-lucide="stethoscope"></i>
          <span>Consultations (${p.consultations.length})</span>
        </button>
        <button type="button" class="hc-profile-tab-btn ${activeTab === 'timeline' ? 'active' : ''}" onclick="switchPatientProfileTab('timeline')">
          <i data-lucide="git-commit-horizontal"></i>
          <span>Timeline</span>
        </button>
      </div>

      <!-- TAB 1: OVERVIEW -->
      <div class="hc-tab-pane ${activeTab === 'overview' ? 'active' : ''}" id="hcTab-overview">
        <div class="case-record-section-card" style="margin-bottom: 18px;">
          <div class="case-section-header" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i data-lucide="clipboard-check"></i>
              <h3>Registration &amp; Chief Complaint</h3>
            </div>
            <span class="hc-autosave-indicator saved" id="overviewSaveBadge">Saved</span>
          </div>
          <form onsubmit="saveOverviewSection(event, '${escAttr(p.id)}')">
            <div class="form-row-3">
              <div class="form-group">
                <label>Patient Full Name *</label>
                <input type="text" id="ovFullName" class="clean-input" value="${escAttr(p.name)}" oninput="autoSavePatientTabs('${escAttr(p.id)}')" required>
              </div>
              <div class="form-group">
                <label>Age *</label>
                <input type="number" id="ovAge" class="clean-input" value="${escAttr(p.age)}" oninput="autoSavePatientTabs('${escAttr(p.id)}')" required>
              </div>
              <div class="form-group">
                <label>Gender *</label>
                <select id="ovGender" class="clean-select" onchange="autoSavePatientTabs('${escAttr(p.id)}')">
                  <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
                  <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
                  <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
            </div>
            <div class="form-row-3">
              <div class="form-group">
                <label>Phone Number *</label>
                <input type="tel" id="ovPhone" class="clean-input" value="${escAttr(p.phone)}" oninput="autoSavePatientTabs('${escAttr(p.id)}')" required>
              </div>
              <div class="form-group">
                <label>Email Address (Optional)</label>
                <input type="email" id="ovEmail" class="clean-input" value="${escAttr(p.email)}" oninput="autoSavePatientTabs('${escAttr(p.id)}')" placeholder="patient@example.com">
              </div>
              <div class="form-group">
                <label>Residential Address *</label>
                <input type="text" id="ovAddress" class="clean-input" value="${escAttr(p.address)}" oninput="autoSavePatientTabs('${escAttr(p.id)}')" required>
              </div>
            </div>
            <div class="form-group">
              <label>Chief Complaint (C/C) *</label>
              <textarea id="ovChiefComplaint" class="clean-textarea" rows="2" oninput="autoSavePatientTabs('${escAttr(p.id)}')" required>${escAttr(p.chiefComplaint)}</textarea>
            </div>
            <div class="hc-section-save-bar">
              <span style="font-size: 12.5px; color: #78847D;">Patient ID: <strong>${escAttr(p.id)}</strong></span>
              <div style="display: flex; gap: 10px;">
                <button type="submit" class="primary-btn-solid">
                  <i data-lucide="save"></i>
                  <span>Save Registration</span>
                </button>
                <button type="button" class="secondary-btn-outline" onclick="switchPatientProfileTab('past')">
                  <span>Next: Medical History →</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <!-- Case Summary Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
          <div class="case-record-section-card">
            <div class="case-section-header">
              <i data-lucide="history"></i>
              <h3>Medical History</h3>
            </div>
            <p style="font-size: 13px; color: #78847D; margin-bottom: 12px; line-height: 1.5;">
              ${hasPast
                ? `<strong>Past:</strong> ${escAttr(past.pastIllnesses || past.recurrentInfections || past.medicalHistory || "Recorded")}<br><strong>Family:</strong> Father: ${escAttr(past.familyFather || "—")} • Mother: ${escAttr(past.familyMother || "—")}`
                : "No past or family medical history recorded yet."}
            </p>
            <button type="button" class="secondary-btn-outline" onclick="switchPatientProfileTab('past')">
              <span>${hasPast ? "Open Medical History" : "+ Add Medical History"}</span>
            </button>
          </div>

          <div class="case-record-section-card">
            <div class="case-section-header">
              <i data-lucide="user-check"></i>
              <h3>Personal History</h3>
            </div>
            <p style="font-size: 13px; color: #78847D; margin-bottom: 12px; line-height: 1.5;">
              ${hasPers
                ? `<strong>Appetite:</strong> ${escAttr(pers.appetite || "—")} • <strong>Thirst:</strong> ${escAttr(pers.thirst || "—")}<br><strong>Thermals:</strong> ${escAttr(pers.thermalSeason || "—")} • <strong>Sleep:</strong> ${escAttr(pers.sleep || "—")}`
                : "No physical generals or personal modalities recorded yet."}
            </p>
            <button type="button" class="secondary-btn-outline" onclick="switchPatientProfileTab('personal')">
              <span>${hasPers ? "Open Personal History" : "+ Add Personal History"}</span>
            </button>
          </div>

          <div class="case-record-section-card">
            <div class="case-section-header">
              <i data-lucide="brain"></i>
              <h3>Mind History</h3>
            </div>
            <p style="font-size: 13px; color: #78847D; margin-bottom: 12px; line-height: 1.5;">
              ${hasMind
                ? `<strong>Anxiety:</strong> ${escAttr(mind.anxiety || "—")}<br><strong>Disposition:</strong> ${escAttr(mind.thoughts || mind.emotionsFeelings || mind.workplaceEnv || "Recorded")}`
                : "No mental or emotional disposition recorded yet."}
            </p>
            <button type="button" class="secondary-btn-outline" onclick="switchPatientProfileTab('mind')">
              <span>${hasMind ? "Open Mind History" : "+ Add Mind History"}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- TAB 2: PAST / MEDICAL HISTORY -->
      <div class="hc-tab-pane ${activeTab === 'past' ? 'active' : ''}" id="hcTab-past">
        <div class="case-record-section-card" style="background: transparent; border: none; padding: 0; box-shadow: none;">
          <div class="hc-clinical-section-block" style="margin-bottom: 16px; padding: 16px 22px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div>
                <h3 class="hc-section-heading">Step 2 — Medical History</h3>
              </div>
              <span class="hc-autosave-indicator saved" id="pastSaveBadge">Saved</span>
            </div>
          </div>

          <form onsubmit="savePastHistorySection(event, '${escAttr(p.id)}')">
            <!-- SECTION A — PAST CONDITIONS -->
            <div class="hc-clinical-section-block">
              <div class="hc-clinical-section-header">
                <div>
                  <h4 class="hc-subsection-heading">Past Conditions</h4>
                </div>
              </div>
              <div class="hc-smart-grid-2">
                ${renderSmartAddField(p, "past", "pastIllnesses")}
                ${renderSmartAddField(p, "past", "recurrentInfections")}
              </div>
              <div style="margin-top: 10px;">
                ${renderSmartAddField(p, "past", "hospitalizationsSurgeries")}
              </div>
            </div>

            <!-- SECTION B — TREATMENT HISTORY -->
            <div class="hc-clinical-section-block">
              <div class="hc-clinical-section-header">
                <div>
                  <h4 class="hc-subsection-heading">Treatment History</h4>
                </div>
              </div>
              <div class="hc-smart-grid-2">
                ${renderSmartAddField(p, "past", "previousTreatments")}
                ${renderSmartAddField(p, "past", "associatedComplaints")}
                ${renderSmartAddField(p, "past", "previousConsultations")}
                ${renderSmartAddField(p, "past", "diagnosticReports")}
              </div>
            </div>

            <!-- SECTION C — FAMILY HISTORY -->
            <div class="hc-clinical-section-block">
              <div class="hc-clinical-section-header">
                <div>
                  <h4 class="hc-subsection-heading">Family History</h4>
                </div>
              </div>
              <div class="hc-family-grid-2">
                ${renderSmartAddField(p, "past", "familyFather")}
                ${renderSmartAddField(p, "past", "familyMother")}
                ${renderSmartAddField(p, "past", "familyBrother")}
                ${renderSmartAddField(p, "past", "familySister")}
              </div>

              <div class="hc-section-save-bar">
                <div></div>
                <div style="display: flex; gap: 10px;">
                  <button type="submit" class="primary-btn-solid">
                    <i data-lucide="save"></i>
                    <span>Save Medical History</span>
                  </button>
                  <button type="button" class="secondary-btn-outline" onclick="switchPatientProfileTab('personal')">
                    <span>Next: Personal History →</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- TAB 3: PERSONAL HISTORY -->
      <div class="hc-tab-pane ${activeTab === 'personal' ? 'active' : ''}" id="hcTab-personal">
        <div class="case-record-section-card" style="background: transparent; border: none; padding: 0; box-shadow: none;">
          <div class="hc-clinical-section-block" style="margin-bottom: 16px; padding: 16px 22px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div>
                <h3 class="hc-section-heading">Step 3 — Personal History</h3>
              </div>
              <span class="hc-autosave-indicator saved" id="personalSaveBadge">Saved</span>
            </div>
          </div>

          <form onsubmit="savePersonalHistorySection(event, '${escAttr(p.id)}')">
            <!-- Diet & Thirst -->
            <div class="hc-clinical-section-block">
              <div class="hc-clinical-section-header">
                <div>
                  <h4 class="hc-subsection-heading">Diet &amp; Thirst</h4>
                </div>
              </div>
              <div class="hc-smart-grid-2">
                ${renderSmartAddField(p, "personal", "appetite")}
                ${renderSmartAddField(p, "personal", "craving")}
                ${renderSmartAddField(p, "personal", "aversion")}
                ${renderSmartAddField(p, "personal", "thirst")}
              </div>
            </div>

            <!-- Elimination & Habits -->
            <div class="hc-clinical-section-block">
              <div class="hc-clinical-section-header">
                <div>
                  <h4 class="hc-subsection-heading">Elimination &amp; Habits</h4>
                </div>
              </div>
              <div class="hc-smart-grid-2">
                ${renderSmartAddField(p, "personal", "urine")}
                ${renderSmartAddField(p, "personal", "bowel")}
                ${renderSmartAddField(p, "personal", "perspiration")}
                ${renderSmartAddField(p, "personal", "habits")}
              </div>
              <div style="margin-top: 10px;">
                ${renderSmartAddField(p, "personal", "hobbies")}
              </div>
            </div>

            <!-- Thermal Modalities -->
            <div class="hc-clinical-section-block">
              <div class="hc-clinical-section-header">
                <div>
                  <h4 class="hc-subsection-heading">Thermal Modalities</h4>
                </div>
              </div>
              <div class="hc-smart-grid-2">
                ${renderSmartAddField(p, "personal", "thermalBath")}
                ${renderSmartAddField(p, "personal", "thermalCovering")}
                ${renderSmartAddField(p, "personal", "thermalFood")}
                ${renderSmartAddField(p, "personal", "thermalSeason")}
              </div>
            </div>

            <!-- Sleep & Gynaecological History -->
            <div class="hc-clinical-section-block">
              <div class="hc-clinical-section-header">
                <div>
                  <h4 class="hc-subsection-heading">Sleep &amp; Gynaecological History</h4>
                </div>
              </div>
              <div class="hc-smart-grid-2">
                ${renderSmartAddField(p, "personal", "sleep")}
                ${renderSmartAddField(p, "personal", "dreams")}
              </div>
              <div style="margin-top: 10px;">
                ${renderSmartAddField(p, "personal", "menstrualHistory")}
              </div>

              <div class="hc-section-save-bar">
                <div></div>
                <div style="display: flex; gap: 10px;">
                  <button type="submit" class="primary-btn-solid">
                    <i data-lucide="save"></i>
                    <span>Save Personal History</span>
                  </button>
                  <button type="button" class="secondary-btn-outline" onclick="switchPatientProfileTab('mind')">
                    <span>Next: Mind History →</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- TAB 4: MIND HISTORY -->
      <div class="hc-tab-pane ${activeTab === 'mind' ? 'active' : ''}" id="hcTab-mind">
        <div class="case-record-section-card" style="background: transparent; border: none; padding: 0; box-shadow: none;">
          <div class="hc-clinical-section-block" style="margin-bottom: 16px; padding: 16px 22px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div>
                <h3 class="hc-section-heading">Step 4 — Mind History</h3>
              </div>
              <span class="hc-autosave-indicator saved" id="mindSaveBadge">Saved</span>
            </div>
          </div>

          <form onsubmit="saveMindHistorySection(event, '${escAttr(p.id)}')">
            <!-- Environment & Social Comfort -->
            <div class="hc-clinical-section-block">
              <div class="hc-clinical-section-header">
                <div>
                  <h4 class="hc-subsection-heading">Environment &amp; Social Comfort</h4>
                </div>
              </div>
              <div class="hc-smart-grid-2">
                ${renderSmartAddField(p, "mind", "workplaceEnv")}
                ${renderSmartAddField(p, "mind", "familyEnv")}
                ${renderSmartAddField(p, "mind", "socialPartyEnv")}
                ${renderSmartAddField(p, "mind", "friendsComfort")}
              </div>
              <div style="margin-top: 10px;">
                ${renderSmartAddField(p, "mind", "introExtrovert")}
              </div>
            </div>

            <!-- Emotional State & Disposition -->
            <div class="hc-clinical-section-block">
              <div class="hc-clinical-section-header">
                <div>
                  <h4 class="hc-subsection-heading">Emotional State &amp; Disposition</h4>
                </div>
              </div>
              <div class="hc-smart-grid-2">
                ${renderSmartAddField(p, "mind", "emotionsFeelings")}
                ${renderSmartAddField(p, "mind", "thoughts")}
                ${renderSmartAddField(p, "mind", "fearsCauses")}
                ${renderSmartAddField(p, "mind", "angerCauses")}
                ${renderSmartAddField(p, "mind", "anxiety")}
                ${renderSmartAddField(p, "mind", "stressResponses")}
              </div>
              <div style="margin-top: 10px;">
                ${renderSmartAddField(p, "mind", "additionalObservations")}
              </div>

              <div class="hc-section-save-bar">
                <div></div>
                <div style="display: flex; gap: 10px;">
                  <button type="submit" class="primary-btn-solid">
                    <i data-lucide="save"></i>
                    <span>Save Mind History</span>
                  </button>
                  <button type="button" class="secondary-btn-outline" onclick="switchPatientProfileTab('consultations')">
                    <span>Next: Consultations →</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- TAB 5: CONSULTATION HISTORY -->
      <div class="hc-tab-pane ${activeTab === 'consultations' ? 'active' : ''}" id="hcTab-consultations">
        <div class="case-record-section-card">
          <div class="case-section-header" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i data-lucide="stethoscope"></i>
              <h3>Consultations &amp; Treatments</h3>
            </div>
            <button type="button" class="primary-btn-solid" onclick="openProgressModal('${escAttr(p.id)}')">
              <i data-lucide="plus"></i>
              <span>+ Add Consultation</span>
            </button>
          </div>

          <div class="data-table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Visit Stage</th>
                  <th>Date</th>
                  <th>Follow-up Observations &amp; Symptoms</th>
                  <th>Medicines &amp; Treatment</th>
                  <th>Progress Status</th>
                </tr>
              </thead>
              <tbody>
                ${p.consultations.map(c => `
                  <tr>
                    <td><strong style="color: var(--primary-green); font-weight: 500;">${escAttr(c.stage)}</strong></td>
                    <td>${escAttr(c.displayDate || c.date)}</td>
                    <td style="max-width: 340px;">${escAttr(c.observations)}</td>
                    <td>
                      <strong style="font-weight: 500;">${escAttr(c.medicine)}</strong>
                      ${c.instructions ? `<div style="font-size: 12px; color: #78847D;">${escAttr(c.instructions)}</div>` : ""}
                    </td>
                    <td><span class="pill-indicator pill-good">${escAttr(c.status || "Recorded")}</span></td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- TAB 6: PROGRESS TIMELINE -->
      <div class="hc-tab-pane ${activeTab === 'timeline' ? 'active' : ''}" id="hcTab-timeline">
        <div class="case-record-section-card">
          <div class="case-section-header" style="justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i data-lucide="git-commit-horizontal"></i>
              <h3>Progress Timeline</h3>
            </div>
            <button type="button" class="primary-btn-solid" onclick="openProgressModal('${escAttr(p.id)}')">
              <i data-lucide="plus-circle"></i>
              <span>Record Follow-Up</span>
            </button>
          </div>

          <!-- Visual Stage Flow Banner: Day 1 -> Follow-up 1 -> Follow-up 2 -> Latest Visit -->
          <div class="hc-timeline-flow-banner">
            ${stagesOrder.map((stg, idx) => `
              <span class="hc-timeline-step-chip ${recordedStages.has(stg) ? 'recorded' : ''}">
                <i data-lucide="${recordedStages.has(stg) ? 'check-circle-2' : 'circle'}"></i>
                <span>${stg}</span>
              </span>
              ${idx < stagesOrder.length - 1 ? '<span class="hc-timeline-arrow">→</span>' : ''}
            `).join("")}
          </div>

          <div class="hc-progress-timeline-list">
            ${p.consultations.map((c, index) => `
              <div class="hc-progress-card">
                <div class="hc-progress-header">
                  <span class="hc-progress-stage">Visit #${index + 1}: ${escAttr(c.stage)}</span>
                  <span class="hc-progress-date">${escAttr(c.displayDate || c.date)}</span>
                </div>
                <div class="hc-progress-grid">
                  <div class="hc-progress-item" style="grid-column: 1 / -1;">
                    <strong>Follow-Up Observations &amp; Clinical Notes</strong>
                    <span>${escAttr(c.observations)}</span>
                  </div>
                  <div class="hc-progress-item">
                    <strong>Medicines &amp; Treatment Prescribed</strong>
                    <span>${escAttr(c.medicine)}</span>
                  </div>
                  <div class="hc-progress-item">
                    <strong>Clinical Status &amp; Instructions</strong>
                    <span><strong>${escAttr(c.status)}</strong> — ${escAttr(c.instructions || "Continue observation")}</span>
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Switch active tab inside Patient Profile & Case Record view
window.switchPatientProfileTab = function(tabId) {
  closeAllSmartPopovers();
  window.__ACTIVE_CASE_TAB = tabId;
  document.querySelectorAll(".hc-profile-tab-btn").forEach(btn => {
    const onClickAttr = btn.getAttribute("onclick") || "";
    btn.classList.toggle("active", onClickAttr.includes(`'${tabId}'`));
  });
  document.querySelectorAll(".hc-step-progress-item").forEach(stepBtn => {
    const onClickAttr = stepBtn.getAttribute("onclick") || "";
    const isMatch = onClickAttr.includes(`'${tabId}'`) || (tabId === "consultations" && onClickAttr.includes("'timeline'"));
    stepBtn.classList.toggle("active", isMatch);
  });
  document.querySelectorAll(".hc-tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.id === `hcTab-${tabId}`);
  });
  if (window.lucide) lucide.createIcons();
};

function updateSaveBadgeState(badgeIds, state, text) {
  const ids = Array.isArray(badgeIds) ? badgeIds : [badgeIds];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("saving", "saved", "error");
    if (state) el.classList.add(state);
    el.textContent = text;
  });
}

// Collect current form values from DOM into patient record & persist to localStorage, Server, and Supabase
function collectAndSyncPatientProfile(patientId) {
  const p = CLINIC_STATE.patients.find(pt => pt.id === patientId);
  if (!p) return null;

  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : null;
  };

  // Overview fields
  if (document.getElementById("ovFullName")) {
    p.name = val("ovFullName") || p.name;
    p.age = val("ovAge") || p.age;
    p.gender = val("ovGender") || p.gender;
    p.phone = val("ovPhone") || p.phone;
    p.email = val("ovEmail") ?? p.email;
    p.address = val("ovAddress") || p.address;
    p.chiefComplaint = val("ovChiefComplaint") || p.chiefComplaint;
  }

  // Sync all smart note inputs currently in DOM
  ["past", "personal", "mind"].forEach(sectionKey => {
    const catalog = CLINICAL_FIELD_CATALOG[sectionKey] || {};
    for (const fieldKey of Object.keys(catalog)) {
      const noteEl = document.getElementById(`smartNote_${sectionKey}_${fieldKey}`);
      if (noteEl) {
        const state = getSmartFieldState(p, sectionKey, fieldKey);
        state.notes = noteEl.value;
      }
    }
    syncSmartSectionSummaries(p, sectionKey);
  });

  persistClinicState();

  // Also perform atomic per-patient upsert to Supabase & Server
  if (window.HomeoCareAPI?.patients?.upsertClinicalRecord) {
    window.HomeoCareAPI.patients.upsertClinicalRecord(p).catch(() => {});
  }

  return p;
}

let _autosaveTimer = null;
function triggerSmartAutosave(patientId, sectionKey = "past") {
  const badgeMap = {
    overview: ["overviewSaveBadge"],
    past: ["pastSaveBadge"],
    personal: ["personalSaveBadge"],
    mind: ["mindSaveBadge"]
  };
  const targetBadges = badgeMap[sectionKey] || ["overviewSaveBadge", "pastSaveBadge", "personalSaveBadge", "mindSaveBadge"];
  updateSaveBadgeState(targetBadges, "saving", "Saving...");

  // Immediately persist in-memory & localStorage so switching tabs never loses data
  const p = CLINIC_STATE.patients.find(pt => pt.id === patientId);
  if (p) {
    try {
      localStorage.setItem(CLINIC_STORAGE_KEY, JSON.stringify({
        patients: CLINIC_STATE.patients || [],
        appointments: CLINIC_STATE.appointments || [],
        invoices: CLINIC_STATE.invoices || [],
        medicines: CLINIC_STATE.medicines || [],
        selectedPatientId: CLINIC_STATE.selectedPatientId || null,
        updatedAt: new Date().toISOString()
      }));
    } catch (_) {}
  }

  if (_autosaveTimer) clearTimeout(_autosaveTimer);
  _autosaveTimer = setTimeout(async () => {
    try {
      const updated = collectAndSyncPatientProfile(patientId);
      if (updated && window.HomeoCareAPI?.patients?.upsertClinicalRecord) {
        await window.HomeoCareAPI.patients.upsertClinicalRecord(updated);
      }
      const nowTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
      updateSaveBadgeState(targetBadges, "saved", `Saved (${nowTime})`);
    } catch (_) {
      updateSaveBadgeState(targetBadges, "error", "Save error — cached locally");
    }
  }, 280);
}

window.autoSavePatientTabs = function(patientId) {
  triggerSmartAutosave(patientId, window.__ACTIVE_CASE_TAB || "overview");
};

window.saveOverviewSection = function(e, patientId) {
  if (e) e.preventDefault();
  updateSaveBadgeState(["overviewSaveBadge"], "saving", "Saving...");
  const p = collectAndSyncPatientProfile(patientId);
  if (p) {
    updateDashboardMetrics();
    renderPatientWorkspace();
    renderPatientRegistry();
    updateSaveBadgeState(["overviewSaveBadge"], "saved", "Saved");
    showToast(`Saved Registration details for ${p.name}.`, "success");
  }
};

window.savePastHistorySection = function(e, patientId) {
  if (e) e.preventDefault();
  updateSaveBadgeState(["pastSaveBadge"], "saving", "Saving...");
  const p = collectAndSyncPatientProfile(patientId);
  if (p) {
    updateSaveBadgeState(["pastSaveBadge"], "saved", "Saved");
    showToast(`Saved Medical History for ${p.name}.`, "success");
  }
};

window.savePersonalHistorySection = function(e, patientId) {
  if (e) e.preventDefault();
  updateSaveBadgeState(["personalSaveBadge"], "saving", "Saving...");
  const p = collectAndSyncPatientProfile(patientId);
  if (p) {
    updateSaveBadgeState(["personalSaveBadge"], "saved", "Saved");
    showToast(`Saved Personal History for ${p.name}.`, "success");
  }
};

window.saveMindHistorySection = function(e, patientId) {
  if (e) e.preventDefault();
  updateSaveBadgeState(["mindSaveBadge"], "saving", "Saving...");
  const p = collectAndSyncPatientProfile(patientId);
  if (p) {
    updateSaveBadgeState(["mindSaveBadge"], "saved", "Saved");
    showToast(`Saved Mind History for ${p.name}.`, "success");
  }
};

// Follow-Up / Progress Modal Handlers (Appends chronologically without overwriting)
window.openProgressModal = function(patientId) {
  const targetId = patientId || CLINIC_STATE.selectedPatientId;
  const p = CLINIC_STATE.patients.find(pt => pt.id === targetId);
  if (!p) {
    showToast("Please select or register a patient first.", "info");
    return;
  }
  CLINIC_STATE.selectedPatientId = p.id;
  const modal = document.getElementById("progressModalOverlay");
  const dateInput = document.getElementById("progVisitDate");
  const stageSelect = document.getElementById("progVisitStage");

  if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
  if (stageSelect) {
    const count = (p.consultations || []).length;
    if (count === 1) stageSelect.value = "Follow-up 1";
    else if (count === 2) stageSelect.value = "Follow-up 2";
    else stageSelect.value = "Latest Visit";
  }

  if (modal) modal.classList.add("active");
  if (window.lucide) lucide.createIcons();
};

function closeProgressModal() {
  const modal = document.getElementById("progressModalOverlay");
  if (modal) modal.classList.remove("active");
}

window.addEventListener("DOMContentLoaded", () => {
  // Load persisted clinic state on initial page load
  loadPersistedClinicState();

  // Setup Automatic Hover-Expanding Sidebar class sync
  const sidebarEl = document.getElementById("sidebar");
  if (sidebarEl) {
    sidebarEl.addEventListener("mouseenter", () => {
      if (window.innerWidth >= 1025) {
        sidebarEl.classList.add("sidebar-expanded");
        document.body.classList.add("sidebar-hover-active");
      }
    });
    sidebarEl.addEventListener("mouseleave", () => {
      if (window.innerWidth >= 1025) {
        sidebarEl.classList.remove("sidebar-expanded");
        document.body.classList.remove("sidebar-hover-active");
      }
    });
  }

  // Bind Follow-up Progress Modal
  const progModal = document.getElementById("progressModalOverlay");
  const progClose = document.getElementById("progressModalCloseBtn");
  const progCancel = document.getElementById("progressModalCancelBtn");
  const progForm = document.getElementById("progressEntryForm");

  if (progClose) progClose.addEventListener("click", closeProgressModal);
  if (progCancel) progCancel.addEventListener("click", closeProgressModal);
  if (progModal) {
    progModal.addEventListener("click", (e) => {
      if (e.target === progModal) closeProgressModal();
    });
  }

  if (progForm) {
    progForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const p = CLINIC_STATE.patients.find(pt => pt.id === CLINIC_STATE.selectedPatientId);
      if (!p) return;

      const stage = document.getElementById("progVisitStage")?.value || "Follow-up 1";
      const dateRaw = document.getElementById("progVisitDate")?.value || new Date().toISOString().split("T")[0];
      const observations = document.getElementById("progObservations")?.value.trim() || "";
      const medicine = document.getElementById("progMedicine")?.value.trim() || "";
      const status = document.getElementById("progOutcomeStatus")?.value || "Improving";
      const instructions = document.getElementById("progNextInstructions")?.value.trim() || "";

      const displayDate = new Date(dateRaw + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      if (!Array.isArray(p.consultations)) p.consultations = [];

      // Append chronologically without overwriting previous visits
      p.consultations.push({
        id: `CONS-${Date.now()}`,
        stage,
        date: dateRaw,
        displayDate,
        observations,
        medicine,
        status,
        instructions,
        doctor: "Dr. Suraj D. Panigrahi"
      });

      p.prescription = medicine;
      if (!Array.isArray(p.history)) p.history = [];
      p.history.unshift({
        title: `${stage} (${status})`,
        date: displayDate,
        desc: `Observations: ${observations} • Rx: ${medicine}`
      });

      persistClinicState();
      updateDashboardMetrics();
      renderPatientWorkspace();
      window.__ACTIVE_CASE_TAB = "timeline";
      renderActiveCaseRecord();

      progForm.reset();
      closeProgressModal();
      showToast(`Recorded "${stage}" for ${p.name}. Previous consultation history preserved.`, "success");
    });
  }
});

// Attach listeners for MVP Dual Entry & Language Switcher
window.addEventListener("DOMContentLoaded", () => {
  // Check hash on load
  if (window.location.hash === "#self-entry") {
    openPatientSelfEntryPortal();
  }

  // Top action in Login page
  const openSelfTopBtn = document.getElementById("openPatientSelfEntryTopBtn");
  if (openSelfTopBtn) {
    openSelfTopBtn.addEventListener("click", openPatientSelfEntryPortal);
  }

  // Hero button in Dashboard
  const openSelfHeroBtn = document.getElementById("openSelfEntryHeroBtn");
  if (openSelfHeroBtn) {
    openSelfHeroBtn.addEventListener("click", openPatientSelfEntryPortal);
  }

  // Exit Self-Entry to staff login
  const exitSelfBtn = document.getElementById("exitSelfEntryBtn");
  if (exitSelfBtn) {
    exitSelfBtn.addEventListener("click", closePatientSelfEntryPortal);
  }

  const selfDoneBtn = document.getElementById("selfEntryDoneBtn");
  if (selfDoneBtn) {
    selfDoneBtn.addEventListener("click", closePatientSelfEntryPortal);
  }

  const selfNewBtn = document.getElementById("selfEntryNewBtn");
  if (selfNewBtn) {
    selfNewBtn.addEventListener("click", () => {
      document.getElementById("selfEntryForm").reset();
      openPatientSelfEntryPortal();
    });
  }

  // Language buttons
  document.querySelectorAll(".lang-toggle-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const lang = e.currentTarget.getAttribute("data-lang");
      setSelfEntryLanguage(lang);
    });
  });

  // Step Next / Prev buttons
  document.querySelectorAll(".btn-next-step").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const nextStep = parseInt(e.currentTarget.getAttribute("data-next"), 10);
      // Validate current step required inputs
      if (selfEntryCurrentStep === 1) {
        const name = document.getElementById("seFullName")?.value.trim();
        const phone = document.getElementById("sePhone")?.value.trim();
        const age = document.getElementById("seAge")?.value.trim();
        const addr = document.getElementById("seAddress")?.value.trim();
        const chief = document.getElementById("seChiefComplaint")?.value.trim();
        if (!name || !phone || !age || !addr || !chief) {
          showToast("Please fill in all required fields marked with * in Step 1.", "error");
          return;
        }
      }
      goToSelfEntryStep(nextStep);
    });
  });

  document.querySelectorAll(".btn-prev-step").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const prevStep = parseInt(e.currentTarget.getAttribute("data-prev"), 10);
      goToSelfEntryStep(prevStep);
    });
  });

  // Self-Entry Form Submission
  const selfEntryForm = document.getElementById("selfEntryForm");
  if (selfEntryForm) {
    selfEntryForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const patientData = {
        name: document.getElementById("seFullName").value.trim(),
        phone: document.getElementById("sePhone").value.trim(),
        age: document.getElementById("seAge").value.trim(),
        gender: document.getElementById("seGender").value,
        dob: document.getElementById("seDob").value,
        address: document.getElementById("seAddress").value.trim(),
        email: document.getElementById("seEmail").value.trim(),
        chiefComplaint: document.getElementById("seChiefComplaint").value.trim(),
        associatedComplaints: document.getElementById("seAssociatedComplaints").value.trim(),
        pastHistory: document.getElementById("sePastHistory").value.trim(),
        familyHistory: document.getElementById("seFamilyHistory").value.trim(),
        personalHistory: {
          appetite: document.getElementById("seAppetite").value.trim(),
          thirst: document.getElementById("seThirst").value.trim(),
          craving: document.getElementById("seCraving").value.trim(),
          diet: document.getElementById("seDiet").value,
          bowel: document.getElementById("seBowel").value.trim(),
          urine: document.getElementById("seUrine").value.trim(),
          habit: document.getElementById("seHabit").value.trim(),
          thermalModality: document.getElementById("seThermalModality").value,
          sleep: document.getElementById("seSleep").value.trim(),
          dreams: document.getElementById("seDreams").value.trim(),
          hobby: document.getElementById("seHobby").value.trim()
        },
        mindHistory: {
          anxiety: document.getElementById("seAnxiety").value.trim(),
          stress: document.getElementById("seStress").value.trim(),
          thoughts: document.getElementById("seThoughts").value.trim(),
          company: document.getElementById("seCompany").value,
          worried: document.getElementById("seWorried").value.trim(),
          happy: document.getElementById("seHappy").value.trim()
        }
      };

      const record = savePatientCaseRecord(patientData, "patient_self");

      // Show receipt
      const formEl = document.getElementById("selfEntryForm");
      const successCard = document.getElementById("selfEntrySuccessCard");
      const rcptId = document.getElementById("rcptPatientId");
      const rcptName = document.getElementById("rcptPatientName");
      const rcptTime = document.getElementById("rcptTime");

      if (formEl) formEl.style.display = "none";
      if (successCard) successCard.style.display = "block";
      if (rcptId) rcptId.textContent = record.id;
      if (rcptName) rcptName.textContent = record.name;
      if (rcptTime) rcptTime.textContent = new Date().toLocaleString();

      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.lucide) lucide.createIcons();
    });
  }
});
