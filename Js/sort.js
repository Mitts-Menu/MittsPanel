// ----------------------------------------------------
// Firebase Config (same as the panel)
// ----------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyDf7QDYCY0BR6zXewFQWfRGLmUNVT0kwaA",
    authDomain: "mitts-web-test.firebaseapp.com",
    projectId: "mitts-web-test",
    storageBucket: "mitts-web-test.firebasestorage.app",
    databaseURL: "https://mitts-web-test-default-rtdb.europe-west1.firebasedatabase.app",
    messagingSenderId: "775073443533",
    appId: "1:775073443533:web:0d28198a31efdc0aba0384",
    measurementId: "G-J87VJ01XD5"
  };
  
  // Initialize Firebase once
  if (!firebase.apps || firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = firebase.database();
  
  // ----------------------------------------------------
  // Logout for header
  // ----------------------------------------------------
  function logout() {
    const confirmLogout = confirm("Çıkış yapmak istediğinizden emin misiniz?");
    if (!confirmLogout) return;
    firebase.auth().signOut()
      .then(() => {
        alert("Çıkış başarılı!");
        window.location.href = "../index.html";
      })
      .catch(err => alert("Çıkış hatası: " + err.message));
  }
  
  // ----------------------------------------------------
  // Auth check
  // ----------------------------------------------------
  document.addEventListener("DOMContentLoaded", () => {
    try {
      firebase.auth().onAuthStateChanged(user => {
        if (user) {
          initPage();
        } else {
          window.location.href = "../index.html";
        }
      });
    } catch (e) {
      console.error("Auth subscribe error:", e);
      alert("Kimlik doğrulama başlatılırken bir hata oluştu.");
    }
  });
  
  // ----------------------------------------------------
  // State
  // ----------------------------------------------------
  let trCategories = [];
  let enCategories = [];
  
  // ----------------------------------------------------
  // Init
  // ----------------------------------------------------
  function initPage() {
    try {
      console.log("[sort] initPage");
      loadTimeRanges();
      wireTimeRangeSaves();
      loadCategoriesAndRender();
    } catch (e) {
      console.error("initPage error:", e);
      alert("Sayfa başlatılırken bir hata oluştu.");
    }
  }
  
  // ----------------------------------------------------
  // Load & Save Time Ranges
  // ----------------------------------------------------
  function loadTimeRanges() {
    db.ref("menu_time_ranges").once("value")
      .then(snap => {
        const data = snap.val() || {};
        const morning = data.morning || { start: 2, end: 15 };
        const afternoon = data.afternoon || { start: 15, end: 22 };
        const night = data.night || { start: 22, end: 2 };

        document.getElementById("morningStart").value = morning.start;
        document.getElementById("morningEnd").value = morning.end;
        document.getElementById("afternoonStart").value = afternoon.start;
        document.getElementById("afternoonEnd").value = afternoon.end;
        document.getElementById("nightStart").value = night.start;
        document.getElementById("nightEnd").value = night.end;
      })
      .catch(err => {
        console.error("loadTimeRanges error:", err);
        alert("Saat aralıkları yüklenirken hata oluştu.");
      });
  }
  
  function wireTimeRangeSaves() {
    document.getElementById("saveMorning").addEventListener("click", () => {
      console.log("[sort] saveMorning click");
      const start = parseInt(document.getElementById("morningStart").value, 10);
      const end = parseInt(document.getElementById("morningEnd").value, 10);
      saveTimeRange("morning", start, end);
    });
    document.getElementById("saveAfternoon").addEventListener("click", () => {
      console.log("[sort] saveAfternoon click");
      const start = parseInt(document.getElementById("afternoonStart").value, 10);
      const end = parseInt(document.getElementById("afternoonEnd").value, 10);
      saveTimeRange("afternoon", start, end);
    });
    document.getElementById("saveNight").addEventListener("click", () => {
      console.log("[sort] saveNight click");
      const start = parseInt(document.getElementById("nightStart").value, 10);
      const end = parseInt(document.getElementById("nightEnd").value, 10);
      saveTimeRange("night", start, end);
    });
  }
  
  function saveTimeRange(key, start, end) {
    if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || start > 23 || end < 0 || end > 23) {
      alert("Lütfen 0-23 aralığında geçerli saat değerleri girin.");
      return;
    }
    // Fetch all ranges, update the target key locally, then validate overlaps before saving
    db.ref("menu_time_ranges").once("value")
      .then(snap => {
        const current = snap.val() || {};
        const ranges = {
          morning: current.morning || { start: 2, end: 15 },
          afternoon: current.afternoon || { start: 15, end: 22 },
          night: current.night || { start: 22, end: 2 }
        };
        ranges[key] = { start, end };

        const overlaps = validateTimeOverlaps(ranges);
        if (overlaps.length > 0) {
          alert("Saat aralıkları çakışıyor: " + overlaps.join(", "));
          return Promise.reject(new Error("overlap"));
        }

        return db.ref("menu_time_ranges").set(ranges);
      })
      .then(() => alert(`${key} saat aralığı güncellendi.`))
      .catch(err => {
        if (err && err.message === "overlap") return; // already alerted
        alert("Saat aralığı güncellenirken hata oluştu: " + (err?.message || err));
      });
  }

  // Validate that morning/afternoon/night do not overlap.
  // Treat intervals as half-open [start, end), wrapping across midnight when end < start
  function validateTimeOverlaps(ranges) {
    const keys = ["morning", "afternoon", "night"];
    const hoursMap = {};

    function expandHours(s, e) {
      const out = new Set();
      if (s === e) return out; // empty interval
      if (e > s) {
        for (let h = s; h < e; h++) out.add(h);
      } else {
        // wrap: [s,24) U [0,e)
        for (let h = s; h < 24; h++) out.add(h);
        for (let h = 0; h < e; h++) out.add(h);
      }
      return out;
    }

    keys.forEach(k => {
      const { start, end } = ranges[k];
      hoursMap[k] = expandHours(Number(start), Number(end));
    });

    const conflicts = [];
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = keys[i], b = keys[j];
        const A = hoursMap[a], B = hoursMap[b];
        let intersect = false;
        for (const h of A) { if (B.has(h)) { intersect = true; break; } }
        if (intersect) conflicts.push(`${a} ↔ ${b}`);
      }
    }
    return conflicts;
  }
  
  // ----------------------------------------------------
  // Load categories and render lists
  // ----------------------------------------------------
  function loadCategoriesAndRender() {
    const trPromise = db.ref("menu/tr").once("value");
    const enPromise = db.ref("menu/en").once("value");

    Promise.all([trPromise, enPromise])
      .then(([trSnap, enSnap]) => {
        trCategories = trSnap.val() || [];
        enCategories = enSnap.val() || [];

        if (!Array.isArray(trCategories)) trCategories = [];
        if (!Array.isArray(enCategories)) enCategories = [];

        // Ensure every category has order fields
        trCategories.forEach((c, idx) => {
          if (typeof c.order_morning !== "number") c.order_morning = idx;
          if (typeof c.order_afternoon !== "number") c.order_afternoon = idx;
          if (typeof c.order_night !== "number") c.order_night = idx;
        });
        enCategories.forEach((c, idx) => {
          if (typeof c.order_morning !== "number") c.order_morning = idx;
          if (typeof c.order_afternoon !== "number") c.order_afternoon = idx;
          if (typeof c.order_night !== "number") c.order_night = idx;
        });

        // Normalize duplicates (e.g., when all are 0) to unique sequences once
        const changedMorning = ensureSectionOrdersUnique("morning");
        const changedAfternoon = ensureSectionOrdersUnique("afternoon");
        const changedNight = ensureSectionOrdersUnique("night");

        if (changedMorning || changedAfternoon || changedNight) {
          console.log("[sort] Normalized duplicate/missing order fields, persisting...");
          return Promise.all([
            db.ref("menu/tr").set(trCategories),
            db.ref("menu/en").set(enCategories)
          ]);
        }
      })
      .then(() => {
        // After possible normalization save, render sections
        renderSection("morning");
        renderSection("afternoon");
        renderSection("night");
      })
      .catch(err => {
        console.error("loadCategoriesAndRender error:", err);
        alert("Kategoriler yüklenirken hata oluştu.");
      });
  }

  // Ensure orders for a section are unique and sequential
  function ensureSectionOrdersUnique(sectionKey) {
    const key = orderKeyFor(sectionKey);
    const values = trCategories.map(c => c[key]);
    const allNumbers = values.every(v => typeof v === "number");
    const uniqueCount = new Set(values).size;

    // If any non-number or duplicates found, normalize to 0..n-1 using current TR order
    if (!allNumbers || uniqueCount !== values.length) {
      trCategories.forEach((c, i) => { c[key] = i; });
      // Mirror to EN by category_id
      enCategories.forEach(en => {
        const match = trCategories.find(tr => tr.category_id === en.category_id);
        if (match) en[key] = match[key];
      });
      return true;
    }
    return false;
  }
  
  function renderSection(sectionKey) {
    const listEl = document.getElementById(`${sectionKey}List`);
    listEl.innerHTML = "";

    const orderKey = orderKeyFor(sectionKey);

    // Sort by section order (numeric) with stable tie-breaker by category_id
    const sorted = [...trCategories].sort((a, b) => {
      const ao = Number(a[orderKey] ?? 0);
      const bo = Number(b[orderKey] ?? 0);
      if (ao !== bo) return ao - bo;
      const aid = Number(a.category_id);
      const bid = Number(b.category_id);
      return aid - bid;
    });

    sorted.forEach((cat, idx) => {
      const row = document.createElement("div");
      row.className = "sort-item";

      const title = document.createElement("div");
      title.className = "title";
      const name = document.createElement("div");
      // Show only the category name with its current position (1-based)
      name.textContent = `${cat.category_name} (${idx + 1})`;
      title.appendChild(name);

      const actions = document.createElement("div");
      actions.className = "sort-actions";

      const upBtn = document.createElement("button");
      upBtn.className = "arrow-btn";
      upBtn.textContent = "↑";
      upBtn.disabled = idx === 0;
      upBtn.addEventListener("click", () => {
        console.log(`[sort] up click ${sectionKey}`, { idx, catId: cat.category_id });
        moveInSection(sectionKey, sorted, idx, idx - 1);
      });

      const downBtn = document.createElement("button");
      downBtn.className = "arrow-btn";
      downBtn.textContent = "↓";
      downBtn.disabled = idx === sorted.length - 1;
      downBtn.addEventListener("click", () => {
        console.log(`[sort] down click ${sectionKey}`, { idx, catId: cat.category_id });
        moveInSection(sectionKey, sorted, idx, idx + 1);
      });

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);

      row.appendChild(title);
      row.appendChild(actions);
      listEl.appendChild(row);
    });
  }
  
  function orderKeyFor(sectionKey) {
    if (sectionKey === "morning") return "order_morning";
    if (sectionKey === "afternoon") return "order_afternoon";
    return "order_night";
  }
  
  // Swap two items’ order fields and save to DB (both tr and en)
  function moveInSection(sectionKey, sortedArray, fromIndex, toIndex) {
    console.log("[sort] moveInSection", { sectionKey, fromIndex, toIndex });
    if (toIndex < 0 || toIndex >= sortedArray.length) return;

    const orderKey = orderKeyFor(sectionKey);

    // Build array of category IDs in current visual order, perform the move, then re-index 0..n-1
    const idList = sortedArray.map(c => Number(c.category_id));
    console.log("[sort] before move order", sectionKey, idList);
    const tempId = idList[fromIndex];
    idList.splice(fromIndex, 1);
    idList.splice(toIndex, 0, tempId);
    console.log("[sort] after move order", sectionKey, idList);

    // Apply new sequential orders to TR
    idList.forEach((catId, idx) => {
      const t = trCategories.find(c => Number(c.category_id) === Number(catId));
      if (t) t[orderKey] = idx;
    });

    // Mirror to EN by category_id
    idList.forEach((catId, idx) => {
      const e = enCategories.find(c => Number(c.category_id) === Number(catId));
      if (e) e[orderKey] = idx;
    });

    // Optimistic UI update: re-render this section immediately
    renderSection(sectionKey);

    // Save both arrays
    const p1 = db.ref("menu/tr").set(trCategories);
    const p2 = db.ref("menu/en").set(enCategories);

    Promise.all([p1, p2])
      .then(() => {
        console.log("[sort] saved TR/EN successfully");
        // Reload everything to ensure indexes and disabled states are correct across sections
        loadCategoriesAndRender();
      })
      .catch(err => {
        console.error("moveInSection error:", err);
        alert("Sıralama güncellenirken hata oluştu.");
      });
  }