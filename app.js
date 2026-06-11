// Standalone Client-Side Application Logic for Expert Activity Tracker (User Version)

// 1. DEFAULT SEED DATA
const DEFAULT_ACTIVITIES = [
  {
    id: "act_init1",
    startDate: "2026-06-09",
    endDate: "2026-06-11",
    type: "자문/컨설팅",
    name: "김민재",
    org: "한국지능정보사회진흥원",
    subject: "AI 행정 혁신 구축 기술 표준 자문",
    targetOrg: "행정안전부",
    attendees: "12명",
    memo: "클라우드 기반 협업 도구 설계 가이드라인 제공",
    createdAt: "2026-06-09T09:00:00.000Z"
  },
  {
    id: "act_init2",
    startDate: "2026-06-10",
    endDate: "2026-06-10",
    type: "강의",
    name: "박서연",
    org: "서울대학교",
    subject: "생성형 AI 시대의 전문 행정 전략 특강",
    targetOrg: "중앙공무원교육원",
    attendees: "50명",
    memo: "공무원 혁신 역량 강화 비대면 원격 교육",
    createdAt: "2026-06-10T10:30:00.000Z"
  },
  {
    id: "act_init3",
    startDate: "2026-06-11",
    endDate: "2026-06-12",
    type: "평가/심사",
    name: "이승우",
    org: "소방청",
    subject: "2026 국가 소방 안전 디지털 플랫폼 기술 평가",
    targetOrg: "한국정보통신협회",
    attendees: "7명",
    memo: "제1회의실 현장 대면 심사 진행",
    createdAt: "2026-06-11T14:00:00.000Z"
  }
];

// 2. STATE STORAGE MANAGEMENT
let activities = [];
let viewMode = "list";
let searchTerm = "";
let typeFilter = "전체";
let currentCalendarDate = new Date(2026, 5, 11); // June 11, 2026
let selectedActivity = null;
let icalMethod = "text"; // "text" or "file"

// Initialize database
function initDatabase() {
  const localData = localStorage.getItem("standalone_activities");
  if (localData) {
    try {
      activities = JSON.parse(localData);
    } catch (e) {
      console.error("Failed to parse localStorage data, seeding default instead", e);
      activities = [...DEFAULT_ACTIVITIES];
      saveDatabase();
    }
  } else {
    activities = [...DEFAULT_ACTIVITIES];
    saveDatabase();
  }
}

function saveDatabase() {
  localStorage.setItem("standalone_activities", JSON.stringify(activities));
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

  if (viewMode === "list") {
    renderListView(filtered);
  } else {
    renderCalendarView(filtered);
  }
  
  // Re-instantiate icons
  lucide.createIcons();
}

function calculateKPIs() {
  const total = activities.length;
  const eduCount = activities.filter(a => a.type === "교육" || a.type === "강의").length;
  const consultCount = activities.filter(a => a.type === "자문/컨설팅").length;
  const auditCount = activities.filter(a => a.type === "평가/심사" || a.type === "연구" || a.type === "회의").length;

  document.getElementById("kpi-total").innerText = `${total}건`;
  
  const eduRatio = total > 0 ? Math.round((eduCount / total) * 100) : 0;
  document.getElementById("kpi-edu-ratio").innerHTML = `${eduRatio}% <span class="text-[10px] text-slate-400 font-normal ml-1">(${eduCount}건)</span>`;
  
  document.getElementById("kpi-consult").innerText = `${consultCount}건`;
  document.getElementById("kpi-audit").innerText = `${auditCount}건`;
}

function filterActivitiesList() {
  return activities.filter(act => {
    const typeMatch = typeFilter === "전체" || act.type === typeFilter;
    const cleanSearch = searchTerm.toLowerCase().trim();
    if (!cleanSearch) return typeMatch;

    const targetStr = `${act.name} ${act.org} ${act.subject} ${act.targetOrg} ${act.memo}`.toLowerCase();
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
    btnList.className = "p-1 rounded-md transition-all bg-white text-blue-600 shadow-xs font-bold";
    btnCal.className = "p-1 rounded-md transition-all text-slate-500 hover:text-slate-800";
    listContainer.classList.remove("hidden");
    calContainer.classList.add("hidden");
    viewTitle.innerText = "활동기록 리스트현황";
  } else {
    btnList.className = "p-1 rounded-md transition-all text-slate-500 hover:text-slate-800";
    btnCal.className = "p-1 rounded-md transition-all bg-white text-blue-600 shadow-xs font-bold";
    listContainer.classList.add("hidden");
    calContainer.classList.remove("hidden");
    viewTitle.innerText = "활동기록 캘린더현황";
    closeCalendarDetails();
  }

  renderMainApp();
}

// 4. RENDER LIST VIEW CARD
function renderListView(filtered) {
  const container = document.getElementById("view-list-container");
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 space-y-2 select-none">
        <i data-lucide="calendar" class="w-10 h-10 mx-auto text-slate-300"></i>
        <p class="text-xs font-semibold">조건에 일치하는 전문인재 활동 기록이 없습니다.</p>
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
    const isEdu = act.type === "교육" || act.type === "강의";
    const isConsult = act.type === "자문/컨설팅";
    const isAudit = act.type === "평가/심사" || act.type === "연구";
    
    const borderClass = isEdu 
      ? "border-l-blue-500" 
      : isConsult 
        ? "border-l-indigo-500" 
        : isAudit 
          ? "border-l-amber-500" 
          : "border-l-slate-400";

    const badgeClass = isEdu 
      ? "bg-blue-100 text-blue-800" 
      : isConsult 
        ? "bg-indigo-100 text-indigo-800" 
        : isAudit 
          ? "bg-amber-100 text-amber-800" 
          : "bg-slate-100 text-slate-700";

    return `
      <div class="border border-slate-200 rounded-xl p-4 flex gap-4 bg-white hover:shadow-md hover:border-slate-300 transition-all border-l-4 ${borderClass} animate-fade-in text-left">
        <div class="flex-1 space-y-2">
          
          <!-- Meta Info -->
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeClass}">
              ${act.type}
            </span>
            <div class="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
              <i data-lucide="calendar" class="w-3 h-3 text-slate-400"></i>
              <span>${act.startDate}</span>
              ${act.endDate && act.endDate !== act.startDate ? `
                <span>~</span>
                <span>${act.endDate}</span>
              ` : ''}
            </div>
          </div>

          <!-- Title -->
          <div>
            <h4 class="font-bold text-slate-800 text-[14px]">
              <span class="text-blue-600 font-semibold mr-1">[${act.name}]</span> ${act.subject}
            </h4>
          </div>

          <!-- Details Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2 rounded-lg text-xs text-slate-600 font-medium">
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 text-[10px] w-12 shrink-0">💼 소속</span>
              <span class="truncate text-slate-700">${act.org}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 text-[10px] w-12 shrink-0">🏢 대상기관</span>
              <span class="truncate text-slate-700">${act.targetOrg || '없음'}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 text-[10px] w-12 shrink-0">👥 참석인원</span>
              <span class="truncate text-slate-700">${act.attendees || '없음'}</span>
            </div>
          </div>

          <!-- Memo -->
          ${act.memo ? `
            <p class="text-slate-500 text-[11px] bg-white border border-slate-100 p-2 rounded-lg italic">
              💡 ${act.memo}
            </p>
          ` : ''}

        </div>

        <!-- Delete Action -->
        <div class="flex flex-col justify-center border-l border-slate-100 pl-3 select-none">
          <button
            type="button"
            onclick="deleteActivity('${act.id}')"
            class="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition active:scale-95 cursor-pointer"
            title="활동 삭제"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>

      </div>
    `;
  }).join("");
}

// Delete Handler
function deleteActivity(id) {
  if (!confirm("해당 전문인재 일정을 데이터베이스에서 삭제하시겠습니까?")) return;
  activities = activities.filter(a => a.id !== id);
  saveDatabase();
  renderMainApp();
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
    weekRowDiv.className = "relative bg-white flex flex-col border-b border-slate-100";
    weekRowDiv.style.minHeight = `${minHeight}px`;

    // 1. Grid Background & Vertical lines
    let bgHtml = `<div class="grid grid-cols-7 absolute inset-0 divide-x divide-slate-100/70 pointer-events-none">`;
    weekDays.forEach(dayObj => {
      const bgClass = !dayObj.isCurrentMonth ? "bg-slate-50/40" : "bg-white";
      const todayClass = dayObj.isToday ? "bg-blue-50/25" : "";
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
      
      let numClass = "text-slate-700";
      if (dayObj.isToday) {
        numClass = "bg-blue-600 text-white font-extrabold shadow-sm scale-110";
      } else if (isSunday) {
        numClass = "text-red-500";
      } else if (isSaturday) {
        numClass = "text-blue-500";
      } else if (!dayObj.isCurrentMonth) {
        numClass = "text-slate-300";
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
      if (act.type === "교육" || act.type === "강의") {
        colorClass = "bg-[#5e72e4] text-white hover:bg-[#4d61d3] border border-[#5e72e4]/30 shadow-xs";
      } else if (act.type === "자문/컨설팅") {
        colorClass = "bg-[#8965e0] text-white hover:bg-[#7854cf] border border-[#8965e0]/30 shadow-xs";
      } else if (act.type === "평가/심사" || act.type === "연구") {
        colorClass = "bg-[#2dce89] text-white hover:bg-[#24b97a] border border-[#2dce89]/30 shadow-xs";
      }

      const lRound = isStartThisWeek ? "rounded-l-md" : "rounded-l-none";
      const rRound = isEndThisWeek ? "rounded-r-md" : "rounded-r-none";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `absolute text-left truncate text-[11px] px-3 font-semibold transition-all pointer-events-auto flex items-center z-20 cursor-pointer h-[24px] ${colorClass} ${lRound} ${rRound}`;
      btn.style.left = `calc(${(startCol / 7) * 100}% + 2px)`;
      btn.style.width = `calc(${((endCol - startCol + 1) / 7) * 100}% - 4px)`;
      btn.style.top = `${trackRow * 28}px`;
      btn.title = `[${act.name}] ${act.subject}`;
      btn.innerHTML = `<span class="truncate w-full pr-1 font-bold">[${act.name}] ${act.subject}</span>`;
      
      btn.onclick = () => showCalendarDetails(act);
      barsContainer.appendChild(btn);
    });

    weekRowDiv.appendChild(barsContainer);
    gridContainer.appendChild(weekRowDiv);
  });
}

// Calendar Detail Box Controllers
function showCalendarDetails(act) {
  selectedActivity = act;
  const card = document.getElementById("calendar-detail-card");
  card.classList.remove("hidden");

  // Format colors
  const isEdu = act.type === "교육" || act.type === "강의";
  const isConsult = act.type === "자문/컨설팅";
  const isAudit = act.type === "평가/심사" || act.type === "연구";
  let badgeColor = "bg-slate-100 text-slate-700";
  if (isEdu) badgeColor = "bg-blue-100 text-blue-800";
  else if (isConsult) badgeColor = "bg-indigo-100 text-indigo-800";
  else if (isAudit) badgeColor = "bg-amber-100 text-amber-800";

  document.getElementById("detail-card-badge").className = `text-[9px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`;
  document.getElementById("detail-card-badge").innerText = act.type;
  document.getElementById("detail-card-dates").innerText = `${act.startDate} ~ ${act.endDate || act.startDate}`;
  document.getElementById("detail-card-title").innerHTML = `<span class="text-blue-600 font-semibold mr-1">[${act.name}]</span> ${act.subject}`;
  document.getElementById("detail-card-org").innerText = `💼 소속: ${act.org}`;
  document.getElementById("detail-card-target").innerText = `🏢 대상: ${act.targetOrg || "없음"}`;
  document.getElementById("detail-card-attendees").innerText = `👥 인원: ${act.attendees || "없음"}`;
  
  const memoEl = document.getElementById("detail-card-memo");
  if (act.memo) {
    memoEl.innerText = `💡 ${act.memo}`;
    memoEl.classList.remove("hidden");
  } else {
    memoEl.classList.add("hidden");
  }
}

function closeCalendarDetails() {
  selectedActivity = null;
  document.getElementById("calendar-detail-card").classList.add("hidden");
}

function deleteActivityInDetails() {
  if (!selectedActivity) return;
  if (!confirm(`[${selectedActivity.name}] 일정을 삭제하시겠습니까?`)) return;
  activities = activities.filter(a => a.id !== selectedActivity.id);
  saveDatabase();
  closeCalendarDetails();
  renderMainApp();
}

// Calendar Navigations
function navigateCalendarToday() {
  currentCalendarDate = new Date();
  renderMainApp();
}

function navigateCalendarPrev() {
  const y = currentCalendarDate.getFullYear();
  const m = currentCalendarDate.getMonth();
  currentCalendarDate = new Date(y, m - 1, 1);
  renderMainApp();
}

function navigateCalendarNext() {
  const y = currentCalendarDate.getFullYear();
  const m = currentCalendarDate.getMonth();
  currentCalendarDate = new Date(y, m + 1, 1);
  renderMainApp();
}

// Helper: compare dates
function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function safeParseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return null;
}

// 6. HANDLERS FOR NEW MANUAL FORM SUBMISSIONS
function handleFormSubmit(e) {
  e.preventDefault();
  
  const start = document.getElementById("form-start-date").value;
  const end = document.getElementById("form-end-date").value;
  const type = document.getElementById("form-type").value;
  const name = document.getElementById("form-name").value;
  const org = document.getElementById("form-org").value;
  const subject = document.getElementById("form-subject").value;
  const targetOrg = document.getElementById("form-target-org").value;
  const attendees = document.getElementById("form-attendees").value;
  const memo = document.getElementById("form-memo").value;

  if (!start || !type || !name || !org || !subject) {
    alert("필수 항목(* 기입)을 모두 입력해 주세요!");
    return;
  }

  const newActivity = {
    id: "act_" + Math.random().toString(36).substring(2, 11),
    startDate: start,
    endDate: end || start,
    type: type,
    name: name,
    org: org,
    subject: subject,
    targetOrg: targetOrg || "",
    attendees: attendees || "",
    memo: memo || "",
    createdAt: new Date().toISOString()
  };

  activities.push(newActivity);
  saveDatabase();
  alert("전문인재 활동내역이 성공적으로 기록 및 연동되었습니다!");
  
  // Reset Form
  document.getElementById("activity-form").reset();
  
  renderMainApp();
}

// 7. AI PARSING ASSISTANT (GEMINI & HEURISTIC FALLBACK)
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
    alert("활동 연혁이나 텍스트 문장을 입력해 주세요.");
    return;
  }

  const btnText = document.getElementById("btn-ai-text");
  const btn = document.getElementById("btn-ai-parse");
  
  // Reset banners
  document.getElementById("ai-banner-success").classList.add("hidden");
  document.getElementById("ai-banner-fallback").classList.add("hidden");
  document.getElementById("ai-banner-error").classList.add("hidden");

  btn.disabled = true;
  btnText.innerText = "분석 진행 중...";

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
    const systemInstruction = `너는 텍스트에서 전문인재 활동 내역을 파싱하여 JSON으로 만들어주는 인공지능이야.
현재 날짜 기준: ${new Date().toISOString().split('T')[0]}.
반드시 아래 JSON 포맷을 성실히 지켜서 순수한 JSON 형태로만 답변해줘. 마크다운 코드블록 기호없이 순수 JSON만 반환해야 돼.

{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "type": "강의/자문/컨설팅/평가/심사/교육/연구/회의/기타 중 택1",
  "name": "인물명",
  "org": "소속기관명",
  "subject": "주제 및 사업명",
  "targetOrg": "대상기관명",
  "attendees": "인원 구성 설명 또는 명수(예: 30명)",
  "memo": "추가 일정 정보 또는 진행시간"
}`;

    const payload = {
      contents: [{ parts: [{ text: `분석할 텍스트 문장: "${promptText}"` }] }],
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
  if (parsed.type) {
    const val = parsed.type;
    const opt = document.getElementById("form-type");
    // Normalize or match select option
    if (["교육", "강의", "자문/컨설팅", "평가/심사", "연구", "회의", "기타"].includes(val)) {
      opt.value = val;
    } else if (val.includes("자문") || val.includes("컨설팅")) {
      opt.value = "자문/컨설팅";
    } else if (val.includes("평가") || val.includes("심사")) {
      opt.value = "평가/심사";
    } else {
      opt.value = "기타";
    }
  }
  if (parsed.name) document.getElementById("form-name").value = parsed.name;
  if (parsed.org) document.getElementById("form-org").value = parsed.org;
  if (parsed.subject) document.getElementById("form-subject").value = parsed.subject;
  if (parsed.targetOrg) document.getElementById("form-target-org").value = parsed.targetOrg;
  if (parsed.attendees) document.getElementById("form-attendees").value = parsed.attendees;
  if (parsed.memo) document.getElementById("form-memo").value = parsed.memo;
}

// HEURISTIC REGEX-BASED PARSER FALLBACK
function heuristicParse(text) {
  const result = {
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    type: "기타",
    name: "전문인재",
    org: "소속기관",
    subject: "활동 주제",
    targetOrg: "대상기관",
    attendees: "",
    memo: "AI 휴리스틱 분석 적용됨"
  };

  const nameMatch = text.match(/([가-힣]{2,4})\s?(?:전문인재|교수|수석연구원|사무관|주무관|처장|청장|원장|대표)/) || text.match(/([가-힣]{2,4})가\b/);
  if (nameMatch) {
    result.name = nameMatch[1];
  } else {
    const matches = text.match(/[가-힣]{3}/g);
    if (matches && matches.length > 0) {
      result.name = matches[0];
    }
  }

  if (text.includes("교육")) result.type = "교육";
  else if (text.includes("강의") || text.includes("특강") || text.includes("수업")) result.type = "강의";
  else if (text.includes("자문") || text.includes("컨설팅")) result.type = "자문/컨설팅";
  else if (text.includes("평가") || text.includes("심사")) result.type = "평가/심사";
  else if (text.includes("연구") || text.includes("학술")) result.type = "연구";
  else if (text.includes("회의") || text.includes("포럼") || text.includes("세미나")) result.type = "회의";

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

  const orgMatch = text.match(/\b([가-힣]{2,12}(?:소방청|행안부|NIA|한국[가-힣]+원|지능정보사회진흥원|대학교|연구원|협회))\b/);
  if (orgMatch) {
    result.org = orgMatch[1];
  }

  const targetMatch = text.match(/(?:에서|을 위해|방문하여)\s*([가-힣A-Za-z0-9\s]{2,10}(?:센터|청사|대학|회의실|본부|지구|지점|NIA))/);
  if (targetMatch) {
    result.targetOrg = targetMatch[1].trim();
  }

  const attendeesMatch = text.match(/(\d+명)/) || text.match(/(\d+\s*명)/);
  if (attendeesMatch) {
    result.attendees = attendeesMatch[1];
  }

  const subjectWords = text.replace(result.name, "").replace(result.org, "").replace(result.targetOrg, "");
  const subjectClean = subjectWords.match(/([가-힣\s]{4,30})(?:교육|진행|수행|자문|강의)/);
  if (subjectClean) {
    result.subject = subjectClean[1].trim() + " " + (result.type);
  } else {
    result.subject = text.substring(0, 30) + "...";
  }

  return result;
}

// 8. ICAL MODAL CONTROLLER & ICS RFC 5545 PARSER
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
            type: subject.includes("교육") ? "교육" : (subject.includes("강의") ? "강의" : (subject.includes("회의") ? "회의" : "기타")),
            name: "외부 연동 일시",
            org: "캘린더 연동처",
            subject: subject,
            targetOrg: currentEvent.location || "기록 참고",
            attendees: "",
            memo: currentEvent.description || "iCal 동기화 연동 일정 데이터"
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

// 9. INITIALIZATION EVENT TRIGGER
function refreshData() {
  initDatabase();
  renderMainApp();
}

window.onload = function() {
  initDatabase();
  renderMainApp();
};
