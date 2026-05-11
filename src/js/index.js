import "jsvectormap/dist/jsvectormap.min.css";
import "flatpickr/dist/flatpickr.min.css";
import "dropzone/dist/dropzone.css";
import "../css/style.css";

import Alpine from "alpinejs";
import persist from "@alpinejs/persist";
import flatpickr from "flatpickr";
import Dropzone from "dropzone";

import chart01 from "./components/charts/chart-01";
import chart02 from "./components/charts/chart-02";
import chart03 from "./components/charts/chart-03";
import map01 from "./components/map-01";
import demographicsMap from "./components/demographics-map";
import "./components/calendar-init.js";
import "./components/image-resize";
import { auth, db } from "./firebase";
import { onAuthStateChanged, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { setDoc, doc, getDoc, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Auth Guard & Global Logic
let isSigningUp = false;

onAuthStateChanged(auth, async (user) => {
  if (isSigningUp) return; // Prevent race condition during signup

  const isSignupPage = window.location.pathname.includes("signup.html");
  if (!user && !isSignupPage) {
    window.location.href = "signup.html";
  } else if (user && isSignupPage) {
    window.location.href = "index.html";
  } else if (user && !isSignupPage) {
    // Fetch and display user name/email
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const nameDisplay = document.getElementById("header-user-name");
        const dropdownName = document.getElementById("dropdown-user-name");
        const dropdownEmail = document.getElementById("dropdown-user-email");
        const initialDisplay = document.getElementById("user-initial");

        const name = userData.name || user.email;
        if (nameDisplay) nameDisplay.textContent = name;
        if (dropdownName) dropdownName.textContent = name;
        if (dropdownEmail) dropdownEmail.textContent = user.email;
        if (initialDisplay) initialDisplay.textContent = name.charAt(0).toUpperCase();

        // Profile Page Specific
        const profileInitial = document.getElementById("profile-user-initial");
        const profileName = document.getElementById("profile-user-name");
        const profileInfoName = document.getElementById("profile-info-name");
        const profileInfoEmail = document.getElementById("profile-info-email");

        if (profileInitial) profileInitial.textContent = name.charAt(0).toUpperCase();
        if (profileName) profileName.textContent = name;
        if (profileInfoName) profileInfoName.textContent = name;
        if (profileInfoEmail) profileInfoEmail.textContent = user.email;

        // Dashboard Metrics Sync
        const activeComplaintsCount = document.getElementById("active-complaints-count");
        if (activeComplaintsCount) {
          const count = localStorage.getItem("activeComplaintsCount") || "3";
          activeComplaintsCount.textContent = count;
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
    document.body.style.visibility = "visible";
  } else if (!user && isSignupPage) {
    document.body.style.visibility = "visible";
  }
});

window.handleSignOut = async () => {
  try {
    await signOut(auth);
    window.location.href = "signup.html";
  } catch (error) {
    console.error("Sign out error:", error);
  }
};

window.handleSignup = async () => {
  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const terms = document.getElementById("terms").checked;

  if (!name || !email || !password) {
    alert("Please fill in all fields");
    return;
  }

  if (!terms) {
    alert("Please agree to the terms and conditions");
    return;
  }

  try {
    isSigningUp = true; // Set flag
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      createdAt: new Date().toISOString()
    });

    console.log("Data stored successfully");
    
    // Show loader for 10 seconds
    const loader = document.createElement("div");
    loader.innerHTML = `
      <div class="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-xl text-white">
        <div class="w-20 h-20 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-8"></div>
        <h2 class="text-3xl font-bold mb-4">Creating your GovAdmin Account...</h2>
        <p class="text-gray-400 text-lg">Setting up your personal dashboard and municipal tools.</p>
      </div>
    `;
    document.body.appendChild(loader);

    setTimeout(() => {
      window.location.href = "index.html";
    }, 10000);

  } catch (error) {
    isSigningUp = false;
    console.error("Signup Error:", error);
    alert("Signup Failed: " + error.message);
  }
};

window.handleIssueDocument = async (formData) => {
  if (!auth.currentUser) {
    alert("Please sign in to issue documents.");
    return;
  }

  try {
    // Show loader for 10 seconds
    const loader = document.createElement("div");
    loader.id = "permit-loader";
    loader.innerHTML = `
      <div class="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-gray-950/90 backdrop-blur-xl text-white font-outfit">
        <div class="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-8 shadow-lg shadow-blue-600/20"></div>
        <h2 class="text-3xl font-bold mb-4 tracking-tight">Verifying Credentials...</h2>
        <p class="text-gray-400 text-lg">Processing digital permit for <span class="text-white font-bold">${formData.applicantName}</span></p>
      </div>
    `;
    document.body.appendChild(loader);

    // Prepare data
    const permitData = {
      "Applicant Name": formData.applicantName,
      "Business Reg Number": formData.businessReg,
      "Permit Type": formData.permitType,
      "Processing Status": formData.status,
      "Amount Charged": Number(formData.amount),
      "Expiration Date": formData.expiryDate ? new Date(formData.expiryDate) : null,
      createdAt: serverTimestamp(),
      serialNumber: "GOV-" + Math.random().toString(36).substr(2, 9).toUpperCase()
    };

    // Store in Firestore - Subcollection "permit & License"
    const docRef = await addDoc(collection(db, "users", auth.currentUser.uid, "permit & License"), permitData);

    setTimeout(() => {
      // Remove loader
      const existingLoader = document.getElementById("permit-loader");
      if (existingLoader) document.body.removeChild(existingLoader);

      // Show Success Modal
      const successModal = document.createElement("div");
      successModal.innerHTML = `
        <div class="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-outfit">
          <div class="w-full max-w-md bg-white dark:bg-gray-950 rounded-[2.5rem] p-10 shadow-2xl border border-gray-100 dark:border-gray-900 text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-cyan-500"></div>
            
            <div class="w-24 h-24 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            
            <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">Issuance Successful</h2>
            <p class="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed">The digital document has been verified, generated, and officially recorded.</p>
            
            <div class="bg-gray-50 dark:bg-gray-900/50 rounded-3xl p-8 mb-10 text-left border border-gray-100 dark:border-gray-800 space-y-6">
              <div>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Entity / Business</p>
                <p class="text-xl font-bold text-gray-900 dark:text-white">${formData.applicantName}</p>
              </div>
              <div class="flex flex-col gap-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <p class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Document Hash ID</p>
                  <p class="font-mono text-sm font-bold text-blue-600 break-all">${docRef.id}</p>
                </div>
                <div>
                  <p class="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Official Serial No.</p>
                  <p class="font-mono text-base font-bold text-gray-900 dark:text-white">${permitData.serialNumber}</p>
                </div>
              </div>
            </div>

            <button onclick="window.location.reload()" class="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/30 active:scale-[0.98]">
              Continue to Dashboard
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(successModal);
    }, 10000);

  } catch (error) {
    console.error("Error issuing permit:", error);
    alert("Failed to issue permit: " + error.message);
    const existingLoader = document.getElementById("permit-loader");
    if (existingLoader) document.body.removeChild(existingLoader);
  }
};

window.recordExpenditure = async (data) => {
  const user = auth.currentUser;
  if (!user) {
    alert("Session expired. Please sign in again.");
    window.location.href = "signup.html";
    return;
  }

  console.log("Recording expenditure for user:", user.uid, data);

  try {
    const expenditureData = {
      "Amount": Number(data.amount),
      "Beneficiary": data.vendor,
      "Category": data.category,
      "Project Title ": data.title, // Matching the space in the screenshot "Project Title "
      "date": new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      "createdAt": serverTimestamp()
    };

    // Store in Firestore - Collection "Expenditure" (Capitalized)
    const docRef = await addDoc(collection(db, "users", user.uid, "Expenditure"), expenditureData);
    console.log("Expenditure recorded successfully with ID:", docRef.id);
    return true;
  } catch (error) {
    console.error("Firestore Error recording expenditure:", error);
    alert("Database Error: " + error.message);
    throw error;
  }
};

window.fetchExpenditures = async () => {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    const q = query(
      collection(db, "users", user.uid, "Expenditure"), // Capitalized
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const logs = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({ 
        id: doc.id, 
        title: data["Project Title "], // Matching space
        amount: data["Amount"],
        category: data["Category"],
        vendor: data["Beneficiary"],
        date: data["date"]
      });
    });
    return logs;
  } catch (error) {
    console.error("Error fetching expenditures:", error);
    return [];
  }
};

window.registerCitizen = async (data) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const citizenData = {
      "Full Name": data.name,
      "NIN": Number(data.nin),
      "State of Origin": data.state,
      "LGA": data.lga,
      "Gender": data.gender,
      "DOB": data.dob || "", // Using age or dob if provided
      "status": "Verified",
      "createdAt": serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "users", user.uid, "New Citizen"), citizenData);
    console.log("Citizen registered with ID:", docRef.id);

    // Show Success Modal for 5 seconds
    const modal = document.createElement("div");
    modal.innerHTML = `
      <div class="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-outfit">
        <div class="w-full max-w-sm bg-white dark:bg-gray-950 rounded-[2rem] p-8 shadow-2xl border border-gray-100 dark:border-gray-900 text-center relative overflow-hidden">
          <div class="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-500 to-emerald-400"></div>
          <div class="w-20 h-20 bg-green-50 dark:bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Registration Saved</h2>
          <p class="text-gray-500 dark:text-gray-400 text-sm mb-6">Citizen record for <span class="font-bold text-gray-900 dark:text-white">${data.name}</span> has been officially synchronized.</p>
          <div class="w-full bg-gray-100 dark:bg-gray-900 rounded-full h-1 overflow-hidden">
            <div id="modal-progress" class="bg-green-500 h-full w-full"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Animate progress bar for 5s
    const progress = modal.querySelector("#modal-progress");
    progress.style.transition = "width 5s linear";
    setTimeout(() => progress.style.width = "0%", 10);

    setTimeout(() => {
      document.body.removeChild(modal);
    }, 5000);

    return true;
  } catch (error) {
    console.error("Error registering citizen:", error);
    alert("Database Error: " + error.message);
    throw error;
  }
};

window.fetchCitizens = async () => {
  // Wait for Auth to initialize if needed
  let user = auth.currentUser;
  if (!user) {
    user = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        unsubscribe();
        resolve(u);
      });
      // Safety timeout
      setTimeout(() => resolve(null), 2000);
    });
  }

  if (!user) return [];

  try {
    const q = query(
      collection(db, "users", user.uid, "New Citizen"),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const list = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      list.push({ 
        id: doc.id, 
        name: data["Full Name"] || "Unknown",
        nin: data["NIN"] || "N/A",
        state: data["State of Origin"] || "N/A",
        lga: data["LGA"] || "N/A",
        gender: data["Gender"] || "N/A",
        age: data["DOB"] || "N/A",
        status: data["status"] || "Verified",
        date: data["createdAt"] ? new Date(data["createdAt"].seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "Recently"
      });
    });
    return list;
  } catch (error) {
    console.error("Error fetching citizens:", error);
    return [];
  }
};

Alpine.plugin(persist);
window.Alpine = Alpine;
Alpine.start();

// Init flatpickr
flatpickr(".datepicker", {
  mode: "range",
  static: true,
  monthSelectorType: "static",
  dateFormat: "M j",
  defaultDate: [new Date().setDate(new Date().getDate() - 6), new Date()],
  prevArrow:
    '<svg class="stroke-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.25 6L9 12.25L15.25 18.5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  nextArrow:
    '<svg class="stroke-current" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.75 19L15 12.75L8.75 6.5" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  onReady: (selectedDates, dateStr, instance) => {
    // eslint-disable-next-line no-param-reassign
    instance.element.value = dateStr.replace("to", "-");
    const customClass = instance.element.getAttribute("data-class");
    instance.calendarContainer.classList.add(customClass);
  },
  onChange: (selectedDates, dateStr, instance) => {
    // eslint-disable-next-line no-param-reassign
    instance.element.value = dateStr.replace("to", "-");
  },
});

// Init Dropzone
const dropzoneArea = document.querySelectorAll("#demo-upload");

if (dropzoneArea.length) {
  let myDropzone = new Dropzone("#demo-upload", { url: "/file/post" });
}

// Document Loaded
document.addEventListener("DOMContentLoaded", () => {
  chart01();
  chart02();
  chart03();
  map01();
  demographicsMap();
});

// Get the current year
const year = document.getElementById("year");
if (year) {
  year.textContent = new Date().getFullYear();
}

// For Copy//
document.addEventListener("DOMContentLoaded", () => {
  const copyInput = document.getElementById("copy-input");
  if (copyInput) {
    // Select the copy button and input field
    const copyButton = document.getElementById("copy-button");
    const copyText = document.getElementById("copy-text");
    const websiteInput = document.getElementById("website-input");

    // Event listener for the copy button
    copyButton.addEventListener("click", () => {
      // Copy the input value to the clipboard
      navigator.clipboard.writeText(websiteInput.value).then(() => {
        // Change the text to "Copied"
        copyText.textContent = "Copied";

        // Reset the text back to "Copy" after 2 seconds
        setTimeout(() => {
          copyText.textContent = "Copy";
        }, 2000);
      });
    });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.getElementById("search-input");
  const searchButton = document.getElementById("search-button");

  // Function to focus the search input
  function focusSearchInput() {
    searchInput.focus();
  }

  // Add click event listener to the search button
  searchButton.addEventListener("click", focusSearchInput);

  // Add keyboard event listener for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  document.addEventListener("keydown", function (event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
      event.preventDefault(); // Prevent the default browser behavior
      focusSearchInput();
    }
  });

  // Add keyboard event listener for "/" key
  document.addEventListener("keydown", function (event) {
    if (event.key === "/" && document.activeElement !== searchInput) {
      event.preventDefault(); // Prevent the "/" character from being typed
      focusSearchInput();
    }
  });
});

window.fetchTaxRevenue = async () => {
  const user = auth.currentUser;
  if (!user) return [];
  try {
    const q = query(collection(db, "users", user.uid, "TaxRevenue"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const list = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: doc.id,
        taxpayer: data.taxpayer || "N/A",
        tin: data.tin || "N/A",
        amount: data.amount || 0,
        status: data.status || "Cleared",
        date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "Recently"
      });
    });
    // Fallback samples if empty
    if (list.length === 0) {
      return [
        { id: '1', taxpayer: 'Dangote Cement Plc', tin: '1082374901', amount: 25500000, status: 'Cleared', date: '14 Sep 2025' },
        { id: '2', taxpayer: 'Amina Ibrahim', tin: '2298347102', amount: 45000, status: 'Cleared', date: '12 Sep 2025' }
      ];
    }
    return list;
  } catch (error) { return []; }
};

window.fetchPermits = async () => {
  const user = auth.currentUser;
  if (!user) return [];
  try {
    const q = query(collection(db, "users", user.uid, "Permits"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const list = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: doc.id,
        applicant: data.applicantName || "N/A",
        type: data.permitType || "N/A",
        amount: data.amount || 0,
        status: data.status || "Approved",
        expiry: data.expiryDate || "N/A"
      });
    });
    return list;
  } catch (error) { return []; }
};

window.handleIssueDocument = async (permitData) => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await addDoc(collection(db, "users", user.uid, "Permits"), {
      ...permitData,
      createdAt: serverTimestamp()
    });
    alert("Permit Issued Successfully");
  } catch (err) {
    console.error(err);
    alert("Failed to issue permit");
  }
};

// --- PDF Generation Logic ---

window.generateRevenueReport = async () => {
  const expenditures = await window.fetchExpenditures();
  const taxes = await window.fetchTaxRevenue();
  const permits = await window.fetchPermits();
  
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(26, 86, 219);
  doc.text("Comprehensive Revenue Collection Report", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // 1. Tax Revenue Section
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("1. Recent Tax Revenue", 14, 45);
  
  const taxData = taxes.map(t => [t.taxpayer, t.tin, `N${Number(t.amount).toLocaleString()}`, t.status, t.date]);
  autoTable(doc, {
    startY: 50,
    head: [['Taxpayer', 'TIN', 'Amount', 'Status', 'Date']],
    body: taxData,
    theme: 'grid',
    headStyles: { fillColor: [26, 86, 219] }
  });

  // 2. Permit Registration Section
  const permitStartY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(16);
  doc.text("2. Permit & License Registrations", 14, permitStartY);
  
  const permitData = permits.length > 0 ? permits.map(p => [p.applicant, p.type, `N${Number(p.amount).toLocaleString()}`, p.status, p.expiry]) : [['No permits issued yet', '', '', '', '']];
  autoTable(doc, {
    startY: permitStartY + 5,
    head: [['Applicant', 'Type', 'Amount', 'Status', 'Expiry']],
    body: permitData,
    theme: 'grid',
    headStyles: { fillColor: [34, 197, 94] } // Green
  });

  // 3. Expenditure Section
  const expStartY = doc.lastAutoTable.finalY + 15;
  if (expStartY > 250) doc.addPage();
  const finalExpY = expStartY > 250 ? 20 : expStartY;
  
  doc.setFontSize(16);
  doc.text("3. Expenditure Tracking", 14, finalExpY);
  
  const expData = expenditures.map(exp => [exp.title, exp.category, `N${Number(exp.amount).toLocaleString()}`, exp.date]);
  autoTable(doc, {
    startY: finalExpY + 5,
    head: [['Description', 'Category', 'Amount', 'Date']],
    body: expData,
    theme: 'grid',
    headStyles: { fillColor: [239, 68, 68] } // Red
  });

  doc.save("Comprehensive_Revenue_Report.pdf");
};

window.generateDemographicsReport = async () => {
  const citizens = await window.fetchCitizens();
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.setTextColor(139, 92, 246); // Purple
  doc.text("Citizen Demographics & Enrollment Report", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  doc.text("National Identity Management & Social Statistics", 14, 35);

  const tableData = citizens.map(c => [
    c.name,
    c.nin,
    c.gender,
    c.age,
    `${c.lga}, ${c.state}`,
    c.status
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Full Name', 'NIN', 'Gender', 'DOB/Age', 'Location', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [139, 92, 246], textColor: 255 }
  });

  doc.save("Citizen_Demographics_Report.pdf");
};

window.generateComplaintsReport = async () => {
  const complaints = await window.fetchComplaints();
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.setTextColor(249, 115, 22); // Orange
  doc.text("Complaints Resolution & Grievance Report", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  doc.text("Public Sector Transparency & Response Metrics", 14, 35);

  const tableData = complaints.map(c => [
    c.id,
    c.citizen,
    c.subject,
    c.category,
    c.priority,
    c.status
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Case ID', 'Citizen', 'Subject', 'Category', 'Priority', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: 255 }
  });

  doc.save("Complaints_Resolution_Report.pdf");
};

window.fetchUserProfile = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return { name: user.email };
  } catch (err) {
    console.error(err);
    return null;
  }
};

window.updateUserProfile = async (data) => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

// --- CSV Export ---
window.exportCitizensCSV = async (citizensData = null) => {
  const citizens = citizensData || await window.fetchCitizens();

  if (!citizens || citizens.length === 0) {
    alert("No citizen records found to export.");
    return;
  }

  const headers = ["Full Name", "NIN", "Gender", "Date of Birth", "State of Origin", "LGA", "Status", "Registered On"];

  // Escape a cell value for safe CSV output
  const escape = (val) => {
    const str = val === undefined || val === null ? "" : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = citizens.map(c => [
    c.name,
    c.nin,
    c.gender,
    c.age,    // stored as DOB string in Firestore
    c.state,
    c.lga,
    c.status,
    c.date    // registration date from Firestore createdAt
  ].map(escape).join(","));

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens the file without garbled characters
  const csvContent = "\uFEFF" + [headers.map(escape).join(","), ...rows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 10);
  link.setAttribute("href", url);
  link.setAttribute("download", `Citizen_Records_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Show a brief success toast
  const toast = document.createElement("div");
  toast.innerHTML = `
    <div class="fixed bottom-6 right-6 z-[99999] flex items-center gap-3 rounded-2xl bg-gray-900 px-5 py-4 shadow-2xl text-white font-outfit animate-fade-in">
      <div class="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 text-green-400 flex-shrink-0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div>
        <p class="text-sm font-semibold">CSV Exported Successfully</p>
        <p class="text-xs text-gray-400">${citizens.length} citizen record${citizens.length !== 1 ? 's' : ''} saved to Citizen_Records_${timestamp}.csv</p>
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.5s";
    toast.style.opacity = "0";
    setTimeout(() => document.body.removeChild(toast), 500);
  }, 3500);
};
