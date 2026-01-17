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

firebase.auth().onAuthStateChanged(user => {
  if (user) {
  } else {
    window.location.href = "../index.html";
  }
});

function logout() {
  const confirmLogout = confirm("Çıkış yapmak istediğinizden emin misiniz?");

  if (confirmLogout) {
    firebase.auth().signOut().then(() => {
      alert("Çıkış başarılı!");
      window.location.href = "../index.html";
    }).catch((error) => {
      alert("Çıkış yaparken bir hata oluştu: " + error.message);
    });
  }
}

const urlParams = new URLSearchParams(window.location.search);
const categoryName = urlParams.get("category");
const categoryId = urlParams.get("id");

console.log("Category Name:", categoryName);
console.log("Category ID:", categoryId);

window.onload = () => {
  setTimeout(() => {
    if (categoryName && categoryId) {
      loadCategoryData(categoryId);
    } else {
      alert("Kategori bilgileri eksik.");
    }
  }, 100);
};

function loadCategoryData(categoryId) {
  document.getElementById("categoryNameTR").value = "Yükleniyor...";
  document.getElementById("categoryNameEN").value = "Yükleniyor...";

  Promise.all([
    db.ref("menu/tr").once("value"),
    db.ref("menu/en").once("value")
  ]).then(([trSnapshot, enSnapshot]) => {
    let categoryFound = false;
    let trCategory = null;
    let enCategory = null;

    trSnapshot.forEach(categorySnapshot => {
      if (categorySnapshot.val().category_id === parseInt(categoryId)) {
        categoryFound = true;
        trCategory = categorySnapshot.val();

        document.getElementById("categoryNameTR").value = trCategory.category_name;

        const pageTitle = document.querySelector('h1');
        if (pageTitle) {
          pageTitle.textContent = `Kategori Düzenle: ${trCategory.category_name}`;
        }

        const itemCount = trCategory.items ? trCategory.items.length : 0;
        const itemCountElement = document.createElement('p');
        itemCountElement.textContent = `Bu kategoride ${itemCount} ürün bulunuyor.`;
        itemCountElement.className = "info-text";

        const existingInfo = document.querySelector('.info-text');
        const formElement = document.querySelector('form');

        if (existingInfo) {
          existingInfo.textContent = itemCountElement.textContent;
        } else if (formElement) {
          formElement.insertBefore(itemCountElement, formElement.firstChild);
        }
      }
    });

    enSnapshot.forEach(categorySnapshot => {
      if (categorySnapshot.val().category_id === parseInt(categoryId)) {
        enCategory = categorySnapshot.val();

        document.getElementById("categoryNameEN").value = enCategory.category_name;
      }
    });

    if (!enCategory && trCategory) {
      document.getElementById("categoryNameEN").value = trCategory.category_name;
    }

    if (!categoryFound) {
      document.getElementById("categoryNameTR").value = "Kategori bulunamadı!";
      document.getElementById("categoryNameEN").value = "Kategori bulunamadı!";
      alert("Kategori bulunamadı! Ana sayfaya yönlendiriliyorsunuz.");
      window.location.href = "main.html";
    }
  }).catch(error => {
    alert("Kategori bilgileri yüklenirken hata oluştu: " + error.message);
    console.error("Kategori yükleme hatası:", error);
  });
}

document.getElementById("editCategoryForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const submitButton = this.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Kaydediliyor...";

  const newCategoryNameTR = document.getElementById("categoryNameTR").value.trim();
  const newCategoryNameEN = document.getElementById("categoryNameEN").value.trim();

  if (!newCategoryNameTR) {
    alert("Türkçe kategori adı boş olamaz.");
    submitButton.disabled = false;
    submitButton.textContent = "Kaydet";
    return;
  }

  if (!categoryId) {
    alert("Kategori ID'si bulunamadı.");
    submitButton.disabled = false;
    submitButton.textContent = "Kaydet";
    return;
  }

  const finalCategoryNameEN = newCategoryNameEN || newCategoryNameTR;

  const trPromise = db.ref("menu/tr").once("value");
  const enPromise = db.ref("menu/en").once("value");

  Promise.all([trPromise, enPromise])
    .then(([trSnapshot, enSnapshot]) => {
      const updatePromises = [];

      trSnapshot.forEach(categorySnapshot => {
        if (categorySnapshot.val().category_id === parseInt(categoryId)) {
          updatePromises.push(
            categorySnapshot.ref.update({
              category_name: newCategoryNameTR
            })
          );
        }
      });

      enSnapshot.forEach(categorySnapshot => {
        if (categorySnapshot.val().category_id === parseInt(categoryId)) {
          updatePromises.push(
            categorySnapshot.ref.update({
              category_name: finalCategoryNameEN
            })
          );
        }
      });

      return Promise.all(updatePromises);
    })
    .then(() => {
      alert("Kategori başarıyla güncellendi (TR ve EN).");
      window.location.href = "main.html";
    })
    .catch(error => {
      alert("Kategori güncellenirken hata oluştu: " + error.message);
      submitButton.disabled = false;
      submitButton.textContent = "Kaydet";
    });
});
