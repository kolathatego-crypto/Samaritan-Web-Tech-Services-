// =============================================// ============================================================
// FIREBASE MODULE INITIALIZATION & SERVICES
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    onSnapshot, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDJ21mPQH-rVLReszD14cYgOetVokINwhs",
    authDomain: "samaritan-web-tech-services.firebaseapp.com",
    projectId: "samaritan-web-tech-services",
    storageBucket: "samaritan-web-tech-services.firebasestorage.app",
    messagingSenderId: "1008242522251",
    appId: "1:1008242522251:web:55c1afc69c3f3bc3893c8e",
    measurementId: "G-V7XJQTQ36W"
};

// Initialize Firebase App & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Paystack Public Test Key
const PAYSTACK_PUBLIC_KEY = "pk_test_cb37af0fa463d6327d7960e84387fdc329b87034";

// ============================================================
// APPLICATION STATE & NAVIGATION ROUTING
// ============================================================
let currentYardCode = null;
let currentYardData = null;

// Global SPA View Switcher
window.enterSamaritanDashboard = function() {
    const landing = document.getElementById("samaritan-landing");
    const nav = document.getElementById("main-nav");
    if (landing) landing.style.display = "none";
    if (nav) nav.classList.remove("hidden-nav");
    window.switchView("samaritan-admin");
};

window.switchView = function(viewId) {
    document.querySelectorAll(".page-view").forEach(view => {
        view.classList.remove("active-view");
    });
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    
    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add("active-view");

    const btnIdMap = {
        "samaritan-admin": "nav-btn-admin",
        "tenant-portal": "nav-btn-tenant",
        "landlord-portal": "nav-btn-landlord"
    };

    const targetNavBtn = document.getElementById(btnIdMap[viewId]);
    if (targetNavBtn) targetNavBtn.classList.add("active");
};

document.addEventListener("DOMContentLoaded", () => {
    // Check URL parameters for direct portal routing
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    const yardParam = urlParams.get("yard");
    const dashboardParam = urlParams.get("dashboard");

    if (yardParam && (viewParam === "tenant-portal" || !viewParam)) {
        currentYardCode = yardParam;
        window.enterSamaritanDashboard();
        const mainNav = document.getElementById("main-nav");
        if (mainNav) mainNav.classList.add("hidden-nav");
        window.switchView("tenant-portal");
        loadTenantYardPortal(yardParam);
    } else if (dashboardParam || viewParam === "landlord-portal") {
        const activeCode = dashboardParam || yardParam;
        window.enterSamaritanDashboard();
        const mainNav = document.getElementById("main-nav");
        if (mainNav) mainNav.classList.add("hidden-nav");
        window.switchView("landlord-portal");
        loadLandlordLedger(activeCode);
    }

    // Attach real-time metrics listener for admin dashboard
    listenToMasterMetrics();
});

// ============================================================
// DYNAMIC NESTED FORM SETUP: PLACES -> YARDS -> ROOMS
// ============================================================
window.renderPlacesSetup = function() {
    const numPlacesInput = document.getElementById("num-places");
    const numPlaces = parseInt(numPlacesInput ? numPlacesInput.value : 0) || 0;
    const container = document.getElementById("places-dynamic-container");
    if (!container) return;
    container.innerHTML = "";

    for (let p = 1; p <= numPlaces; p++) {
        const placeBox = document.createElement("div");
        placeBox.className = "dynamic-place-box card";
        placeBox.style.cssText = "margin-top: 15px; background: rgba(255,255,255,0.03);";
        
        placeBox.innerHTML = `
            <h4 style="color:var(--gold); margin-bottom:10px;"><i class="fa-solid fa-building"></i> Place ${p}</h4>
            <div class="form-group">
                <label>Place / Location Name</label>
                <input type="text" class="place-name-input" placeholder="e.g. ${p === 1 ? 'Lotus Gardens' : 'Diepsloot'}" required>
            </div>
            <div class="form-group">
                <label>Number of Yards / Phases in this Place</label>
                <input type="number" class="num-yards-input" min="1" max="10" placeholder="e.g. 2" oninput="window.renderYardsSetup(this, ${p})" required>
            </div>
            <div class="yards-container-${p}"></div>
        `;
        container.appendChild(placeBox);
    }
};

window.renderYardsSetup = function(input, placeIndex) {
    const numYards = parseInt(input.value) || 0;
    const yardsContainer = input.closest(".dynamic-place-box").querySelector(`.yards-container-${placeIndex}`);
    if (!yardsContainer) return;
    yardsContainer.innerHTML = "";

    for (let y = 1; y <= numYards; y++) {
        const yardBox = document.createElement("div");
        yardBox.className = "dynamic-yard-box";
        yardBox.style.cssText = "border: 1px dashed var(--border-color); padding: 12px; border-radius: 6px; margin-top: 10px; background: rgba(0,0,0,0.2);";
        
        yardBox.innerHTML = `
            <h5 style="color:var(--green-accent); margin-bottom:10px;"><i class="fa-solid fa-house"></i> Yard ${y}</h5>
            <div class="form-group">
                <label>Yard / Extension / Phase Name</label>
                <input type="text" class="yard-name-input" placeholder="e.g. ${y === 1 ? 'Phase 1' : 'Phase 2'}" required>
            </div>
            <div class="form-group">
                <label>Number of Rooms in this Yard</label>
                <input type="number" class="num-rooms-input" min="1" max="20" placeholder="e.g. 3" oninput="window.renderRoomsSetup(this)" required>
            </div>
            <div class="rooms-container"></div>
        `;
        yardsContainer.appendChild(yardBox);
    }
};

window.renderRoomsSetup = function(input) {
    const numRooms = parseInt(input.value) || 0;
    const roomsContainer = input.closest(".dynamic-yard-box").querySelector(".rooms-container");
    if (!roomsContainer) return;
    roomsContainer.innerHTML = "";

    let roomsHTML = '<div style="margin-top:10px; font-size:0.85rem; color:var(--text-muted); font-weight:bold;">Room Prices Setup:</div>';
    for (let r = 1; r <= numRooms; r++) {
        roomsHTML += `
            <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-top:8px;">
                <span style="font-size:0.85rem; width:90px; color:var(--text-light);">Room ${r} Price:</span>
                <input type="number" class="room-price-input" data-room="Room ${r}" placeholder="e.g. 2500" required style="flex:1;">
            </div>
        `;
    }
    roomsContainer.innerHTML = roomsHTML;
};

// ============================================================
// SECTION 1: REGISTER LANDLORD & MULTI-YARD REGISTRATION
// ============================================================
window.handleLandlordRegistration = async function() {
    const nameInput = document.getElementById("landlord-name");
    const phoneInput = document.getElementById("landlord-phone");
    const bankInput = document.getElementById("landlord-bank");

    const landlordName = nameInput ? nameInput.value.trim() : "";
    const landlordPhone = phoneInput ? phoneInput.value.trim() : "";
    const landlordBank = bankInput ? bankInput.value.trim() : "";

    if (!landlordName || !landlordPhone || !landlordBank) {
        alert("Please fill in all landlord contact and banking details.");
        return;
    }

    const placeBoxes = document.querySelectorAll(".dynamic-place-box");
    if (placeBoxes.length === 0) {
        alert("Please specify the number of places owned.");
        return;
    }

    const baseUrl = window.location.origin + window.location.pathname;
    const safeLandlordCode = landlordName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const landlordDashboardLink = `${baseUrl}?dashboard=${safeLandlordCode}`;

    let generatedTenantLinksHTML = `
        <div style="background: rgba(0,230,118,0.1); border:1px solid var(--green-accent); padding:12px; border-radius:8px; margin-bottom:15px;">
            <strong style="color:var(--green-accent);"><i class="fa-solid fa-key"></i> Landlord Private Dashboard Link:</strong>
            <input type="text" value="${landlordDashboardLink}" readonly style="width:100%; margin: 6px 0; padding: 6px; background:#111; color:#fff; border:1px solid #444;">
            <button class="btn btn-gold-outline" style="padding:6px 12px; font-size:0.85rem;" onclick="navigator.clipboard.writeText('${landlordDashboardLink}'); alert('Landlord Dashboard link copied!');"><i class="fa-solid fa-copy"></i> Copy Landlord Link</button>
        </div>
        <h5 style="color:var(--gold); margin-bottom:8px;"><i class="fa-solid fa-link"></i> Generated Tenant Payment Links:</h5>
    `;

    try {
        for (let pBox of placeBoxes) {
            const placeName = pBox.querySelector(".place-name-input").value.trim();
            const yardBoxes = pBox.querySelectorAll(".dynamic-yard-box");

            for (let yBox of yardBoxes) {
                const yardName = yBox.querySelector(".yard-name-input").value.trim();
                const roomInputs = yBox.querySelectorAll(".room-price-input");
                
                const roomsList = [];
                roomInputs.forEach((input, index) => {
                    const priceVal = parseFloat(input.value);
                    if (!isNaN(priceVal)) {
                        roomsList.push({
                            name: `Room ${index + 1}`,
                            price: priceVal
                        });
                    }
                });

                const propertyCode = `${placeName}-${yardName}`.toLowerCase().replace(/[^a-z0-9]/g, "-");
                const fullPropertyName = `${placeName} - ${yardName}`;
                const tenantLink = `${baseUrl}?yard=${propertyCode}`;

                // Save property record to Firestore
                await addDoc(collection(db, "properties"), {
                    landlordName: landlordName,
                    landlordPhone: landlordPhone,
                    landlordBank: landlordBank,
                    landlordCode: safeLandlordCode,
                    placeName: placeName,
                    yardName: yardName,
                    propertyName: fullPropertyName,
                    propertyCode: propertyCode,
                    rooms: roomsList,
                    createdAt: serverTimestamp()
                });

                generatedTenantLinksHTML += `
                    <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; margin-bottom: 8px; border-left:3px solid var(--gold);">
                        <strong style="color: #fff; font-size:0.9rem;">${fullPropertyName}:</strong>
                        <input type="text" value="${tenantLink}" readonly style="width:100%; margin: 4px 0; padding: 5px; background:#111; color:#fff; border:1px solid #444; font-size:0.85rem;">
                        <button class="btn btn-gold" style="padding:4px 10px; font-size:0.8rem;" onclick="navigator.clipboard.writeText('${tenantLink}'); alert('Tenant link copied!');"><i class="fa-solid fa-copy"></i> Copy Payment Link</button>
                    </div>
                `;
            }
        }

        const container = document.getElementById("generated-links-container");
        if (container) container.innerHTML = generatedTenantLinksHTML;

        const form = document.getElementById("add-landlord-form");
        if (form) form.reset();
        
        const dynamicContainer = document.getElementById("places-dynamic-container");
        if (dynamicContainer) dynamicContainer.innerHTML = "";

        alert("All property yards successfully onboarded and payment links generated!");

    } catch (error) {
        console.error("Error saving landlord properties: ", error);
        alert("Failed to save property onboarding setup: " + error.message);
    }
};

// Real-time listener for Master Metrics
function listenToMasterMetrics() {
    onSnapshot(collection(db, "properties"), (snapshot) => {
        const activeYardsElem = document.getElementById("active-yards");
        if (activeYardsElem) activeYardsElem.innerText = snapshot.size;
        
        let uniqueLandlords = new Set();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.landlordName) uniqueLandlords.add(data.landlordName);
        });
        const activeLandlordsElem = document.getElementById("active-landlords");
        if (activeLandlordsElem) activeLandlordsElem.innerText = uniqueLandlords.size;
    });

    onSnapshot(collection(db, "payments"), (snapshot) => {
        let totalRev = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.amount) totalRev += parseFloat(data.amount);
        });
        const totalRevenueElem = document.getElementById("total-revenue");
        if (totalRevenueElem) totalRevenueElem.innerText = "R" + totalRev.toLocaleString('en-ZA', { minimumFractionDigits: 2 });
    });
}

// ============================================================
// CLIENT PREVIEW DEMO CALCULATIONS & TAB SWITCHERS
// ============================================================
window.updateDemoPrice = function() {
    const select = document.getElementById("demo-tenant-room-select");
    const priceDisplay = document.getElementById("demo-tenant-price");
    if (!select || !priceDisplay) return;
    const price = select.value;
    priceDisplay.value = price ? "R " + parseFloat(price).toLocaleString('en-ZA', { minimumFractionDigits: 2 }) : "R 0.00";
};

window.switchDemoPlace = function(place) {
    const rows = document.getElementById("demo-landlord-rows");
    const ratio = document.getElementById("demo-paid-ratio");
    const total = document.getElementById("demo-collected-total");
    if (!rows || !ratio || !total) return;

    if (place === "lotus") {
        ratio.innerText = "5 / 6 Rooms Paid (83%)";
        total.innerText = "R12,500 / R15,000";
        rows.innerHTML = `
            <tr><td>Room 1</td><td>R2,000</td><td>Thabo Molefe</td><td><span style="color:var(--green-accent); font-weight:bold;">Paid</span></td></tr>
            <tr><td>Room 2</td><td>R2,500</td><td>Sipho Ndlovu</td><td><span style="color:var(--green-accent); font-weight:bold;">Paid</span></td></tr>
            <tr><td>Room 3</td><td>R2,800</td><td>David Smith</td><td><span style="color:var(--red-accent); font-weight:bold;">Unpaid</span></td></tr>
        `;
    } else {
        ratio.innerText = "3 / 4 Rooms Paid (75%)";
        total.innerText = "R7,500 / R10,000";
        rows.innerHTML = `
            <tr><td>Room 1</td><td>R2,500</td><td>Lerato Khumalo</td><td><span style="color:var(--green-accent); font-weight:bold;">Paid</span></td></tr>
            <tr><td>Room 2</td><td>R2,500</td><td>Peter Parker</td><td><span style="color:var(--green-accent); font-weight:bold;">Paid</span></td></tr>
            <tr><td>Room 3</td><td>R2,500</td><td>Mary Jane</td><td><span style="color:var(--red-accent); font-weight:bold;">Unpaid</span></td></tr>
        `;
    }
};

window.switchDemoYard = function(yard) {
    const rows = document.getElementById("demo-landlord-rows");
    const ratio = document.getElementById("demo-paid-ratio");
    const total = document.getElementById("demo-collected-total");
    if (!rows || !ratio || !total) return;

    if (yard === "ext1") {
        ratio.innerText = "5 / 6 Rooms Paid (83%)";
        total.innerText = "R12,500 / R15,000";
        rows.innerHTML = `
            <tr><td>Room 1</td><td>R2,000</td><td>Thabo Molefe</td><td><span style="color:var(--green-accent); font-weight:bold;">Paid</span></td></tr>
            <tr><td>Room 2</td><td>R2,500</td><td>Sipho Ndlovu</td><td><span style="color:var(--green-accent); font-weight:bold;">Paid</span></td></tr>
            <tr><td>Room 3</td><td>R2,800</td><td>David Smith</td><td><span style="color:var(--red-accent); font-weight:bold;">Unpaid</span></td></tr>
        `;
    } else {
        ratio.innerText = "2 / 2 Rooms Paid (100%)";
        total.innerText = "R5,000 / R5,000";
        rows.innerHTML = `
            <tr><td>Room 1</td><td>R2,500</td><td>Kabuya Nkosi</td><td><span style="color:var(--green-accent); font-weight:bold;">Paid</span></td></tr>
            <tr><td>Room 2</td><td>R2,500</td><td>Zanele Dlamini</td><td><span style="color:var(--green-accent); font-weight:bold;">Paid</span></td></tr>
        `;
    }
};

// ============================================================
// SECTION 2: TENANT PORTAL LOGIC & PAYSTACK INTEGRATION
// ============================================================
async function loadTenantYardPortal(yardCode) {
    const titleElem = document.getElementById("tenant-location-title");
    const selectElem = document.getElementById("tenant-room-select");

    const q = query(collection(db, "properties"), where("propertyCode", "==", yardCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        if (titleElem) titleElem.innerText = "Property Not Found";
        if (selectElem) selectElem.innerHTML = `<option value="">-- No Rooms Available --</option>`;
        return;
    }

    const propDoc = querySnapshot.docs[0];
    currentYardData = propDoc.data();
    if (titleElem) titleElem.innerText = currentYardData.propertyName || currentYardData.propertyCode;

    if (selectElem) {
        selectElem.innerHTML = `<option value="">-- Choose Your Room --</option>`;
        if (currentYardData.rooms && Array.isArray(currentYardData.rooms)) {
            currentYardData.rooms.forEach((room, index) => {
                selectElem.innerHTML += `<option value="room-${index}" data-name="${room.name}" data-price="${room.price}">${room.name} - R${parseFloat(room.price).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</option>`;
            });
        }
    }
}

window.onRoomSelected = function() {
    const select = document.getElementById("tenant-room-select");
    if (!select) return;
    const selectedOption = select.options[select.selectedIndex];
    const price = selectedOption.getAttribute("data-price");
    const card = document.getElementById("rent-details-card");
    const displayPrice = document.getElementById("display-rent-price");

    if (price && card && displayPrice) {
        displayPrice.innerText = "R" + parseFloat(price).toLocaleString('en-ZA', { minimumFractionDigits: 2 });
        card.classList.remove("hidden");
    } else if (card) {
        card.classList.add("hidden");
    }
};

window.triggerPaystackPayment = function() {
    const select = document.getElementById("tenant-room-select");
    if (!select) return;
    const selectedOption = select.options[select.selectedIndex];
    const roomName = selectedOption.getAttribute("data-name") || selectedOption.value;
    const price = parseFloat(selectedOption.getAttribute("data-price"));
    const phoneInput = document.getElementById("tenant-phone-input");
    const phone = phoneInput ? phoneInput.value.trim() : "";

    if (!price || isNaN(price)) {
        alert("Please select a valid room.");
        return;
    }

    if (!phone) {
        alert("Please enter your phone number.");
        return;
    }

    // Initialize Paystack Inline Pop-up
    const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: `tenant_${phone}@samaritanweb.co.za`,
        amount: Math.round(price * 100),
        currency: 'ZAR',
        ref: 'SAM_' + Math.floor((Math.random() * 1000000000) + 1),
        metadata: {
            custom_fields: [
                { display_name: "Property Name", variable_name: "property_name", value: currentYardData ? currentYardData.propertyName : "Samaritan Property" },
                { display_name: "Room Number", variable_name: "room_number", value: roomName },
                { display_name: "Phone Number", variable_name: "phone_number", value: phone }
            ]
        },
        callback: function(response) {
            recordSuccessfulPayment(response.reference, price, roomName, phone);
        },
        onClose: function() {
            alert('Payment window closed.');
        }
    });

    handler.openIframe();
};

async function recordSuccessfulPayment(reference, amount, roomName, phone) {
    const samaritanFee = amount * 0.05;
    const netPayout = amount - samaritanFee;

    try {
        await addDoc(collection(db, "payments"), {
            reference: reference,
            propertyName: currentYardData ? currentYardData.propertyName : "Samaritan Property",
            propertyCode: currentYardCode || "general",
            roomName: roomName,
            amount: amount,
            samaritanFee: samaritanFee,
            netPayout: netPayout,
            tenantPhone: phone,
            status: "Success",
            datePaid: new Date().toISOString().split("T")[0],
            createdAt: serverTimestamp()
        });

        const statusBadge = document.getElementById("payment-status-badge");
        if (statusBadge) {
            statusBadge.innerText = "Paid Success";
            statusBadge.style.backgroundColor = "#d3f9d8";
            statusBadge.style.color = "#2b8a3e";
        }

        alert("Payment successful! Reference: " + reference);

    } catch (error) {
        console.error("Error recording payment: ", error);
        alert("Payment was processed on Paystack, but saving the record failed: " + error.message);
    }
}

// ============================================================
// SECTION 3: LANDLORD PORTAL LEDGER LOGIC
// ============================================================
function loadLandlordLedger(identifierCode) {
    const tbody = document.getElementById("landlord-ledger-body");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading ledger records...</td></tr>`;

    let q = query(collection(db, "payments"), where("propertyCode", "==", identifierCode));
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No rent payments recorded yet for this property ledger.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const tenantRef = data.tenantPhone ? data.tenantPhone : "N/A";
            tbody.innerHTML += `
                <tr>
                    <td><strong>${data.propertyName}</strong></td>
                    <td>${data.roomName}</td>
                    <td>R${parseFloat(data.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td>${tenantRef}</td>
                    <td>${data.datePaid}</td>
                    <td><span style="background:#d3f9d8; color:#2b8a3e; padding:4px 8px; border-radius:12px; font-weight:bold; font-size:0.8rem;">Paid (Net R${parseFloat(data.netPayout).toLocaleString('en-ZA', { minimumFractionDigits: 2 })})</span></td>
                </tr>
            `;
        });
    });
}
