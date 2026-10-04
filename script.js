// ============================================================
// FIREBASE MODULE INITIALIZATION & SERVICES
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    getDoc, 
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
// APPLICATION STATE & URL ROUTING
// ============================================================
let currentYardCode = null;
let currentYardData = null;

document.addEventListener("DOMContentLoaded", () => {
    // Check URL parameters for dynamic portal routing
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get("view");
    const yardParam = urlParams.get("yard");

    if (viewParam && yardParam) {
        currentYardCode = yardParam;
        
        if (viewParam === "tenant-portal") {
            enterSamaritanDashboard();
            switchView("tenant-portal");
            loadTenantYardPortal(yardParam);
        } else if (viewParam === "landlord-portal") {
            enterSamaritanDashboard();
            switchView("landlord-portal");
            loadLandlordLedger(yardParam);
        }
    }

    // Attach real-time listener to admin metrics
    listenToMasterMetrics();
});

// ============================================================
// MASTER ADMIN: LANDLORD & YARD REGISTRATION
// ============================================================
window.handleLandlordRegistration = async function() {
    const landlordName = document.getElementById("landlord-name").value.trim();
    const landlordPhone = document.getElementById("landlord-phone").value.trim();
    const landlordBank = document.getElementById("landlord-bank").value.trim();
    const propertyName = document.getElementById("property-name").value.trim();
    const propertyCode = document.getElementById("property-code").value.trim().toLowerCase();
    const rawRoomPrices = document.getElementById("room-prices-input").value.trim();

    if (!landlordName || !propertyName || !propertyCode || !rawRoomPrices) {
        alert("Please fill in all required fields.");
        return;
    }

    // Parse Room Numbers & Prices (e.g. "Room 1: 2000, Room 2: 2500")
    const roomsList = [];
    const pairs = rawRoomPrices.split(",");
    pairs.forEach(pair => {
        const parts = pair.split(":");
        if (parts.length === 2) {
            const roomName = parts[0].trim();
            const price = parseFloat(parts[1].trim());
            if (roomName && !isNaN(price)) {
                roomsList.push({ name: roomName, price: price });
            }
        }
    });

    if (roomsList.length === 0) {
        alert("Invalid room price format! Use format: Room 1: 2000, Room 2: 2500");
        return;
    }

    try {
        // Save Property Yard to Firestore
        await addDoc(collection(db, "properties"), {
            landlordName: landlordName,
            landlordPhone: landlordPhone,
            landlordBank: landlordBank,
            propertyName: propertyName,
            propertyCode: propertyCode,
            rooms: roomsList,
            createdAt: serverTimestamp()
        });

        // Generate Links
        const baseUrl = window.location.origin + window.location.pathname;
        const tenantLink = `${baseUrl}?view=tenant-portal&yard=${propertyCode}`;
        const landlordLink = `${baseUrl}?view=landlord-portal&yard=${propertyCode}`;

        const container = document.getElementById("generated-links-container");
        container.innerHTML = `
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                <strong style="color: #FFD700;">${propertyName} (Tenant Payment Link):</strong>
                <input type="text" value="${tenantLink}" readonly style="width:100%; margin: 5px 0; padding: 6px; background:#111; color:#fff; border:1px solid #444;">
                <button class="btn btn-gold" onclick="navigator.clipboard.writeText('${tenantLink}'); alert('Tenant link copied!');"><i class="fa-solid fa-copy"></i> Copy Tenant Link</button>
            </div>
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
                <strong style="color: #00E676;">Landlord Dashboard Link:</strong>
                <input type="text" value="${landlordLink}" readonly style="width:100%; margin: 5px 0; padding: 6px; background:#111; color:#fff; border:1px solid #444;">
                <button class="btn btn-gold-outline" onclick="navigator.clipboard.writeText('${landlordLink}'); alert('Landlord link copied!');"><i class="fa-solid fa-copy"></i> Copy Landlord Link</button>
            </div>
        `;

        document.getElementById("add-landlord-form").reset();
        alert("Property successfully registered and saved to Firestore!");

    } catch (error) {
        console.error("Error saving landlord property: ", error);
        alert("Failed to save property: " + error.message);
    }
};

// Real-time listener for Master Admin Metrics
function listenToMasterMetrics() {
    onSnapshot(collection(db, "properties"), (snapshot) => {
        document.getElementById("active-yards").innerText = snapshot.size;
        
        let uniqueLandlords = new Set();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.landlordName) uniqueLandlords.add(data.landlordName);
        });
        document.getElementById("active-landlords").innerText = uniqueLandlords.size;
    });

    onSnapshot(collection(db, "payments"), (snapshot) => {
        let totalRev = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.amount) totalRev += parseFloat(data.amount);
        });
        document.getElementById("total-revenue").innerText = "R" + totalRev.toLocaleString('en-ZA', { minimumFractionDigits: 2 });
    });
}

// ============================================================
// VIEW 2: TENANT PORTAL LOGIC & PAYSTACK INTEGRATION
// ============================================================
async function loadTenantYardPortal(yardCode) {
    const titleElem = document.getElementById("tenant-location-title");
    const selectElem = document.getElementById("tenant-room-select");

    const q = query(collection(db, "properties"), where("propertyCode", "==", yardCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        titleElem.innerText = "Property Not Found";
        selectElem.innerHTML = `<option value="">-- No Rooms Available --</option>`;
        return;
    }

    const propDoc = querySnapshot.docs[0];
    currentYardData = propDoc.data();
    titleElem.innerText = currentYardData.propertyName;

    selectElem.innerHTML = `<option value="">-- Choose Your Room --</option>`;
    currentYardData.rooms.forEach((room, index) => {
        selectElem.innerHTML += `<option value="room-${index}" data-name="${room.name}" data-price="${room.price}">${room.name} - R${room.price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</option>`;
    });
}

window.triggerPaystackPayment = function() {
    const select = document.getElementById("tenant-room-select");
    const selectedOption = select.options[select.selectedIndex];
    const roomName = selectedOption.getAttribute("data-name") || selectedOption.value;
    const price = parseFloat(selectedOption.getAttribute("data-price"));
    const phone = document.getElementById("tenant-phone-input").value.trim();

    if (!price || isNaN(price)) {
        alert("Please select a valid room number.");
        return;
    }

    if (!phone) {
        alert("Please enter your phone/WhatsApp number.");
        return;
    }

    // Initialize Paystack Inline Pop-up
    const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: `tenant_${phone}@samaritanweb.co.za`, // Generates test email based on phone number
        amount: Math.round(price * 100), // Amount in South African Cents (ZAR)
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
            // Success Callback: Save transaction to Firestore
            recordSuccessfulPayment(response.reference, price, roomName, phone);
        },
        onClose: function() {
            alert('Payment window closed.');
        }
    });

    handler.openIframe();
};

async function recordSuccessfulPayment(reference, amount, roomName, phone) {
    const samaritanFee = amount * 0.05; // 5% platform commission
    const netPayout = amount - samaritanFee;

    try {
        await addDoc(collection(db, "payments"), {
            reference: reference,
            propertyName: currentYardData ? currentYardData.propertyName : "Lotus Gardens Phase 4",
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

        // Update UI
        document.getElementById("payment-status-badge").innerText = "Paid Success";
        document.getElementById("payment-status-badge").className = "badge badge-success";
        document.getElementById("payment-status-badge").style.backgroundColor = "#d3f9d8";
        document.getElementById("payment-status-badge").style.color = "#2b8a3e";

        alert("Payment successful! Receipt reference: " + reference);

    } catch (error) {
        console.error("Error saving payment ledger: ", error);
        alert("Payment was successful on Paystack, but saving record failed: " + error.message);
    }
}

// ============================================================
// VIEW 3: LANDLORD PORTAL LEDGER LOGIC
// ============================================================
function loadLandlordLedger(yardCode) {
    const tbody = document.getElementById("landlord-ledger-body");
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Loading ledger records...</td></tr>`;

    const q = query(collection(db, "payments"), where("propertyCode", "==", yardCode));
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No rent payments recorded yet for this property.</td></tr>`;
            return;
        }

        tbody.innerHTML = "";
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td><strong>${data.propertyName}</strong></td>
                    <td>${data.roomName}</td>
                    <td>R${parseFloat(data.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td>${data.datePaid}</td>
                    <td>R${parseFloat(data.samaritanFee).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                    <td><span class="badge" style="background:#d3f9d8; color:#2b8a3e; padding:4px 8px; border-radius:12px;">Paid (Net R${parseFloat(data.netPayout).toLocaleString('en-ZA', { minimumFractionDigits: 2 })})</span></td>
                </tr>
            `;
        });
    });
}