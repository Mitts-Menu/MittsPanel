const firebaseConfig = {
  apiKey: "AIzaSyDf7QDYCY0BR6zXewFQWfRGLmUNVT0kwaA",
  authDomain: "mitts-web-test.firebaseapp.com",
  databaseURL: "https://mitts-web-test-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mitts-web-test",
  storageBucket: "mitts-web-test.firebasestorage.app",
  messagingSenderId: "775073443533",
  appId: "1:775073443533:web:0d28198a31efdc0aba0384",
  measurementId: "G-J87VJ01XD5"
};

if (!firebase.apps || firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

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

let trCategories = [];
let enCategories = [];
const stagedOrders = { morning: null, afternoon: null, night: null };

function initPage() {
  try {
    console.log("[sort] initPage");
    loadTimeRanges();
    wireTimeRangeSaves();
    wireConfirmButtons();
    loadCategoriesAndRender();
  } catch (e) {
    console.error("initPage error:", e);
    alert("Sayfa başlatılırken bir hata oluştu.");
  }
}

function wireConfirmButtons() {
  const map = [
    { key: "morning", btn: "confirmMorningOrder" },
    { key: "afternoon", btn: "confirmAfternoonOrder" },
    { key: "night", btn: "confirmNightOrder" }
  ];
  map.forEach(({ key, btn }) => {
    const el = document.getElementById(btn);
    if (!el) return;
    el.addEventListener("click", () => {
      console.log("[sort] confirm order click", key, stagedOrders[key]);
      applyStagedOrder(key);
    });
  });
}

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
      if (err && err.message === "overlap") return;
      alert("Saat aralığı güncellenirken hata oluştu: " + (err?.message || err));
    });
}

function validateTimeOverlaps(ranges) {
  const keys = ["morning", "afternoon", "night"];
  const hoursMap = {};

  function expandHours(s, e) {
    const out = new Set();
    if (s === e) return out;
    if (e > s) {
      for (let h = s; h < e; h++) out.add(h);
    } else {
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

function loadCategoriesAndRender() {
  const trPromise = db.ref("menu/tr").once("value");
  const enPromise = db.ref("menu/en").once("value");

  Promise.all([trPromise, enPromise])
    .then(([trSnap, enSnap]) => {
      trCategories = trSnap.val() || [];
      enCategories = enSnap.val() || [];

      if (!Array.isArray(trCategories)) trCategories = [];
      if (!Array.isArray(enCategories)) enCategories = [];

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
      ["morning", "afternoon", "night"].forEach(k => {
        if (!stagedOrders[k]) stagedOrders[k] = null;
      });

      renderSection("morning");
      renderSection("afternoon");
      renderSection("night");
    })
    .catch(err => {
      console.error("loadCategoriesAndRender error:", err);
      alert("Kategoriler yüklenirken hata oluştu.");
    });
}

function ensureSectionOrdersUnique(sectionKey) {
  const key = orderKeyFor(sectionKey);
  const values = trCategories.map(c => c[key]);
  const allNumbers = values.every(v => typeof v === "number");
  const uniqueCount = new Set(values).size;

  if (!allNumbers || uniqueCount !== values.length) {
    trCategories.forEach((c, i) => { c[key] = i; });
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

  let sorted;
  if (Array.isArray(stagedOrders[sectionKey]) && stagedOrders[sectionKey].length) {
    const idToCat = new Map(trCategories.map(c => [Number(c.category_id), c]));
    sorted = stagedOrders[sectionKey]
      .map(id => idToCat.get(Number(id)))
      .filter(Boolean);
    const stagedSet = new Set(stagedOrders[sectionKey].map(Number));
    const rest = trCategories.filter(c => !stagedSet.has(Number(c.category_id)));
    sorted = [...sorted, ...rest];
  } else {
    sorted = [...trCategories].sort((a, b) => {
      const ao = Number(a[orderKey] ?? 0);
      const bo = Number(b[orderKey] ?? 0);
      if (ao !== bo) return ao - bo;
      const aid = Number(a.category_id);
      const bid = Number(b.category_id);
      return aid - bid;
    });
    stagedOrders[sectionKey] = sorted.map(c => Number(c.category_id));
  }

  sorted.forEach((cat, idx) => {
    const row = document.createElement("div");
    row.className = "sort-item";

    const title = document.createElement("div");
    title.className = "title";
    const name = document.createElement("div");
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

function moveInSection(sectionKey, sortedArray, fromIndex, toIndex) {
  console.log("[sort] moveInSection", { sectionKey, fromIndex, toIndex });
  if (toIndex < 0 || toIndex >= sortedArray.length) return;

  const orderKey = orderKeyFor(sectionKey);

  const idList = Array.isArray(stagedOrders[sectionKey]) && stagedOrders[sectionKey].length
    ? [...stagedOrders[sectionKey]].map(Number)
    : sortedArray.map(c => Number(c.category_id));
  console.log("[sort] before move order", sectionKey, idList);
  const tempId = idList[fromIndex];
  idList.splice(fromIndex, 1);
  idList.splice(toIndex, 0, tempId);
  console.log("[sort] after move order", sectionKey, idList);
  stagedOrders[sectionKey] = idList;
  renderSection(sectionKey);
}

function applyStagedOrder(sectionKey) {
  const orderKey = orderKeyFor(sectionKey);
  const idList = stagedOrders[sectionKey];
  if (!Array.isArray(idList) || idList.length === 0) return;

  idList.forEach((catId, idx) => {
    const t = trCategories.find(c => Number(c.category_id) === Number(catId));
    if (t) t[orderKey] = idx;
  });

  idList.forEach((catId, idx) => {
    const e = enCategories.find(c => Number(c.category_id) === Number(catId));
    if (e) e[orderKey] = idx;
  });

  Promise.all([db.ref("menu/tr").set(trCategories), db.ref("menu/en").set(enCategories)])
    .then(() => {
      console.log("[sort] confirmed and saved order for", sectionKey);
      loadCategoriesAndRender();
    })
    .catch(err => {
      console.error("applyStagedOrder error:", err);
      alert("Sıralama kaydedilirken hata oluştu.");
    });
}
