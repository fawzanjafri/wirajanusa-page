
let activities = JSON.parse(localStorage.getItem('wirajanusa_activities')) || {};
let currentActiveDayElement = null; // Elemen hari yang dipilih (untuk modal tambah)

// Variabel Global Kalendar
let currentCalendarDate = new Date(); 
const calendarDays = document.getElementById('calendarDays');
const currentMonthDisplay = document.getElementById('currentMonth');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');



// Variabel Modal Aktiviti Baharu
const activityModal = document.getElementById('activityModal');
const closeModalBtn = document.getElementById('closeModal');
const saveActivityBtn = document.getElementById('saveActivityBtn');
const modalDateSpan = document.getElementById('modalDateSpan');
const activityNameInput = document.getElementById('activityName');
const activityExcoSelect = document.getElementById('activityExco');
const activityStartTime = document.getElementById('activityStartTime');
const activityEndTime = document.getElementById('activityEndTime');
const activityPIC = document.getElementById('activityPIC');

// Variabel Modal Butiran/Edit Aktiviti
const activityDetailModal = document.getElementById('activityDetailModal');
const closeDetailModalBtn = document.getElementById('closeDetailModal');
const editActivityBtn = document.getElementById('editActivityBtn');
const deleteActivityBtn = document.getElementById('deleteActivityBtn');
let currentActivityDateKey = null;
let currentActivityIndex = -1;


// =======================================================
// ===== DARK/LIGHT MODE LOGIC (Kekal) =====
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
    loadTheme();
}


// =======================================================
// ===== KALENDAR & FUNGSINYA =====
// =======================================================

// FUNGSI UTAMA: Menjana Kalendar
function generateCalendar(date) {
    if (!calendarDays) return;

    calendarDays.innerHTML = ''; // Kosongkan kalendar sedia ada

    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Tarikh hari pertama dan hari terakhir dalam bulan
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Hari pertama dalam minggu (0=Ahad, 1=Isnin...)
    let startingDay = firstDayOfMonth.getDay();
    // Tukar Ahad (0) kepada 7, jika anda mahu Isnin sebagai permulaan minggu
    if (startingDay === 0) startingDay = 7; 
    
    // Kira tarikh dari bulan sebelumnya untuk isian tempat kosong
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    let daysFromPrevMonth = startingDay - 1; 

    // 1. Tambah hari dari bulan sebelumnya (pre-padding)
    for (let i = daysFromPrevMonth; i > 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'disabled');
        dayElement.innerHTML = `<span class="day-number">${prevMonthLastDay - i + 1}</span>`;
        calendarDays.appendChild(dayElement);
    }
    
    // 2. Tambah hari dari bulan semasa
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day');
        dayElement.innerHTML = `<span class="day-number">${day}</span>`;
        
        // Format tarikh ke 'YYYY-MM-DD'
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayElement.setAttribute('data-date-key', dateKey);
        
        const isCurrentMonth = true; // Sentiasa benar untuk gelung ini
        
        // Tandakan hari ini
        if (dateKey === todayKey && isCurrentMonth) {
            dayElement.classList.add('is-today');
        }

        // Tambah butang untuk tambah aktiviti
        const addActivityBtn = document.createElement('button');
        addActivityBtn.textContent = '+';
        addActivityBtn.classList.add('add-activity-btn');
        // PENTING: Tambah data-date-key pada butang
        addActivityBtn.setAttribute('data-date-key', dateKey); 
        dayElement.appendChild(addActivityBtn);
        
        // Paparkan aktiviti sedia ada
        if (activities[dateKey]) {
            activities[dateKey].forEach(activity => {
                displayActivityOnCalendar(dateKey, activity, dayElement);
            });
        }
        
        calendarDays.appendChild(dayElement);
    }
    
    // 3. Tambah hari dari bulan berikutnya (post-padding)
    let totalCells = daysFromPrevMonth + lastDayOfMonth.getDate();
    let daysToNextMonth = (42 - totalCells) % 7; // 42 adalah bilangan sel untuk 6 baris penuh

    for (let i = 1; i <= daysToNextMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('calendar-day', 'disabled');
        dayElement.innerHTML = `<span class="day-number">${i}</span>`;
        calendarDays.appendChild(dayElement);
    }

    // Kemas kini tajuk bulan
    currentMonthDisplay.textContent = date.toLocaleDateString('ms-MY', { month: 'long', year: 'numeric' });
}

// FUNGSI: Papar aktiviti pada hari kalendar
function displayActivityOnCalendar(dateKey, activity, dayElement = null) {
    if (!dayElement) {
        dayElement = document.querySelector(`.calendar-day[data-date-key="${dateKey}"]`);
    }

    if (!dayElement) return;

    const activityItem = document.createElement('div');
    activityItem.classList.add('activity-item', `exco-${activity.exco.toLowerCase().replace(/\s/g, '-')}`);
    
    const activityIndex = activities[dateKey] ? activities[dateKey].findIndex(a => a === activity) : -1;
    
    // Tambah maklumat untuk modal butiran
    activityItem.setAttribute('data-activity-index', activityIndex);
    activityItem.setAttribute('data-date-key', dateKey);
    
    activityItem.innerHTML = `
        <span class="exco">${activity.exco}</span>
        <span class="time">${activity.startTime} - ${activity.endTime}</span>
    `;

    // Event listener untuk buka modal butiran aktiviti
    activityItem.addEventListener('click', (e) => {
        e.stopPropagation(); 
        // Dapatkan indeks dari elemen jika aktiviti sudah disimpan dalam data activities[dateKey]
        const index = parseInt(activityItem.getAttribute('data-activity-index'));
        openActivityDetailModal(activity, index, dateKey);
    });
    
    dayElement.appendChild(activityItem);
}


// =======================================================
// ===== EVENT LISTENER UNTUK NAVIGASI KALENDAR =====
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
// ===== LOGIK MODAL TAMBAH AKTIVITI =====
// =======================================================

function openActivityModal(dayElement, activityToEdit = null, indexToEdit = -1) {
    if (!activityModal) return;

    // 1. Bersihkan active status pada hari sebelum ni (jika ada)
    if (currentActiveDayElement) {
        currentActiveDayElement.classList.remove('active');
    }

    // 2. Set elemen hari yang aktif semasa & tambah class 'active'
    currentActiveDayElement = dayElement;
    currentActiveDayElement.classList.add('active'); 
    
    // Tarikh untuk dipaparkan dalam modal
    const dateKey = dayElement.getAttribute('data-date-key');
    const dateParts = dateKey.split('-');
    const dateObject = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dateString = dateObject.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

    modalDateSpan.textContent = dateString;

    // Tetapkan borang untuk Tambah atau Edit
    if (activityToEdit && indexToEdit !== -1) {
        document.querySelector('#activityModal h2').textContent = `Edit Aktiviti pada ${dateString}`;
        activityNameInput.value = activityToEdit.name;
        activityExcoSelect.value = activityToEdit.exco;
        activityStartTime.value = activityToEdit.startTime;
        activityEndTime.value = activityToEdit.endTime;
        activityPIC.value = activityToEdit.pic || '';
        saveActivityBtn.textContent = 'Kemaskini Aktiviti';
        saveActivityBtn.setAttribute('data-edit-index', indexToEdit);
    } else {
        document.querySelector('#activityModal h2').textContent = `Tambah Aktiviti pada ${dateString}`;
        activityNameInput.value = '';
        activityExcoSelect.value = activityExcoSelect.options[0].value; // Set ke lalai
        activityStartTime.value = '';
        activityEndTime.value = '';
        activityPIC.value = '';
        saveActivityBtn.textContent = 'Simpan Aktiviti';
        saveActivityBtn.removeAttribute('data-edit-index');
    }

    activityModal.classList.add('active');
}

function closeActivityModal() {
    if (!activityModal) return;
    activityModal.classList.remove('active');

    // Buang kelas 'active' pada hari yang dipilih
    if (currentActiveDayElement) {
        currentActiveDayElement.classList.remove('active');
    }
    
    // Reset pembolehubah global
    currentActiveDayElement = null; 
}


// EVENT LISTENER: Tutup Modal
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeActivityModal);
}

// EVENT LISTENER: Klik luar modal
if (activityModal) {
    activityModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeActivityModal();
        }
    });
}

// EVENT LISTENER: Simpan Aktiviti
if (saveActivityBtn) {
    saveActivityBtn.addEventListener('click', () => {
        if (!currentActiveDayElement) return;

        const name = activityNameInput.value.trim();
        const exco = activityExcoSelect.value;
        const startTime = activityStartTime.value;
        const endTime = activityEndTime.value;
        const pic = activityPIC.value.trim();
        const editIndex = saveActivityBtn.getAttribute('data-edit-index'); // Semak jika mod edit

        if (!name || !exco || !startTime || !endTime) {
            alert("Sila isi Nama Aktiviti, Exco, dan Waktu Mula/Tamat.");
            return;
        }

        const dateKey = currentActiveDayElement.getAttribute('data-date-key'); 

        const newActivity = { name, exco, startTime, endTime, pic };

        // Simpan dalam objek activities
        if (!activities[dateKey]) {
            activities[dateKey] = [];
        }

        if (editIndex !== null) {
            // Mod Edit: Kemaskini aktiviti sedia ada
            const index = parseInt(editIndex);
            activities[dateKey][index] = newActivity;
            alert(`Aktiviti '${name}' telah dikemaskini.`);
        } else {
            // Mod Tambah: Tambah aktiviti baharu
            activities[dateKey].push(newActivity);
            localStorage.setItem('wirajanusa_activities', JSON.stringify(activities));
            alert(`Aktiviti '${name}' oleh ${exco} telah disimpan dan dipaparkan.`);
        }

        // Janakan semula kalendar untuk kemaskini paparan
        generateCalendar(currentCalendarDate);
        closeActivityModal();
    });
}


// =======================================================
// ===== LOGIK MODAL BUTIRAN AKTIVITI (DETAIL MODAL) =====
// =======================================================

function openActivityDetailModal(activity, index, dateKey) {
    if (!activityDetailModal) return;

    // Set variable global untuk fungsi Edit/Delete
    currentActivityDateKey = dateKey;
    currentActivityIndex = index;
    
    // Format tarikh
    const dateParts = dateKey.split('-');
    const dateObject = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
    const dateString = dateObject.toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' });

    // Paparkan maklumat dalam modal
    document.getElementById('detailActivityName').textContent = activity.name;
    document.getElementById('detailActivityDate').textContent = dateString;
    document.getElementById('detailActivityExco').textContent = activity.exco;
    document.getElementById('detailActivityTime').textContent = `${activity.startTime} - ${activity.endTime}`;
    document.getElementById('detailActivityPIC').textContent = activity.pic || 'Tiada';
    document.getElementById('detailActivityTitleInModal').textContent = activity.name; // Letakkan nama aktiviti di tajuk

    activityDetailModal.classList.add('active');
}

function closeActivityDetailModal() {
    if (!activityDetailModal) return;
    activityDetailModal.classList.remove('active');
    
    // Reset variable global
    currentActivityDateKey = null;
    currentActivityIndex = -1;
}

// EVENT LISTENER: Tutup Modal Butiran
if (closeDetailModalBtn) {
    closeDetailModalBtn.addEventListener('click', closeActivityDetailModal);
}

// EVENT LISTENER: Klik luar Modal Butiran
if (activityDetailModal) {
    activityDetailModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            closeActivityDetailModal();
        }
    });
}

// EVENT LISTENER: Butang Padam Aktiviti (Delete)
if (deleteActivityBtn) {
    deleteActivityBtn.addEventListener('click', () => {
        if (!currentActivityDateKey || currentActivityIndex === -1) return;

        const activityName = activities[currentActivityDateKey][currentActivityIndex].name;

        if (confirm(`Anda pasti mahu memadam aktiviti "${activityName}"?`)) {
            
            // Padam dari data simpanan
            activities[currentActivityDateKey].splice(currentActivityIndex, 1);
            localStorage.setItem('wirajanusa_activities', JSON.stringify(activities));
            
            // Janakan semula kalendar untuk kemaskini paparan
            generateCalendar(currentCalendarDate);
            
            closeActivityDetailModal();
        }
    });
}

// EVENT LISTENER: Butang Edit Aktiviti
if (editActivityBtn) {
    editActivityBtn.addEventListener('click', () => {
        if (!currentActivityDateKey || currentActivityIndex === -1) return;
        
        const dayElement = document.querySelector(`.calendar-day[data-date-key="${currentActivityDateKey}"]`);
        const activityToEdit = activities[currentActivityDateKey][currentActivityIndex];
        
        closeActivityDetailModal(); // Tutup modal butiran
        openActivityModal(dayElement, activityToEdit, currentActivityIndex); // Buka modal tambah/edit
    });
}

// =======================================================
// ===== EVENT DELEGATION UNTUK BUTANG TAMBAH AKTIVITI (PENTING!) =====
// =======================================================

if (calendarDays) {
    calendarDays.addEventListener('click', (e) => {
        // Semak jika elemen yang diklik adalah butang tambah aktiviti
        if (e.target.classList.contains('add-activity-btn')) {
            e.stopPropagation(); // Hentikan gelembung event
            
            const dateKey = e.target.getAttribute('data-date-key');
            // Dapatkan elemen hari kalendar sebenar menggunakan dateKey
            const dayElement = document.querySelector(`.calendar-day[data-date-key="${dateKey}"]`);
            
            if (dayElement) {
                // Buka modal
                openActivityModal(dayElement);
            }
        }
    });
}

// =======================================================
// ===== SIDEBAR LOGIC (Dikekalkan) =====
// =======================================================
const sidebarPanel = document.getElementById("sidebarPanel");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const closeSidebar = document.getElementById("closeSidebar");
const menuTrigger = document.querySelector(".menu-trigger");

// buka sidebar
if (menuTrigger) {
    menuTrigger.addEventListener("click", function(e){
        e.preventDefault();
        if (sidebarPanel) sidebarPanel.classList.add("active");
        if (sidebarOverlay) sidebarOverlay.classList.add("active");
    });
}
// close button
if (closeSidebar) {
    closeSidebar.addEventListener("click", function(){
        if (sidebarPanel) sidebarPanel.classList.remove("active");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
    });
}
// klik luar sidebar
if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", function(){
        if (sidebarPanel) sidebarPanel.classList.remove("active");
        if (sidebarOverlay) sidebarOverlay.classList.remove("active");
    });
}

// =======================================================
// ===== VIDEO SLIDESHOW LOGIC (Dikekalkan) =====
// =======================================================
const videoSources = [
  "assets/videos/hero1.mp4",
  "assets/videos/hero2.mp4"
];

const videos = document.querySelectorAll(".hero-video");
const prevVideoBtn = document.getElementById("prevVideo");
const nextVideoBtn = document.getElementById("nextVideo");

let currentVideoIndex = 0;
let slideInterval; // Variable untuk simpan timer

if (videos.length > 0) {
    
    // 1. SETUP AWAL: Play semua video serentak (Muted)
    // Ini rahsia kenapa transition jadi smooth (video dah ready bergerak)
    videos.forEach((vid, index) => {
        if (videoSources[index]) {
            vid.src = videoSources[index];
            vid.muted = true; 
            vid.play().catch(e => console.log("Autoplay prevented:", e));
        }
    });

    // 2. FUNGSI TUKAR VIDEO
    function showVideo(index) {
        // Buang class active dari semua video
        videos.forEach(v => v.classList.remove("active"));
        
        // Tambah class active pada video yang dipilih
        videos[index].classList.add("active");
        
        // Safety net: Pastikan video tengah play
        videos[index].play().catch(e => console.log(e));
    }

    // 3. FUNGSI GERAK KE NEXT (Dengan Reset Timer)
    function nextSlide() {
        currentVideoIndex = (currentVideoIndex + 1) % videos.length;
        showVideo(currentVideoIndex);
        resetTimer(); // Reset timer supaya tak bertukar laju sangat lepas klik
    }

    // 4. FUNGSI GERAK KE PREV (Dengan Reset Timer)
    function prevSlide() {
        // Formula matematik untuk loop ke belakang (0 -> last index)
        currentVideoIndex = (currentVideoIndex - 1 + videos.length) % videos.length;
        showVideo(currentVideoIndex);
        resetTimer();
    }

    // 5. LOGIK TIMER (AUTO LOOP)
    function startTimer() {
        slideInterval = setInterval(() => {
            currentVideoIndex = (currentVideoIndex + 1) % videos.length;
            showVideo(currentVideoIndex);
        }, 8000); // 8 saat
    }

    function resetTimer() {
        clearInterval(slideInterval); // Hentikan timer lama
        startTimer(); // Mula timer baru
    }

    // 6. EVENT LISTENERS UNTUK BUTANG
    if (nextVideoBtn) nextVideoBtn.addEventListener("click", nextSlide);
    if (prevVideoBtn) prevVideoBtn.addEventListener("click", prevSlide);

    // Mula timer bila page load
    startTimer();
}

// =======================================================
// ===== INIT KALENDAR: Mula kalendar dengan bulan semasa =====
// =======================================================
if (calendarDays && currentMonthDisplay) {
    // Fungsi init awal
    generateCalendar(currentCalendarDate); 
}