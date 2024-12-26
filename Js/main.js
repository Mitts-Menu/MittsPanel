// ----------------------------------------------------
// Firebase Config
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCCI4I7yCCHEjhe4sOMnzP4j35S592aods",
  authDomain: "mitts-menu.firebaseapp.com",
  databaseURL: "https://mitts-menu-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mitts-menu",
  storageBucket: "mitts-menu.appspot.com",
  messagingSenderId: "1023674735399",
  appId: "1:1023674735399:web:5bfbd8c6f3fa4f44e0e702",
  measurementId: "G-FY4717JPP5"
};
// Firebase başlat
firebase.initializeApp(firebaseConfig);

// Referanslar
const db = firebase.database();

// ----------------------------------------------------
// Çıkış butonu
// ----------------------------------------------------
function logout() {
  const confirmLogout = confirm("Çıkış yapmak istediğinizden emin misiniz?");
  if (confirmLogout) {
    firebase.auth().signOut()
      .then(() => {
        alert("Çıkış başarılı!");
        window.location.href = "../index.html"; 
      })
      .catch((error) => {
        alert("Çıkış yaparken bir hata oluştu: " + error.message);
      });
  }
}

// ----------------------------------------------------
// Kullanıcı oturum kontrol
// ----------------------------------------------------
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    loadMenuData();
  } else {
    // Giriş yoksa anasayfaya (index.html) dön
    window.location.href = "../index.html";
  }
});

// ----------------------------------------------------
// Menü verilerini yükleme
// ----------------------------------------------------
function loadMenuData() {
  const container = document.getElementById("menuContainer");
  container.innerHTML = "<p>Yükleniyor...</p>";

  db.ref("menu/tr").once("value", snapshot => {
    const menuData = snapshot.val();
    container.innerHTML = "";

    if (!menuData || !Array.isArray(menuData)) {
      container.innerHTML = "<p>Menü verisi bulunamadı veya geçersiz format.</p>";
      return;
    }

    // Kategorileri alfabetik sıraya göre
    menuData.sort((a, b) => a.category_name.localeCompare(b.category_name));

    menuData.forEach(category => {
      // Kategori Div
      const categoryDiv = document.createElement("div");
      categoryDiv.className = "category";

      // Kategori Başlık
      const categoryTitle = document.createElement("div");
      categoryTitle.className = "category-title";
      categoryTitle.textContent = category.category_name;
      categoryTitle.onclick = () => toggleItemList(categoryDiv);
      categoryDiv.appendChild(categoryTitle);

      // Ürün listesi
      const itemList = document.createElement("div");
      itemList.className = "item-list";

      if (category.items && category.items.length > 0) {
        category.items.forEach(item => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "item";
          itemDiv.textContent = `${item.name} - ${item.price} TL`;

          // Ürün düzenleme
          const editItemButton = document.createElement("button");
          editItemButton.className = "category-button";
          editItemButton.textContent = "Düzenle";
          editItemButton.onclick = () => editItem(category.category_name, item);

          // Ürün silme
          const deleteItemButton = document.createElement("button");
          deleteItemButton.className = "category-button";
          deleteItemButton.textContent = "Sil";
          deleteItemButton.onclick = () => deleteItem(category.category_name, item.name);

          itemDiv.appendChild(editItemButton);
          itemDiv.appendChild(deleteItemButton);
          itemList.appendChild(itemDiv);
        });
      } else {
        const noItems = document.createElement("p");
        noItems.textContent = "Bu kategoride ürün bulunmuyor.";
        itemList.appendChild(noItems);
      }

      // Kategori butonları
      const editCategoryButton = document.createElement("button");
      editCategoryButton.className = "category-button";
      editCategoryButton.textContent = "Düzenle";
      editCategoryButton.onclick = () => editCategory(category.category_name);

      const deleteCategoryButton = document.createElement("button");
      deleteCategoryButton.className = "category-button";
      deleteCategoryButton.textContent = "Sil";
      deleteCategoryButton.onclick = () => deleteCategory(category.category_name);

      // ÜRÜN EKLE butonu -> add_item.html'e yönlendir
      const addItemButton = document.createElement("button");
      addItemButton.className = "category-button";
      addItemButton.textContent = "Ürün Ekle";
      addItemButton.onclick = () => {
        // Parametre olarak category_name'i gönderiyoruz
        window.location.href = `add_item.html?category=${encodeURIComponent(category.category_name)}`;
      };

      // Buton grubu
      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "category-buttons";
      buttonsDiv.appendChild(editCategoryButton);
      buttonsDiv.appendChild(deleteCategoryButton);
      buttonsDiv.appendChild(addItemButton);

      categoryDiv.appendChild(buttonsDiv);
      categoryDiv.appendChild(itemList);
      container.appendChild(categoryDiv);
    });
  });
}

// ----------------------------------------------------
// Kategori düzenleme
// ----------------------------------------------------
function editCategory(categoryName) {
  window.location.href = `edit_category.html?category=${encodeURIComponent(categoryName)}`;
}

// ----------------------------------------------------
// Kategori silme
// ----------------------------------------------------
function deleteCategory(categoryName) {
  if (confirm(`"${categoryName}" kategorisini silmek istediğinize emin misiniz?`)) {

    // 1) Hem tr hem en tarafında silme promiselerini hazırlayalım
    const trPromise = db.ref("menu/tr")
      .orderByChild("category_name")
      .equalTo(categoryName)
      .once("value");

    const enPromise = db.ref("menu/en")
      .orderByChild("category_name")
      .equalTo(categoryName)
      .once("value");

    // 2) Promise.all ile her ikisini de bekle
    Promise.all([trPromise, enPromise])
      .then(([trSnapshot, enSnapshot]) => {
        // TR tarafında bulduğumuz kategorileri silelim
        trSnapshot.forEach(childSnapshot => {
          childSnapshot.ref.remove();
        });

        // EN tarafında bulduğumuz kategorileri silelim
        enSnapshot.forEach(childSnapshot => {
          childSnapshot.ref.remove();
        });
      })
      .then(() => {
        // 3) Silme işlemi tamamlanınca menüyü yeniden yükleyelim
        loadMenuData();
      })
      .catch(err => {
        alert("Kategori silinirken hata oluştu: " + err);
      });
  }
}

// ----------------------------------------------------
// Ürün düzenleme
// ----------------------------------------------------
function editItem(categoryName, item) {
  window.location.href = `edit_item.html?category=${encodeURIComponent(categoryName)}&item=${encodeURIComponent(item.name)}`;
}

// ----------------------------------------------------
// Ürün silme
// ----------------------------------------------------
function deleteItem(categoryName, itemName) {
  if (confirm(`"${itemName}" ürününü silmek istediğinize emin misiniz?`)) {

    // Hem "menu/tr" hem "menu/en" altındaki veriyi paralel okuyalım.
    const trPromise = db.ref("menu/tr")
      .orderByChild("category_name")
      .equalTo(categoryName)
      .once("value");

    const enPromise = db.ref("menu/en")
      .orderByChild("category_name")
      .equalTo(categoryName)
      .once("value");

    // Promise.all ile aynı anda bekleyelim
    Promise.all([trPromise, enPromise])
      .then(([trSnapshot, enSnapshot]) => {
        // "menu/tr" tarafında itemName eşleşen ürünü sil
        trSnapshot.forEach(childSnapshot => {
          const itemsRef = childSnapshot.ref.child("items");
          itemsRef.once("value", itemSnapshot => {
            itemSnapshot.forEach(item => {
              if (item.val().name === itemName) {
                item.ref.remove();
              }
            });
          });
        });

        // "menu/en" tarafında itemName eşleşen ürünü sil
        enSnapshot.forEach(childSnapshot => {
          const itemsRef = childSnapshot.ref.child("items");
          itemsRef.once("value", itemSnapshot => {
            itemSnapshot.forEach(item => {
              if (item.val().name === itemName) {
                item.ref.remove();
              }
            });
          });
        });
      })
      .then(() => {
        // Silme işlemleri tamamlanınca listeyi yeniden yükle
        loadMenuData();
      })
      .catch(err => {
        alert("Ürün silinirken hata oluştu: " + err);
      });
  }
}


// ----------------------------------------------------
// Açılır/kapanır ürün listesi
// ----------------------------------------------------
function toggleItemList(categoryDiv) {
  const itemList = categoryDiv.querySelector(".item-list");
  itemList.classList.toggle("active");
}

// ----------------------------------------------------
// Kategori ekleme işlemi
// ----------------------------------------------------
function addCategory() {
  const newCategoryName = prompt("Yeni Kategori Adı:");
  if (!newCategoryName) return;

  // TR ve EN tarafındaki array'leri paralel çekmek için Promise kullanalım
  const trRef = db.ref("menu/tr").once("value");
  const enRef = db.ref("menu/en").once("value");

  Promise.all([trRef, enRef])
    .then(([trSnap, enSnap]) => {
      // TR verisi
      let trArray = trSnap.val() || [];
      if (!Array.isArray(trArray)) trArray = [];

      // EN verisi
      let enArray = enSnap.val() || [];
      if (!Array.isArray(enArray)) enArray = [];

      // TR tarafı maxId
      let trMaxId = 0;
      trArray.forEach(cat => {
        if (cat.category_id > trMaxId) trMaxId = cat.category_id;
      });

      // EN tarafı maxId (ayrı tutabilir ya da aynı id kullanabilirsin)
      let enMaxId = 0;
      enArray.forEach(cat => {
        if (cat.category_id > enMaxId) enMaxId = cat.category_id;
      });

      // Yeni TR kategorisi
      const newCategoryTR = {
        category_id: trMaxId + 1,
        category_name: newCategoryName,
        items: []
      };

      // Yeni EN kategorisi (ayrı id istiyorsan enMaxId+1 ver; 
      // aynı id istersen trMaxId+1 kullan)
      const newCategoryEN = {
        category_id: enMaxId + 1,
        category_name: newCategoryName,
        items: []
      };

      trArray.push(newCategoryTR);
      enArray.push(newCategoryEN);

      // Her iki dili de güncelle
      const updatePromises = [];
      updatePromises.push(db.ref("menu/tr").set(trArray));
      updatePromises.push(db.ref("menu/en").set(enArray));

      return Promise.all(updatePromises);
    })
    .then(() => {
      alert("Yeni kategori (TR ve EN) eklendi: " + newCategoryName);
      loadMenuData(); // Tekrar yükle (main.html'de TR'yi göreceğiz)
    })
    .catch(err => {
      console.error("Kategori eklerken hata:", err);
    });
}

