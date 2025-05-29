// Firebase yapılandırması
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

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Firebase bağlantısı
const db = firebase.database();

// URL parametrelerinden ürün ve kategori bilgilerini al
const urlParams = new URLSearchParams(window.location.search);
const categoryName = urlParams.get("category");
const categoryId = urlParams.get("id"); // Kategori ID'sini al
const itemId = urlParams.get("item");

console.log("Category Name:", categoryName);
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
    // TR ve EN menülerini paralel olarak al
    Promise.all([
        db.ref("menu/tr").once("value"),
        db.ref("menu/en").once("value")
    ]).then(([trSnapshot, enSnapshot]) => {
        let trItem = null;
        let enItem = null;
        let itemNumericId = null;
        
        // TR verisini bul
        trSnapshot.forEach(categorySnapshot => {
            if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                const itemsArray = categorySnapshot.val().items || [];
                // Önce isim ile eşleşen ürünü bul
                const foundItem = itemsArray.find(item => item.name === itemId);
                
                if (foundItem) {
                    trItem = foundItem;
                    itemNumericId = foundItem.id;
                    
                    // TR verilerini formda göster
                    document.getElementById("itemNameTR").value = foundItem.name;
                    document.getElementById("itemDescriptionTR").value = foundItem.description;
                    document.getElementById("itemPrice").value = foundItem.price;
                    document.getElementById("itemIsActive").checked = foundItem.is_active;

                    // Resmi göster
                    const itemImage = document.getElementById("itemImage");
                    
                    // Eğer image_url boş veya tanımsız ise, placeholder kullan
                    if (!foundItem.image_url || foundItem.image_url === "" || foundItem.image_url === "undefined") {
                        itemImage.src = "../img/mitts_logo.png";
                    } else {
                        itemImage.src = foundItem.image_url;
                    }
                }
            }
        });
        
        // EN verisini ID ile bul 
        if (itemNumericId) {
            enSnapshot.forEach(categorySnapshot => {
                if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                    const itemsArray = categorySnapshot.val().items || [];
                    // ID ile eşleşen ürünü bul
                    const foundItem = itemsArray.find(item => item.id === itemNumericId);
                    
                    if (foundItem) {
                        enItem = foundItem;
                        
                        // EN verilerini formda göster
                        document.getElementById("itemNameEN").value = foundItem.name;
                        document.getElementById("itemDescriptionEN").value = foundItem.description;
                    }
                }
            });
        }

        // Eğer EN verisi bulunamadıysa TR verilerini kullan
        if (!enItem && trItem) {
            document.getElementById("itemNameEN").value = trItem.name;
            document.getElementById("itemDescriptionEN").value = trItem.description;
        }
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
document.getElementById("editItemForm").addEventListener("submit", function (event) {
    event.preventDefault();

    // Butonun birden fazla kez tıklanmasını engelle
    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Güncelleniyor...";

    const updatedNameTR = document.getElementById("itemNameTR").value.trim();
    const updatedNameEN = document.getElementById("itemNameEN").value.trim();
    const updatedDetailsTR = document.getElementById("itemDescriptionTR").value.trim();
    const updatedDetailsEN = document.getElementById("itemDescriptionEN").value.trim();
    
    // İsim alanları için kontrol
    if (!updatedNameTR) {
        alert("Türkçe ürün adı boş olamaz.");
        submitButton.disabled = false;
        submitButton.textContent = "Ürünü Güncelle";
        return;
    }
    
    // EN alanları boşsa TR verilerini kullan
    const finalNameEN = updatedNameEN || updatedNameTR;
    const finalDetailsEN = updatedDetailsEN || updatedDetailsTR;
    
    // Burada parseInt() veya parseFloat() kullanarak sayısal tipe çeviriyoruz
    let updatedPrice = document.getElementById("itemPrice").value;
    updatedPrice = parseInt(updatedPrice);  // int olarak almak için

    // Eğer ondalıklı fiyat girilmesini istiyorsanız:
    // updatedPrice = parseFloat(updatedPrice);

    // Fiyat bilgisini boş veya geçersiz girilmişse kontrol edebilirsiniz
    if (isNaN(updatedPrice)) {
        alert("Lütfen geçerli bir fiyat giriniz.");
        submitButton.disabled = false;
        submitButton.textContent = "Ürünü Güncelle";
        return;
    }

    const updatedIsActive = document.getElementById("itemIsActive").checked;

    // Yeni resim varsa, yükle
    const fileInput = document.getElementById("itemImageUpload");
    const newImageFile = fileInput.files[0];
    
    // Mevcut resmin URL'sini al - şu anki görüntülenen kaynak
    let currentImageUrl = document.getElementById("itemImage").src;
    
    // Eğer görüntülenen resim placeholder ise
    const isPlaceholder = currentImageUrl.includes("mitts_logo.png");
    
    // Firebase'den aldığımız orijinal resmi hatırla (veri kaybını önlemek için)
    let originalImageUrl = null;
    
    // Tüm TR menüsünü çekip kategori ID'sine göre filtreleme
    db.ref("menu/tr").once("value", snapshot => {
        snapshot.forEach(categorySnapshot => {
            // Kategori ID'si eşleşiyorsa
            if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                const itemsArray = categorySnapshot.val().items || [];
                
                // Ürünler arasında adı eşleşeni bul
                const foundItem = itemsArray.find(item => item.name === itemId);
                
                if (foundItem) {
                    // Orijinal resim URL'sini sakla
                    originalImageUrl = foundItem.image_url;
                    
                    // Yeni resim yükleme işlemine devam et
                    if (newImageFile) {
                        uploadImage(newImageFile).then((newImageUrl) => {
                            // Yeni resim yüklenmişse bu URL'yi kullan
                            updateItemInDatabase(updatedNameTR, finalNameEN, updatedPrice, updatedDetailsTR, finalDetailsEN, newImageUrl, updatedIsActive);
                        }).catch((error) => {
                            alert("Resim yüklenirken bir hata oluştu: " + error.message);
                            submitButton.disabled = false;
                            submitButton.textContent = "Ürünü Güncelle";
                        });
                    } else {
                        // Yeni resim yüklenmediyse
                        let finalImageUrl;
                        
                        // Orijinal bir resim varsa ve placeholder görüntülenmiyorsa
                        if (originalImageUrl && originalImageUrl !== "" && !isPlaceholder && originalImageUrl !== "undefined") {
                            // Orijinal resmi koru
                            finalImageUrl = originalImageUrl;
                        } else if (isPlaceholder) {
                            // Zaten placeholder gösteriliyorsa placeholder kullan
                            finalImageUrl = "../img/mitts_logo.png";
                        } else {
                            // Eğer orijinal resim yoksa veya geçersizse placeholder kullan
                            finalImageUrl = "../img/mitts_logo.png";
                        }
                        
                        updateItemInDatabase(updatedNameTR, finalNameEN, updatedPrice, updatedDetailsTR, finalDetailsEN, finalImageUrl, updatedIsActive);
                    }
                }
            }
        });
    });
});

// Veriyi Firebase'e güncelleme
function updateItemInDatabase(updatedNameTR, updatedNameEN, updatedPrice, updatedDetailsTR, updatedDetailsEN, updatedImageUrl, updatedIsActive) {
    // TR ve EN menü güncellemelerini paralel olarak toplamak için
    let updatePromises = [];
    
    // TR ve EN tüm menü verilerini çek
    const trPromise = db.ref("menu/tr").once("value");
    const enPromise = db.ref("menu/en").once("value");
    
    // Her iki menüyü de aynı anda sorgulayalım
    Promise.all([trPromise, enPromise])
        .then(([trSnapshot, enSnapshot]) => {
            let itemNumericId = null;
            
            // TR menüsünde kategori ID'sine göre eşleşen kategoriyi bul
            trSnapshot.forEach(categorySnapshot => {
                // Kategori ID'si eşleşiyorsa
                if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                    const itemsArray = categorySnapshot.val().items || [];
                    
                    // Ürünler içinde güncelleme yapılacak ürünü bul
                    const itemIndex = itemsArray.findIndex(item => item.name === itemId);
                    
                    if (itemIndex !== -1) {
                        // Ürün ID'sini kaydet
                        itemNumericId = itemsArray[itemIndex].id;
                        
                        // Ürünü güncelle
                        itemsArray[itemIndex] = {
                            ...itemsArray[itemIndex],
                            name: updatedNameTR,
                            price: updatedPrice,
                            description: updatedDetailsTR,
                            image_url: updatedImageUrl,
                            is_active: updatedIsActive
                        };
                        
                        // Değişiklikleri kaydet
                        updatePromises.push(
                            categorySnapshot.ref.child("items").set(itemsArray)
                        );
                    }
                }
            });
            
            // ID'ye sahip değilsek hata döndür
            if (!itemNumericId) {
                throw new Error("Güncellenecek ürün ID'si bulunamadı");
            }
            
            // EN menüsünde kategori ID'sine göre eşleşen kategoriyi bul
            enSnapshot.forEach(categorySnapshot => {
                // Kategori ID'si eşleşiyorsa
                if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                    const itemsArray = categorySnapshot.val().items || [];
                    
                    // Ürünler içinde güncelleme yapılacak ürünü ID'ye göre bul
                    const itemIndex = itemsArray.findIndex(item => item.id === itemNumericId);
                    
                    if (itemIndex !== -1) {
                        // Ürünü güncelle
                        itemsArray[itemIndex] = {
                            ...itemsArray[itemIndex],
                            name: updatedNameEN, // EN için farklı isim
                            price: updatedPrice,
                            description: updatedDetailsEN, // EN için farklı açıklama
                            image_url: updatedImageUrl,
                            is_active: updatedIsActive // Aktiflik durumu her iki dil için de aynı
                        };
                        
                        // Değişiklikleri kaydet
                        updatePromises.push(
                            categorySnapshot.ref.child("items").set(itemsArray)
                        );
                    } else {
                        // Eğer EN menüsünde bu ID'ye sahip ürün yoksa, yeni bir ürün olarak ekle
                        const newItem = {
                            id: itemNumericId,
                            name: updatedNameEN,
                            price: updatedPrice,
                            description: updatedDetailsEN,
                            image_url: updatedImageUrl,
                            is_active: updatedIsActive,
                            is_popular: false, // Varsayılan değer
                            allergens: []
                        };
                        
                        itemsArray.push(newItem);
                        
                        // Değişiklikleri kaydet
                        updatePromises.push(
                            categorySnapshot.ref.child("items").set(itemsArray)
                        );
                    }
                }
            });
            
            // Tüm güncellemeleri paralel olarak çalıştır
            return Promise.all(updatePromises);
        })
        .then(() => {
            alert("Ürün TR ve EN menülerinde eşzamanlı olarak güncellendi.");
            window.location.href = "main.html"; // Anasayfaya dön
        })
        .catch(error => {
            alert("Veri güncellenirken bir hata oluştu: " + error.message);
            // Eğer form hala görünüyorsa butonu tekrar etkinleştir
            const submitButton = document.querySelector('#editItemForm button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Ürünü Güncelle";
            }
        });
}
