

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
    loadMenuData();
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

// URL parametrelerinden kategori adı almak
const urlParams = new URLSearchParams(window.location.search);
const categoryName = urlParams.get("category");

// Sayfa yüklendiğinde kategori verilerini getir
window.onload = () => {
  if (categoryName) {
    loadCategoryData(categoryName);
  }
};

// Kategori verisini yükleme
function loadCategoryData(categoryName) {
  db.ref("menu/tr").orderByChild("category_name").equalTo(categoryName).once("value", snapshot => {
    snapshot.forEach(childSnapshot => {
      const category = childSnapshot.val();
      document.getElementById("categoryName").value = category.category_name;
    });
  });
}

// Kategori düzenleme formunun submit işlemi
document.getElementById("editCategoryForm").addEventListener("submit", function (event) {
  event.preventDefault();

  const newCategoryName = document.getElementById("categoryName").value.trim();

  if (newCategoryName) {
    db.ref("menu/tr").orderByChild("category_name").equalTo(categoryName).once("value", snapshot => {
      snapshot.forEach(childSnapshot => {
        childSnapshot.ref.update({
          category_name: newCategoryName
        });
      });
    });
    alert("Kategori başarıyla güncellendi.");
    window.location.href = "main.html"; // Anasayfaya geri dön
  }
});