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
                
               const name = clean(cols[2]);      // Column C
                const level = clean(cols[3]);     // Column D (Peringkat Baru)
                const exco = clean(cols[4]);      // Column E (Asalnya D)
                const startTime = clean(cols[5]); // Column F (Asalnya E)
                const endTime = clean(cols[6]);   // Column G (Asalnya F)
                const pic = clean(cols[7]);       // Column H (Asalnya G)
                const venue = clean(cols[8]);     // Column I (Asalnya H)

                // Simpan data aktiviti ke dalam objek (Tambah level)
                const activityData = {
                    name: name,
                    level: level, 
                    exco: exco,
                    startTime: startTime,
                    endTime: endTime,
                    pic: pic,
                    venue: venue
                };

                // --- FUNGSI HELPER: TUKAR TEKS KE OBJEK TARIKH (VERSI STABIL) ---
                function parseToDate(dateStr) {
                    if (!dateStr) return null;
                    dateStr = dateStr.trim();
                    // Format sistem: YYYY-MM-DD
                    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const parts = dateStr.split('-');
                        // Guna parameter untuk elak isu zon masa (Timezone Shift)
                        return new Date(parts[0], parts[1] - 1, parts[2]);
                    } 
                    // Format biasa: DD/MM/YYYY
                    else if (dateStr.includes('/')) {
                        const parts = dateStr.split('/');
                        if (parts.length === 3) {
                            return new Date(parts[2], parts[1] - 1, parts[0]);
                        }
                    }
                    return null;
                }

                // --- LOGIK PARSING TARIKH PINTAR (REGEX) ---
                // Skrip akan ekstrak SEMUA tarikh lengkap yang dia jumpa dalam kotak
                const dateMatches = rawDate.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g);

                if (dateMatches && dateMatches.length >= 2) {
                    // KES 1: Tarikh Panjang (Ada 2 tarikh lengkap dikesan)
                    const startDate = parseToDate(dateMatches[0]);
                    const endDate = parseToDate(dateMatches[1]);

                    if (startDate && endDate && startDate <= endDate) {
                        let currentDate = new Date(startDate);
                        while (currentDate <= endDate) {
                            const y = currentDate.getFullYear();
                            const m = String(currentDate.getMonth() + 1).padStart(2, '0');
                            const d = String(currentDate.getDate()).padStart(2, '0');
                            const dateKey = `${y}-${m}-${d}`;

                            if (!activities[dateKey]) activities[dateKey] = [];
                            activities[dateKey].push(activityData);

                            // Gerak ke hari seterusnya
                            currentDate.setDate(currentDate.getDate() + 1);
                        }
                    }
                } else if (dateMatches && dateMatches.length === 1) {
                    // KES 2: Tarikh Biasa (Hanya 1 tarikh lengkap dikesan)
                    const singleDate = parseToDate(dateMatches[0]);
                    if (singleDate) {
                        const y = singleDate.getFullYear();
                        const m = String(singleDate.getMonth() + 1).padStart(2, '0');
                        const d = String(singleDate.getDate()).padStart(2, '0');
                        const dateKey = `${y}-${m}-${d}`;

                        if (!activities[dateKey]) activities[dateKey] = [];
                        activities[dateKey].push(activityData);
                    }
                } else {
                    console.warn("Format tarikh tidak difahami untuk aktiviti:", name, rawDate);
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
    document.getElementById('detailActivityLevel').textContent = activity.level || '-';
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
// ===== LOGIK DROPDOWN SIDEBAR (ACCORDION) =====
// =======================================================
const submenuToggles = document.querySelectorAll('.submenu-toggle');

submenuToggles.forEach(toggle => {
    toggle.addEventListener('click', function(e) {
        e.preventDefault(); // Halang link dari refresh page
        
        const parentLi = this.parentElement;
        const submenu = parentLi.querySelector('.submenu');
        
        // (Pilihan) Kalau kau nak menu lain automatik tertutup bila buka menu baru:
        document.querySelectorAll('.has-submenu').forEach(item => {
            if(item !== parentLi) {
                item.classList.remove('open');
                const otherSubmenu = item.querySelector('.submenu');
                if(otherSubmenu) otherSubmenu.classList.remove('open');
            }
        });

        // Toggle (Buka/Tutup) menu yang ditekan
        parentLi.classList.toggle('open');
        submenu.classList.toggle('open');
    });
});


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
    loadCadetProfiles();
    loadDirektoriPenuh();
});

// =======================================================
// ===== 11. FUNGSI FETCH PROFIL KADET (SIDANG) =====
// =======================================================

// TAMPAL LINK CSV 'INFO KADET' DI SINI
const CADET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTaXbK7mx0na3uTO8jA_WtQ9v8qwJYBTPgmXPd5gaA0uKMhnMsmyZToq41INGBCooYak5SlbyK9Z4Px/pub?gid=1610115312&single=true&output=csv';

async function loadCadetProfiles() {
    // Kita target ID container asal
    const gridContainer = document.getElementById('cadet-grid');
    if (!gridContainer) return; 

    const currentSidang = gridContainer.getAttribute('data-sidang').toUpperCase();
    console.log("Memuat turun profil untuk sidang:", currentSidang);

    try {
        const response = await fetch(CADET_SHEET_URL);
        if (!response.ok) throw new Error("Gagal tarik data profil");
        
        const data = await response.text();
        const rows = data.split('\n');

        // Sediakan dua "bakul" untuk asingkan kadet
        let jawatankuasa = [];
        let kadetBiasa = [];

        rows.forEach((row, index) => {
            if (index === 0 || !row.trim()) return; 
            
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const clean = (text) => text ? text.replace(/^"|"$/g, '').trim() : '';

            // SUSUNAN BARU (A=Nama, B=Matriks, C=Sidang, D=Jawatan, E=Jantina, F=Gambar)
            if (cols.length >= 6) {
                const nama = clean(cols[0]); 
                const matriks = clean(cols[1]);
                const sidang = clean(cols[2]).toUpperCase();
                const jawatan = clean(cols[3]).toUpperCase(); // Kolum D
                const jantina = clean(cols[4]).toUpperCase(); // Kolum E
                const photoUrl = clean(cols[5]);              // Kolum F

                if (sidang === currentSidang) {
                    
                    let finalPhoto = photoUrl;
                    if (photoUrl && photoUrl.includes("drive.google.com")) {
                        let fileId = "";
                        if (photoUrl.includes("id=")) fileId = photoUrl.split("id=")[1].split("&")[0];
                        else if (photoUrl.includes("/d/")) fileId = photoUrl.split("/d/")[1].split("/")[0];
                        
                        if (fileId && fileId.length > 10) {
                            finalPhoto = "https://lh3.googleusercontent.com/d/" + fileId;
                        }
                    }

                    let fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=111827&color=F5A623&size=300&bold=true`;
                    if (!finalPhoto || finalPhoto === "" || finalPhoto === "-") {
                        finalPhoto = fallbackImg;
                    }

                    // Objek data seorang kadet
                    const cadetObj = { nama, matriks, jawatan, jantina, finalPhoto, fallbackImg };

                    // Semak jika kadet ini adalah Jawatankuasa
                    let rank = 99; // Default (Kadet Biasa)
                    if (jawatan === "KETUA SIDANG") rank = 1;
                    else if (jawatan.includes("TIMBALAN")) rank = 2; // Boleh tangkap 'Timbalan Ketua' dsb.
                    else if (jawatan === "BENDAHARI") rank = 3;

                    if (rank < 99) {
                        cadetObj.rank = rank;
                        jawatankuasa.push(cadetObj);
                    } else {
                        kadetBiasa.push(cadetObj);
                    }
                }
            }
        });

        // --- SUSUNAN KHAS JAWATANKUASA (TIMBALAN KIRI, KETUA TENGAH, BENDAHARI KANAN) ---
        let ketuas = jawatankuasa.filter(k => k.rank === 1);
        let timbalans = jawatankuasa.filter(k => k.rank === 2);
        let bendaharis = jawatankuasa.filter(k => k.rank === 3);
        
        // Gabungkan semula mengikut urutan yang kau nak
        jawatankuasa = [...timbalans, ...ketuas, ...bendaharis];

        // Fungsi Helper untuk buat kod HTML kad kadet
        const generateCardHTML = (c) => `
            <div class="cadet-card">
                <div class="cadet-photo-container">
                    <img src="${c.finalPhoto}" alt="${c.nama}" class="cadet-photo" onerror="this.src='${c.fallbackImg}'">
                </div>
                <div class="cadet-info">
                    <h3 class="cadet-name">${c.nama}</h3>
                    <p class="cadet-matrix">${c.matriks}</p>
                    <div class="cadet-badges">
                        ${c.jawatan && c.jawatan !== "-" ? `<span class="cadet-badge jawatan-badge">${c.jawatan}</span>` : ''}
                        ${c.jantina && c.jantina !== "-" ? `<span class="cadet-badge jantina-badge">${c.jantina}</span>` : ''}
                    </div>
                </div>
            </div>`;

        let finalHTML = '';

        // TAMPAL SEKSYEN JAWATANKUASA (Jika Ada)
        if (jawatankuasa.length > 0) {
            finalHTML += `
                <div class="jawatankuasa-section">
                    <h3 class="section-sub-title">Jawatankuasa Sidang</h3>
                    <div class="cadet-grid-flex">
                        ${jawatankuasa.map(generateCardHTML).join('')}
                    </div>
                </div>
                <hr class="divider">
            `;
        }

        // TAMPAL SEKSYEN KADET BIASA
        if (kadetBiasa.length > 0) {
            finalHTML += `
                <div class="biasa-section">
                    <div class="cadet-grid-flex">
                        ${kadetBiasa.map(generateCardHTML).join('')}
                    </div>
                </div>
            `;
        } else if (jawatankuasa.length === 0) {
            finalHTML = '<p style="text-align:center; width:100%; color:#888;">Tiada rekod kadet dijumpai untuk sidang ini.</p>';
        }

        gridContainer.innerHTML = finalHTML;

    } catch (error) {
        console.error("Ralat memuat turun profil:", error);
        gridContainer.innerHTML = '<p style="color:red; text-align:center; width:100%;">Gagal memuat turun data dari pelayan.</p>';
    }
}

// =======================================================
// ===== 12. FUNGSI FETCH DIREKTORI PENUH (SEMUA SIDANG A-Z) =====
// =======================================================
async function loadDirektoriPenuh() {
    const direktoriContainer = document.getElementById('direktori-grid-penuh');
    if (!direktoriContainer) return; 

    try {
        const response = await fetch(CADET_SHEET_URL);
        if (!response.ok) throw new Error("Gagal tarik data");
        
        const data = await response.text();
        const rows = data.split('\n');

        // Kita cuma perlukan satu bekas besar untuk semua kadet
        let semuaKadet = [];

        rows.forEach((row, index) => {
            if (index === 0 || !row.trim()) return; 
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const clean = (text) => text ? text.replace(/^"|"$/g, '').trim() : '';

            if (cols.length >= 6) {
                const nama = clean(cols[0]); 
                const matriks = clean(cols[1]);
                const sidang = clean(cols[2]).toUpperCase();
                // Jawatan kita abaikan untuk view ni
                const jantina = clean(cols[4]).toUpperCase(); 
                const photoUrl = clean(cols[5]);              

                let finalPhoto = photoUrl;
                if (photoUrl && photoUrl.includes("drive.google.com")) {
                    let fileId = "";
                    if (photoUrl.includes("id=")) fileId = photoUrl.split("id=")[1].split("&")[0];
                    else if (photoUrl.includes("/d/")) fileId = photoUrl.split("/d/")[1].split("/")[0];
                    if (fileId && fileId.length > 10) finalPhoto = "https://lh3.googleusercontent.com/d/" + fileId;
                }

                let fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=111827&color=F5A623&size=300&bold=true`;
                if (!finalPhoto || finalPhoto === "" || finalPhoto === "-") finalPhoto = fallbackImg;

                // Masukkan ke dalam senarai induk
                semuaKadet.push({ nama, matriks, sidang, jantina, finalPhoto, fallbackImg });
            }
        });

        // --- 1. SUSUN MENGIKUT ABJAD A-Z (NAMA) ---
        semuaKadet.sort((a, b) => a.nama.localeCompare(b.nama));

        // --- 2. FUNGSI PEWARNA LENCANA SIDANG ---
        const getSidangColor = (s) => {
            if(s === 'MEGANTARA') return 'background-color:#F5A623; color:#111; border-color:#F5A623;';
            if(s === 'ADIKARA') return 'background-color:#004d40; color:#fff; border-color:#004d40;';
            if(s === 'DIRGANTARA') return 'background-color:#01579b; color:#fff; border-color:#01579b;';
            if(s === 'NAGASASRA') return 'background-color:#b71c1c; color:#fff; border-color:#b71c1c;';
            return 'background-color:#e5e7eb; color:#333;';
        };

        // --- 3. BINA KAD (Sertakan ID unik untuk fungsi carian) ---
        const generateCardHTML = (c) => `
            <div class="cadet-card" id="kadet-${c.matriks.replace(/\s+/g, '')}">
                <div class="cadet-photo-container">
                    <img src="${c.finalPhoto}" alt="${c.nama}" class="cadet-photo" onerror="this.src='${c.fallbackImg}'">
                </div>
                <div class="cadet-info">
                    <h3 class="cadet-name">${c.nama}</h3>
                    <p class="cadet-matrix">${c.matriks}</p>
                    <div class="cadet-badges">
                        <span class="cadet-badge" style="${getSidangColor(c.sidang)}">${c.sidang}</span>
                        ${c.jantina && c.jantina !== "-" ? `<span class="cadet-badge jantina-badge">${c.jantina}</span>` : ''}
                    </div>
                </div>
            </div>`;

        // Masukkan semua kad dalam satu susunan flex yang besar
        let finalHTML = `
            <div class="sidang-group" style="background:transparent; box-shadow:none; padding:0;">
                <div class="cadet-grid-flex">
                    ${semuaKadet.map(generateCardHTML).join('')}
                </div>
            </div>`;

        direktoriContainer.innerHTML = finalHTML;

        // --- 4. HIDUPKAN ENJIN CARIAN PINTAR ---
        setupSearchFunction(semuaKadet);

    } catch (error) {
        console.error("Ralat Direktori:", error);
        direktoriContainer.innerHTML = '<p style="color:red; text-align:center;">Gagal memuat turun data.</p>';
    }
}

// =======================================================
// ===== ENJIN CARIAN KADET (MELUNCUR & HIGHLIGHT) =====
// =======================================================
function setupSearchFunction(semuaKadet) {
    const searchInput = document.getElementById('searchKadetInput');
    const searchBtn = document.getElementById('searchKadetBtn');
    
    if (!searchInput || !searchBtn) return;

    const performSearch = () => {
        const query = searchInput.value.toLowerCase().trim();
        if (!query) return;

        // Cari kadet yang match pada sebahagian nama atau matriks
        const foundKadet = semuaKadet.find(k => 
            k.nama.toLowerCase().includes(query) || 
            k.matriks.toLowerCase().includes(query)
        );

        if (foundKadet) {
            // Cari elemen kad di skrin
            const targetId = `kadet-${foundKadet.matriks.replace(/\s+/g, '')}`;
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                // Bersihkan sebarang highlight lama
                document.querySelectorAll('.cadet-card').forEach(el => {
                    el.style.boxShadow = '';
                    el.style.transform = '';
                    el.style.border = '1px solid #eee';
                });

                // Meluncur terus ke muka kadet
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Beri efek 'menyala' supaya mata user terus nampak
                setTimeout(() => {
                    targetElement.style.transition = 'all 0.5s ease';
                    targetElement.style.boxShadow = '0 0 25px rgba(245, 166, 35, 0.8)'; // Glow Emas
                    targetElement.style.border = '2px solid #F5A623';
                    targetElement.style.transform = 'scale(1.05)';
                    
                    // Padam efek lepas 3 saat
                    setTimeout(() => {
                        targetElement.style.boxShadow = '';
                        targetElement.style.border = '1px solid #eee';
                        targetElement.style.transform = '';
                    }, 3000);
                }, 400); // Tunggu sikit bagi dia siap scroll
            }
        } else {
            alert('Tiada kadet dijumpai. Sila pastikan ejaan nama atau nombor matriks betul.');
        }
    };

    // Apabila butang ditekan
    searchBtn.addEventListener('click', performSearch);
    
    // Apabila user tekan 'Enter' di keyboard
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
}