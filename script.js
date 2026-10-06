/* ==========================================================================
   AUTHENTICATION & DASHBOARD SWITCHING
   ========================================================================== */
const MASTER_PHONE = "0723449512";
const MASTER_PASS = "Tk@y1503";

document.getElementById('admin-login-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const phone = document.getElementById('admin-phone').value;
  const pass = document.getElementById('admin-pass').value;

  if (phone === MASTER_PHONE && pass === MASTER_PASS) {
    document.getElementById('admin-login-screen').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
  } else {
    alert("Invalid Master Admin Credentials!");
  }
});

function switchAdminTab(tabId, element) {
  document.querySelectorAll('.tab-pane').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.sidebar-menu li').forEach(el => el.classList.remove('active'));
  
  document.getElementById(tabId).classList.remove('hidden');
  element.parentElement.classList.add('active');
  document.getElementById('current-tab-title').innerText = element.innerText;
}

/* ==========================================================================
   PUBLIC & TENANT PORTALS MANAGEMENT
   ========================================================================== */
function openPublicPortal() {
  document.getElementById('admin-dashboard').classList.add('hidden');
  document.getElementById('public-portal').classList.remove('hidden');
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Theme Toggle
function toggleTheme() {
  const body = document.body;
  if (body.getAttribute('data-theme') === 'dark') {
    body.removeAttribute('data-theme');
  } else {
    body.setAttribute('data-theme', 'dark');
  }
}

// Property Link Generator
document.getElementById('property-config-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const area = document.getElementById('prop-area').value || "Extension Yard";
  const rent = document.getElementById('prop-rent').value || "2600";
  
  const linkUrl = window.location.origin + window.location.pathname + `?tenantLink=true&loc=${encodeURIComponent(area)}&rent=${rent}`;
  
  document.getElementById('generated-links-output').innerHTML = `
    <div class="stat-card">
      <p><strong>Generated Link for ${area}</strong></p>
      <input type="text" class="form-control" value="${linkUrl}" readonly style="margin: 0.5rem 0;">
      <button class="btn btn-primary" onclick="copyLink(this)">Copy Link</button>
    </div>
  `;
});

function copyLink(btn) {
  const input = btn.previousElementSibling;
  input.select();
  navigator.clipboard.writeText(input.value);
  btn.innerText = "Copied!";
  setTimeout(() => btn.innerText = "Copy Link", 2000);
}

/* ==========================================================================
   TENANT PORTAL LOGIC & URL PARSING
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('tenantLink') === 'true') {
    document.getElementById('admin-login-screen').classList.add('hidden');
    document.getElementById('tenant-portal').classList.remove('hidden');
    
    const loc = params.get('loc') || 'Lotus Gardens Phase 4';
    document.getElementById('tenant-location').innerText = loc;
  }
});

function calculateRent() {
  const room = document.getElementById('room-select').value;
  const params = new URLSearchParams(window.location.search);
  const rate = params.get('rent') || "2600";
  
  const display = document.getElementById('rent-display');
  if (room) {
    display.innerText = `R ${parseFloat(rate).toLocaleString('en-ZA', {minimumFractionDigits: 2})}`;
  } else {
    display.innerText = "R 0.00";
  }
}

/* ==========================================================================
   VOICE RECORDER LOGIC
   ========================================================================== */
let isRecording = false;
function toggleRecording() {
  const btn = document.getElementById('record-btn');
  const status = document.getElementById('record-status');
  
  if (!isRecording) {
    isRecording = true;
    btn.classList.add('recording');
    status.innerText = "Recording voice note... Click again to stop.";
  } else {
    isRecording = false;
    btn.classList.remove('recording');
    status.innerText = "Voice note recorded successfully!";
  }
}
