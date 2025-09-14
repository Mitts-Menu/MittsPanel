// ----------------------------------------------------
// Firebase Config
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDf7QDYCY0BR6zXewFQWfRGLmUNVT0kwaA",
  authDomain: "mitts-web-test.firebaseapp.com",
  projectId: "mitts-web-test",
  storageBucket: "mitts-web-test.firebasestorage.app",
  databaseURL:"https://mitts-web-test-default-rtdb.europe-west1.firebasedatabase.app",
  messagingSenderId: "775073443533",
  appId: "1:775073443533:web:0d28198a31efdc0aba0384",
  measurementId: "G-J87VJ01XD5"
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

    // Kategorileri ID'ye göre sırala (alfabetik yerine)
    menuData.sort((a, b) => a.category_id - b.category_id);

    menuData.forEach((category, index) => {
      // Kategori Div
      const categoryDiv = document.createElement("div");
      categoryDiv.className = "category";

      // Kategori Başlık ve Sıralama Butonları Container
      const categoryHeaderDiv = document.createElement("div");
      categoryHeaderDiv.className = "category-header";
      categoryHeaderDiv.style.display = "flex";
      categoryHeaderDiv.style.alignItems = "center";
      categoryHeaderDiv.style.justifyContent = "flex-start";

      // Kategori Başlık
      const categoryTitle = document.createElement("div");
      categoryTitle.className = "category-title";
      categoryTitle.onclick = () => toggleItemList(categoryDiv);
      
      // Kategori adını span olarak ekle
      const categoryNameSpan = document.createElement("span");
      categoryNameSpan.textContent = category.category_name;
      categoryTitle.appendChild(categoryNameSpan);
      
      // ID'yi badge olarak ekle
      const categoryIdBadge = document.createElement("span");
      categoryIdBadge.className = "category-id";
      categoryIdBadge.textContent = `ID: ${category.category_id}`;
      categoryTitle.appendChild(categoryIdBadge);

      categoryHeaderDiv.appendChild(categoryTitle);
      categoryDiv.appendChild(categoryHeaderDiv);

      // Ürün listesi
      const itemList = document.createElement("div");
      itemList.className = "item-list";

      if (category.items && category.items.length > 0) {
        category.items.forEach(item => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "item";
          
          // Görseli olmayan ürünler için placeholder göster
          if (!item.image_url || item.image_url === "" || item.image_url === "undefined") {
            item.image_url = "../img/mitts_logo.png";
          }
          
          itemDiv.textContent = `${item.name} - ${item.price} TL`;

          // Düzenleme işlemi için kategori_id'yi de iletiyoruz
          const editItemButton = document.createElement("button");
          editItemButton.className = "category-button";
          editItemButton.textContent = "Düzenle";
          editItemButton.onclick = () => editItem(category.category_name, {
            ...item,
            category_id: category.category_id
          });

          // Silme işlemi için kategori_id'yi de iletiyoruz
          const deleteItemButton = document.createElement("button");
          deleteItemButton.className = "category-button";
          deleteItemButton.textContent = "Sil";
          deleteItemButton.onclick = () => deleteItem(category.category_name, item.name, category.category_id);

          itemDiv.appendChild(editItemButton);
          itemDiv.appendChild(deleteItemButton);
          itemList.appendChild(itemDiv);
        });
      } else {
        const noItems = document.createElement("p");
        noItems.textContent = "Bu kategoride ürün bulunmuyor.";
        itemList.appendChild(noItems);
      }

      // Kategori butonları - kategori ID'sini de iletiyoruz
      const editCategoryButton = document.createElement("button");
      editCategoryButton.className = "category-button";
      editCategoryButton.textContent = "Düzenle";
      editCategoryButton.onclick = () => editCategory(category.category_name, category.category_id);

      const deleteCategoryButton = document.createElement("button");
      deleteCategoryButton.className = "category-button";
      deleteCategoryButton.textContent = "Sil";
      deleteCategoryButton.onclick = () => deleteCategory(category.category_name, category.category_id);

      // ÜRÜN EKLE butonu -> add_item.html'e yönlendir
      const addItemButton = document.createElement("button");
      addItemButton.className = "category-button";
      addItemButton.textContent = "Ürün Ekle";
      addItemButton.onclick = () => {
        // Kategori adı ve kategori ID'sini parametre olarak gönderiyoruz
        window.location.href = `add_item.html?category=${encodeURIComponent(category.category_name)}&id=${encodeURIComponent(category.category_id)}`;
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
function editCategory(categoryName, categoryId) {
  window.location.href = `edit_category.html?category=${encodeURIComponent(categoryName)}&id=${encodeURIComponent(categoryId)}`;
}

// ----------------------------------------------------
// Kategori silme
// ----------------------------------------------------
function deleteCategory(categoryName, categoryId) {
  if (confirm(`"${categoryName}" kategorisini silmek istediğinize emin misiniz?`)) {

    // Hem TR hem EN tüm verilerini al
    const trPromise = db.ref("menu/tr").once("value");
    const enPromise = db.ref("menu/en").once("value");

    // Promise.all ile her ikisini de bekle
    Promise.all([trPromise, enPromise])
      .then(([trSnapshot, enSnapshot]) => {
        const deletePromises = [];
        
        // TR menüsünde kategori ID'sine göre eşleşen kategoriyi bul ve sil
        let trArray = [];
        trSnapshot.forEach(childSnapshot => {
          const category = childSnapshot.val();
          // Kategori ID'si eşleşmiyorsa diziye ekle (eşleşenleri filtrele)
          if (category.category_id !== categoryId) {
            trArray.push(category);
          }
        });
        
        // EN menüsünde kategori ID'sine göre eşleşen kategoriyi bul ve sil
        let enArray = [];
        enSnapshot.forEach(childSnapshot => {
          const category = childSnapshot.val();
          // Kategori ID'si eşleşmiyorsa diziye ekle (eşleşenleri filtrele)
          if (category.category_id !== categoryId) {
            enArray.push(category);
          }
        });
        
        // Güncellenmiş dizileri yazalım
        deletePromises.push(db.ref("menu/tr").set(trArray));
        deletePromises.push(db.ref("menu/en").set(enArray));
        
        return Promise.all(deletePromises);
      })
      .then(() => {
        // Silme işlemi tamamlanınca menüyü yeniden yükleyelim
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
  window.location.href = `edit_item.html?category=${encodeURIComponent(categoryName)}&id=${encodeURIComponent(item.category_id)}&item=${encodeURIComponent(item.name)}`;
}

// ----------------------------------------------------
// Ürün silme
// ----------------------------------------------------
function deleteItem(categoryName, itemName, categoryId) {
  if (confirm(`"${itemName}" ürününü silmek istediğinize emin misiniz?`)) {

    // Hem "menu/tr" hem "menu/en" tüm verilerini al
    const trPromise = db.ref("menu/tr").once("value");
    const enPromise = db.ref("menu/en").once("value");

    // Promise.all ile aynı anda bekleyelim
    Promise.all([trPromise, enPromise])
      .then(([trSnapshot, enSnapshot]) => {
        const deletePromises = [];
        let itemNumericId = null;

        // TR menüsünde kategori ID'sine göre eşleşen kategoriyi bul
        trSnapshot.forEach(categorySnapshot => {
          if (categorySnapshot.val().category_id === categoryId) {
            const itemsArray = categorySnapshot.val().items || [];
            
            // Önce silinecek ürünün numeric ID'sini bul
            const itemToDelete = itemsArray.find(item => item.name === itemName);
            if (itemToDelete) {
              itemNumericId = itemToDelete.id;
            }
            
            // Silinecek ürün dışındakileri filtrele
            const updatedItems = itemsArray.filter(item => item.name !== itemName);
            
            // Referans üzerinden güncelle
            if (updatedItems.length !== itemsArray.length) {
              deletePromises.push(
                categorySnapshot.ref.child("items").set(updatedItems)
              );
            }
          }
        });

        // EN menüsünde ID'ye göre eşleşen ürünü sil
        if (itemNumericId !== null) { // Eğer ID bulunduysa
          enSnapshot.forEach(categorySnapshot => {
            if (categorySnapshot.val().category_id === categoryId) {
              const itemsArray = categorySnapshot.val().items || [];
              
              // ID'ye göre filtrele
              const updatedItems = itemsArray.filter(item => item.id !== itemNumericId);
              
              // Referans üzerinden güncelle
              if (updatedItems.length !== itemsArray.length) {
                deletePromises.push(
                  categorySnapshot.ref.child("items").set(updatedItems)
                );
              }
            }
          });
        }

        return Promise.all(deletePromises);
      })
      .then(() => {
        // Silme işlemleri tamamlanınca listeyi yeniden yükle
        alert(`"${itemName}" ürünü başarıyla silindi.`);
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



