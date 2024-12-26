// Firebase yapılandırması
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

// URL parametrelerinden ürün ve kategori bilgilerini al
const urlParams = new URLSearchParams(window.location.search);
const categoryId = urlParams.get("category");
const itemId = urlParams.get("item");

console.log("Category ID:", categoryId);
console.log("Item ID:", itemId);

firebase.auth().onAuthStateChanged(user => {
    if (user) {
      loadMenuData();
    } else {
      window.location.href = "../index.html";
    }
  });
// Sayfa yüklendiğinde ürün verilerini yükle
window.onload = () => {
    if (categoryId && itemId) {
        loadItemData(categoryId, itemId);
    } else {
        alert("Kategori veya ürün bilgileri eksik.");
    }
};
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
// Ürün verisini Firebase'den yükleme
function loadItemData(categoryId, itemId) {
    db.ref("menu/tr").once("value", snapshot => {
        snapshot.forEach(childSnapshot => {
            const itemsRef = childSnapshot.ref.child("items");
            itemsRef.once("value", itemSnapshot => {
                itemSnapshot.forEach(item => {
                    if (item.val().name === itemId) {
                        // Ürün bilgilerini formda göster
                        document.getElementById("itemName").value = item.val().name;
                        document.getElementById("itemPrice").value = item.val().price;
                        document.getElementById("itemDescription").value = item.val().description;
                        document.getElementById("itemIsActive").checked = item.val().is_active;

                        // Resmi göster
                        const itemImage = document.getElementById("itemImage");
                        itemImage.src = item.val().image_url; // Firebase'den gelen resim URL'si
                    }
                });
            });
        });
    });
}
function uploadImage(file) {
    const storageRef = firebase.storage().ref('menu_images/' + file.name);
    const uploadTask = storageRef.put(file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
            (snapshot) => {
                // Yükleme ilerlemesi (isteğe bağlı)
            }, 
            (error) => {
                reject(error);
            }, 
            () => {
                // Yükleme tamamlandığında URL'yi almak
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                    resolve(downloadURL);
                }).catch((error) => {
                    reject(error);
                });
            }
        );
    });
}
// Ürün düzenleme formunun submit işlemi
// Ürün düzenleme formunun submit işlemi
document.getElementById("editItemForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const updatedName = document.getElementById("itemName").value;
    // Burada parseInt() veya parseFloat() kullanarak sayısal tipe çeviriyoruz
    let updatedPrice = document.getElementById("itemPrice").value;
    updatedPrice = parseInt(updatedPrice);  // int olarak almak için

    // Eğer ondalıklı fiyat girilmesini istiyorsanız:
    // updatedPrice = parseFloat(updatedPrice);

    // Fiyat bilgisini boş veya geçersiz girilmişse kontrol edebilirsiniz
    if (isNaN(updatedPrice)) {
        alert("Lütfen geçerli bir fiyat giriniz.");
        return;
    }

    const updatedDetails = document.getElementById("itemDescription").value;
    const updatedIsActive = document.getElementById("itemIsActive").checked;

    // Yeni resim varsa, yükle
    const fileInput = document.getElementById("itemImageUpload");
    const newImageFile = fileInput.files[0];
    let updatedImageUrl = document.getElementById("itemImage").src;  // Varsayılan resim URL'si

    if (newImageFile) {
        uploadImage(newImageFile).then((imageUrl) => {
            updatedImageUrl = imageUrl;
            updateItemInDatabase(updatedName, updatedPrice, updatedDetails, updatedImageUrl, updatedIsActive);
        }).catch((error) => {
            alert("Resim yüklenirken bir hata oluştu: " + error.message);
        });
    } else {
        updateItemInDatabase(updatedName, updatedPrice, updatedDetails, updatedImageUrl, updatedIsActive);
    }
});


// Veriyi Firebase'e güncelleme
function updateItemInDatabase(updatedName, updatedPrice, updatedDetails, updatedImageUrl, updatedIsActive) {
    db.ref("menu/tr").once("value", snapshot => {
        snapshot.forEach(childSnapshot => {
            const itemsRef = childSnapshot.ref.child("items");
            itemsRef.once("value", itemSnapshot => {
                itemSnapshot.forEach(item => {
                    if (item.val().name === itemId) {
                        // Güncellenmiş verileri Firebase'e yaz
                        item.ref.update({
                            name: updatedName,
                            price: updatedPrice,
                            description: updatedDetails,
                            image_url: updatedImageUrl,
                            is_active: updatedIsActive
                        }).then(() => {
                            alert("Ürün başarıyla güncellendi.");
                            window.location.href = "main.html"; // Anasayfaya dön
                        }).catch(error => {
                            alert("Veri güncellenirken bir hata oluştu: " + error.message);
                        });
                    }
                });
            });
        });
    });
}
