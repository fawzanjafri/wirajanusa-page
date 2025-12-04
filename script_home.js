// =======================================================
// ===== 1. KONFIGURASI & PEMBOLEHUBAH GLOBAL =====
// =======================================================

// URL Google Sheet (Format CSV)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTaXbK7mx0na3uTO8jA_WtQ9v8qwJYBTPgmXPd5gaA0uKMhnMsmyZToq41INGBCooYak5SlbyK9Z4Px/pub?output=csv';

let activities = {}; 
let currentActiveDayElement = null; 
let currentCalendarDate = new Date(); 

// --- Elemen DOM Kalendar ---
const calendarDays = document.getElementById('calendarDays');
const currentMonthDisplay = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');

// --- Elemen DOM Modal Tambah/Edit (PENTING: Ini yang hilang sebelum ni) ---
const activityModal = document.getElementById('activityModal');
const closeModalBtn = document.getElementById('closeModal');
const saveActivityBtn = document.getElementById('saveActivityBtn');
const modalDateSpan = document.getElementById('modalDateSpan');

// Input Form
const activityNameInput = document.getElementById('activityName');
const activityExcoSelect = document.getElementById('activityExco');
const activityStartTime = document.getElementById('activityStartTime');
const activityEndTime = document.getElementById('activityEndTime');
const activityPIC = document.getElementById('activityPIC');

// --- Elemen DOM Modal Butiran (Detail) ---
const activityDetailModal = document.getElementById('activityDetailModal');
const closeDetailModalBtn = document.getElementById('closeDetailModal');
const editActivityBtn = document.getElementById('editActivityBtn');
const deleteActivityBtn = document.getElementById('deleteActivityBtn');

// Variable sementara untuk edit/delete
let currentActivityDateKey = null;
let currentActivityIndex = -1;


// =======================================================
// ===== 2. FUNGSI FETCH DATA (GOOGLE SHEETS) =====
// =======================================================
async function loadActivitiesFromSheet() {
    console.log("Memulakan proses tarik data dari Google Sheet...");

    try {
        const response = await fetch(SHEET_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.text();
        
        // Reset activities
        activities = {};

        // Pecahkan baris
        const rows = data.split('\n');

        rows.forEach((row, index) => {
            // Abaikan baris kosong
            if (!row.trim()) return;

            // Regex untuk handle koma dalam quote (contoh: "Program A, Dewan B")
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
            
            // Fungsi cuci text (buang quote " ")
            const clean = (text) => text ? text.replace(/^"|"$/g, '').trim() : '';

            // Pastikan ada cukup column (A=Bil, B=Date, C=Nama, D=Exco, E=Start, F=End, G=PIC)
            if (cols.length > 2) {
                
                let rawDate = clean(cols[1]); // Column B (Indeks 1)
                let dateKey = null;

                // --- LOGIK PARSING TARIKH PINTAR ---
                // 1. Cuba Format YYYY-MM-DD (contoh: 2025-12-03)
               if (rawDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    dateKey = rawDate;
                }
                // 2. Cuba Format DD/MM/YYYY atau D/M/YYYY (contoh: 3/12/2025)
                else if (rawDate.includes('/')) {
                    // ... (logik split tarikh kekal sama) ...
                    const parts = rawDate.split('/');
                    if (parts.length === 3) {
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        const year = parts[2];
                        dateKey = `${year}-${month}-${day}`;
                    }
                }

                // Jika tarikh valid, simpan data
                if (dateKey) {
                    const name = clean(cols[2]);      // Column C
                    const exco = clean(cols[3]);      // Column D
                    const startTime = clean(cols[4]); // Column E
                    const endTime = clean(cols[5]);   // Column F
                    const pic = clean(cols[6]);       // Column G
                    const venue = clean(cols[7]);     // Column H

                    if (!activities[dateKey]) {
                        activities[dateKey] = [];
                    }

                    activities[dateKey].push({
                        name: name,
                        exco: exco,
                        startTime: startTime,
                        endTime: endTime,
                        pic: pic,
                        venue: venue
                    });
                }
            }
        });

        console.log("Data berjaya ditarik & diproses:", activities);
        generateCalendar(currentCalendarDate);

    } catch (error) {
        console.error("Gagal tarik data Google Sheet:", error);
    }
}


// =======================================================
// ===== 3. DARK/LIGHT MODE LOGIC =====
// =======================================================
const themeToggle = document.getElementById('themeToggle');
const body = document.body;
const themeKey = 'wirajanusa_theme';

function loadTheme() {
    const savedTheme = localStorage.getItem(themeKey) || 'light';
    body.classList.toggle('dark-mode', savedTheme === 'dark');
}

function toggleTheme() {
    body.classList.toggle('dark-mode');
    const newTheme = body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem(themeKey, newTheme);
}

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}


// =======================================================
// ===== 4. LOGIK PENJANAAN KALENDAR =====
// =======================================================

function generateCalendar(date) {
    if (!calendarDays) return;

    calendarDays.innerHTML = ''; // Kosongkan kalendar sedia ada

    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Setup tarikh
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Hari pertama minggu (Isnin sebagai hari pertama)
    let startingDay = firstDayOfMonth.getDay();
    if (startingDay === 0) startingDay = 7; 
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    let daysFromPrevMonth = startingDay - 1; 

    // 1. Padding Bulan Lepas
    for (let i = daysFromPrevMonth; i > 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'disabled');
        dayElement.innerHTML = `<span class="day-number">${prevMonthLastDay - i + 1}</span>`;
        calendarDays.appendChild(dayElement);
    }
    
    // 2. Hari Bulan Semasa
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        
        // Set attribute nombor hari (untuk CSS)
        dayElement.setAttribute('data-day-number', day);
        dayElement.innerHTML = `<span class="day-number">${day}</span>`;
        
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayElement.setAttribute('data-date-key', dateKey);
        
        // Tanda Hari Ini
        if (dateKey === todayKey) {
            dayElement.classList.add('is-today');
        }

        // Butang Tambah (+) - Walaupun hidden via CSS, elemen perlu wujud
        const addActivityBtn = document.createElement('button');
        addActivityBtn.textContent = '+';
        addActivityBtn.classList.add('add-activity-btn');
        addActivityBtn.setAttribute('data-date-key', dateKey); 
        dayElement.appendChild(addActivityBtn);
        
        // Paparkan Aktiviti (Data dari Google Sheet)
        if (activities[dateKey]) {
            dayElement.classList.add('has-activity'); // Helper class
            activities[dateKey].forEach(activity => {
                displayActivityOnCalendar(dateKey, activity, dayElement);
            });
        }
        
        calendarDays.appendChild(dayElement);
    }
    
    // 3. Padding Bulan Depan
    let totalCells = daysFromPrevMonth + lastDayOfMonth.getDate();
    let daysToNextMonth = (42 - totalCells) % 7; 

    for (let i = 1; i <= daysToNextMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'disabled');
        dayElement.innerHTML = `<span class="day-number">${i}</span>`;
        calendarDays.appendChild(dayElement);
    }

    // Tajuk Bulan
    if(currentMonthDisplay) {
        currentMonthDisplay.textContent = date.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
    }
}

function displayActivityOnCalendar(dateKey, activity, dayElement) {
    const activityItem = document.createElement('div');
    
    // Kita kekalkan warna ikut Exco supaya nampak cantik
    const excoClass = activity.exco ? `exco-${activity.exco.toLowerCase().replace(/\s+/g, '-')}` : 'exco-default';
    activityItem.classList.add('activity-item', excoClass);
    
    const activityIndex = activities[dateKey].findIndex(a => a === activity);
    activityItem.setAttribute('data-activity-index', activityIndex);
    
    // === UBAH DISPLAI DI SINI ===
    activityItem.innerHTML = `
        <span class="act-name">${activity.name}</span>
        <span class="act-time">${activity.startTime} - ${activity.endTime}</span>
        <span class="act-venue">📍 ${activity.venue || 'TBA'}</span>
    `;

    activityItem.addEventListener('click', (e) => {
        e.stopPropagation(); 
        openActivityDetailModal(activity, activityIndex, dateKey);
    });
    
    dayElement.appendChild(activityItem);
}


// =======================================================
// ===== 5. EVENT LISTENERS NAVIGASI KALENDAR =====
// =======================================================
if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        generateCalendar(currentCalendarDate);
    });
}

if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        generateCalendar(currentCalendarDate);
    });
}


// =======================================================
// ===== 6. LOGIK MODAL (VIEW DETAILS) =====
// =======================================================

function openActivityDetailModal(activity, index, dateKey) {
    if (!activityDetailModal) return;

    currentActivityDateKey = dateKey;
    currentActivityIndex = index;
    
    // Format Tarikh Cantik
    const dateParts = dateKey.split('-');
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dateString = dateObj.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

    // Masukkan data ke dalam Modal
    document.getElementById('detailActivityName').textContent = activity.name;
    document.getElementById('detailActivityDate').textContent = dateString;
    document.getElementById('detailActivityExco').textContent = activity.exco;
    document.getElementById('detailActivityTime').textContent = `${activity.startTime} - ${activity.endTime}`;
    document.getElementById('detailActivityPIC').textContent = activity.pic || '-';
    document.getElementById('detailActivityVenue').textContent = activity.venue || '-';
    document.getElementById('detailActivityTitleInModal').textContent = activity.name;

    activityDetailModal.classList.add('active');
}

function closeActivityDetailModal() {
    if (!activityDetailModal) return;
    activityDetailModal.classList.remove('active');
}

// Event Listeners Modal
if (closeDetailModalBtn) closeDetailModalBtn.addEventListener('click', closeActivityDetailModal);

if (activityDetailModal) {
    activityDetailModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeActivityDetailModal();
    });
}

// Logik Butang Delete (Hanya padam sementara di skrin, tidak delete di Google Sheet)
if (deleteActivityBtn) {
    deleteActivityBtn.addEventListener('click', () => {
        alert("Fungsi padam hanya boleh dilakukan oleh Admin melalui Google Sheets.");
    });
}


// =======================================================
// ===== 7. LOGIK MODAL TAMBAH (LEGACY - HIDDEN) =====
// =======================================================
// Fungsi ini dikekalkan supaya kod tidak error jika ada panggilan 'openActivityModal'
function openActivityModal(dayElement) {
    if (!activityModal) return;
    // Logik tambah aktiviti manual dimatikan kerana guna Google Sheet
    alert("Sila tambah aktiviti melalui Google Sheets.");
}

function closeActivityModal() {
    if (activityModal) activityModal.classList.remove('active');
}

if (closeModalBtn) closeModalBtn.addEventListener('click', closeActivityModal);
if (activityModal) activityModal.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeActivityModal();
});

// Event Delegation untuk butang '+' (Jika butang ini didedahkan semula)
if (calendarDays) {
    calendarDays.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-activity-btn')) {
            e.stopPropagation();
            alert("Sila tambah aktiviti melalui Google Sheets.");
        }
    });
}


// =======================================================
// ===== 8. SIDEBAR LOGIC =====
// =======================================================
const sidebarPanel = document.getElementById("sidebarPanel");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const closeSidebar = document.getElementById("closeSidebar");
const menuTrigger = document.querySelector(".menu-trigger");

if (menuTrigger) {
    menuTrigger.addEventListener("click", function(e){
        e.preventDefault();
        if (sidebarPanel) sidebarPanel.classList.add("active");
        if (sidebarOverlay) sidebarOverlay.classList.add("active");
    });
}
if (closeSidebar) {
    closeSidebar.addEventListener("click", function(){
        if (sidebarPanel) sidebarPanel.classList.remove("active");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
    });
}
if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", function(){
        if (sidebarPanel) sidebarPanel.classList.remove("active");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
    });
}


// =======================================================
// ===== 9. VIDEO SLIDESHOW LOGIC (HYBRID) =====
// =======================================================
const videoSources = [
  "assets/videos/hero1.mp4",
  "assets/videos/hero2.mp4"
];

const videos = document.querySelectorAll(".hero-video");
const prevVideoBtn = document.getElementById("prevVideo");
const nextVideoBtn = document.getElementById("nextVideo");

let currentVideoIndex = 0;
let slideInterval; 

if (videos.length > 0) {
    
    // Play all videos muted initially for smooth transition
    videos.forEach((vid, index) => {
        if (videoSources[index]) {
            vid.src = videoSources[index];
            vid.muted = true; 
            vid.play().catch(e => console.log("Autoplay prevented:", e));
        }
    });

    function showVideo(index) {
        videos.forEach(v => v.classList.remove("active"));
        videos[index].classList.add("active");
        videos[index].play().catch(e => console.log(e));
    }

    function nextSlide() {
        currentVideoIndex = (currentVideoIndex + 1) % videos.length;
        showVideo(currentVideoIndex);
        resetTimer();
    }

    function prevSlide() {
        currentVideoIndex = (currentVideoIndex - 1 + videos.length) % videos.length;
        showVideo(currentVideoIndex);
        resetTimer();
    }

    function startTimer() {
        slideInterval = setInterval(() => {
            currentVideoIndex = (currentVideoIndex + 1) % videos.length;
            showVideo(currentVideoIndex);
        }, 8000); 
    }

    function resetTimer() {
        clearInterval(slideInterval);
        startTimer();
    }

    if (nextVideoBtn) nextVideoBtn.addEventListener("click", nextSlide);
    if (prevVideoBtn) prevVideoBtn.addEventListener("click", prevSlide);

    startTimer();
}


// =======================================================
// ===== 10. INITIALIZATION =====
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadActivitiesFromSheet(); // Tarik data sheet
});