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
firebase.initializeApp(firebaseConfig);

const db = firebase.database();
const storage = firebase.storage();

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

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    loadMenuData();
  } else {
    window.location.href = "../index.html";
  }
});

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

    menuData.sort((a, b) => a.category_id - b.category_id);

    menuData.forEach((category, index) => {
      const categoryDiv = document.createElement("div");
      categoryDiv.className = "category";

      const categoryHeaderDiv = document.createElement("div");
      categoryHeaderDiv.className = "category-header";
      categoryHeaderDiv.style.display = "flex";
      categoryHeaderDiv.style.alignItems = "center";
      categoryHeaderDiv.style.justifyContent = "flex-start";

      const categoryTitle = document.createElement("div");
      categoryTitle.className = "category-title";
      categoryTitle.onclick = () => toggleItemList(categoryDiv);

      const categoryNameSpan = document.createElement("span");
      categoryNameSpan.textContent = category.category_name;
      categoryTitle.appendChild(categoryNameSpan);

      const categoryIdBadge = document.createElement("span");
      categoryIdBadge.className = "category-id";
      categoryIdBadge.textContent = `ID: ${category.category_id}`;
      categoryTitle.appendChild(categoryIdBadge);

      categoryHeaderDiv.appendChild(categoryTitle);
      categoryDiv.appendChild(categoryHeaderDiv);

      const itemList = document.createElement("div");
      itemList.className = "item-list";

      if (category.items && category.items.length > 0) {
        category.items.forEach(item => {
          const itemDiv = document.createElement("div");
          itemDiv.className = "item";

          if (!item.image_url || item.image_url === "" || item.image_url === "undefined") {
            item.image_url = "../img/mitts_logo.png";
          }

          itemDiv.textContent = `${item.name} - ${item.price} TL`;

          const editItemButton = document.createElement("button");
          editItemButton.className = "category-button";
          editItemButton.textContent = "Düzenle";
          editItemButton.onclick = () => editItem(category.category_name, {
            ...item,
            category_id: category.category_id
          });

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

      const editCategoryButton = document.createElement("button");
      editCategoryButton.className = "category-button";
      editCategoryButton.textContent = "Düzenle";
      editCategoryButton.onclick = () => editCategory(category.category_name, category.category_id);

      const deleteCategoryButton = document.createElement("button");
      deleteCategoryButton.className = "category-button";
      deleteCategoryButton.textContent = "Sil";
      deleteCategoryButton.onclick = () => deleteCategory(category.category_name, category.category_id);

      const addItemButton = document.createElement("button");
      addItemButton.className = "category-button";
      addItemButton.textContent = "Ürün Ekle";
      addItemButton.onclick = () => {
        window.location.href = `add_item.html?category=${encodeURIComponent(category.category_name)}&id=${encodeURIComponent(category.category_id)}`;
      };

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

function editCategory(categoryName, categoryId) {
  window.location.href = `edit_category.html?category=${encodeURIComponent(categoryName)}&id=${encodeURIComponent(categoryId)}`;
}

function deleteCategory(categoryName, categoryId) {
  if (confirm(`"${categoryName}" kategorisini silmek istediğinize emin misiniz?`)) {

    const trPromise = db.ref("menu/tr").once("value");
    const enPromise = db.ref("menu/en").once("value");

    Promise.all([trPromise, enPromise])
      .then(([trSnapshot, enSnapshot]) => {
        const deletePromises = [];

        let trArray = [];
        trSnapshot.forEach(childSnapshot => {
          const category = childSnapshot.val();
          if (category.category_id !== categoryId) {
            trArray.push(category);
          }
        });

        let enArray = [];
        enSnapshot.forEach(childSnapshot => {
          const category = childSnapshot.val();
          if (category.category_id !== categoryId) {
            enArray.push(category);
          }
        });

        deletePromises.push(db.ref("menu/tr").set(trArray));
        deletePromises.push(db.ref("menu/en").set(enArray));

        return Promise.all(deletePromises);
      })
      .then(() => {
        loadMenuData();
      })
      .catch(err => {
        alert("Kategori silinirken hata oluştu: " + err);
      });
  }
}

function editItem(categoryName, item) {
  window.location.href = `edit_item.html?category=${encodeURIComponent(categoryName)}&id=${encodeURIComponent(item.category_id)}&item=${encodeURIComponent(item.name)}`;
}

function deleteItem(categoryName, itemName, categoryId) {
  if (confirm(`"${itemName}" ürününü silmek istediğinize emin misiniz?`)) {

    const trPromise = db.ref("menu/tr").once("value");
    const enPromise = db.ref("menu/en").once("value");

    Promise.all([trPromise, enPromise])
      .then(([trSnapshot, enSnapshot]) => {
        const deletePromises = [];
        let itemNumericId = null;
        let imageUrl = null;

        trSnapshot.forEach(categorySnapshot => {
          if (categorySnapshot.val().category_id === categoryId) {
            const itemsArray = categorySnapshot.val().items || [];

            const itemToDelete = itemsArray.find(item => item.name === itemName);
            if (itemToDelete) {
              itemNumericId = itemToDelete.id;
              imageUrl = itemToDelete.image_url;
            }

            const updatedItems = itemsArray.filter(item => item.name !== itemName);

            if (updatedItems.length !== itemsArray.length) {
              deletePromises.push(
                categorySnapshot.ref.child("items").set(updatedItems)
              );
            }
          }
        });

        if (itemNumericId !== null) {
          enSnapshot.forEach(categorySnapshot => {
            if (categorySnapshot.val().category_id === categoryId) {
              const itemsArray = categorySnapshot.val().items || [];

              const updatedItems = itemsArray.filter(item => item.id !== itemNumericId);

              if (updatedItems.length !== itemsArray.length) {
                deletePromises.push(
                  categorySnapshot.ref.child("items").set(updatedItems)
                );
              }
            }
          });
        }

        return Promise.all(deletePromises).then(() => {
          if (imageUrl && imageUrl !== "" && imageUrl !== "../img/mitts_logo.png" && imageUrl.includes("MittsWebp/")) {
            const storageRef = storage.ref().child(imageUrl);
            return storageRef.delete().catch(error => {
              console.log("Resim silinirken hata oluştu:", error);
            });
          }
        });
      })
      .then(() => {
        alert(`"${itemName}" ürünü başarıyla silindi.`);
        loadMenuData();
      })
      .catch(err => {
        alert("Ürün silinirken hata oluştu: " + err);
      });
  }
}

function toggleItemList(categoryDiv) {
  const itemList = categoryDiv.querySelector(".item-list");
  itemList.classList.toggle("active");
}

function addCategory() {
  const newCategoryName = prompt("Yeni Kategori Adı:");
  if (!newCategoryName) return;

  const trRef = db.ref("menu/tr").once("value");
  const enRef = db.ref("menu/en").once("value");

  Promise.all([trRef, enRef])
    .then(([trSnap, enSnap]) => {
      let trArray = trSnap.val() || [];
      if (!Array.isArray(trArray)) trArray = [];

      let enArray = enSnap.val() || [];
      if (!Array.isArray(enArray)) enArray = [];

      let maxId = 0;
      trArray.forEach(cat => {
        if (cat.category_id > maxId) maxId = cat.category_id;
      });
      enArray.forEach(cat => {
        if (cat.category_id > maxId) maxId = cat.category_id;
      });

      const newId = maxId + 1;

      const newCategoryTR = {
        category_id: newId,
        category_name: newCategoryName,
        items: [],
        order_afternoon: newId,
        order_morning: newId,
        order_night: newId
      };

      const newCategoryEN = {
        category_id: newId,
        category_name: newCategoryName,
        items: [],
        order_afternoon: newId,
        order_morning: newId,
        order_night: newId
      };

      trArray.push(newCategoryTR);
      enArray.push(newCategoryEN);

      const updatePromises = [];
      updatePromises.push(db.ref("menu/tr").set(trArray));
      updatePromises.push(db.ref("menu/en").set(enArray));

      return Promise.all(updatePromises);
    })
    .then(() => {
      alert("Yeni kategori (TR ve EN) eklendi: " + newCategoryName);
      loadMenuData();
    })
    .catch(err => {
      console.error("Kategori eklerken hata:", err);
    });
}
