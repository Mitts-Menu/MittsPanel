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

firebase.initializeApp(firebaseConfig);

const db = firebase.database();

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    // Ana sayfadaki fonksiyona burada gerek yok, sadece oturum kontrolü yapalım
  } else {
    window.location.href = "../index.html";
  }
});
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

// URL parametrelerinden kategori bilgilerini almak
const urlParams = new URLSearchParams(window.location.search);
const categoryName = urlParams.get("category");
const categoryId = urlParams.get("id"); // Kategori ID'sini al

console.log("Category Name:", categoryName);
console.log("Category ID:", categoryId);

// Sayfa yüklendiğinde kategori verilerini getir
window.onload = () => {
  // Form elementinin DOM'da olduğundan emin olalım
  setTimeout(() => {
    if (categoryName && categoryId) {
      loadCategoryData(categoryId);
    } else {
      alert("Kategori bilgileri eksik.");
    }
  }, 100); // Kısa bir gecikme sağlayarak DOM'un yüklenmesini bekleyelim
};

// Kategori verisini yükleme - artık ID'ye göre
function loadCategoryData(categoryId) {
  // Yüklenirken bilgi ver
  document.getElementById("categoryNameTR").value = "Yükleniyor...";
  document.getElementById("categoryNameEN").value = "Yükleniyor...";
  
  // TR ve EN menülerini paralel olarak çek
  Promise.all([
    db.ref("menu/tr").once("value"),
    db.ref("menu/en").once("value")
  ]).then(([trSnapshot, enSnapshot]) => {
    let categoryFound = false;
    let trCategory = null;
    let enCategory = null;
    
    // TR menüsünde kategoriyi bul
    trSnapshot.forEach(categorySnapshot => {
      // Kategori ID'si eşleşirse
      if (categorySnapshot.val().category_id === parseInt(categoryId)) {
        categoryFound = true;
        trCategory = categorySnapshot.val();
        
        // TR kategori bilgilerini forma yükle
        document.getElementById("categoryNameTR").value = trCategory.category_name;
        
        // Formun başlığını güncelle (önce varsa kontrol et)
        const pageTitle = document.querySelector('h1');
        if (pageTitle) {
          pageTitle.textContent = `Kategori Düzenle: ${trCategory.category_name}`;
        }
        
        // İçerdiği ürünlerin sayısını göster
        const itemCount = trCategory.items ? trCategory.items.length : 0;
        const itemCountElement = document.createElement('p');
        itemCountElement.textContent = `Bu kategoride ${itemCount} ürün bulunuyor.`;
        itemCountElement.className = "info-text";
        
        // Eğer zaten eklenmiş bir eleman varsa değiştir, yoksa ekle
        const existingInfo = document.querySelector('.info-text');
        const formElement = document.querySelector('form');
        
        if (existingInfo) {
          existingInfo.textContent = itemCountElement.textContent;
        } else if (formElement) {
          formElement.insertBefore(itemCountElement, formElement.firstChild);
        }
      }
    });
    
    // EN menüsünde aynı ID'li kategoriyi bul
    enSnapshot.forEach(categorySnapshot => {
      if (categorySnapshot.val().category_id === parseInt(categoryId)) {
        enCategory = categorySnapshot.val();
        
        // EN kategori bilgilerini forma yükle
        document.getElementById("categoryNameEN").value = enCategory.category_name;
      }
    });
    
    // Eğer EN kategorisi bulunamadıysa veya adı yoksa, TR adını kopyala
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

// Kategori düzenleme formunun submit işlemi
document.getElementById("editCategoryForm").addEventListener("submit", function (event) {
  event.preventDefault();

  // Butonun birden fazla kez tıklanmasını engelle
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
  
  // Eğer EN adı boşsa TR adını kullan
  const finalCategoryNameEN = newCategoryNameEN || newCategoryNameTR;

  // TR ve EN tüm menü verilerini çek
  const trPromise = db.ref("menu/tr").once("value");
  const enPromise = db.ref("menu/en").once("value");

  Promise.all([trPromise, enPromise])
    .then(([trSnapshot, enSnapshot]) => {
      const updatePromises = [];
      
      // TR menüsünde ID'ye göre kategoriyi bul ve güncelle
      trSnapshot.forEach(categorySnapshot => {
        if (categorySnapshot.val().category_id === parseInt(categoryId)) {
          updatePromises.push(
            categorySnapshot.ref.update({
              category_name: newCategoryNameTR
            })
          );
        }
      });
      
      // EN menüsünde ID'ye göre kategoriyi bul ve güncelle
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
      window.location.href = "main.html"; // Anasayfaya geri dön
    })
    .catch(error => {
      alert("Kategori güncellenirken hata oluştu: " + error.message);
      submitButton.disabled = false;
      submitButton.textContent = "Kaydet";
    });
});