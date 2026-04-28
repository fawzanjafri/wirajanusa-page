// =======================================================
// ===== 1. KONFIGURASI & PEMBOLEHUBAH GLOBAL =====
// =======================================================

// URL Google Sheet (Format CSV)
const AKTIVITI_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTaXbK7mx0na3uTO8jA_WtQ9v8qwJYBTPgmXPd5gaA0uKMhnMsmyZToq41INGBCooYak5SlbyK9Z4Px/pub?output=csv';
const CADET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTaXbK7mx0na3uTO8jA_WtQ9v8qwJYBTPgmXPd5gaA0uKMhnMsmyZToq41INGBCooYak5SlbyK9Z4Px/pub?gid=1610115312&single=true&output=csv';
const PEGAWAI_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTaXbK7mx0na3uTO8jA_WtQ9v8qwJYBTPgmXPd5gaA0uKMhnMsmyZToq41INGBCooYak5SlbyK9Z4Px/pub?gid=966069051&single=true&output=csv'; 
const TAKWIM_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTaXbK7mx0na3uTO8jA_WtQ9v8qwJYBTPgmXPd5gaA0uKMhnMsmyZToq41INGBCooYak5SlbyK9Z4Px/pub?gid=218188007&single=true&output=csv';
const MED_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTaXbK7mx0na3uTO8jA_WtQ9v8qwJYBTPgmXPd5gaA0uKMhnMsmyZToq41INGBCooYak5SlbyK9Z4Px/pub?gid=1312565253&single=true&output=csv';

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
// ===== 2. FUNGSI FETCH DATA HYBRID (AKTIVITI + TAKWIM) =====
// =======================================================
async function loadActivitiesFromSheet() {
    console.log("Memulakan proses tarik data hibrid (Aktiviti & Takwim)...");

    try {
        // Tarik data dari dua sheet berbeza secara serentak
        const [resAktiviti, resTakwim] = await Promise.all([
            fetch(AKTIVITI_SHEET_URL),
            fetch(TAKWIM_SHEET_URL)
        ]);

        if (!resAktiviti.ok || !resTakwim.ok) throw new Error("Gagal tarik salah satu data kalendar");
        
        const dataAktiviti = await resAktiviti.text();
        const dataTakwim = await resTakwim.text();
        
        // Reset memori aktiviti (Elak duplicate kalau refresh)
        activities = {};

        // --- FUNGSI HELPER: TUKAR TEKS KE OBJEK TARIKH ---
        function parseToDate(dateStr) {
            if (!dateStr) return null;
            dateStr = dateStr.trim();
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const parts = dateStr.split('-');
                return new Date(parts[0], parts[1] - 1, parts[2]);
            } else if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]);
            }
            return null;
        }

        // --- FUNGSI HELPER: PROSES BARISAN CSV MENGIKUT TAB ---
        const prosesDataCSV = (csvText, isTakwimRasmi) => {
            const rows = csvText.split('\n');
            rows.forEach((row, index) => {
                if (index === 0 || !row.trim()) return;

                const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
                const clean = (text) => text ? text.replace(/^"|"$/g, '').trim() : '';

                if (cols.length >= 3) {
                    let rawDate = clean(cols[1]); // Kolum B (Tarikh - Sama untuk dua-dua tab)
                    let name = clean(cols[2]);    // Kolum C (Nama Program/Modul - Sama untuk dua-dua)
                    
                    let level, exco, startTime, endTime, pic, venue;

                    if (isTakwimRasmi) {
                        // SETTING UNTUK TAB TAKWIM AKADEMIK (Lajur A hingga F)
                        level = clean(cols[3]) || "-"; // Lajur D: Peringkat (Akademik/Lain-lain)
                        exco = "INTAN";   // Kekalkan INTAN supaya CSS warna kalendar jadi merah
                        startTime = "-";  // Takwim tiada masa spesifik
                        endTime = "-";
                        pic = clean(cols[4]) || "-"; // Lajur E: Sidang Terlibat (Kita tumpang variable 'pic')
                        venue = clean(cols[5]) || "-"; // Lajur F: Venue
                    } else {
                        // SETTING UNTUK TAB AKTIVITI (Berdasarkan Gambar 1 - A hingga I)
                        level = clean(cols[3]) || "-";
                        exco = clean(cols[4]) || "-";
                        startTime = clean(cols[5]) || "-";
                        endTime = clean(cols[6]) || "-";
                        pic = cols.length > 7 ? clean(cols[7]) : "-";
                        venue = cols.length > 8 ? clean(cols[8]) : "-";
                    }

                    const activityData = {
                        name: name,
                        level: level, 
                        exco: exco,
                        startTime: startTime,
                        endTime: endTime,
                        pic: pic,
                        venue: venue,
                        isTakwim: isTakwimRasmi
                    };

                    const dateMatches = rawDate.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g);

                    if (dateMatches && dateMatches.length >= 2) {
                        // KES 1: Tarikh Berjulat (Contoh: 2025-09-28 - 2025-10-01)
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
                                // Halang duplicate manual jika data masuk dua kali
                                if(!activities[dateKey].some(a => a.name === name)) {
                                    activities[dateKey].push(activityData);
                                }
                                currentDate.setDate(currentDate.getDate() + 1);
                            }
                        }
                    } else if (dateMatches && dateMatches.length === 1) {
                        // KES 2: Tarikh Tunggal
                        const singleDate = parseToDate(dateMatches[0]);
                        if (singleDate) {
                            const y = singleDate.getFullYear();
                            const m = String(singleDate.getMonth() + 1).padStart(2, '0');
                            const d = String(singleDate.getDate()).padStart(2, '0');
                            const dateKey = `${y}-${m}-${d}`;

                            if (!activities[dateKey]) activities[dateKey] = [];
                            if(!activities[dateKey].some(a => a.name === name)) {
                                activities[dateKey].push(activityData);
                            }
                        }
                    }
                }
            });
        };

        // Pastikan kita parse dua-dua data menggunakan rule yang betul
        prosesDataCSV(dataAktiviti, false); // Baca guna rule Senarai_Aktiviti
        prosesDataCSV(dataTakwim, true);    // Baca guna rule Takwim_Akademik

        console.log("Data hibrid kalendar berjaya diproses.");
        generateCalendar(currentCalendarDate);
        
        if (typeof findNextActivity === "function") findNextActivity();

        if (typeof initModulLuarCountdown === "function") initModulLuarCountdown();

    } catch (error) {
        console.error("Gagal tarik data kalendar:", error);
    }
}


// =======================================================
// ===== 5. LOGIK PENJANAAN KALENDAR =====
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
        
        // --- TAMBAH BLOK KOD INI (FUNGSI KLIK MOBILE AGENDA) ---
        dayElement.addEventListener('click', (e) => {
            // Abaikan jika yang ditekan tu butang tambah (+)
            if(e.target.classList.contains('add-activity-btn')) return; 
            
            // Panggil fungsi senarai agenda di bawah kalendar
            if (typeof showMobileAgenda === "function") {
                showMobileAgenda(dateKey, dayElement);
            }
        });
        // --------------------------------------------------------

        // Tanda Hari Ini
        if (dateKey === todayKey) {
            dayElement.classList.add('is-today');
        }
        
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
    
    // --- LOGIK PENGASINGAN GAYA (TAKWIM VS AKTIVITI) ---
    if (activity.isTakwim) {
        // Jika ini Takwim, guna gaya tanpa warna (transparent)
        activityItem.classList.add('activity-item', 'jenis-takwim');
    } else {
        // Jika ini Aktiviti, guna warna ikut nama Exco/Agensi
        const excoClass = activity.exco ? `exco-${activity.exco.toLowerCase().replace(/\s+/g, '-')}` : 'exco-default';
        activityItem.classList.add('activity-item', excoClass);
    }
    
    const activityIndex = activities[dateKey].findIndex(a => a === activity);
    activityItem.setAttribute('data-activity-index', activityIndex);
    
    // Logik Pintar: Jika Takwim, papar Sidang. Jika Aktiviti, papar Masa.
    const masaAtauSidang = activity.isTakwim 
        ? `👥 ${activity.pic}` 
        : `🕒 ${activity.startTime} - ${activity.endTime}`;

    activityItem.innerHTML = `
        <span class="act-name">${activity.name}</span>
        <span class="act-time">${masaAtauSidang}</span>
        <span class="act-venue">📍 ${activity.venue || 'TBA'}</span>
    `;

    activityItem.addEventListener('click', (e) => {
        e.stopPropagation(); 
        openActivityDetailModal(activity, activityIndex, dateKey);
    });
    
    dayElement.appendChild(activityItem);
}


// =======================================================
// ===== 6. EVENT LISTENERS NAVIGASI KALENDAR =====
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
// ===== 7. LOGIK MODAL (VIEW DETAILS) =====
// =======================================================

function openActivityDetailModal(activity, index, dateKey) {
    if (!activityDetailModal) return;

    currentActivityDateKey = dateKey;
    currentActivityIndex = index;
    
    // Format Tarikh Cantik
    const dateParts = dateKey.split('-');
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dateString = dateObj.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

    // --- LOGIK PINTAR: TUKAR LABEL DAN DATA DINAMIK ---
    
    // 1. Masukkan data asas yang sama untuk kedua-duanya
    document.getElementById('detailActivityName').textContent = activity.name;
    document.getElementById('detailActivityTitleInModal').textContent = activity.name;
    document.getElementById('detailActivityDate').textContent = dateString;
    document.getElementById('detailActivityLevel').textContent = activity.level || '-';
    document.getElementById('detailActivityVenue').textContent = activity.venue || '-';

    // Elemen yang akan berubah-ubah
    const detailExco = document.getElementById('detailActivityExco');
    const detailTime = document.getElementById('detailActivityTime');
    const detailPIC = document.getElementById('detailActivityPIC');
    
    if (activity.isTakwim) {
        // JIKA INI DATA TAKWIM (INTAN):
        detailExco.parentElement.style.display = 'none'; // Sorokkan baris "Exco"
        detailTime.parentElement.style.display = 'none'; // Sorokkan baris "Masa"
        
        // Tukar perkataan "Pengarah Program" jadi "Sidang Terlibat"
        detailPIC.previousElementSibling.textContent = 'Sidang Terlibat:';
        detailPIC.textContent = activity.pic || '-';
        
    } else {
        // JIKA INI DATA AKTIVITI KADET:
        detailExco.parentElement.style.display = 'flex'; // Tunjukkan baris "Exco"
        detailTime.parentElement.style.display = 'flex'; // Tunjukkan baris "Masa"
        
        detailExco.textContent = activity.exco;
        detailTime.textContent = `${activity.startTime} - ${activity.endTime}`;
        
        // Tukar semula label kepada asalnya
        detailPIC.previousElementSibling.textContent = 'Pengarah Program:';
        detailPIC.textContent = activity.pic || '-';
    }

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
        showToast("Hanya Admin boleh padam melalui Google Sheets.", "error");
    });
}


// =======================================================
// ===== 8. LOGIK MODAL TAMBAH & SIMPAN KE GOOGLE SHEETS =====
// =======================================================

let selectedDateForNewActivity = "";

// 1. TAMPAL URL WEB APP ANDA DI SINI
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwgKsZRdXr1DsO5CrlHeW4Qx60BVRdZHUjFQwT4v94ucnyzvvyZ55dQ9iakyNIn_p3F/exec';

// Fungsi buka modal dan set tarikh
function openActivityModal(dateKey) {
    if (!activityModal) return;
    selectedDateForNewActivity = dateKey;

    // Format tarikh untuk tajuk Modal (Contoh: 15/11/2025)
    const parts = dateKey.split('-');
    const displayDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    if(modalDateSpan) modalDateSpan.textContent = displayDate;

    // Kosongkan form input setiap kali borang dibuka
    document.getElementById('activityName').value = '';
    document.getElementById('activityLevel').value = 'INTAN';
    document.getElementById('activityExco').value = 'Majlis Tertinggi';
    document.getElementById('activityStartTime').value = '';
    document.getElementById('activityEndTime').value = '';
    document.getElementById('activityPIC').value = '';

    activityModal.classList.add('active');
}

function closeActivityModal() {
    if (activityModal) activityModal.classList.remove('active');
}

// Tutup modal bila butang X atau overlay ditekan
if (closeModalBtn) closeModalBtn.addEventListener('click', closeActivityModal);
if (activityModal) {
    activityModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeActivityModal();
    });
}

// Event Delegation untuk tangkap klik butang '+' di kalendar
if (calendarDays) {
    calendarDays.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-activity-btn')) {
            e.stopPropagation();
            const dateKey = e.target.getAttribute('data-date-key');
            openActivityModal(dateKey);
        }
    });
}

// ==========================================
// 9. FUNGSI HANTAR DATA KE GOOGLE SHEETS (API)
// ==========================================
async function saveActivityToSheet() {
    // Ambil nilai dari borang
    const nama = document.getElementById('activityName').value.trim();
    const peringkat = document.getElementById('activityLevel').value;
    const exco = document.getElementById('activityExco').value;
    const mula = document.getElementById('activityStartTime').value;
    const tamat = document.getElementById('activityEndTime').value;
    const pic = document.getElementById('activityPIC').value.trim();
    const venue = "-"; // Set default '-' kerana form asal tiada input venue

    // Validasi ringkas
    if (!nama || !mula || !tamat) {
        if (typeof showToast === 'function') {
            showToast("Sila isikan Nama Aktiviti, Waktu Mula dan Tamat.", "warning");
        } else {
            alert("Sila isikan Nama Aktiviti, Waktu Mula dan Tamat.");
        }
        return;
    }

    // Tukar teks butang supaya user tahu sistem sedang memproses
    const originalText = saveActivityBtn.textContent;
    saveActivityBtn.textContent = "Menyimpan...";
    saveActivityBtn.disabled = true;

    // Susun data ke dalam objek (Pastikan key ini sama dengan kod di Google Apps Script)
    const payload = {
        tarikh: selectedDateForNewActivity,
        nama: nama,
        peringkat: peringkat,
        exco: exco,
        mula: mula,
        tamat: tamat,
        pic: pic,
        venue: venue
    };

    try {
        // Hantar data menggunakan Fetch API (POST)
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            // Hantar sebagai text/plain untuk elak isu CORS dari pelayar web
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
            if (typeof showToast === 'function') {
                showToast("Aktiviti berjaya disimpan!", "success");
            } else {
                alert("Aktiviti berjaya disimpan!");
            }
            
            closeActivityModal();
            
            // PENTING: Tarik semula data dari Google Sheets supaya kalendar terus update!
            loadActivitiesFromSheet(); 
            
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Ralat menyimpan data:", error);
        if (typeof showToast === 'function') {
            showToast("Gagal menyambung ke pangkalan data.", "error");
        } else {
            alert("Gagal menyambung ke pangkalan data.");
        }
    } finally {
        // Kembalikan butang kepada keadaan asal
        saveActivityBtn.textContent = originalText;
        saveActivityBtn.disabled = false;
    }
}

// Sambungkan butang "Simpan Aktiviti" dengan fungsi di atas
if (saveActivityBtn) {
    saveActivityBtn.onclick = saveActivityToSheet;
}


// =======================================================
// ===== 10. SIDEBAR LOGIC =====
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
// ===== 11. LOGIK DROPDOWN SIDEBAR (ACCORDION) =====
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
// ===== 12. VIDEO SLIDESHOW LOGIC (PREMIUM UPGRADE) =====
// =======================================================
const videoSources = [
  "assets/videos/hero1.mp4",
  "assets/videos/hero2.mp4"
];

const videos = document.querySelectorAll(".hero-video");
const prevVideoBtn = document.getElementById("prevVideo");
const nextVideoBtn = document.getElementById("nextVideo");
const pausePlayBtn = document.getElementById("pausePlayBtn");
const playIcon = document.getElementById("playIcon");
const pauseIcon = document.getElementById("pauseIcon");

let currentVideoIndex = 0;
let slideInterval; 
let isPlaying = true; // Status sama ada slideshow sedang berjalan

if (videos.length > 0) {
    
    // Set sumber video tetapi JANGAN mainkan semuanya serentak
    videos.forEach((vid, index) => {
        if (videoSources[index]) {
            vid.src = videoSources[index];
            vid.muted = true; 
        }
    });

    // Mainkan video pertama sahaja pada permulaan
    videos[0].classList.add("active");
    videos[0].play().catch(e => console.log("Autoplay dihalang pelayar:", e));

    function showVideo(index) {
        videos.forEach((v, i) => {
            v.classList.remove("active");
            if (i !== index) {
                // Berhentikan video yang tidak aktif selepas animasi fade out tamat (1.5 saat)
                // Ini sangat menjimatkan RAM & Bateri pengguna!
                setTimeout(() => v.pause(), 1500); 
            }
        });
        
        videos[index].classList.add("active");
        
        // Hanya mainkan jika status keseluruhan adalah 'Playing'
        if (isPlaying) {
            videos[index].play().catch(e => console.log(e));
        }
    }

    function nextSlide() {
        currentVideoIndex = (currentVideoIndex + 1) % videos.length;
        showVideo(currentVideoIndex);
        if(isPlaying) resetTimer();
    }

    function prevSlide() {
        currentVideoIndex = (currentVideoIndex - 1 + videos.length) % videos.length;
        showVideo(currentVideoIndex);
        if(isPlaying) resetTimer();
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

    // --- Logik Butang Pause/Play ---
    if (pausePlayBtn) {
        pausePlayBtn.addEventListener("click", () => {
            isPlaying = !isPlaying; // Tukar status
            
            if (isPlaying) {
                // Jika ditekan Play
                videos[currentVideoIndex].play();
                startTimer();
                playIcon.style.display = "none";
                pauseIcon.style.display = "block";
            } else {
                // Jika ditekan Pause
                videos[currentVideoIndex].pause();
                clearInterval(slideInterval); // Hentikan pertukaran automatik
                playIcon.style.display = "block";
                pauseIcon.style.display = "none";
            }
        });
    }

    if (nextVideoBtn) nextVideoBtn.addEventListener("click", nextSlide);
    if (prevVideoBtn) prevVideoBtn.addEventListener("click", prevSlide);

    startTimer();
}


// =======================================================
// ===== 13. INITIALIZATION =====
// =======================================================
document.addEventListener('DOMContentLoaded', () => {
    loadActivitiesFromSheet(); // Tarik data sheet
    loadCadetProfiles();
    loadDirektoriPenuh();
    loadDirektoriPegawai();
    loadCartaOrganisasi();
    if (typeof loadGallery === 'function') loadGallery();
});

// =======================================================
// ===== 14. FUNGSI FETCH PROFIL KADET & PEGAWAI (SIDANG) =====
// =======================================================

async function loadCadetProfiles() {
    const gridContainer = document.getElementById('cadet-grid');
    if (!gridContainer) return; 

    const currentSidang = gridContainer.getAttribute('data-sidang').toUpperCase();
    console.log("Memuat turun profil & pegawai untuk sidang:", currentSidang);

    try {
        // Tarik data Pegawai dan Kadet serentak
        const [resPegawai, resKadet] = await Promise.all([
            fetch(PEGAWAI_SHEET_URL),
            fetch(CADET_SHEET_URL)
        ]);

        if (!resPegawai.ok || !resKadet.ok) throw new Error("Gagal tarik data");
        
        const dataPegawai = await resPegawai.text();
        const dataKadet = await resKadet.text();

        // --- 1. PROSES DATA PEGAWAI PENYELARAS ---
        let pegawaiSidang = [];
        const rowsPegawai = dataPegawai.split('\n');
        
        rowsPegawai.forEach((row, index) => {
            if (index === 0 || !row.trim()) return; 
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const clean = (text) => text ? text.replace(/^"|"$/g, '').trim() : '';

            if (cols.length >= 3) {
                const nama = clean(cols[0]); 
                const sidang = clean(cols[1]).toUpperCase();
                const jawatan = clean(cols[2]);
                const photoUrl = cols.length > 3 ? clean(cols[3]) : "";

                if (sidang === currentSidang) {
                    let finalPhoto = photoUrl;
                    if (photoUrl && photoUrl.includes("drive.google.com")) {
                        let fileId = "";
                        if (photoUrl.includes("id=")) fileId = photoUrl.split("id=")[1].split("&")[0];
                        else if (photoUrl.includes("/d/")) fileId = photoUrl.split("/d/")[1].split("/")[0];
                        if (fileId && fileId.length > 10) finalPhoto = "https://lh3.googleusercontent.com/d/" + fileId;
                    }

                    let fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=111827&color=F5A623&size=300&bold=true`;
                    if (!finalPhoto || finalPhoto === "" || finalPhoto === "-") finalPhoto = fallbackImg;

                    // --- SISTEM PENGESAN PANGKAT PEGAWAI ---
                    let pRank = 99; // Lalai
                    const j = jawatan.toUpperCase();
                    if (j.includes("KETUA UNIT")) pRank = 1;
                    else if (j.includes("KETUA PENOLONG PENGARAH KANAN")) pRank = 2;
                    else if (j.includes("KETUA PENOLONG PENGARAH")) pRank = 3;
                    else if (j.includes("PENOLONG PENGARAH KANAN")) pRank = 4;
                    else if (j.includes("PENOLONG PENGARAH")) pRank = 5;

                    pegawaiSidang.push({ nama, jawatan, finalPhoto, fallbackImg, isPegawai: true, pRank });
                }
            }
        });

        // --- SUSUNAN PEGAWAI (KEDUA KIRI, PERTAMA TENGAH, KETIGA KANAN) ---
        // Mula-mula, susun ikut pangkat (1, 2, 3...)
        pegawaiSidang.sort((a, b) => a.pRank - b.pRank);
        
        if (pegawaiSidang.length >= 3) {
            // Jika 3 pegawai atau lebih: Kedua Kiri, Pertama Tengah, Ketiga Kanan
            const first = pegawaiSidang[0];
            const second = pegawaiSidang[1];
            const third = pegawaiSidang[2];
            const rest = pegawaiSidang.slice(3);
            pegawaiSidang = [second, first, third, ...rest]; 
        }

        // --- 2. PROSES DATA KADET ---
        let jawatankuasa = [];
        let kadetBiasa = [];
        const rowsKadet = dataKadet.split('\n');

        rowsKadet.forEach((row, index) => {
            if (index === 0 || !row.trim()) return; 
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const clean = (text) => text ? text.replace(/^"|"$/g, '').trim() : '';

            if (cols.length >= 6) {
                const nama = clean(cols[0]); 
                const matriks = clean(cols[1]);
                const sidang = clean(cols[2]).toUpperCase();
                const jawatan = clean(cols[3]).toUpperCase(); 
                const jantina = clean(cols[4]).toUpperCase(); 
                const photoUrl = clean(cols[5]);              

                if (sidang === currentSidang) {
                    let finalPhoto = photoUrl;
                    if (photoUrl && photoUrl.includes("drive.google.com")) {
                        let fileId = "";
                        if (photoUrl.includes("id=")) fileId = photoUrl.split("id=")[1].split("&")[0];
                        else if (photoUrl.includes("/d/")) fileId = photoUrl.split("/d/")[1].split("/")[0];
                        if (fileId && fileId.length > 10) finalPhoto = "https://lh3.googleusercontent.com/d/" + fileId;
                    }

                    let fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=111827&color=F5A623&size=300&bold=true`;
                    if (!finalPhoto || finalPhoto === "" || finalPhoto === "-") finalPhoto = fallbackImg;

                    const cadetObj = { nama, matriks, jawatan, jantina, finalPhoto, fallbackImg, isPegawai: false };

                    let rank = 99; 
                    if (jawatan === "KETUA SIDANG") rank = 1;
                    else if (jawatan.includes("TIMBALAN KETUA SIDANG")) rank = 2; 
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

        // Susun Jawatankuasa (Timbalan Kiri, Ketua Tengah, Bendahari Kanan)
        let ketuas = jawatankuasa.filter(k => k.rank === 1);
        let timbalans = jawatankuasa.filter(k => k.rank === 2);
        let bendaharis = jawatankuasa.filter(k => k.rank === 3);
        jawatankuasa = [...timbalans, ...ketuas, ...bendaharis];

        // --- 3. JANA HTML (GAYA DINAMIK) ---
        const generateCardHTML = (c) => {
            // JIKA PEGAWAI: Kosongkan ruang Matriks/Jawatan (Tinggal nama & gambar sahaja)
            // JIKA KADET: Paparkan No Matriks
            const matrixOrJawatan = c.isPegawai 
                ? '' // Kosongkan
                : '<p class="cadet-matrix">' + c.matriks + '</p>';
                
            // Pegawai tak perlu lencana jawatan/jantina kecil di bawah
            const badges = c.isPegawai ? '' : `
                <div class="cadet-badges">
                    ${c.jawatan && c.jawatan !== "-" ? '<span class="cadet-badge jawatan-badge">' + c.jawatan + '</span>' : ''}
                    ${c.jantina && c.jantina !== "-" ? '<span class="cadet-badge jantina-badge">' + c.jantina + '</span>' : ''}
                </div>
            `;

            return `
                <div class="cadet-card" ${c.isPegawai ? 'style="border: 2px solid #F5A623; box-shadow: 0 4px 15px rgba(245, 166, 35, 0.15); margin-bottom: 10px;"' : ''}>
                    <div class="cadet-photo-container">
                        <img src="${c.finalPhoto}" alt="${c.nama}" class="cadet-photo" onerror="this.src='${c.fallbackImg}'">
                    </div>
                    <div class="cadet-info" style="${c.isPegawai ? 'justify-content: center;' : ''}">
                        <h3 class="cadet-name" style="${c.isPegawai ? 'font-size: 0.9rem; margin-bottom: 0;' : ''}">${c.nama}</h3>
                        ${matrixOrJawatan}
                        ${badges}
                    </div>
                </div>`;
        };

        let finalHTML = '';

        // TAMPAL SEKSYEN PEGAWAI (PALING ATAS)
        if (pegawaiSidang.length > 0) {
            finalHTML += `
                <h3 class="section-sub-title" style="color: #F5A623; font-weight: 800; font-size: 1.2rem; margin-bottom: 15px; text-transform: uppercase;">PEGAWAI PENYELARAS</h3>
                <div class="jawatankuasa-section">
                    <div class="cadet-grid-flex">
                        ${pegawaiSidang.map(generateCardHTML).join('')}
                    </div>
                </div>
                <hr class="divider">
            `;
        }

        // TAMPAL SEKSYEN JAWATANKUASA
        if (jawatankuasa.length > 0) {
            finalHTML += `
                <h3 class="section-sub-title" style="font-size: 1.2rem; margin-bottom: 15px; text-transform: uppercase;">JAWATANKUASA SIDANG</h3>
                <div class="jawatankuasa-section">
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
        } else if (jawatankuasa.length === 0 && pegawaiSidang.length === 0) {
            finalHTML = '<p style="text-align:center; width:100%; color:#888;">Tiada rekod dijumpai untuk sidang ini.</p>';
        }

        gridContainer.innerHTML = finalHTML;

    } catch (error) {
        console.error("Ralat memuat turun profil:", error);
        gridContainer.innerHTML = '<p style="color:red; text-align:center; width:100%;">Gagal memuat turun data dari pelayan.</p>';
    }
}

// =======================================================
// ===== 15. FUNGSI FETCH DIREKTORI PENUH (SEMUA SIDANG A-Z) =====
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
// ===== 16. FUNGSI FETCH DIREKTORI PEGAWAI (UDPA) =====
// =======================================================

async function loadDirektoriPegawai() {
    const container = document.getElementById('direktori-grid-pegawai');
    if (!container) return; 

    console.log("Memuat turun direktori pegawai...");

    try {
        const response = await fetch(PEGAWAI_SHEET_URL);
        if (!response.ok) throw new Error("Gagal tarik data pegawai");
        
        const data = await response.text();
        
        // Peringkat Keselamatan: Semak kalau tersalah letak link web HTML
        if (data.trim().startsWith('<') || data.includes('<!DOCTYPE html>')) {
            container.innerHTML = '<p style="color:red; text-align:center;">Ralat: Sila pastikan link diletak adalah format CSV (Bukan link web biasa).</p>';
            return;
        }

        const rows = data.split('\n');

        let kudpa = [];
        let pegawaiLain = [];

        rows.forEach((row, index) => {
            if (index === 0 || !row.trim()) return; // Abaikan header
            
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const clean = (text) => text ? text.replace(/^"|"$/g, '').trim() : '';

            // LAJUR BARU: A=Nama, B=Sidang, C=Jawatan, D=Gambar
            if (cols.length >= 3) {
                const nama = clean(cols[0]); 
                const sidang = clean(cols[1]).toUpperCase(); // Lajur B
                const jawatan = clean(cols[2]); // Lajur C
                const photoUrl = cols.length > 3 ? clean(cols[3]) : ""; // Lajur D            

                // Baiki link Google Drive jika ada (walaupun anda guna postimg, kita biarkan untuk langkah berjaga-jaga)
                let finalPhoto = photoUrl;
                if (photoUrl && photoUrl.includes("drive.google.com")) {
                    let fileId = "";
                    if (photoUrl.includes("id=")) fileId = photoUrl.split("id=")[1].split("&")[0];
                    else if (photoUrl.includes("/d/")) fileId = photoUrl.split("/d/")[1].split("/")[0];
                    if (fileId && fileId.length > 10) finalPhoto = "https://lh3.googleusercontent.com/d/" + fileId;
                }

                let fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=111827&color=F5A623&size=300&bold=true`;
                if (!finalPhoto || finalPhoto === "" || finalPhoto === "-") finalPhoto = fallbackImg;

                const pegawaiObj = { nama, sidang, jawatan, finalPhoto, fallbackImg };

                // Asingkan KUDPA (Kita tangkap perkataan "Ketua Unit")
                if (jawatan.toUpperCase().includes("KETUA UNIT DIPLOMA")) {
                    kudpa.push(pegawaiObj);
                } else {
                    pegawaiLain.push(pegawaiObj);
                }
            }
        });

        // --- FUNGSI PEWARNA LENCANA SIDANG ---
        const getSidangColor = (s) => {
            if(s === 'MEGANTARA') return 'background-color:#F5A623; color:#111; border-color:#F5A623;';
            if(s === 'ADIKARA') return 'background-color:#004d40; color:#fff; border-color:#004d40;';
            if(s === 'DIRGANTARA') return 'background-color:#01579b; color:#fff; border-color:#01579b;';
            if(s === 'NAGASASRA') return 'background-color:#b71c1c; color:#fff; border-color:#b71c1c;';
            return 'background-color:#e5e7eb; color:#333;';
        };

        // --- BINA KAD (Dengan gaya khas untuk KUDPA) ---
        const generateCardHTML = (p, isKudpa) => `
            <div class="cadet-card" ${isKudpa ? 'style="width: 180px; transform: scale(1.05); border: 2px solid #F5A623; box-shadow: 0 8px 25px rgba(245, 166, 35, 0.2);"' : ''}>
                <div class="cadet-photo-container">
                    <img src="${p.finalPhoto}" alt="${p.nama}" class="cadet-photo" loading="lazy" onerror="this.src='${p.fallbackImg}'">
                </div>
                <div class="cadet-info">
                    <h3 class="cadet-name">${p.nama}</h3>
                    <p class="cadet-matrix" style="color: ${isKudpa ? '#F5A623' : 'var(--muted)'}; font-weight: ${isKudpa ? '800' : '600'}; font-size: 0.65rem; margin-bottom: 8px;">${p.jawatan}</p>
                    <div class="cadet-badges">
                        ${p.sidang && p.sidang !== "-" ? `<span class="cadet-badge" style="${getSidangColor(p.sidang)}">${p.sidang}</span>` : ''}
                    </div>
                </div>
            </div>`;

        let finalHTML = '';

        // SEKSYEN 1: TAMPAL KUDPA DI ATAS TENGAH
        if (kudpa.length > 0) {
            finalHTML += `
                <div style="display: flex; justify-content: center; margin-bottom: 40px;">
                    ${kudpa.map(p => generateCardHTML(p, true)).join('')}
                </div>
                <hr class="divider" style="margin-bottom: 40px; width: 30%;">
            `;
        }

        // SEKSYEN 2: TAMPAL PEGAWAI LAIN BERSUSUN
        if (pegawaiLain.length > 0) {
            finalHTML += `
                <div class="cadet-grid-flex">
                    ${pegawaiLain.map(p => generateCardHTML(p, false)).join('')}
                </div>
            `;
        }

        container.innerHTML = finalHTML;

    } catch (error) {
        console.error("Ralat Direktori Pegawai:", error);
        container.innerHTML = '<p style="color:red; text-align:center;">Gagal memuat turun data dari pelayan. Pastikan link CSV betul.</p>';
    }
}

// =======================================================
// ===== 17. ENJIN CARIAN KADET & STATISTIK (MELUNCUR & HIGHLIGHT) =====
// =======================================================
function setupSearchFunction(semuaKadet) {
    const searchInput = document.getElementById('searchKadetInput');
    const searchBtn = document.getElementById('searchKadetBtn');
    const filterSidang = document.getElementById('filterSidang');
    
    // Fungsi Kira Statistik Live
    const updateStatistik = (senarai) => {
        const dashboard = document.getElementById('statistik-dashboard');
        if (!dashboard) return;

        const total = senarai.length;
        // Kira jantina. Anggap data dalam sheet menggunakan huruf 'L' atau perkataan 'LELAKI'
        const lelaki = senarai.filter(k => k.jantina.startsWith('L')).length; 
        const perempuan = senarai.filter(k => k.jantina.startsWith('P')).length;

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-lelaki').textContent = lelaki;
        document.getElementById('stat-perempuan').textContent = perempuan;
        
        dashboard.style.display = 'flex'; // Tunjukkan kotak lepas dah siap kira
    };

    // Paparkan statistik semua kadet pada mula-mula page dibuka
    updateStatistik(semuaKadet);

    if (!searchInput || !searchBtn || !filterSidang) return;

    const applyFilters = () => {
        const query = searchInput.value.toLowerCase().trim();
        const selectedSidang = filterSidang.value;

        let kadetDitemui = [];

        semuaKadet.forEach(k => {
            const targetId = `kadet-${k.matriks.replace(/\s+/g, '')}`;
            const targetElement = document.getElementById(targetId);
            
            if (!targetElement) return;

            const matchText = k.nama.toLowerCase().includes(query) || k.matriks.toLowerCase().includes(query);
            const matchSidang = selectedSidang === "SEMUA" || k.sidang === selectedSidang;

            if (matchText && matchSidang) {
                targetElement.style.display = 'flex';
                kadetDitemui.push(k); // Simpan kadet yang lulus tapisan ke dalam memori
            } else {
                targetElement.style.display = 'none';
            }
        });

        // Update kotak statistik dengan data yang dah ditapis
        updateStatistik(kadetDitemui);

        if (kadetDitemui.length === 0) {
            if (typeof showToast === 'function') {
                showToast('Tiada kadet sepadan dengan carian ini.', 'warning');
            } else {
                alert('Tiada kadet sepadan.');
            }
        }
    };

    searchBtn.addEventListener('click', applyFilters);
    filterSidang.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters); // Auto-filter masa tengah menaip
}

// =======================================================
// =====18. FUNGSI TOAST NOTIFICATION =====
// =======================================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // Cipta elemen div baru
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    // Masukkan ke dalam container
    container.appendChild(toast);

    // Animasi masuk (bagi sikit masa untuk render)
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Animasi keluar dan buang dari DOM selepas 3 saat
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 400); // Tunggu animasi transition CSS selesai
    }, 3000);
}

// =======================================================
// =====19. FUNGSI PINTAR: AKTIVITI SETERUSNYA (KADET SAHAJA) =====
// =======================================================
function findNextActivity() {
    const container = document.getElementById('upcoming-event-section');
    if (!container) return; 

    // Dapatkan tarikh hari ini tepat pada jam 00:00:00 (Tengah Malam)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextDateKey = null;
    let nextActivity = null;

    // Susun semua tarikh dari lama ke baru secara tepat
    const sortedDates = Object.keys(activities).sort((a, b) => {
        const pA = a.split('-');
        const pB = b.split('-');
        return new Date(pA[0], pA[1] - 1, pA[2]) - new Date(pB[0], pB[1] - 1, pB[2]);
    });

    // Cari tarikh pertama yang HANYA PADA MASA DEPAN (Esok dan ke atas)
    for (const dateKey of sortedDates) {
        const parts = dateKey.split('-');
        
        // Memaksa JavaScript menggunakan waktu tempatan (Local Time)
        const activityDate = new Date(parts[0], parts[1] - 1, parts[2]);
        activityDate.setHours(0, 0, 0, 0);
        
        // Semak jika tarikh adalah hari esok atau ke atas
        if (activityDate.getTime() > today.getTime()) {
            
            // LOGIK BARU: Tapis dan ambil aktiviti yang BUKAN Takwim sahaja
            const aktivitiKadetSahaja = activities[dateKey].filter(act => act.isTakwim === false);
            
            // Jika ada aktiviti kadet pada hari tersebut, kita ambil yang pertama
            if (aktivitiKadetSahaja.length > 0) {
                nextDateKey = dateKey;
                nextActivity = aktivitiKadetSahaja[0]; 
                break; // Berhenti mencari lepas jumpa yang pertama
            }
            // Jika hari tersebut cuma ada Takwim, loop ini akan terus mencari di hari berikutnya
        }
    }

    // Jika jumpa aktiviti, paparkan pada kad
    if (nextActivity) {
        document.getElementById('upcoming-title').textContent = nextActivity.name;
        document.getElementById('upcoming-venue').textContent = `📍 ${nextActivity.venue || 'Menunggu Makluman'}`;
        document.getElementById('upcoming-time').textContent = `🕒 ${nextActivity.startTime} - ${nextActivity.endTime}`;
        
        const dateParts = nextDateKey.split('-');
        const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        const dateString = dateObj.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
        
        document.getElementById('upcoming-date').textContent = `📅 ${dateString}`;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// =======================================================
// =====20. FUNGSI AGENDA MOBILE (KLIK KALENDAR) =====
// =======================================================
function showMobileAgenda(dateKey, targetDayElement) {
    const agendaContainer = document.getElementById('mobile-agenda-container');
    const agendaList = document.getElementById('agenda-event-list');
    const agendaTitle = document.getElementById('agenda-date-title');
    
    // Hanya aktif jika dibuka di telefon pintar (lebar skrin < 768px)
    if(!agendaContainer || window.innerWidth > 768) return; 
    
    // 1. Serlahkan hari yang ditekan (Highlight)
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('is-selected'));
    if (targetDayElement) targetDayElement.classList.add('is-selected');
    
    // 2. Format Tajuk Tarikh
    const dateParts = dateKey.split('-');
    const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    agendaTitle.textContent = dateObj.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // 3. Kosongkan senarai lama
    agendaList.innerHTML = '';
    
    // 4. Masukkan senarai aktiviti baru
    if(activities[dateKey] && activities[dateKey].length > 0) {
        activities[dateKey].forEach((act, index) => {
            const item = document.createElement('div');
            
            // Kitar semula CSS exco sedia ada untuk border tepi
            const excoClass = act.isTakwim ? 'jenis-takwim' : (act.exco ? `exco-${act.exco.toLowerCase().replace(/\s+/g, '-')}` : 'exco-default');
            
            // Kita tambah gaya sikit supaya border dia tebal sebelah kiri
            item.className = `agenda-item ${excoClass}`;
            if (!act.isTakwim) {
                item.style.borderLeft = `5px solid`; // Menggunakan warna dari excoClass
                item.style.backgroundColor = "var(--card)"; // Paksa latar belakang putih
            }
            
            const masaAtauSidang = act.isTakwim ? `👥 ${act.pic}` : `🕒 ${act.startTime} - ${act.endTime}`;
            
            item.innerHTML = `
                <span class="agenda-item-title">${act.name}</span>
                <span class="agenda-item-time">${masaAtauSidang}</span>
                <span class="agenda-item-venue">📍 ${act.venue || 'Menunggu Makluman'}</span>
            `;
            
            // Buka Modal Detail bila ditekan
            item.addEventListener('click', () => {
                openActivityDetailModal(act, index, dateKey);
            });
            
            agendaList.appendChild(item);
        });
    } else {
        agendaList.innerHTML = '<div class="empty-agenda">Tiada aktiviti dijadualkan pada hari ini.</div>';
    }
}

// =======================================================
// =====21. FUNGSI BINA CARTA ORGANISASI MED =====
// =======================================================
async function loadCartaOrganisasi() {
    const container = document.getElementById('org-chart-container');
    if (!container) return;

    try {
        // Tarik data MED dan data Kadet serentak (untuk curi gambar profil)
        const [resMed, resKadet] = await Promise.all([
            fetch(MED_SHEET_URL),
            fetch(CADET_SHEET_URL)
        ]);

        if (!resMed.ok || !resKadet.ok) throw new Error("Gagal tarik data");

        const dataMed = await resMed.text();
        const dataKadet = await resKadet.text();

        // 1. Bina 'Kamus Gambar' dari data Kadet menggunakan No Matriks sebagai kunci
        const imageMap = {};
        dataKadet.split('\n').forEach((row, index) => {
            if (index === 0 || !row.trim()) return;
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length >= 6) {
                const matriks = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : '';
                let photoUrl = cols[5] ? cols[5].replace(/^"|"$/g, '').trim() : '';
                
                // Baiki link google drive
                if (photoUrl && photoUrl.includes("drive.google.com")) {
                    let fileId = "";
                    if (photoUrl.includes("id=")) fileId = photoUrl.split("id=")[1].split("&")[0];
                    else if (photoUrl.includes("/d/")) fileId = photoUrl.split("/d/")[1].split("/")[0];
                    if (fileId && fileId.length > 10) photoUrl = "https://lh3.googleusercontent.com/d/" + fileId;
                }
                
                if (matriks) imageMap[matriks] = photoUrl;
            }
        });

        // 2. Proses data MED & Kumpul ikut Penggal
        const penggalGroup = {};

        dataMed.split('\n').forEach((row, index) => {
            if (index === 0 || !row.trim()) return;
            const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            const clean = (text) => text ? text.replace(/^"|"$/g, '').trim() : '';

            // Lajur: A=Nama, B=Matriks, C=Sidang, D=Penggal, E=Exco
            if (cols.length >= 5) {
                const nama = clean(cols[0]);
                const matriks = clean(cols[1]);
                const sidang = clean(cols[2]).toUpperCase();
                const penggal = clean(cols[3]);
                const exco = clean(cols[4]);

                let finalPhoto = imageMap[matriks] || "";
                let fallbackImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(nama)}&background=111827&color=F5A623&size=300&bold=true`;
                if (!finalPhoto || finalPhoto === "-") finalPhoto = fallbackImg;

                if (!penggalGroup[penggal]) penggalGroup[penggal] = [];
                
                penggalGroup[penggal].push({ nama, matriks, sidang, exco, finalPhoto, fallbackImg });
            }
        });

        // 3. Bina HTML (Susun penggal terbaru di atas)
        let finalHTML = '';
        const sortedPenggal = Object.keys(penggalGroup).sort((a, b) => parseInt(b) - parseInt(a));

        // Fungsi Warna Sidang
        const getSidangColor = (s) => {
            if(s === 'MEGANTARA') return 'background-color:#F5A623; color:#111; border-color:#F5A623;';
            if(s === 'ADIKARA') return 'background-color:#004d40; color:#fff; border-color:#004d40;';
            if(s === 'DIRGANTARA') return 'background-color:#01579b; color:#fff; border-color:#01579b;';
            if(s === 'NAGASASRA') return 'background-color:#b71c1c; color:#fff; border-color:#b71c1c;';
            return 'background-color:#e5e7eb; color:#333;';
        };

        // Pembuat Kad (Besarkan sikit untuk top management)
        const generateOrgCard = (p, isTopTier) => `
            <div class="cadet-card" style="${isTopTier ? 'width: 170px; border: 2px solid var(--accent); box-shadow: 0 8px 20px rgba(0,0,0,0.1); margin-bottom: 10px;' : ''}">
                <div class="cadet-photo-container">
                    <img src="${p.finalPhoto}" alt="${p.nama}" class="cadet-photo" onerror="this.src='${p.fallbackImg}'">
                </div>
                <div class="cadet-info">
                    <h3 class="cadet-name">${p.nama}</h3>
                    <p class="cadet-matrix" style="color: ${isTopTier ? 'var(--accent)' : '#F5A623'}; font-weight: 800; font-size: 0.7rem; margin-bottom: 8px;">${p.exco.toUpperCase()}</p>
                    <div class="cadet-badges">
                        <span class="cadet-badge" style="${getSidangColor(p.sidang)}">${p.sidang}</span>
                    </div>
                </div>
            </div>`;

        // 4. Susun mengikut hierarki bagi setiap penggal
        sortedPenggal.forEach(penggal => {
            const ahli = penggalGroup[penggal];
            
            // Asingkan ikut tier
            const tier1 = ahli.filter(a => a.exco.toLowerCase().includes('ketua eksekutif') && !a.exco.toLowerCase().includes('timbalan'));
            const tier1_timbalan = ahli.filter(a => a.exco.toLowerCase().includes('timbalan ketua eksekutif'));
            const tier2 = ahli.filter(a => a.exco.toLowerCase().includes('setiausaha') || a.exco.toLowerCase().includes('bendahari'));
            
            // Yang baki adalah Exco lain (Mengekalkan susunan asal dari sheet)
            const tier3 = ahli.filter(a => !tier1.includes(a) && !tier1_timbalan.includes(a) && !tier2.includes(a));

            finalHTML += `
                <div class="penggal-section">
                    <h2 class="penggal-title">PENGGAL ${penggal}</h2>
                    
                    <div class="org-tier tier-1">
                        ${tier1.map(p => generateOrgCard(p, true)).join('')}
                        ${tier1_timbalan.map(p => generateOrgCard(p, true)).join('')}
                    </div>

                    ${tier2.length > 0 ? `
                    <div class="org-tier tier-2">
                        ${tier2.map(p => generateOrgCard(p, false)).join('')}
                    </div>
                    ` : ''}

                    ${tier3.length > 0 ? `
                    <div class="org-tier tier-3">
                        ${tier3.map(p => generateOrgCard(p, false)).join('')}
                    </div>
                    ` : ''}
                </div>
            `;
            
            // Letak pembahagi jika ada penggal seterusnya
            if (penggal !== sortedPenggal[sortedPenggal.length - 1]) {
                finalHTML += `<hr class="divider" style="width: 80%; margin: 60px auto;">`;
            }
        });

        container.innerHTML = finalHTML;

    } catch (error) {
        console.error("Ralat Carta Organisasi:", error);
        container.innerHTML = '<p style="color:red; text-align:center;">Gagal memuat turun data hierarki organisasi.</p>';
    }
}

/*// =======================================================
// ===== 22. AUDIO BACKGROUND LOGIC =====
// =======================================================
const bgMusic = document.getElementById('bgMusic');
const musicToggleBtn = document.getElementById('musicToggleBtn');
let isMusicPlaying = false;

if (bgMusic && musicToggleBtn) {
    // Rendahkan volume sikit supaya tak terkejut
    bgMusic.volume = 0.4; 

    // Fungsi mainkan muzik (Perlu interaksi pengguna untuk elak di-block oleh browser)
    const startMusicOnFirstInteraction = () => {
        if (!isMusicPlaying) {
            bgMusic.play().then(() => {
                isMusicPlaying = true;
                musicToggleBtn.innerHTML = '🔊';
            }).catch(err => console.log("Muzik perlukan klik pengguna: ", err));
        }
        // Buang listener lepas dah main
        document.body.removeEventListener('click', startMusicOnFirstInteraction);
        document.body.removeEventListener('touchstart', startMusicOnFirstInteraction);
    };

    // Dengar klik pertama di mana-mana skrin
    document.body.addEventListener('click', startMusicOnFirstInteraction);
    document.body.addEventListener('touchstart', startMusicOnFirstInteraction);

    // Fungsi butang manual Play/Pause
    musicToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        if (isMusicPlaying) {
            bgMusic.pause();
            isMusicPlaying = false;
            musicToggleBtn.innerHTML = '🔇';
        } else {
            bgMusic.play();
            isMusicPlaying = true;
            musicToggleBtn.innerHTML = '🔊';
        }
    });
}

(// =======================================================
// ===== 23. VISITOR COUNTER (LIVE API) =====
// =======================================================
const visitorSpan = document.getElementById('visitorCount');
if (visitorSpan) {
    // Menggunakan free API untuk mengira jumlah hit laman web
    fetch('https://api.counterapi.dev/v1/wirajanusa_dpa/visits/up')
        .then(response => response.json())
        .then(data => {
            // Format nombor (cth: 1000 jadi 1,000)
            visitorSpan.textContent = data.count.toLocaleString();
        })
        .catch(error => {
            console.error('Ralat API Pelawat:', error);
            // Nilai sandaran (fallback) jika API gagal
            visitorSpan.textContent = "1,042"; 
        });
}*/

// =======================================================
// ===== 24. DUAL COUNTDOWN TIMER =====
// =======================================================
const dpaTargetDate = new Date('2026-07-26T23:59:59').getTime(); // Target DPA Tamat
let modulLuarTargetDate = null;
let countdownInterval;

function initModulLuarCountdown() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sortedDates = Object.keys(activities).sort((a, b) => {
        return new Date(a) - new Date(b);
    });

    console.log("Semua Tarikh Dijumpai:", sortedDates); // DEBUG

    let foundModules = [];
    let foundDateKey = null;

    for (const dateKey of sortedDates) {
        const actDate = new Date(dateKey);
        actDate.setHours(0, 0, 0, 0);

        if (actDate.getTime() >= today.getTime()) {
            // LOGIK BARU: Tapis HANYA jika lajur Peringkat mengandungi "Modul Luar"
            const modulsOnDate = activities[dateKey].filter(act => {
                return act.level && act.level.toLowerCase().includes("modul luar");
            });

            if (modulsOnDate.length > 0) {
                foundModules = modulsOnDate;
                foundDateKey = actDate.getTime();
                console.log("Modul Luar Terdekat Dijumpai:", foundModules); // DEBUG
                break; // Berhenti mencari lepas jumpa tarikh terdekat
            }
        }
    }

    const titleEl = document.getElementById('modul-luar-title');
    const timerEl = document.getElementById('timer-modul');
    const successEl = document.getElementById('modul-luar-success');

    if (foundModules.length > 0 && titleEl) {
        modulLuarTargetDate = foundDateKey;
        
        // Gabungkan nama semua modul yang dijumpai dan buang duplicate
        const uniqueNames = [...new Set(foundModules.map(m => m.name))];
        titleEl.textContent = `Menuju: ${uniqueNames.join(" & ")}`;
        
        if (timerEl) timerEl.style.display = 'flex';
        if (successEl) successEl.style.display = 'none';
    } else if (titleEl) {
        // Jika tiada lagi modul luar
        modulLuarTargetDate = null;
        titleEl.textContent = "Modul Luar";
        if (timerEl) timerEl.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
    }
}

function updateCountdowns() {
    const now = new Date().getTime();

    // 1. Kira Countdown DPA
    const distDPA = dpaTargetDate - now;
    if (distDPA > 0 && document.getElementById('dpa-d')) {
        document.getElementById('dpa-d').textContent = String(Math.floor(distDPA / (1000 * 60 * 60 * 24))).padStart(2, '0');
        document.getElementById('dpa-h').textContent = String(Math.floor((distDPA % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
        document.getElementById('dpa-m').textContent = String(Math.floor((distDPA % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        document.getElementById('dpa-s').textContent = String(Math.floor((distDPA % (1000 * 60)) / 1000)).padStart(2, '0');
    }

    // 2. Kira Countdown Modul Luar
    if (modulLuarTargetDate) {
        const distMod = modulLuarTargetDate - now;
        if (distMod > 0 && document.getElementById('mod-d')) {
            document.getElementById('mod-d').textContent = String(Math.floor(distMod / (1000 * 60 * 60 * 24))).padStart(2, '0');
            document.getElementById('mod-h').textContent = String(Math.floor((distMod % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
            document.getElementById('mod-m').textContent = String(Math.floor((distMod % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            document.getElementById('mod-s').textContent = String(Math.floor((distMod % (1000 * 60)) / 1000)).padStart(2, '0');
        }
    }
}

// Mulakan jam!
countdownInterval = setInterval(updateCountdowns, 1000);

// =======================================================
// ===== 25. FUNGSI GALERI GAMBAR GOOGLE DRIVE =====
// =======================================================

// TAMPAL WEB APP URL DARI LANGKAH 2 DI SINI
const GALLERY_API_URL = 'https://script.google.com/macros/s/AKfycbwfwycOp7uzAQXBb5CLhuyCVOHpG53-GsYk93iJEOHMLxgU-JpxzmjxnkCzZpqNufaBlg/exec';

async function loadGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;

    try {
        const response = await fetch(GALLERY_API_URL);
        const images = await response.json();

        if (images.length === 0) {
            grid.innerHTML = '<p style="text-align:center; width:100%;">Tiada gambar dijumpai dalam folder Drive.</p>';
            return;
        }

        // Jana HTML untuk setiap gambar (Guna Thumbnail API supaya kebal sekatan browser)
        grid.innerHTML = images.map(img => `
            <div class="gallery-item">
                <img src="https://drive.google.com/thumbnail?id=${img.id}&sz=w800" 
                     alt="${img.name}" 
                     loading="lazy"
                     onclick="window.open('https://drive.google.com/file/d/${img.id}/view', '_blank')">
            </div>
        `).join('');

    } catch (error) {
        console.error("Ralat Galeri:", error);
        grid.innerHTML = '<p style="color:red; text-align:center; width:100%;">Gagal memuat turun galeri gambar.</p>';
    }
}

// Tambah loadGallery() ke dalam DOMContentLoaded initialization anda
// (Cari bahagian document.addEventListener('DOMContentLoaded', ...))