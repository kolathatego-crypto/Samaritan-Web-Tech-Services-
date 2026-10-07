/**
 * Samaritan Web Tech Services - Main Dashboard Application Script
 */

// ==========================================
// 1. HARDCODED CREDENTIALS FOR VALIDATION
// ==========================================
const ALLOWED_CELLPHONE = "0723449512";
const ALLOWED_PASSWORD  = "Tk@y1503";

// ==========================================
// 2. FIREBASE INITIALIZATION (MODULE IMPORTS)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-analytics.js";
import { 
  getFirestore, 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJ21mPQH-rVLReszD14cYgOetVokINwhs",
  authDomain: "samaritan-web-tech-services.firebaseapp.com",
  projectId: "samaritan-web-tech-services",
  storageBucket: "samaritan-web-tech-services.firebasestorage.app",
  messagingSenderId: "1008242522251",
  appId: "1:1008242522251:web:55c1afc69c3f3bc3893c8e",
  measurementId: "G-V7XJQTQ36W"
};

// Paystack Public Key Configuration
const PAYSTACK_PUBLIC_KEY = "pk_test_cb37af0fa463d6327d7960e84387fdc329b87034";

// Initialize Firebase App & Services
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Dynamic State Variables
let activeRoomsCount = 0;
let inactiveRoomsCount = 0;
let totalMonthlyIncome = 0;
let isMaintenanceActive = false;

// ==========================================
// 3. DOM INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // --- LOGIN ACCESS CONTROL ---
  const loginCard = document.querySelector('.login-card');
  const dashboardPage = document.querySelector('.dashboard-page');
  const loginForm = document.querySelector('.login-form');
  const messageBox = document.getElementById('login-message');

  // Initially hide dashboard
  if (dashboardPage) {
    dashboardPage.style.display = 'none';
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const cellphoneInput = document.getElementById('cellphone').value.trim();
      const passwordInput = document.getElementById('password').value.trim();

      // Check entered values against hardcoded credentials
      if (cellphoneInput === ALLOWED_CELLPHONE && passwordInput === ALLOWED_PASSWORD) {
        if (messageBox) {
          messageBox.className = 'login-message success';
          messageBox.textContent = 'Access granted. Unlocking dashboard...';
        }

        setTimeout(() => {
          if (loginCard) loginCard.style.display = 'none';
          if (dashboardPage) dashboardPage.style.display = 'flex';

          // Load dynamic data once logged in
          initializeRealtimeData();
        }, 500);

      } else {
        if (messageBox) {
          messageBox.className = 'login-message error';
          messageBox.textContent = 'Wrong cellphone number or password.';
        }
      }
    });
  }

  // --- SIDEBAR TOGGLE ---
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  const sidebar = document.getElementById('sidebarMenu');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  // --- THEME SWITCHER (LIGHT / DARK MODE) ---
  const lightBtn = document.querySelector('.light-btn');
  const darkBtn = document.querySelector('.dark-btn');

  if (lightBtn) {
    lightBtn.addEventListener('click', () => {
      document.body.classList.remove('dark-theme');
    });
  }

  if (darkBtn) {
    darkBtn.addEventListener('click', () => {
      document.body.classList.add('dark-theme');
    });
  }

  // --- MAINTENANCE MODE TOGGLE ---
  const maintenanceBtn = document.querySelector('.warning-btn');

  if (maintenanceBtn) {
    maintenanceBtn.addEventListener('click', () => {
      isMaintenanceActive = !isMaintenanceActive;
      if (isMaintenanceActive) {
        maintenanceBtn.style.backgroundColor = '#22c55e';
        maintenanceBtn.textContent = 'Maintenance Mode: ON';
      } else {
        maintenanceBtn.style.backgroundColor = '#ef4444';
        maintenanceBtn.textContent = 'Toggle Maintenance Mode';
      }
    });
  }

});

// ==========================================
// 4. TAB SWITCHING FUNCTIONALITY
// ==========================================
window.switchTab = function (sectionId, evt) {
  // Hide all sections
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));

  // Reveal selected section
  const selectedTab = document.getElementById(sectionId);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Highlight active sidebar button
  const sideButtons = document.querySelectorAll('.side-btn');
  sideButtons.forEach(btn => btn.classList.remove('active'));

  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add('active');
  }
};

// ==========================================
// 5. REAL-TIME DATA SYNCHRONIZATION (FIREBASE)
// ==========================================
function initializeRealtimeData() {
  
  // Listen to 'rooms' collection
  onSnapshot(collection(db, "rooms"), (snapshot) => {
    let active = 0;
    let inactive = 0;

    snapshot.forEach((doc) => {
      const room = doc.data();
      if (room.status === 'active') {
        active++;
      } else {
        inactive++;
      }
    });

    activeRoomsCount = active;
    inactiveRoomsCount = inactive;

    updateRoomMetricsUI();
  }, (error) => {
    console.warn("Firestore 'rooms' collection listener info:", error.message);
  });

  // Listen to 'payments' collection
  onSnapshot(collection(db, "payments"), (snapshot) => {
    let monthlyTotal = 0;
    const clientListContainer = document.querySelector('.client-list');

    if (clientListContainer) clientListContainer.innerHTML = '';

    if (snapshot.empty && clientListContainer) {
      clientListContainer.innerHTML = `<div class="client-card-item empty-state"><p>No client revenue recorded yet.</p></div>`;
      return;
    }

    snapshot.forEach((doc) => {
      const payment = doc.data();
      monthlyTotal += Number(payment.amount || 0);

      if (clientListContainer) {
        const item = document.createElement('div');
        item.className = 'client-card-item';
        item.innerHTML = `
          <div class="client-info">
            <h4>${payment.clientName || 'Unknown Client'}</h4>
            <span>${payment.date || 'Recent'}</span>
          </div>
          <div class="client-pay">R ${(payment.amount || 0).toFixed(2)}</div>
        `;
        clientListContainer.appendChild(item);
      }
    });

    totalMonthlyIncome = monthlyTotal;
    updateFinanceUI();
  }, (error) => {
    console.warn("Firestore 'payments' collection listener info:", error.message);
  });
}

// ==========================================
// 6. UI UPDATERS
// ==========================================
function updateRoomMetricsUI() {
  const total = activeRoomsCount + inactiveRoomsCount;

  const activePercent = total > 0 ? Math.round((activeRoomsCount / total) * 100) : 0;
  const inactivePercent = total > 0 ? Math.round((inactiveRoomsCount / total) * 100) : 0;

  // Active rooms card updates
  const activeCard = document.querySelectorAll('.metric-card')[0];
  if (activeCard) {
    const textElem = activeCard.querySelector('.percentage');
    const countElem = activeCard.querySelector('.count-value');
    const circleElem = activeCard.querySelector('.circle');

    if (textElem) textElem.textContent = `${activePercent}%`;
    if (countElem) countElem.textContent = activeRoomsCount;
    if (circleElem) circleElem.setAttribute('stroke-dasharray', `${activePercent}, 100`);
  }

  // Inactive rooms card updates
  const inactiveCard = document.querySelectorAll('.metric-card')[1];
  if (inactiveCard) {
    const textElem = inactiveCard.querySelector('.percentage');
    const countElem = inactiveCard.querySelector('.count-value');
    const circleElem = inactiveCard.querySelector('.circle');

    if (textElem) textElem.textContent = `${inactivePercent}%`;
    if (countElem) countElem.textContent = inactiveRoomsCount;
    if (circleElem) circleElem.setAttribute('stroke-dasharray', `${inactivePercent}, 100`);
  }

  // Legend updates
  const legendActive = document.querySelector('.legend-item:nth-child(1)');
  const legendInactive = document.querySelector('.legend-item:nth-child(2)');

  if (legendActive) {
    legendActive.innerHTML = `<span class="color-dot active-dot"></span> Active Rooms (${activeRoomsCount} / ${activePercent}%)`;
  }
  if (legendInactive) {
    legendInactive.innerHTML = `<span class="color-dot inactive-dot"></span> Inactive Rooms (${inactiveRoomsCount} / ${inactivePercent}%)`;
  }
}

function updateFinanceUI() {
  const summaryAmount = document.querySelector('.summary-card .summary-amount');
  if (summaryAmount) {
    summaryAmount.textContent = `R ${totalMonthlyIncome.toFixed(2)}`;
  }
}

// ==========================================
// 7. PAYSTACK PAYMENT INTEGRATION HELPER
// ==========================================
window.payWithPaystack = function (email, amountInZAR) {
  if (typeof PaystackPop === 'undefined') {
    alert("Paystack SDK is loading. Please ensure the Paystack script tag is in your HTML.");
    return;
  }

  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email,
    amount: amountInZAR * 100, // Amount in cents
    currency: 'ZAR',
    ref: 'SMTRN_' + Math.floor((Math.random() * 1000000000) + 1),
    onClose: function () {
      alert('Transaction cancelled.');
    },
    callback: function (response) {
      alert('Payment successful! Reference: ' + response.reference);
    }
  });

  handler.openIframe();
};
