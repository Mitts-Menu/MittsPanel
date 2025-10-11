// ----------------------------------------------------
// Firebase Config
// ----------------------------------------------------
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
    window.location.href = "../index.html";
  }
});

// ----------------------------------------------------
// Menü verilerini yükleme
// ----------------------------------------------------
function loadMenuData() {
  const container = document.getElementById("menuContainer");
  container.innerHTML = "<p>Yükleniyor...</p>";

  // Hem TR hem EN menülerini paralel olarak al
  Promise.all([
      db.ref("menu/tr").once("value"),
      db.ref("menu/en").once("value")
  ]).then(([trSnapshot, enSnapshot]) => {
      const trMenuData = trSnapshot.val();
      const enMenuData = enSnapshot.val();
      container.innerHTML = "";

      if (!trMenuData || !Array.isArray(trMenuData)) {
          container.innerHTML = "<p>Menü verisi bulunamadı veya geçersiz format.</p>";
          return;
      }

      // Kategorileri ID'ye göre sırala
      trMenuData.sort((a, b) => a.category_id - b.category_id);

      trMenuData.forEach((category) => {
          // Kategori Div
          const categoryDiv = document.createElement("div");
          categoryDiv.className = "category";

          // Kategori Başlık ve Toggle İşlevi
          const categoryHeaderDiv = document.createElement("div");
          categoryHeaderDiv.className = "category-header";
          categoryHeaderDiv.style.display = "flex";
          categoryHeaderDiv.style.justifyContent = "space-between";
          categoryHeaderDiv.style.alignItems = "center";
          categoryHeaderDiv.style.cursor = "pointer";

          const categoryTitle = document.createElement("span");
          categoryTitle.textContent = category.category_name;

          // Ürün listesini toggle et
          categoryHeaderDiv.onclick = () => {
              const itemList = categoryDiv.querySelector(".item-list");
              if (itemList.style.display === "none") {
                  itemList.style.display = "block";
              } else {
                  itemList.style.display = "none";
              }
          };

          categoryHeaderDiv.appendChild(categoryTitle);
          categoryDiv.appendChild(categoryHeaderDiv);

          // Ürün listesi
          const itemList = document.createElement("div");
          itemList.className = "item-list";
          itemList.style.display = "none"; // Başlangıçta kapalı

          if (category.items && category.items.length > 0) {
              category.items.forEach(item => {
                  const itemDiv = document.createElement("div");
                  itemDiv.className = "item";

                  // Görsel fallback
                  if (!item.image_url || item.image_url === "" || item.image_url === "undefined") {
                      item.image_url = "../img/mitts_logo.png";
                  }

                  // Ürün adı
                  const nameSpan = document.createElement("span");
                  nameSpan.textContent = item.name + " - ";

                  // Fiyat Textbox
                  const priceInput = document.createElement("input");
                  priceInput.type = "number";
                  priceInput.value = item.price;
                  priceInput.style.width = "80px";

                  // Onay butonu
                  const confirmButton = document.createElement("button");
                  confirmButton.textContent = "Fiyatı Onayla";
                  confirmButton.onclick = () => {
                      const newPrice = parseFloat(priceInput.value);

                      if (isNaN(newPrice)) {
                          alert("Geçerli bir fiyat giriniz!");
                          return;
                      }

                      // Hem TR hem EN menüsünü güncelle
                      updateItemPrice(category.category_id, item.id, newPrice, trMenuData, enMenuData);
                  };

                  itemDiv.appendChild(nameSpan);
                  itemDiv.appendChild(priceInput);
                  itemDiv.appendChild(document.createTextNode(" TL "));
                  itemDiv.appendChild(confirmButton);

                  itemList.appendChild(itemDiv);
              });
          } else {
              const noItems = document.createElement("p");
              noItems.textContent = "Bu kategoride ürün bulunmuyor.";
              itemList.appendChild(noItems);
          }

          categoryDiv.appendChild(itemList);
          container.appendChild(categoryDiv);
      });
  }).catch(error => {
      console.error("Menü verileri yüklenirken hata oluştu:", error);
      container.innerHTML = "<p>Menü verileri yüklenirken bir hata oluştu.</p>";
  });
}

// ----------------------------------------------------
// Fiyat Güncelleme Fonksiyonu
// ----------------------------------------------------
function updateItemPrice(categoryId, itemId, newPrice, trMenuData, enMenuData) {
    let updatePromises = [];

    // TR menüsünde güncelle
    const trCategoryIndex = trMenuData.findIndex(cat => cat.category_id === categoryId);
    if (trCategoryIndex !== -1) {
        const trItemIndex = trMenuData[trCategoryIndex].items.findIndex(item => item.id === itemId);
        if (trItemIndex !== -1) {
            trMenuData[trCategoryIndex].items[trItemIndex].price = newPrice;
            updatePromises.push(db.ref(`menu/tr/${trCategoryIndex}/items/${trItemIndex}/price`).set(newPrice));
        }
    }

    // EN menüsünde güncelle
    const enCategoryIndex = enMenuData.findIndex(cat => cat.category_id === categoryId);
    if (enCategoryIndex !== -1) {
        const enItemIndex = enMenuData[enCategoryIndex].items.findIndex(item => item.id === itemId);
        if (enItemIndex !== -1) {
            enMenuData[enCategoryIndex].items[enItemIndex].price = newPrice;
            updatePromises.push(db.ref(`menu/en/${enCategoryIndex}/items/${enItemIndex}/price`).set(newPrice));
        }
    }

    Promise.all(updatePromises)
        .then(() => {
            alert("Fiyat başarıyla güncellendi!");
        })
        .catch(error => {
            alert("Fiyat güncellenirken bir hata oluştu: " + error.message);
        });
}
