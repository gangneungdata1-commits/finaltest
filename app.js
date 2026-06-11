// Standalone Client-Side Application Logic for Expert Activity Tracker (User Version)

// 1. DEFAULT SEED DATA (STARTS EMPTY)
const DEFAULT_ACTIVITIES = [];

// 2. STATE STORAGE MANAGEMENT
let activities = [];
let dbMode = "local"; // "local" or "sheets"
let viewMode = "list";
let searchTerm = "";
let typeFilter = "전체";
let currentCalendarDate = new Date(2026, 5, 11); // June 11, 2026
let selectedActivity = null;
let icalMethod = "text"; // "text" or "file"
let editingActivityId = null; // State for tracking the currently edited activity
let sheetsUrl = ""; // Google Sheets Apps Script Web App URL

// Initialize database (Supports real-time Google Sheets or localStorage fallback)
async function initDatabase() {
  // Clear any old/stale developer activities once to guarantee a fresh, empty start!
  const currentVersion = "2.1";
  const savedVersion = localStorage.getItem("standalone_version");
  if (savedVersion !== currentVersion) {
    localStorage.removeItem("standalone_activities");
    localStorage.setItem("standalone_version", currentVersion);
  }

  // Load saved Database Mode preference
  const savedDbMode = localStorage.getItem("standalone_db_mode");
  if (savedDbMode) {
    dbMode = savedDbMode;
    const select = document.getElementById("db-mode-select");
    if (select) select.value = dbMode;
  }

  // Load saved Sheets Web App URL
  const savedUrl = localStorage.getItem("standalone_sheets_url");
  if (savedUrl) {
    sheetsUrl = savedUrl;
    const input = document.getElementById("google-web-app-url");
    if (input) input.value = sheetsUrl;
  } else {
    sheetsUrl = window.CONFIG?.GOOGLE_WEB_APP_URL || "";
    const input = document.getElementById("google-web-app-url");
    if (input) input.value = sheetsUrl;
  }

  const urlContainer = document.getElementById("sheets-url-container");
  if (dbMode === "sheets") {
    urlContainer.classList.remove("hidden");
    if (sheetsUrl) {
      updateSheetsSyncStatus("connecting");
      try {
        // Fetch real-time activities list from Google Sheets DB
        const res = await fetch(`${sheetsUrl}?action=get`);
        if (!res.ok) throw new Error("Network response was not ok");
        activities = await res.json();
        updateSheetsSyncStatus("connected");
      } catch (e) {
        console.error("Failed to fetch Google Sheets data, falling back to localStorage", e);
        updateSheetsSyncStatus("error");
        loadFromLocalStorage();
      }
    } else {
      updateSheetsSyncStatus("local");
      loadFromLocalStorage();
    }
  } else {
    urlContainer.classList.add("hidden");
    updateSheetsSyncStatus("local");
    loadFromLocalStorage();
  }
  
  renderMainApp();
}

function loadFromLocalStorage() {
  const localData = localStorage.getItem("standalone_activities");
  if (localData) {
    try {
      activities = JSON.parse(localData);
      
      // Filter out any old mock seed data starting with "act_init"
      activities = activities.filter(act => act.id && !act.id.startsWith("act_init"));
      
      // Automatic Schema Migration: Upgrades any old activities stored in the user's browser
      activities = activities.map(act => {
        return {
          id: act.id || "act_" + Math.random().toString(36).substring(2, 11),
          startDate: act.startDate || "",
          endDate: act.endDate || act.startDate || "",
          time: act.time || "09:00",
          type: act.type === "내부" || act.type === "대외" ? act.type : (act.type === "회의" ? "내부" : "대외"),
          dept: act.dept || act.org || "기획조정실",
          manager: act.manager || act.name || "담당자",
          phone: act.phone || "",
          subject: act.subject || "일정 제목",
          location: act.location || act.targetOrg || "회의실",
          attendees: act.attendees || "",
          content: act.content || act.memo || "",
          createdAt: act.createdAt || new Date().toISOString()
        };
      });
      saveDatabase();
    } catch (e) {
      console.error("Failed to parse localStorage data", e);
      activities = [];
      saveDatabase();
    }
  } else {
    activities = [];
    saveDatabase();
  }
}

function saveDatabase() {
  localStorage.setItem("standalone_activities", JSON.stringify(activities));
}

// DB Mode Selector toggles
function handleDbModeChange() {
  const select = document.getElementById("db-mode-select");
  dbMode = select.value;
  localStorage.setItem("standalone_db_mode", dbMode);
  
  // Re-trigger DB load & sync status
  initDatabase();
}

// 3. MAIN APP VIEW CONTROLLER
function renderMainApp() {
  calculateKPIs();
  
  // Apply Search & Filters
  const filtered = filterActivitiesList();

  // Populate list count header
  const countText = document.getElementById("search-count-text");
  countText.innerHTML = `검색 및 필터 조회 결과: <strong>${filtered.length}</strong>건 / ${activities.length} 전체`;
  
  const resetBtn = document.getElementById("btn-reset-filters");
  if (searchTerm || typeFilter !== "전체") {
    resetBtn.classList.remove("hidden");
  } else {
    resetBtn.classList.add("hidden");
  }

  // ALWAYS render both views on load so that Tailwind JIT CDN parses all dynamically created classes instantly!
  renderListView(filtered);
  renderCalendarView(filtered);
  
  // Re-instantiate icons
  lucide.createIcons();
}

function calculateKPIs() {
  const total = activities.length;
  const externalCount = activities.filter(a => a.type === "대외").length;
  const internalCount = activities.filter(a => a.type === "내부").length;
  const upcomingCount = activities.filter(a => (a.startDate >= "2026-06-11")).length;

  document.getElementById("kpi-total").innerText = `${total}건`;
  
  const extRatio = total > 0 ? Math.round((externalCount / total) * 100) : 0;
  document.getElementById("kpi-external-ratio").innerHTML = `${extRatio}% <span class="text-[10px] text-slate-400 font-normal ml-1">(${externalCount}건)</span>`;
  
  document.getElementById("kpi-internal").innerText = `${internalCount}건`;
  document.getElementById("kpi-upcoming").innerText = `${upcomingCount}건`;
}

function filterActivitiesList() {
  return activities.filter(act => {
    const typeMatch = typeFilter === "전체" || act.type === typeFilter;
    const cleanSearch = searchTerm.toLowerCase().trim();
    if (!cleanSearch) return typeMatch;

    const targetStr = `${act.manager} ${act.dept} ${act.subject} ${act.location} ${act.content} ${act.phone}`.toLowerCase();
    const textMatch = targetStr.includes(cleanSearch);
    return typeMatch && textMatch;
  });
}

function handleSearchFilterChange() {
  searchTerm = document.getElementById("search-input").value;
  typeFilter = document.getElementById("filter-type").value;
  renderMainApp();
}

function resetSearchFilters() {
  document.getElementById("search-input").value = "";
  document.getElementById("filter-type").value = "전체";
  searchTerm = "";
  typeFilter = "전체";
  renderMainApp();
}

function switchViewMode(mode) {
  viewMode = mode;
  const btnList = document.getElementById("btn-view-list");
  const btnCal = document.getElementById("btn-view-calendar");
  const listContainer = document.getElementById("view-list-container");
  const calContainer = document.getElementById("view-calendar-container");
  const viewTitle = document.getElementById("view-mode-title");

  if (mode === "list") {
    btnList.className = "p-1 rounded-md transition-all bg-white dark:bg-[#111827] text-blue-600 shadow-xs font-bold";
    btnCal.className = "p-1 rounded-md transition-all text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
    listContainer.classList.remove("hidden");
    calContainer.classList.add("hidden");
    viewTitle.innerText = "보고서 일정 리스트";
  } else {
    btnList.className = "p-1 rounded-md transition-all text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
    btnCal.className = "p-1 rounded-md transition-all bg-white dark:bg-[#111827] text-blue-600 shadow-xs font-bold";
    listContainer.classList.add("hidden");
    calContainer.classList.remove("hidden");
    viewTitle.innerText = "보고서 일정 캘린더";
    
    // Automatically trigger real-time refresh when switching to the calendar view
    if (dbMode === "sheets" && sheetsUrl) {
      initDatabase();
    }
  }

  renderMainApp();
}

// 4. RENDER LIST VIEW CARD
function renderListView(filtered) {
  const container = document.getElementById("view-list-container");
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-20 border-2 border-dashed border-slate-200 dark:border-[#1f2937] rounded-xl bg-slate-50 dark:bg-[#111827]/40 text-slate-400 dark:text-slate-555 space-y-2 select-none">
        <i data-lucide="calendar" class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600"></i>
        <p class="text-xs font-semibold">조건에 일치하는 공무원 보고 일정이 없습니다.</p>
        <p class="text-[10px] text-slate-400">새로운 일정을 입력하고 필터링 조회를 확인하세요.</p>
      </div>
    `;
    return;
  }

  // Sort by createdAt or startDate descending to show latest additions at top
  const sorted = [...filtered].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  container.innerHTML = sorted.map(act => {
    const isExternal = act.type === "대외";
    
    const borderClass = isExternal 
      ? "border-l-blue-500" 
      : "border-l-emerald-500";

    const badgeClass = isExternal 
      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400" 
      : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400";

    return `
      <div class="border border-slate-200 dark:border-[#1f2937] rounded-xl p-4 flex gap-4 bg-white dark:bg-[#111827] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all border-l-4 ${borderClass} animate-fade-in text-left">
        <div class="flex-1 space-y-2">
          
          <!-- Meta Info -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}">
              ${act.type}
            </span>
            ${formatDisplayTime(act.time) ? `<span class="text-slate-400 dark:text-slate-550 font-bold font-mono text-[11px]">${formatDisplayTime(act.time)}</span>` : ''}
            <div class="flex items-center gap-1 text-slate-400 dark:text-slate-500 font-mono text-[11px]">
              <i data-lucide="calendar" class="w-3 h-3 text-slate-400 dark:text-slate-500"></i>
              <span>${act.startDate}</span>
              ${act.endDate && act.endDate !== act.startDate ? `
                <span>~</span>
                <span>${act.endDate}</span>
              ` : ''}
            </div>
          </div>

          <!-- Title -->
          <div>
            <h4 class="font-bold text-slate-850 dark:text-slate-100 text-[14px]">
              <span class="text-blue-600 dark:text-blue-400 font-bold mr-1">[${act.dept}]</span> ${act.subject}
            </h4>
          </div>

          <!-- Details Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-[#151c2c]/40 p-2 rounded-lg text-xs text-slate-600 dark:text-slate-400 font-medium">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 dark:text-slate-550 text-[10px] w-12 shrink-0">👤 담당자</span>
              <span class="truncate text-slate-700 dark:text-slate-300">${act.manager} ${act.phone ? `(${act.phone})` : ''}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 dark:text-slate-550 text-[10px] w-12 shrink-0">🏢 장소</span>
              <span class="truncate text-slate-700 dark:text-slate-300">${act.location || '없음'}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 dark:text-slate-550 text-[10px] w-12 shrink-0">👥 참석자</span>
              <span class="truncate text-slate-700 dark:text-slate-300">${act.attendees || '없음'}</span>
            </div>
          </div>

          <!-- Content Memo -->
          ${act.content ? `
            <p class="text-slate-500 dark:text-slate-400 text-[11px] bg-white dark:bg-[#1a2336] border border-slate-100 dark:border-[#2d394e] p-2 rounded-lg italic">
              💡 ${act.content}
            </p>
          ` : ''}

        </div>

        <!-- Edit & Delete Action Side -->
        <div class="flex flex-col gap-2 justify-center border-l border-slate-100 dark:border-[#1f2937] pl-3 select-none">
          <button
            type="button"
            onclick="editActivityFromList('${act.id}')"
            class="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-[#1a2336]/40 rounded-xl transition active:scale-95 cursor-pointer"
            title="일정 수정"
          >
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          <button
            type="button"
            onclick="deleteActivity('${act.id}')"
            class="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-[#1a2336]/40 rounded-xl transition active:scale-95 cursor-pointer"
            title="일정 삭제"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>

      </div>
    `;
  }).join("");
}

// Delete Handler (Synchronized with Google Sheets if connected)
async function deleteActivity(id) {
  if (!confirm("해당 일정을 삭제하시겠습니까?")) return;
  activities = activities.filter(a => a.id !== id);
  saveDatabase();
  renderMainApp();

  if (dbMode === "sheets" && sheetsUrl) {
    updateSheetsSyncStatus("connecting");
    await syncToGoogleSheets("delete", id);
    updateSheetsSyncStatus("connected");
  }
}

// 5. RENDER DYNAMIC CALENDAR ENGINE (VANILLA PORT FROM REACT)
function renderCalendarView(filtered) {
  const gridContainer = document.getElementById("calendar-weeks-grid");
  const label = document.getElementById("calendar-month-label");

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  label.innerText = `${year}년 ${month + 1}월`;

  // Generate calendar grid dates
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days = [];

  // 1. Previous month padding
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const prevDate = new Date(year, month - 1, prevMonthDays - i);
    days.push({
      date: prevDate,
      isCurrentMonth: false,
      isToday: isSameDay(prevDate, new Date())
    });
  }

  // 2. Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const currDate = new Date(year, month, i);
    days.push({
      date: currDate,
      isCurrentMonth: true,
      isToday: isSameDay(currDate, new Date())
    });
  }

  // 3. Next month padding to fulfill 6 rows (42 cells)
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const nextDate = new Date(year, month + 1, i);
    days.push({
      date: nextDate,
      isCurrentMonth: false,
      isToday: isSameDay(nextDate, new Date())
    });
  }

  // Slice into 6 weeks
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Clear previous rendering
  gridContainer.innerHTML = "";

  weeks.forEach((weekDays, weekIdx) => {
    const weekStart = weekDays[0].date;
    const weekEnd = weekDays[6].date;
    const weekStartMidnight = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()).getTime();
    const weekEndMidnight = new Date(weekEnd.getFullYear(), weekEnd.getMonth(), weekEnd.getDate()).getTime();

    // Filter activities that overlap with this week
    const weekActivities = filtered.filter(act => {
      const start = safeParseDate(act.startDate);
      const end = safeParseDate(act.endDate || act.startDate);
      if (!start) return false;

      const startM = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endM = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() : startM;

      return startM <= weekEndMidnight && endM >= weekStartMidnight;
    });

    // Sort: duration descending, then start date ascending
    weekActivities.sort((a, b) => {
      const startA = safeParseDate(a.startDate)?.getTime() || 0;
      const startB = safeParseDate(b.startDate)?.getTime() || 0;
      const endA = safeParseDate(a.endDate || a.startDate)?.getTime() || 0;
      const endB = safeParseDate(b.endDate || b.startDate)?.getTime() || 0;

      const durA = endA - startA;
      const durB = endB - startB;

      if (durA !== durB) return durB - durA;
      return startA - startB;
    });

    // Assign tracks
    const tracks = [];
    const activityPositions = [];

    weekActivities.forEach(act => {
      const start = safeParseDate(act.startDate);
      const end = safeParseDate(act.endDate || act.startDate);
      if (!start) return;

      const actStartM = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const actEndM = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() : actStartM;

      let startCol = 0;
      let endCol = 6;

      for (let c = 0; c < 7; c++) {
        const colTime = new Date(weekDays[c].date.getFullYear(), weekDays[c].date.getMonth(), weekDays[c].date.getDate()).getTime();
        if (colTime === actStartM) {
          startCol = c;
        }
        if (colTime === actEndM) {
          endCol = c;
        }
      }

      if (actStartM < weekStartMidnight) startCol = 0;
      if (actEndM > weekEndMidnight) endCol = 6;

      let trackRow = 0;
      while (true) {
        if (!tracks[trackRow]) {
          tracks[trackRow] = Array(7).fill(null);
        }
        let available = true;
        for (let c = startCol; c <= endCol; c++) {
          if (tracks[trackRow][c] !== null) {
            available = false;
            break;
          }
        }
        if (available) {
          for (let c = startCol; c <= endCol; c++) {
            tracks[trackRow][c] = act;
          }
          activityPositions.push({ act, startCol, endCol, trackRow });
          break;
        }
        trackRow++;
      }
    });

    const numTracks = tracks.length;
    const minHeight = Math.max(115, 48 + numTracks * 28);

    // Week Row Div
    const weekRowDiv = document.createElement("div");
    weekRowDiv.className = "relative bg-white dark:bg-[#111827] flex flex-col border-b border-slate-100 dark:border-[#1f2937] transition-colors duration-200";
    weekRowDiv.style.minHeight = `${minHeight}px`;

    // 1. Grid Background & Vertical lines
    let bgHtml = `<div class="grid grid-cols-7 absolute inset-0 divide-x divide-slate-100/70 dark:divide-[#1f2937]/50 pointer-events-none">`;
    weekDays.forEach(dayObj => {
      const bgClass = !dayObj.isCurrentMonth ? "bg-slate-50/40 dark:bg-slate-950/20" : "bg-white dark:bg-[#111827]";
      const todayClass = dayObj.isToday ? "bg-blue-50/25 dark:bg-blue-900/10" : "";
      bgHtml += `<div class="h-full ${bgClass} ${todayClass}"></div>`;
    });
    bgHtml += `</div>`;
    weekRowDiv.innerHTML += bgHtml;

    // 2. Day numbers
    let daysHtml = `<div class="grid grid-cols-7 h-[36px] items-center relative z-10 pointer-events-none mb-1">`;
    weekDays.forEach((dayObj, colIdx) => {
      const isSunday = colIdx === 0;
      const isSaturday = colIdx === 6;
      const isFirst = dayObj.date.getDate() === 1;
      const dateLabel = isFirst ? `${dayObj.date.getMonth() + 1}월 1일` : `${dayObj.date.getDate()}`;
      
      let numClass = "text-slate-700 dark:text-slate-300";
      if (dayObj.isToday) {
        numClass = "bg-blue-600 text-white font-extrabold shadow-sm scale-110";
      } else if (isSunday) {
        numClass = "text-red-500";
      } else if (isSaturday) {
        numClass = "text-blue-500";
      } else if (!dayObj.isCurrentMonth) {
        numClass = "text-slate-300 dark:text-slate-700";
      }

      daysHtml += `
        <div class="flex items-center justify-center pt-2">
          <span class="inline-flex items-center justify-center p-1 px-1.5 rounded-full text-xs font-bold font-sans select-none ${numClass}">
            ${dateLabel}
          </span>
        </div>
      `;
    });
    daysHtml += `</div>`;
    weekRowDiv.innerHTML += daysHtml;

    // 3. Bars container
    const barsContainer = document.createElement("div");
    barsContainer.className = "relative flex-1 pb-2 min-h-12";

    activityPositions.forEach(({ act, startCol, endCol, trackRow }) => {
      const start = safeParseDate(act.startDate);
      const end = safeParseDate(act.endDate || act.startDate);
      const actStartM = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() : 0;
      const actEndM = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() : actStartM;

      const isStartThisWeek = actStartM >= weekStartMidnight;
      const isEndThisWeek = actEndM <= weekEndMidnight;

      let colorClass = "bg-[#7084d3] text-white hover:bg-[#5f73c5] border border-[#7084d3]/30 shadow-xs";
      if (act.type === "대외") {
        colorClass = "bg-[#5e72e4] text-white hover:bg-[#4d61d3] border border-[#5e72e4]/20 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30 dark:hover:bg-indigo-500/25 shadow-xs";
      } else if (act.type === "내부") {
        colorClass = "bg-[#2dce89] text-white hover:bg-[#24b97a] border border-[#2dce89]/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/25 shadow-xs";
      }

      const lRound = isStartThisWeek ? "rounded-l-md" : "rounded-l-none";
      const rRound = isEndThisWeek ? "rounded-r-md" : "rounded-r-none";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `absolute text-left truncate text-[11px] px-1.5 font-semibold transition-all pointer-events-auto flex items-center z-20 cursor-pointer h-[24px] ${colorClass} ${lRound} ${rRound}`;
      btn.style.left = `calc(${(startCol / 7) * 100}% + 2px)`;
      btn.style.width = `calc(${((endCol - startCol + 1) / 7) * 100}% - 4px)`;
      btn.style.top = `${trackRow * 28}px`;
      btn.title = `[${act.dept}] ${act.subject}`;
      btn.innerHTML = `<span class="truncate w-full pr-1 font-bold">[${act.dept}] ${act.subject}</span>`;
      
      btn.onclick = () => editActivityFromList(act.id);
      barsContainer.appendChild(btn);
    });

    weekRowDiv.appendChild(barsContainer);
    gridContainer.appendChild(weekRowDiv);
  });
}

// 6. EDITING PROCESS (CALENDAR CLICK & LIST BUTTONS)
function populateFormWithActivity(act) {
  document.getElementById("form-start-date").value = act.startDate || "";
  document.getElementById("form-end-date").value = act.endDate || act.startDate || "";
  document.getElementById("form-time").value = formatDisplayTime(act.time);
  
  // Normalize type value: trim whitespace and fallback to "대외" if unrecognized
  const typeVal = String(act.type || "").trim();
  document.getElementById("form-type").value = (typeVal === "내부") ? "내부" : "대외";
  
  document.getElementById("form-dept").value = act.dept || "";
  document.getElementById("form-manager").value = act.manager || "";
  document.getElementById("form-phone").value = act.phone || "";
  document.getElementById("form-subject").value = act.subject || "";
  document.getElementById("form-location").value = act.location || "";
  document.getElementById("form-attendees").value = act.attendees || "";
  document.getElementById("form-content").value = act.content || "";
}

function editActivityFromList(id) {
  const act = activities.find(a => a.id === id);
  if (!act) return;

  editingActivityId = id;
  populateFormWithActivity(act);

  // Smooth scroll to the form element
  document.getElementById("activity-form").scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Visual highlights for edit mode
  document.getElementById("form-card-title").innerHTML = `<i data-lucide="edit-3" class="w-4 h-4 text-amber-500 animate-pulse"></i> 보고 일정 수정 진행 중`;
  document.getElementById("form-required-badge").innerHTML = `<span class="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded">수정 모드</span>`;
  document.getElementById("btn-form-submit").className = "w-full bg-amber-500 hover:bg-amber-600 text-white font-bold p-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 shadow-sm active:scale-98 text-xs cursor-pointer";
  document.getElementById("text-form-submit").innerText = "일정 보고서 수정 완료하기";
  document.getElementById("btn-cancel-edit").classList.remove("hidden");
  document.getElementById("btn-delete-in-edit").classList.remove("hidden");

  // Re-instantiate icons
  lucide.createIcons();
}

function exitEditMode() {
  editingActivityId = null;
  document.getElementById("activity-form").reset();

  // Reset visual layout to Add Mode
  document.getElementById("form-card-title").innerHTML = `<i data-lucide="plus-circle" class="w-4 h-4 text-blue-600"></i> 일정 보고서 상세 정보`;
  document.getElementById("form-required-badge").innerText = "* 필수기입";
  document.getElementById("btn-form-submit").className = "w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded-xl transition duration-150 flex items-center justify-center gap-1.5 shadow-sm active:scale-98 text-xs cursor-pointer";
  document.getElementById("text-form-submit").innerText = "일정 보고서에 등록하기";
  document.getElementById("btn-cancel-edit").classList.add("hidden");
  document.getElementById("btn-delete-in-edit").classList.add("hidden");

  // Re-instantiate icons
  lucide.createIcons();
}

// Delete the currently editing activity directly from the edit form
async function deleteEditingActivity() {
  if (!editingActivityId) return;
  const act = activities.find(a => a.id === editingActivityId);
  const label = act ? `[${act.dept || ''}] ${act.subject || ''}` : editingActivityId;
  if (!confirm(`${label} 일정을 삭제하시겠습니까?`)) return;
  
  activities = activities.filter(a => a.id !== editingActivityId);
  saveDatabase();
  
  if (dbMode === "sheets" && sheetsUrl) {
    await syncToGoogleSheets("delete", editingActivityId);
  }
  
  exitEditMode();
  renderMainApp();
}

// 7. HANDLERS FOR NEW MANUAL FORM SUBMISSIONS (CREATE & UPDATE)
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const start = document.getElementById("form-start-date").value;
  const end = document.getElementById("form-end-date").value;
  const time = document.getElementById("form-time").value;
  const type = document.getElementById("form-type").value;
  const dept = document.getElementById("form-dept").value;
  const manager = document.getElementById("form-manager").value;
  const phone = document.getElementById("form-phone").value;
  const subject = document.getElementById("form-subject").value;
  const location = document.getElementById("form-location").value;
  const attendees = document.getElementById("form-attendees").value;
  const content = document.getElementById("form-content").value;

  if (!start || !type || !dept || !manager || !subject) {
    alert("필수 항목(* 기입)을 모두 입력해 주세요!");
    return;
  }

  const payloadData = {
    startDate: start,
    endDate: end || start,
    time: time,
    type: type,
    dept: dept,
    manager: manager,
    phone: phone || "",
    subject: subject,
    location: location || "",
    attendees: attendees || "",
    content: content || ""
  };

  if (editingActivityId) {
    // 1) UPDATE MODE
    activities = activities.map(act => {
      if (act.id === editingActivityId) {
        return {
          ...act,
          ...payloadData
        };
      }
      return act;
    });

    alert("보고서 일정이 성공적으로 수정 완료되었습니다!");
    
    // Sync to Google Sheets if connected
    if (dbMode === "sheets" && sheetsUrl) {
      updateSheetsSyncStatus("connecting");
      await syncToGoogleSheets("update", editingActivityId, payloadData);
      updateSheetsSyncStatus("connected");
    }
    
    exitEditMode();
  } else {
    // 2) CREATE MODE
    const newActivity = {
      id: "act_" + Math.random().toString(36).substring(2, 11),
      ...payloadData,
      createdAt: new Date().toISOString()
    };

    activities.push(newActivity);
    alert("일정 보고서가 성공적으로 기록 및 연동되었습니다!");
    
    // Sync to Google Sheets if connected
    if (dbMode === "sheets" && sheetsUrl) {
      updateSheetsSyncStatus("connecting");
      await syncToGoogleSheets("create", newActivity.id, newActivity);
      updateSheetsSyncStatus("connected");
    }

    // Reset Form
    document.getElementById("activity-form").reset();
  }

  saveDatabase();
  renderMainApp();
}

// 8. SYNCHRONIZE CRUD TO GOOGLE SHEETS WEB APP BACKEND
async function syncToGoogleSheets(action, id, data) {
  if (!sheetsUrl) return;
  try {
    // We use "text/plain" Content-Type instead of "application/json" to bypass CORS preflight OPTIONS requests,
    // which Google Apps Script Web Apps do not support. e.postData.contents still parses correctly as JSON!
    const res = await fetch(sheetsUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action, id, data }),
      mode: "cors"
    });
    
    // Attempt to parse response, but do not throw error if CORS redirection body is opaque,
    // as Google Sheets has already successfully processed and recorded the POST write request!
    try {
      const result = await res.json();
      if (result && result.error) {
        console.warn("Sheets backend warning:", result.error);
      }
    } catch (parseErr) {
      console.log("Opaque/Redirect response received, write succeeded.");
    }
  } catch (e) {
    console.error("Failed to sync change to Google Sheets:", e);
    alert("구글 스프레드시트 동기화 실패: " + e.message + "\n(데이터는 브라우저 로컬 저장소에 우선 저장되었습니다.)");
  }
}

function handleSheetsUrlChange() {
  const url = document.getElementById("google-web-app-url").value.trim();
  if (url) {
    localStorage.setItem("standalone_sheets_url", url);
    sheetsUrl = url;
  } else {
    localStorage.removeItem("standalone_sheets_url");
    sheetsUrl = "";
  }
  initDatabase(); // Re-trigger DB load and refresh with the new URL!
}

function updateSheetsSyncStatus(status) {
  const text = document.getElementById("sheets-sync-text");
  if (!text) return;

  if (dbMode === "local") {
    text.innerText = "로컬 브라우저 저장소 연동 모드";
    text.className = "text-xs font-bold text-white mt-1";
  } else {
    if (status === "connecting") {
      text.innerText = "구글 시트 연동 수신 중...";
      text.className = "text-xs font-bold text-amber-400 mt-1 animate-pulse";
    } else if (status === "connected") {
      text.innerText = "구글 스프레드시트 실시간 동기화";
      text.className = "text-xs font-bold text-emerald-400 mt-1";
    } else if (status === "error") {
      text.innerText = "구글 시트 동기화 오류 (로컬 모드)";
      text.className = "text-xs font-bold text-rose-400 mt-1";
    } else {
      text.innerText = "구글 시트 연동 주소 입력 대기 중";
      text.className = "text-xs font-bold text-slate-350 mt-1";
    }
  }
}

// Calendar Navigations
function navigateCalendarToday() {
  currentCalendarDate = new Date();
  renderMainApp();
}

// Calendar Navigation Forward/Backward
function navigateCalendarPrev() {
  const y = currentCalendarDate.getFullYear();
  const m = currentCalendarDate.getMonth();
  currentCalendarDate = new Date(y, m - 1, 1);
  renderMainApp();
}

// Calendar Navigation Forward
function navigateCalendarNext() {
  const y = currentCalendarDate.getFullYear();
  const m = currentCalendarDate.getMonth();
  currentCalendarDate = new Date(y, m + 1, 1);
  renderMainApp();
}

// Helper: format display time cleanly and handle Google Sheets December 30 1899 base epoch string dates
function formatDisplayTime(timeStr) {
  if (!timeStr) return "";
  const s = String(timeStr).trim();
  if (!s) return "";
  // If it's already HH:MM format (user-entered), return as-is
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const parts = s.split(":");
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  // If it looks like a Google Sheets date-time string, don't extract time from it
  // (the time in "Sat Dec 30 1899 ..." is unreliable due to timezone offset artifacts)
  if (s.includes("1899") || s.includes("GMT")) return "";
  // Try to find HH:MM pattern in other strings
  const match = s.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return "";
}

// Helper: compare dates
function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function safeParseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try standard date parsing first (handles ISO strings and standard formats)
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // If standard parsing fails (like "2026. 6. 11." or "2026/06/11"), extract Year, Month, Day numerically
  const matches = String(dateStr).match(/\d+/g);
  if (matches && matches.length >= 3) {
    const year = parseInt(matches[0], 10);
    const month = parseInt(matches[1], 10) - 1;
    const day = parseInt(matches[2], 10);
    return new Date(year, month, day);
  }
  
  return null;
}

// 9. AI PARSING ASSISTANT (GEMINI & HEURISTIC FALLBACK)
function toggleApiKeyVisibility() {
  const el = document.getElementById("gemini-api-key");
  const eye = document.getElementById("api-key-eye");
  if (el.type === "password") {
    el.type = "text";
    eye.setAttribute("data-lucide", "eye-off");
  } else {
    el.type = "password";
    eye.setAttribute("data-lucide", "eye");
  }
  lucide.createIcons();
}

async function runAiParse() {
  const promptText = document.getElementById("ai-prompt").value.trim();
  if (!promptText) {
    alert("보고서나 메신저 대화의 일정 텍스트 문장을 입력해 주세요.");
    return;
  }

  const btnText = document.getElementById("btn-ai-text");
  const btn = document.getElementById("btn-ai-parse");
  
  // Reset banners
  document.getElementById("ai-banner-success").classList.add("hidden");
  document.getElementById("ai-banner-fallback").classList.add("hidden");
  document.getElementById("ai-banner-error").classList.add("hidden");

  btn.disabled = true;
  btnText.innerText = "보고 일정 분석 중...";

  const apiKey = document.getElementById("gemini-api-key").value.trim();

  // If NO API key, fallback to local Heuristic parsing
  if (!apiKey) {
    setTimeout(() => {
      const parsed = heuristicParse(promptText);
      populateForm(parsed);
      
      btn.disabled = false;
      btnText.innerText = "자연어 추출 및 화면 채우기";
      document.getElementById("ai-banner-fallback").classList.remove("hidden");
    }, 800);
    return;
  }

  // If API key is provided, execute direct fetch to Google Gemini API
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const systemInstruction = `너는 텍스트에서 공무원 일정 보고 내역을 파싱하여 JSON으로 만들어주는 인공지능이야.
현재 날짜 기준: ${new Date().toISOString().split('T')[0]}.
반드시 아래 JSON 포맷을 성실히 지켜서 순수한 JSON 형태로만 답변해줘. 마크다운 코드블록 기호없이 순수 JSON만 반환해야 돼.

{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "time": "HH:MM (예: 14:00. 시간 정보가 없거나 모호하면 09:00으로 기본설정)",
  "type": "대외/내부 중 택1",
  "dept": "부서명",
  "manager": "담당자명",
  "phone": "전화번호 (정보가 없으면 빈문자열)",
  "subject": "일정 제목",
  "location": "장소",
  "attendees": "참석자 설명 (예: 행안부 3명, 지자체 5명 등)",
  "content": "일정 내용 설명"
}`;

    const payload = {
      contents: [{ parts: [{ text: `분석할 일정 문장: "${promptText}"` }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { 
        responseMimeType: "application/json"
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson.error?.message || `HTTP ${res.status}`);
    }

    const result = await res.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error("API가 비어있는 본문을 반환했습니다.");
    }

    const parsed = JSON.parse(rawText.trim());
    populateForm(parsed);

    document.getElementById("ai-banner-success").classList.remove("hidden");
  } catch (err) {
    console.error("Gemini API direct call failed:", err);
    document.getElementById("ai-error-text").innerText = `구문 분석 실패: ${err.message}. 직접 수동 입력해 주세요.`;
    document.getElementById("ai-banner-error").classList.remove("hidden");
  } finally {
    btn.disabled = false;
    btnText.innerText = "자연어 추출 및 화면 채우기";
  }
}

function populateForm(parsed) {
  if (parsed.startDate) document.getElementById("form-start-date").value = parsed.startDate;
  if (parsed.endDate) document.getElementById("form-end-date").value = parsed.endDate;
  if (parsed.time) document.getElementById("form-time").value = parsed.time;
  if (parsed.type) {
    const val = parsed.type;
    const opt = document.getElementById("form-type");
    if (["대외", "내부"].includes(val)) {
      opt.value = val;
    } else {
      opt.value = "대외";
    }
  }
  if (parsed.dept) document.getElementById("form-dept").value = parsed.dept;
  if (parsed.manager) document.getElementById("form-manager").value = parsed.manager;
  if (parsed.phone) document.getElementById("form-phone").value = parsed.phone;
  if (parsed.subject) document.getElementById("form-subject").value = parsed.subject;
  if (parsed.location) document.getElementById("form-location").value = parsed.location;
  if (parsed.attendees) document.getElementById("form-attendees").value = parsed.attendees;
  if (parsed.content) document.getElementById("form-content").value = parsed.content;
}

// HEURISTIC REGEX-BASED PARSER FALLBACK
function heuristicParse(text) {
  const result = {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    time: "09:00",
    type: "대외",
    dept: "디지털정부국",
    manager: "담당자",
    phone: "",
    subject: "핵심 주간 회의",
    location: "회의실",
    attendees: "",
    content: "보고서 구문 자동 파싱 완료"
  };

  const nameMatch = text.match(/([가-힣]{2,4})\s?(?:주무관|사무관|과장|팀장|담당|서기관|비서관|대표)/) || text.match(/([가-힣]{2,4})가\b/);
  if (nameMatch) {
    result.manager = nameMatch[1];
  } else {
    const matches = text.match(/[가-힣]{3}/g);
    if (matches && matches.length > 0) {
      result.manager = matches[0];
    }
  }

  if (text.includes("내부") || text.includes("회의") || text.includes("주간업무") || text.includes("보고회")) {
    result.type = "내부";
  } else {
    result.type = "대외";
  }

  const today = new Date();
  const year = today.getFullYear();
  const dateRegex = /(\d{1,2})월\s*(\d{1,2})일/;
  const matchDate = text.match(dateRegex);
  if (matchDate) {
    const month = String(matchDate[1]).padStart(2, '0');
    const day = String(matchDate[2]).padStart(2, '0');
    result.startDate = `${year}-${month}-${day}`;
    result.endDate = `${year}-${month}-${day}`;

    const durationMatch = text.match(/(\d+)\s*일\s*동안/) || text.match(/(\d+)일간/);
    if (durationMatch) {
      const days = parseInt(durationMatch[1], 10);
      const endD = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10) + days - 1);
      const endM = String(endD.getMonth() + 1).padStart(2, '0');
      const endDay = String(endD.getDate()).padStart(2, '0');
      result.endDate = `${year}-${endM}-${endDay}`;
    }
  }

  const timeRegex = /(\d{1,2})시\s*(\d{1,2})분?/ || /(\d{1,2}):(\d{2})/;
  const matchTime = text.match(timeRegex);
  if (matchTime) {
    const hour = String(matchTime[1]).padStart(2, '0');
    const min = matchTime[2] ? String(matchTime[2]).padStart(2, '0') : "00";
    result.time = `${hour}:${min}`;
  }

  const phoneMatch = text.match(/(\d{2,3}-\d{3,4}-\d{4})/);
  if (phoneMatch) {
    result.phone = phoneMatch[1];
  }

  const deptMatch = text.match(/\b([가-힣]{2,10}(?:과|실|본부|국|청|처|부))\b/);
  if (deptMatch) {
    result.dept = deptMatch[1];
  }

  const locMatch = text.match(/(?:에서|방문하여|소재)\s*([가-힣A-Za-z0-9\s]{2,12}(?:회의실|대강당|청사|도청|시청|구청|본부|지사|세미나실))/);
  if (locMatch) {
    result.location = locMatch[1].trim();
  }

  const attMatch = text.match(/(\d+명)/) || text.match(/([가-힣\s,]{2,15} 등\s*\d*명?)/);
  if (attMatch) {
    result.attendees = attMatch[1];
  }

  const subjectWords = text.replace(result.manager, "").replace(result.dept, "").replace(result.location, "");
  const subjectClean = subjectWords.match(/([가-힣\s]{4,30})(?:회의|진행|수행|보고|자문|교육|특강)/);
  if (subjectClean) {
    result.subject = subjectClean[1].trim();
  } else {
    result.subject = text.substring(0, 30) + "...";
  }

  return result;
}

// 10. ICAL MODAL CONTROLLER & ICS RFC 5545 PARSER
function openIcalModal() {
  document.getElementById("ical-modal").classList.remove("hidden");
}

function closeIcalModal() {
  document.getElementById("ical-modal").classList.add("hidden");
}

function switchIcalMethod(method) {
  icalMethod = method;
  const btnText = document.getElementById("btn-ical-method-text");
  const btnFile = document.getElementById("btn-ical-method-file");
  const conText = document.getElementById("ical-container-text");
  const conFile = document.getElementById("ical-container-file");

  if (method === "text") {
    btnText.className = "flex-1 py-1 rounded-md text-slate-700 bg-white shadow-xs";
    btnFile.className = "flex-1 py-1 rounded-md text-slate-500";
    conText.classList.remove("hidden");
    conFile.classList.add("hidden");
  } else {
    btnText.className = "flex-1 py-1 rounded-md text-slate-500";
    btnFile.className = "flex-1 py-1 rounded-md text-slate-700 bg-white shadow-xs";
    conText.classList.add("hidden");
    conFile.classList.remove("hidden");
  }
}

async function processIcalUpload() {
  let icsContent = "";

  if (icalMethod === "text") {
    icsContent = document.getElementById("ical-text-input").value.trim();
    if (!icsContent) {
      alert("ICS 파일 내용을 붙여넣어 주세요.");
      return;
    }
    parseAndMergeIcs(icsContent);
  } else {
    const fileInput = document.getElementById("ical-file-input");
    const file = fileInput.files[0];
    if (!file) {
      alert("ICS 파일을 업로드해 주세요.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
      icsContent = e.target.result;
      parseAndMergeIcs(icsContent);
    };
    reader.readAsText(file);
  }
}

function parseAndMergeIcs(icsText) {
  try {
    const events = [];
    const lines = icsText.split(/\r?\n/);
    let currentEvent = null;
    let insideEvent = false;

    // Helper: format 20261231 or 20261231T150000Z to YYYY-MM-DD
    const parseDateStr = (dStr) => {
      if (!dStr) return "";
      const match = dStr.match(/(\d{4})(\d{2})(\d{2})/);
      return match ? `${match[1]}-${match[2]}-${match[3]}` : dStr;
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Handle folder line concatenation
      while (i + 1 < lines.length && (lines[i + 1].startsWith(" ") || lines[i + 1].startsWith("\t"))) {
        line += lines[i + 1].substring(1);
        i++;
      }

      const cleanLine = line.trim();

      if (cleanLine === "BEGIN:VEVENT") {
        insideEvent = true;
        currentEvent = {};
      } else if (cleanLine === "END:VEVENT") {
        if (insideEvent && currentEvent) {
          const subject = currentEvent.summary || "무제 일정";
          const start = currentEvent.dtstart || "";
          const end = currentEvent.dtend || start;

          events.push({
            id: 'ical_' + Math.random().toString(36).substring(2, 7),
            startDate: parseDateStr(start),
            endDate: parseDateStr(end),
            time: "09:00",
            type: subject.includes("회의") || subject.includes("내부") ? "내부" : "대외",
            dept: "캘린더 연동처",
            manager: "외부 연동 일시",
            phone: "",
            subject: subject,
            location: currentEvent.location || "기록 참고",
            attendees: "",
            content: currentEvent.description || "iCal 동기화 연동 일정 데이터"
          });
        }
        insideEvent = false;
        currentEvent = null;
      } else if (insideEvent && currentEvent) {
        if (cleanLine.startsWith("SUMMARY:")) {
          currentEvent.summary = cleanLine.substring(8);
        } else if (cleanLine.startsWith("DTSTART")) {
          const parts = cleanLine.split(":");
          currentEvent.dtstart = parts.length > 1 ? parts[1] : "";
        } else if (cleanLine.startsWith("DTEND")) {
          const parts = cleanLine.split(":");
          currentEvent.dtend = parts.length > 1 ? parts[1] : "";
        } else if (cleanLine.startsWith("DESCRIPTION:")) {
          currentEvent.description = cleanLine.substring(12);
        } else if (cleanLine.startsWith("LOCATION:")) {
          currentEvent.location = cleanLine.substring(9);
        }
      }
    }

    if (events.length === 0) {
      alert("추출할 수 있는 유효한 일정(VEVENT) 데이터를 찾지 못했습니다.");
      return;
    }

    if (confirm(`${events.length}개의 일정을 확인하였습니다! 로컬 데이터와 일괄 병합하시겠습니까?`)) {
      activities = [...events, ...activities];
      saveDatabase();
      alert("iCal 일정 연동 및 병합 처리가 완료되었습니다!");
      
      // Reset controls
      document.getElementById("ical-text-input").value = "";
      document.getElementById("ical-file-input").value = "";
      closeIcalModal();
      renderMainApp();
    }
  } catch (err) {
    alert("iCal 파싱 구문 해석 실패: " + err.message);
  }
}

// 12. REPORT GENERATOR PANEL CONTROLLER
let reportQueriedActivities = [];
let latestReportBlob = null;
let latestReportFilename = "";

function toggleReportPanel() {
  const panel = document.getElementById("report-panel");
  const backdrop = document.getElementById("report-panel-backdrop");
  const isOpen = !panel.classList.contains("translate-x-full");
  
  if (isOpen) {
    closeReportPanel();
  } else {
    panel.classList.remove("translate-x-full");
    backdrop.classList.remove("hidden");
    populateReportDeptFilter();
    handleReportTypeChange();
    lucide.createIcons();
  }
}

function closeReportPanel() {
  document.getElementById("report-panel").classList.add("translate-x-full");
  document.getElementById("report-panel-backdrop").classList.add("hidden");
}

function populateReportDeptFilter() {
  const select = document.getElementById("report-dept-filter");
  const currentVal = select.value;
  select.innerHTML = '<option value="">전체 부서</option>';
  
  // Extract unique dept names from all activities
  const depts = [...new Set(activities.map(a => (a.dept || "").trim()).filter(d => d))];
  depts.sort();
  depts.forEach(dept => {
    const opt = document.createElement("option");
    opt.value = dept;
    opt.textContent = dept;
    if (dept === currentVal) opt.selected = true;
    select.appendChild(opt);
  });
}

function handleReportTypeChange() {
  const type = document.getElementById("report-query-type").value;
  const presetContainer = document.getElementById("report-period-preset-container");
  const customContainer = document.getElementById("report-period-custom-container");

  if (type === "custom") {
    presetContainer.classList.add("hidden");
    customContainer.classList.remove("hidden");
  } else {
    presetContainer.classList.remove("hidden");
    customContainer.classList.add("hidden");
    updateReportPeriodOptions();
  }
  
  // Hide previous results when type changes
  document.getElementById("report-preview-container").classList.add("hidden");
  document.getElementById("report-download-section").classList.add("hidden");
}

function updateReportPeriodOptions() {
  const type = document.getElementById("report-query-type").value;
  const select = document.getElementById("report-period");
  select.innerHTML = "";

  const now = new Date();
  
  if (type === "weekly") {
    // Generate past 4 weeks + current week + future 4 weeks (total 9 weeks)
    const weekOptions = [];
    for (let i = -4; i <= 4; i++) {
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1 + (i * 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const startStr = formatDateStr(monday);
      const endStr = formatDateStr(sunday);
      const label = i === 0 ? `${startStr} ~ ${endStr} (이번 주)` : `${startStr} ~ ${endStr}`;
      weekOptions.push({ value: `${startStr}|${endStr}`, label, isCurrent: i === 0 });
    }
    weekOptions.forEach(opt => {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      if (opt.isCurrent) el.selected = true;
      select.appendChild(el);
    });
  } else if (type === "monthly") {
    // Generate last 6 months as selectable periods
    for (let i = 0; i < 6; i++) {
      const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0);
      const startStr = formatDateStr(target);
      const endStr = formatDateStr(lastDay);
      const opt = document.createElement("option");
      opt.value = `${startStr}|${endStr}`;
      opt.textContent = `${target.getFullYear()}년 ${target.getMonth() + 1}월`;
      select.appendChild(opt);
    }
  }
}

function formatDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getReportPeriod() {
  const type = document.getElementById("report-query-type").value;
  
  if (type === "custom") {
    const startStr = document.getElementById("report-custom-start").value;
    const endStr = document.getElementById("report-custom-end").value;
    if (!startStr || !endStr) {
      alert("시작일과 종료일을 모두 선택해 주세요.");
      return null;
    }
    if (startStr > endStr) {
      alert("시작일이 종료일보다 늦을 수 없습니다.");
      return null;
    }
    return { startStr, endStr };
  } else {
    const periodVal = document.getElementById("report-period").value;
    if (!periodVal) {
      alert("기간을 선택해 주세요.");
      return null;
    }
    const [startStr, endStr] = periodVal.split("|");
    return { startStr, endStr };
  }
}

function executeReportQuery() {
  const period = getReportPeriod();
  if (!period) return;
  const { startStr, endStr } = period;
  const deptFilter = (document.getElementById("report-dept-filter")?.value || "").trim();
  const attendeeFilter = (document.getElementById("report-attendee-filter")?.value || "").trim().toLowerCase();

  reportQueriedActivities = activities.filter(act => {
    const d = safeParseDate(act.startDate);
    if (!d) return false;
    const ds = formatDateStr(d);
    if (ds < startStr || ds > endStr) return false;
    
    if (deptFilter && (act.dept || "").trim() !== deptFilter) return false;
    
    if (attendeeFilter) {
      const searchTarget = `${act.manager} ${act.attendees} ${act.dept}`.toLowerCase();
      if (!searchTarget.includes(attendeeFilter)) return false;
    }
    return true;
  });

  // Sort by date ascending
  reportQueriedActivities.sort((a, b) => {
    const da = safeParseDate(a.startDate)?.getTime() || 0;
    const db = safeParseDate(b.startDate)?.getTime() || 0;
    return da - db;
  });

  // Show preview
  const container = document.getElementById("report-preview-container");
  const list = document.getElementById("report-preview-list");
  const countEl = document.getElementById("report-preview-count");
  const downloadSection = document.getElementById("report-download-section");

  container.classList.remove("hidden");

  if (reportQueriedActivities.length === 0) {
    list.innerHTML = `<p class="text-slate-400 text-center py-4">해당 기간에 조회된 일정이 없습니다.</p>`;
    downloadSection.classList.add("hidden");
  } else {
    list.innerHTML = reportQueriedActivities.map(act => {
      const typeColor = act.type === "대외" ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400";
      return `<div class="flex items-center gap-2 py-1 border-b border-slate-100 dark:border-[#1f2937] last:border-0">
        <span class="text-[10px] font-bold ${typeColor} w-6 shrink-0">${act.type || ''}</span>
        <span class="text-slate-500 dark:text-slate-400 font-mono text-[10px] w-20 shrink-0">${act.startDate || ''}</span>
        <span class="truncate font-semibold text-slate-800 dark:text-slate-200">[${act.dept || ''}] ${act.subject || ''}</span>
      </div>`;
    }).join("");
    
    // Show download section
    downloadSection.classList.remove("hidden");
    
    // Auto-fill output filename based on query type
    const type = document.getElementById("report-query-type").value;
    const fnTypeLabel = type === "weekly" ? "주간" : type === "monthly" ? "월간" : "기간별";
    const filenameInput = document.getElementById("report-output-filename");
    filenameInput.value = `${startStr.replace(/-/g, '_')}_${fnTypeLabel}보고서.hwpx`;
  }

  countEl.innerText = `총 ${reportQueriedActivities.length}건 조회됨`;
  lucide.createIcons();
}

async function generateHwpxReport() {
  if (reportQueriedActivities.length === 0) {
    alert("먼저 '일정 조회하기'를 실행하여 보고서에 포함할 일정을 조회해 주세요.");
    return;
  }

  const queryType = document.getElementById("report-query-type").value;
  const period = getReportPeriod();
  if (!period) return;
  const { startStr, endStr } = period;
  const customFilename = document.getElementById("report-output-filename").value.trim();
  const typeLabel = queryType === "weekly" ? "주간" : queryType === "monthly" ? "월간" : "기간별";
  const templateFile = document.getElementById("report-template-file").files[0];
  const selectedDept = (document.getElementById("report-dept-filter")?.value || "").trim();

  // Format period display for the header cells
  const periodStartDisplay = `(${startStr.substring(5).replace('-', '. ')}.`;
  const periodEndDisplay = `${endStr.substring(5).replace('-', '. ')}.)`;
  // ───────────────────────────────────────────────
  // CASE 1: HWPX Template
  // ───────────────────────────────────────────────
  if (templateFile && templateFile.name.endsWith(".hwpx")) {
    try {
      const templateZip = await JSZip.loadAsync(templateFile);
      let totalReplacements = 0;
      let foundFields = new Set();

      // Group activities by department
      let deptGroups;
      if (selectedDept) {
        // Single department selected
        deptGroups = [{ dept: selectedDept, acts: reportQueriedActivities }];
      } else {
        // "전체 부서" → group by dept, each gets its own page
        const deptMap = {};
        reportQueriedActivities.forEach(act => {
          const d = (act.dept || "미지정").trim();
          if (!deptMap[d]) deptMap[d] = [];
          deptMap[d].push(act);
        });
        deptGroups = Object.entries(deptMap).map(([dept, acts]) => ({ dept, acts }));
      }

      // Read original section0.xml as the master template
      let masterContent = null;
      let sectionFileName = null;
      const fileNames = Object.keys(templateZip.files);
      for (const fn of fileNames) {
        if (fn.includes("section") && fn.endsWith(".xml")) {
          masterContent = await templateZip.files[fn].async("string");
          sectionFileName = fn;
          break;
        }
      }

      if (!masterContent || !sectionFileName) {
        alert("HWPX 템플릿에서 section XML을 찾지 못했습니다.");
        return;
      }

      // For multiple departments, we'll build the full content by repeating the table for each dept
      let finalContent = masterContent;
      const blockStartMarker = 'name="번호"';
      const blockEndMarker = '등등,,,';

      // Find the ENTIRE table (from <hp:tbl to </hp:tbl>) that contains the repeating block
      const tblStart = masterContent.lastIndexOf('<hp:tbl', masterContent.indexOf(blockStartMarker));
      const tblEnd = masterContent.indexOf('</hp:tbl>', masterContent.indexOf(blockEndMarker));
      const tblEndFull = tblEnd !== -1 ? tblEnd + '</hp:tbl>'.length : -1;

      if (tblStart !== -1 && tblEndFull !== -1) {
        const masterTable = masterContent.substring(tblStart, tblEndFull);
        
        let allTablesOutput = "";

        deptGroups.forEach((group, groupIdx) => {
          let tableXml = masterTable;

          // ─── Replace header cells for this department ───
          const cellReplacements = {
            "부서": group.dept,
            "시작일": periodStartDisplay,
            "종료일": periodEndDisplay,
            "조회 타입": typeLabel + "업무",
          };
          
          for (const [cellName, cellValue] of Object.entries(cellReplacements)) {
            // Find tc with this name, then replace the first <hp:t>...</hp:t> inside it
            const tcMarker = `name="${cellName}"`;
            const tcIdx = tableXml.indexOf(tcMarker);
            if (tcIdx !== -1) {
              const tStart = tableXml.indexOf('<hp:t>', tcIdx);
              const tEnd = tableXml.indexOf('</hp:t>', tStart);
              if (tStart !== -1 && tEnd !== -1) {
                tableXml = tableXml.substring(0, tStart + '<hp:t>'.length) + escapeXml(cellValue) + tableXml.substring(tEnd);
                totalReplacements++;
                foundFields.add(`셀:${cellName}`);
              }
            }
          }

          // ─── Find and replace the repeating block inside this table ───
          if (tableXml.includes(blockStartMarker) && tableXml.includes(blockEndMarker)) {
            const fieldIdx = tableXml.indexOf(blockStartMarker);
            let pStart = tableXml.lastIndexOf('<hp:p ', fieldIdx);
            const etcIdx = tableXml.indexOf(blockEndMarker);
            let pEnd = tableXml.indexOf('</hp:p>', etcIdx);
            if (pEnd !== -1) pEnd += '</hp:p>'.length;

            if (pStart !== -1 && pEnd !== -1 && pStart < pEnd) {
              const templateBlock = tableXml.substring(pStart, pEnd);

              // Split into 내부 and 대외 within this dept group
              const internalActs = group.acts.filter(a => String(a.type).trim() !== "대외");
              const externalActs = group.acts.filter(a => String(a.type).trim() === "대외");

              let allBlocks = "";
              let globalNum = 1;
              const idOffset = groupIdx * 10000;

              // Helper to fill one block
              // Helper: build date display string
              function buildDateDisplay(act) {
                let dateStr = act.startDate || "";
                if (act.endDate && act.endDate !== act.startDate) {
                  dateStr += "~" + act.endDate;
                }
                const timeStr = formatDisplayTime(act.time);
                if (timeStr && timeStr !== "00:00") {
                  dateStr += " " + timeStr;
                }
                return dateStr;
              }

              // Helper: empty paragraph for spacing between items
              const spacerP = `<hp:p id="0" paraPrIDRef="77" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="60"/><hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1300" textheight="1300" baseline="1105" spacing="428" horzpos="0" horzsize="46604" flags="393216"/></hp:linesegarray></hp:p>`;

              function fillBlock(block, act, num, hideNumber) {
                const dateDisplay = buildDateDisplay(act);
                
                // CRITICAL: Replace 번호 by directly finding the original "<hp:t>1</hp:t>" value
                // in the 번호 field and the ". " that follows it, then merge into 제목
                // The template has: [번호 field]<hp:t>1</hp:t>[fieldEnd]<hp:t>. </hp:t>[제목 field]<hp:t>제목</hp:t>
                // We want: [번호 field]<hp:t>N</hp:t>[fieldEnd]<hp:t>. </hp:t>[제목 field]<hp:t>실제제목</hp:t>
                
                // Step 1: Replace the 번호 field's <hp:t>1</hp:t> with the actual number
                // Find the exact pattern in the original template: after 번호's fieldBegin close, <hp:t>1</hp:t>
                const numValue = hideNumber ? " " : String(num);
                
                // Direct string replacement: find "</hp:fieldBegin></hp:ctrl><hp:t>1</hp:t>" and replace the "1"
                const origNumPattern = '</hp:fieldBegin></hp:ctrl><hp:t>1</hp:t>';
                const newNumPattern = `</hp:fieldBegin></hp:ctrl><hp:t>${escapeXml(numValue)}</hp:t>`;
                if (block.includes(origNumPattern)) {
                  block = block.replace(origNumPattern, newNumPattern);
                  foundFields.add("번호");
                  totalReplacements++;
                }
                
                // Step 2: Replace other fields normally
                const fields = {
                  "제목": act.subject || "",
                  "담당자": act.manager || "",
                  "내용": act.content || "",
                  "장소": act.location || "",
                  "시작일": dateDisplay,
                  "참석자": act.attendees || "",
                };
                
                for (const [fn, fv] of Object.entries(fields)) {
                  block = replaceHwpxField(block, fn, fv);
                  if (fv.trim()) {
                    foundFields.add(fn);
                    totalReplacements++;
                  }
                }
                // Remove "등등,,,"
                block = block.replace(/<hp:p[^>]*>[^<]*<hp:run[^>]*><hp:t>[^<]*등등[^<]*<\/hp:t>.*?<\/hp:p>/g, '');
                // Remove empty-value lines
                const emptyCheck = ["장소", "참석자", "내용", "시작일"];
                for (const fn of emptyCheck) {
                  if (!fields[fn]) {
                    block = block.replace(new RegExp(`<hp:p[^>]*>(?:(?!</hp:p>).)*name="${escapeRegex(fn)}"(?:(?!</hp:p>).)*</hp:p>`, 'gs'), '');
                  }
                }
                // Unique IDs
                const offset = idOffset + num * 100;
                block = block.replace(/id="(\d+)"/g, (m, id) => `id="${parseInt(id) + offset}"`);
                block = block.replace(/beginIDRef="(\d+)"/g, (m, id) => `beginIDRef="${parseInt(id) + offset}"`);
                return block;
              }

              // 내부 activities
              internalActs.forEach((act, idx) => {
                if (idx > 0) allBlocks += spacerP; // Spacing between items
                allBlocks += fillBlock(templateBlock, act, globalNum, false);
                globalNum++;
              });

              // 대외 activities - same format as internal, appended after
              externalActs.forEach((act, idx) => {
                if (internalActs.length > 0 || idx > 0) allBlocks += spacerP; // Spacing between items
                allBlocks += fillBlock(templateBlock, act, globalNum, false);
                globalNum++;
              });

              tableXml = tableXml.substring(0, pStart) + allBlocks + tableXml.substring(pEnd);
            }
          }

          // ─── Remove the static "대내외 협력 및 성과확산" template section ───
          // Always remove - if external acts exist, it was dynamically generated above
          const staticSectionRegex = /<hp:p[^>]*>[^<]*<hp:run[^>]*><hp:t>[^<]*대내외 협력[^<]*<\/hp:t>.*?<\/hp:p>/gs;
          tableXml = tableXml.replace(staticSectionRegex, '');
          tableXml = tableXml.replace(/<hp:p[^>]*>(?:(?!<\/hp:p>).)*❍ 제목(?:(?!<\/hp:p>).)*<\/hp:p>/gs, '');
          tableXml = tableXml.replace(/<hp:p[^>]*>(?:(?!<\/hp:p>).)*\* 내용(?:(?!<\/hp:p>).)*<\/hp:p>/gs, '');
          tableXml = tableXml.replace(/<hp:p[^>]*>(?:(?!<\/hp:p>).)*\* 등등(?:(?!<\/hp:p>).)*<\/hp:p>/gs, '');

          // Add page break before each department table (except the first)
          if (groupIdx > 0) {
            allTablesOutput += `<hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="1" columnBreak="0" merged="0"><hp:linesegarray><hp:lineseg textpos="0" vertpos="0" vertsize="1000" textheight="1000" baseline="850" spacing="600" horzpos="0" horzsize="0" flags="393216"/></hp:linesegarray></hp:p>`;
          }
          allTablesOutput += tableXml;
        });

        // Replace original table in master content with all department tables
        finalContent = masterContent.substring(0, tblStart) + allTablesOutput + masterContent.substring(tblEndFull);
      }

      // ─── Replace any remaining header CLICK_HERE fields ───
      const headerClickFields = {
        "기간": `${startStr} ~ ${endStr}`,
        "조회타입": typeLabel,
        "총건수": String(reportQueriedActivities.length),
        "생성일": formatDateStr(new Date()),
      };
      for (const [fn, fv] of Object.entries(headerClickFields)) {
        const newFinal = replaceHwpxField(finalContent, fn, fv);
        if (newFinal !== finalContent) {
          finalContent = newFinal;
          totalReplacements++;
          foundFields.add(fn);
        }
      }

      // Write back to ZIP
      templateZip.file(sectionFileName, finalContent);

      const outputBlob = await templateZip.generateAsync({ type: "blob", mimeType: "application/octet-stream" });
      const defaultFilename = customFilename || `${startStr.replace(/-/g, '_')}_${typeLabel}보고서.hwpx`;

      latestReportBlob = outputBlob;
      latestReportFilename = defaultFilename;
      triggerBlobDownload(outputBlob, defaultFilename);

      // No alert popup - just download silently

    } catch (err) {
      console.error("HWPX template processing failed:", err);
      alert("HWPX 템플릿 처리 중 오류: " + err.message + "\n\n기본 텍스트 보고서로 대체 생성합니다.");
      generateTextReport(startStr, endStr, typeLabel, customFilename);
    }
    return;
  }

  // ───────────────────────────────────────────────
  // CASE 2: No user template uploaded → Try to load default built-in template
  // ───────────────────────────────────────────────
  try {
    const defaultTemplateRes = await fetch('결과보고 양식_v2.hwpx');
    if (defaultTemplateRes.ok) {
      const defaultBlob = await defaultTemplateRes.blob();
      // Create a synthetic File object and re-trigger with the default template
      const defaultFile = new File([defaultBlob], '결과보고 양식_v2.hwpx');
      
      // Temporarily set the template file input
      const dt = new DataTransfer();
      dt.items.add(defaultFile);
      document.getElementById("report-template-file").files = dt.files;
      
      // Re-call this function (now templateFile will be set)
      return generateHwpxReport();
    }
  } catch (e) {
    console.log("Default template not available, falling back to text report");
  }
  
  generateTextReport(startStr, endStr, typeLabel, customFilename);
}

// Replace a HWPX CLICK_HERE field value using safe string-based search
function replaceHwpxField(xml, fieldName, newValue) {
  let result = xml;
  let searchFrom = 0;
  const escapedValue = escapeXml(newValue);
  
  while (true) {
    // Find: type="CLICK_HERE" name="fieldName" (the actual field declaration)
    const searchStr = `type="CLICK_HERE" name="${fieldName}"`;
    const fieldIdx = result.indexOf(searchStr, searchFrom);
    if (fieldIdx === -1) break;
    
    // Find the closing </hp:fieldBegin></hp:ctrl> after this field
    const closeTag = '</hp:fieldBegin></hp:ctrl>';
    const fieldBeginClose = result.indexOf(closeTag, fieldIdx);
    if (fieldBeginClose === -1) break;
    const afterClose = fieldBeginClose + closeTag.length;
    
    // Find the next <hp:t> tag after the field close (should be within ~10 chars)
    const tOpenTag = '<hp:t>';
    const tCloseTag = '</hp:t>';
    const tStart = result.indexOf(tOpenTag, afterClose);
    if (tStart === -1 || tStart > afterClose + 10) {
      searchFrom = afterClose;
      continue;
    }
    const tEnd = result.indexOf(tCloseTag, tStart);
    if (tEnd === -1) break;
    
    // Replace the content between <hp:t> and </hp:t>
    result = result.substring(0, tStart + tOpenTag.length) + escapedValue + result.substring(tEnd);
    searchFrom = tStart + tOpenTag.length + escapedValue.length + tCloseTag.length;
  }
  
  return result;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Preview report as text in the panel
function previewReport() {
  if (reportQueriedActivities.length === 0) {
    alert("먼저 '일정 조회하기'를 실행해 주세요.");
    return;
  }
  const period = getReportPeriod();
  if (!period) return;
  const { startStr, endStr } = period;
  const queryType = document.getElementById("report-query-type").value;
  const typeLabel = queryType === "weekly" ? "주간" : queryType === "monthly" ? "월간" : "기간별";
  const selectedDept = (document.getElementById("report-dept-filter")?.value || "").trim();

  // Group by dept
  let deptGroups;
  if (selectedDept) {
    deptGroups = [{ dept: selectedDept, acts: reportQueriedActivities }];
  } else {
    const deptMap = {};
    reportQueriedActivities.forEach(act => {
      const d = (act.dept || "미지정").trim();
      if (!deptMap[d]) deptMap[d] = [];
      deptMap[d].push(act);
    });
    deptGroups = Object.entries(deptMap).map(([dept, acts]) => ({ dept, acts }));
  }

  let preview = "";
  deptGroups.forEach((group, gi) => {
    if (gi > 0) preview += "\n━━━━━━━━━━━━━━━━━━━━━ (페이지 구분) ━━━━━━━━━━━━━━━━━━━━━\n\n";
    const periodDisp = `(${startStr.substring(5).replace('-', '. ')}. ~ ${endStr.substring(5).replace('-', '. ')}.)`;
    preview += `${group.dept}  ${periodDisp}  ${typeLabel}업무\n\n`;

    const internalActs = group.acts.filter(a => String(a.type).trim() !== "대외");
    const externalActs = group.acts.filter(a => String(a.type).trim() === "대외");
    let num = 1;

    internalActs.forEach(act => {
      preview += `${num}. ${act.subject || ""}(${act.manager || ""})\n`;
      if (act.content) preview += `  ❍ ${act.content}\n`;
      if (act.location) preview += `    * 장 소: ${act.location}\n`;
      let dateDisp = act.startDate || "";
      if (act.endDate && act.endDate !== act.startDate) dateDisp += "~" + act.endDate;
      const timeDisp = formatDisplayTime(act.time);
      if (timeDisp) dateDisp += " " + timeDisp;
      if (dateDisp) preview += `    * 일 정: ${dateDisp}\n`;
      if (act.attendees) preview += `    * 참석자: ${act.attendees}\n`;
      preview += "\n";
      num++;
    });

    externalActs.forEach(act => {
      preview += `${num}. ${act.subject || ""}(${act.manager || ""})\n`;
      if (act.content) preview += `  ❍ ${act.content}\n`;
      if (act.location) preview += `    * 장 소: ${act.location}\n`;
      let dateDisp = act.startDate || "";
      if (act.endDate && act.endDate !== act.startDate) dateDisp += "~" + act.endDate;
      const timeDisp = formatDisplayTime(act.time);
      if (timeDisp) dateDisp += " " + timeDisp;
      if (dateDisp) preview += `    * 일 정: ${dateDisp}\n`;
      if (act.attendees) preview += `    * 참석자: ${act.attendees}\n`;
      preview += "\n";
      num++;
    });
  });

  // Show in popup modal
  const badge = document.getElementById("preview-modal-badge");
  badge.textContent = `${typeLabel} · ${reportQueriedActivities.length}건 · ${deptGroups.length}개 부서`;
  
  document.getElementById("report-preview-text-content").textContent = preview;
  document.getElementById("report-preview-modal").classList.remove("hidden");
  lucide.createIcons();
}

function closePreviewModal() {
  document.getElementById("report-preview-modal").classList.add("hidden");
}

function generateTextReport(startStr, endStr, typeLabel, customFilename) {
  let reportContent = "";
  reportContent += `=====================================\n`;
  reportContent += `  ${typeLabel} 일정 보고서\n`;
  reportContent += `  기간: ${startStr} ~ ${endStr}\n`;
  reportContent += `  생성일시: ${new Date().toLocaleString("ko-KR")}\n`;
  reportContent += `  총 ${reportQueriedActivities.length}건\n`;
  reportContent += `=====================================\n\n`;

  reportContent += `번호\t시작일\t종료일\t시간\t유형\t부서\t담당자\t전화번호\t제목\t장소\t참석자\t내용\n`;
  reportContent += `─────────────────────────────────────────────────────\n`;

  reportQueriedActivities.forEach((act, idx) => {
    reportContent += `${idx + 1}\t${act.startDate}\t${act.endDate || act.startDate}\t${formatDisplayTime(act.time)}\t${act.type}\t${act.dept}\t${act.manager}\t${act.phone}\t${act.subject}\t${act.location}\t${act.attendees}\t${act.content}\n`;
  });

  reportContent += `\n─────────────────────────────────────────────────────\n`;
  reportContent += `[끝] 이상 ${reportQueriedActivities.length}건의 보고 일정입니다.\n`;

  const defaultFilename = customFilename || `${startStr.replace(/-/g, '_')}_${typeLabel}보고서.txt`;
  const blob = new Blob(["\uFEFF" + reportContent], { type: "text/plain;charset=utf-8;" });
  
  latestReportBlob = blob;
  latestReportFilename = defaultFilename;

  triggerBlobDownload(blob, defaultFilename);
  // No alert - silent download
}

function downloadLatestReport() {
  if (!latestReportBlob) {
    alert("아직 생성된 보고서가 없습니다.");
    return;
  }
  const url = URL.createObjectURL(latestReportBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = latestReportFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 13. DARK/LIGHT THEME CONTROLLER
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("standalone_theme", isDark ? "dark" : "light");
  updateThemeIcons(isDark);
  
  // Force a re-render to repaint all dynamically generated elements with new dark/light classes!
  renderMainApp();
}

function updateThemeIcons(isDark) {
  const sun = document.getElementById("theme-icon-sun");
  const moon = document.getElementById("theme-icon-moon");
  if (isDark) {
    sun.classList.add("hidden");
    moon.classList.remove("hidden");
  } else {
    sun.classList.remove("hidden");
    moon.classList.add("hidden");
  }
}

function loadThemePreference() {
  const savedTheme = localStorage.getItem("standalone_theme");
  const isSystemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const useDark = savedTheme === "dark" || (!savedTheme && isSystemDark);

  if (useDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  updateThemeIcons(useDark);
}

// 14. INITIALIZATION EVENT TRIGGER
function refreshData() {
  initDatabase();
  renderMainApp();
}

window.onload = function() {
  loadThemePreference();
  initDatabase();
  renderMainApp();
};
