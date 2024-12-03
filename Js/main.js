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

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Firebase bağlantısı
const db = firebase.database();

// Kullanıcı çıkış işlemi
function logout() {
  // Kullanıcıya çıkış yapıp yapmadığını sor
  const confirmLogout = confirm("Çıkış yapmak istediğinizden emin misiniz?");
  
  if (confirmLogout) {
      // Eğer kullanıcı evet derse, çıkış yapma işlemi yapılabilir
      firebase.auth().signOut().then(() => {
          alert("Çıkış başarılı!");
          window.location.href = "../index.html"; // Giriş sayfasına yönlendir
      }).catch((error) => {
          alert("Çıkış yaparken bir hata oluştu: " + error.message);
      });
  }
}

// Firebase'den menü verilerini yükleme
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    loadMenuData();
  } else {
    window.location.href = "../index.html";
  }
});

function loadMenuData() {
  const container = document.getElementById("menuContainer");
  container.innerHTML = "<p>Yükleniyor...</p>";  // Yükleme mesajı

  db.ref("menu/tr").once("value", snapshot => {
    const menuData = snapshot.val();
    container.innerHTML = ""; // Yükleme mesajını kaldır

    // Kategorileri alfabetik sıraya göre düzenle
    menuData.sort((a, b) => a.category_name.localeCompare(b.category_name));

    menuData.forEach(category => {
      const categoryDiv = document.createElement("div");
      categoryDiv.className = "category";

      // Kategori başlığı
      const categoryTitle = document.createElement("div");
      categoryTitle.className = "category-title";
      categoryTitle.textContent = category.category_name;
      
      // Kategori başlığına tıklama işlevi ekle
      categoryTitle.onclick = () => toggleItemList(categoryDiv);

      categoryDiv.appendChild(categoryTitle);

      const itemList = document.createElement("div");
      itemList.className = "item-list";

      category.items.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.className = "item";
        itemDiv.textContent = `${item.name} - ${item.price} TL`;

        // Ürün düzenleme butonu
        const editItemButton = document.createElement("button");
        editItemButton.className = "category-button";
        editItemButton.textContent = "Düzenle";
        editItemButton.onclick = () => editItem(category.category_name, item);

        // Ürün silme butonu
        const deleteItemButton = document.createElement("button");
        deleteItemButton.className = "category-button";
        deleteItemButton.textContent = "Sil";
        deleteItemButton.onclick = () => deleteItem(category.category_name, item.name);

        itemDiv.appendChild(editItemButton);
        itemDiv.appendChild(deleteItemButton);

        itemList.appendChild(itemDiv);
      });

      // Kategori düzenleme butonu
      const editCategoryButton = document.createElement("button");
      editCategoryButton.className = "category-button";
      editCategoryButton.textContent = "Düzenle";
      editCategoryButton.onclick = () => editCategory(category.category_name);

      // Kategori silme butonu
      const deleteCategoryButton = document.createElement("button");
      deleteCategoryButton.className = "category-button";
      deleteCategoryButton.textContent = "Sil";
      deleteCategoryButton.onclick = () => deleteCategory(category.category_name);

      const buttonsDiv = document.createElement("div");
      buttonsDiv.className = "category-buttons";
      buttonsDiv.appendChild(editCategoryButton);
      buttonsDiv.appendChild(deleteCategoryButton);

      categoryDiv.appendChild(buttonsDiv);
      categoryDiv.appendChild(itemList);
      container.appendChild(categoryDiv);
    });
  });
}

// Kategori düzenleme fonksiyonu
function editCategory(categoryName) {
  window.location.href = `edit_category.html?category=${categoryName}`;
}

// Kategori silme fonksiyonu
function deleteCategory(categoryName) {
  if (confirm(`"${categoryName}" kategorisini silmek istediğinize emin misiniz?`)) {
    db.ref("menu/tr").orderByChild("category_name").equalTo(categoryName).once("value", snapshot => {
      snapshot.forEach(childSnapshot => {
        childSnapshot.ref.remove();
      });
      loadMenuData(); // Silme işleminden sonra verileri tekrar yükle
    });
  }
}

// Ürün düzenleme fonksiyonu
function editItem(categoryName, item) {
  window.location.href = `edit_item.html?category=${categoryName}&item=${item.name}`;
}

// Ürün silme fonksiyonu
function deleteItem(categoryName, itemName) {
  if (confirm(`"${itemName}" ürününü silmek istediğinize emin misiniz?`)) {
    db.ref("menu/tr").orderByChild("category_name").equalTo(categoryName).once("value", snapshot => {
      snapshot.forEach(childSnapshot => {
        const itemsRef = childSnapshot.ref.child("items");
        itemsRef.once("value", itemSnapshot => {
          itemSnapshot.forEach(item => {
            if (item.val().name === itemName) {
              item.ref.remove();
            }
          });
        });
      });
      loadMenuData(); // Silme işleminden sonra verileri tekrar yükle
    });
  }
}

// Açılır menüyü göster/gizle
function toggleItemList(categoryDiv) {
  const itemList = categoryDiv.querySelector(".item-list");
  itemList.classList.toggle("active");
}
