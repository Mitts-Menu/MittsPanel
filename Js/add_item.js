// ----------------------------------------------------
// Firebase Config (aynen tekrar)
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
  firebase.initializeApp(firebaseConfig);
  
  const db = firebase.database();
  const storage = firebase.storage();

  // ----------------------------------------------------
  // URL'den kategori adını al
  // ----------------------------------------------------
  const urlParams = new URLSearchParams(window.location.search);
  const categoryName = urlParams.get("category");
  const categoryId = urlParams.get("id"); // Kategori ID'si
  
  // Sayfa başlığında kategori bilgisini göster (opsiyonel)
  document.addEventListener("DOMContentLoaded", function() {
    const titleElement = document.querySelector(".edit-container h2");
    if (titleElement) {
      titleElement.textContent = `${categoryName} - Yeni Ürün Ekle`;
    }
  });
  
  // ----------------------------------------------------
  // Sayfa yüklenince oturum kontrolü
  // ----------------------------------------------------
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      window.location.href = "../index.html";
    }
  });

  // ----------------------------------------------------
  // Form Submit -> Resim varsa önce yükle, sonra DB'ye yaz
  // ----------------------------------------------------
  document.getElementById("addItemForm").addEventListener("submit", function(e) {
    e.preventDefault();
  
    // Form butonunu devre dışı bırak
    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Ekleniyor...";
  
    // Form alanlarını al
    const itemNameTR = document.getElementById("itemNameTR").value.trim();
    const itemNameEN = document.getElementById("itemNameEN").value.trim();
    const itemDescriptionTR = document.getElementById("itemDescriptionTR").value.trim();
    const itemDescriptionEN = document.getElementById("itemDescriptionEN").value.trim();
    let itemPrice = parseFloat(document.getElementById("itemPrice").value);
    const itemIsPopular = document.getElementById("itemIsPopular").checked;
    const itemIsActive = document.getElementById("itemIsActive").checked;
  
    if (!itemNameTR) {
      alert("Türkçe ürün adı boş olamaz.");
      submitButton.disabled = false;
      submitButton.textContent = "Ürünü Kaydet";
      return;
    }
    if (isNaN(itemPrice)) {
      alert("Geçerli bir fiyat giriniz.");
      submitButton.disabled = false;
      submitButton.textContent = "Ürünü Kaydet";
      return;
    }
  
    // EN alanları boşsa TR verilerini kullan
    const finalNameEN = itemNameEN || itemNameTR;
    const finalDescriptionEN = itemDescriptionEN || itemDescriptionTR;
  
    // Resim dosyası
    const imageFile = document.getElementById("itemImage").files[0];
  
    if (imageFile) {
      // 1) Resim seçilmişse, önce Firebase Storage'a yükleyelim
      uploadImage(imageFile)
        .then(({ downloadURL, storagePath }) => {
          // 2) Download URL'yi alıp DB'ye ekle
          addItemToCategory(itemNameTR, finalNameEN, itemPrice, itemDescriptionTR, finalDescriptionEN, itemIsPopular, itemIsActive, downloadURL)
            .then(() => {
              alert("Ürün ve resmi başarıyla eklendi!");
              window.location.href = "./main.html"; // Ana sayfaya dön
            })
            .catch(err => {
              alert("Ürün eklenirken hata: " + err);
              submitButton.disabled = false;
              submitButton.textContent = "Ürünü Kaydet";
            });
        })
        .catch(err => {
          alert("Resim yüklenemedi: " + err);
          submitButton.disabled = false;
          submitButton.textContent = "Ürünü Kaydet";
        });
    } else {
      // Resim seçilmemişse, placeholder olarak mitts_logo kullan
      const placeholderImageURL = "../img/mitts_logo.png";
      addItemToCategory(itemNameTR, finalNameEN, itemPrice, itemDescriptionTR, finalDescriptionEN, itemIsPopular, itemIsActive, placeholderImageURL)
        .then(() => {
          alert("Ürün başarıyla eklendi!");
          window.location.href = "./main.html";
        })
        .catch(err => {
          alert("Ürün eklenirken hata: " + err);
          submitButton.disabled = false;
          submitButton.textContent = "Ürünü Kaydet";
        });
    }
  });
  
  // ----------------------------------------------------
  // Firebase Storage'a resmi yükleyen fonksiyon
  // ----------------------------------------------------
  function getNextImageSequence() {
    const counterRef = firebase.database().ref("counters/image_seq");
    return counterRef.transaction(current => (current || 0) + 1)
      .then(result => {
        if (!result.committed) {
          throw new Error("Görsel sayaç güncellenemedi");
        }
        return result.snapshot.val();
      });
  }

  function getFileExtension(file) {
    const name = file.name || "";
    const dot = name.lastIndexOf(".");
    if (dot !== -1) {
      return name.substring(dot);
    }
    // Dosya adında uzantı yoksa, MIME tipinden tahmin et
    switch (file.type) {
      case "image/webp": return ".webp";
      case "image/jpeg": return ".jpg";
      case "image/png": return ".png";
      default: return "";
    }
  }

  function uploadImage(file) {
    return new Promise((resolve, reject) => {
      getNextImageSequence()
        .then(seq => {
          // Dosya uzantısını al
          const ext = getFileExtension(file);
          // Her zaman .webp uzantısı kullan
          const fileName = "0J6A282x" + seq + ".webp";
          const storagePath = "MittsWebp/" + fileName;
          const storageRef = storage.ref().child(storagePath);

          const uploadTask = storageRef.put(file);
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log("Yükleme ilerlemesi: " + progress + "%");
            },
            (error) => {
              reject(error);
            },
            () => {
              // Download URL yerine direkt dosya yolunu kullan
              const imageUrl = "MittsWebp/0J6A282x" + seq + ".webp";
              resolve({ downloadURL: imageUrl, storagePath });
            }
          );
        })
        .catch(reject);
    });
  }
  
  // ----------------------------------------------------
  // Hem menu/tr hem menu/en'e ekle
  // ----------------------------------------------------
  function addItemToCategory(nameTR, nameEN, price, descTR, descEN, isPopular, isActive, imageUrl) {
    return new Promise((resolve, reject) => {
      console.log("Ürün ekleme başladı:", nameTR, "(TR)", nameEN, "(EN)");
      console.log("Kategori ID:", categoryId);
      console.log("Aktif:", isActive, "Popüler:", isPopular);
      
      // Tanımsız veya boş değerleri kontrol et
      if (!nameTR || !nameEN || !imageUrl || isNaN(price)) {
        return reject("Eksik veya geçersiz veri. Lütfen tüm alanları kontrol edin.");
      }
      
      if (!categoryId) {
        console.error("Kategori ID'si bulunamadı!");
        return reject("Kategori ID'si bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
      }
      
      // TR ve EN kategorilerin referansları
      const trRef = db.ref("menu/tr");
      const enRef = db.ref("menu/en");
      
      // Tüm menüleri al ve kategori ID'sine göre eşleştir
      Promise.all([
        trRef.once("value"),
        enRef.once("value")
      ])
      .then(([trFullSnapshot, enFullSnapshot]) => {
        let trCategory = null;
        let trCategoryKey = null;
        let trCategoryItems = [];
        
        let enCategory = null;
        let enCategoryKey = null;
        let enCategoryItems = [];
        
        // TR menüsünden ID'ye göre kategori bul
        trFullSnapshot.forEach(child => {
          if (child.val().category_id === parseInt(categoryId)) {
            trCategory = child.val();
            trCategoryKey = child.key;
            // Dizi boş veya tanımsız ise boş dizi oluştur, değilse temizle
            trCategoryItems = Array.isArray(child.val().items) ? 
              child.val().items.filter(item => item !== null && item !== undefined) : [];
            console.log("TR Kategori bulundu:", trCategory.category_name, "ID:", trCategory.category_id, "Key:", trCategoryKey);
          }
        });
        
        // TR kategori kontrolü
        if (!trCategory) {
          throw new Error(`Kategori ID ${categoryId} ile eşleşen TR kategori bulunamadı!`);
        }
        
        // EN menüsünden aynı ID'ye sahip kategori bul
        enFullSnapshot.forEach(child => {
          if (child.val().category_id === parseInt(categoryId)) {
            enCategory = child.val();
            enCategoryKey = child.key;
            // Dizi boş veya tanımsız ise boş dizi oluştur, değilse temizle
            enCategoryItems = Array.isArray(child.val().items) ? 
              child.val().items.filter(item => item !== null && item !== undefined) : [];
            console.log("EN Kategori bulundu:", enCategory.category_name, "ID:", enCategory.category_id, "Key:", enCategoryKey);
          }
        });
        
        // Eğer EN kategorisi yoksa oluştur
        if (!enCategory) {
          console.log("EN'de kategori bulunamadı, ID ile eşleşen yeni kategori oluşturuluyor.");
          
          // Tüm EN kategorilerini al
          let enMenuArray = [];
          enFullSnapshot.forEach(child => {
            enMenuArray.push(child.val());
          });
          
          // Yeni EN kategorisi oluştur, TR ile aynı ID
          const newEnCategory = {
            category_id: parseInt(categoryId), // TR ile aynı ID
            category_name: trCategory.category_name, // TR ile aynı isim
            items: []
          };
          
          // EN menüsüne ekle
          enMenuArray.push(newEnCategory);
          
          // EN menüsünü güncelle ve yeni oluşturulan kategorinin key'ini al
          return enRef.set(enMenuArray)
            .then(() => {
              // Yeni key'i bulmak için tekrar sorgula
              return enRef.orderByChild("category_id").equalTo(parseInt(categoryId)).once("value");
            })
            .then(newEnCategorySnapshot => {
              if (!newEnCategorySnapshot.exists()) {
                throw new Error("EN kategorisi oluşturuldu fakat bulunamadı!");
              }
              
              newEnCategorySnapshot.forEach(child => {
                enCategory = child.val();
                enCategoryKey = child.key;
                enCategoryItems = [];
                console.log("Yeni EN Kategori oluşturuldu:", enCategory.category_name, "ID:", enCategory.category_id, "Key:", enCategoryKey);
              });
              
              return { trCategory, trCategoryKey, trCategoryItems, enCategory, enCategoryKey, enCategoryItems };
            });
        }
        
        // Eğer EN kategorisi zaten varsa, devam et
        return { trCategory, trCategoryKey, trCategoryItems, enCategory, enCategoryKey, enCategoryItems };
      })
      .then(data => {
        let { trCategory, trCategoryKey, trCategoryItems, enCategory, enCategoryKey, enCategoryItems } = data;
        
        console.log("İşleme devam, TR kategori:", trCategory.category_name, "EN kategori:", enCategory.category_name);
        
        // Yeni ürün ID'si oluştur
        let newItemId = 0;
        
        if (trCategoryItems.length === 0) {
          // İlk ürün için: kategori ID * 100 + 1
          newItemId = trCategory.category_id * 100 + 1;
        } else {
          // En yüksek ID'yi bul ve 1 ekle
          let maxId = 0;
          trCategoryItems.forEach(item => {
            if (item && item.id && item.id > maxId) {
              maxId = item.id;
            }
          });
          newItemId = maxId + 1;
        }
        
        console.log("Yeni ürün ID:", newItemId);
        
        // TR için yeni ürün nesnesi
        const newItemTR = {
          id: newItemId,
          name: nameTR,
          price: price,
          description: descTR,
          image_url: imageUrl,
          is_active: isActive,
          is_popular: isPopular,
          allergens: []
        };
        
        // EN için yeni ürün nesnesi 
        const newItemEN = {
          id: newItemId,
          name: nameEN,
          price: price,
          description: descEN,
          image_url: imageUrl,
          is_active: isActive,
          is_popular: isPopular,
          allergens: []
        };
        
        console.log("TR: " + (isActive ? "Aktif" : "Pasif") + " & " + (isPopular ? "Popüler" : "Normal"));
        console.log("EN: " + (isActive ? "Aktif" : "Pasif") + " & " + (isPopular ? "Popüler" : "Normal"));
        
        // Güncellemeler için Promise'lar
        const updatePromises = [];
        
        // TR kategorisine ürünü ekle
        trCategoryItems = trCategoryItems.filter(item => item !== null && item !== undefined);
        // Dizi indekslerini düzelt (sparse array sorununu önle)
        trCategoryItems = trCategoryItems.map(item => item);
        trCategoryItems.push(newItemTR);
        updatePromises.push(
          trRef.child(trCategoryKey).child("items").set(trCategoryItems)
        );
        
        // EN kategorisine ürünü ekle
        enCategoryItems = enCategoryItems.filter(item => item !== null && item !== undefined);
        // Dizi indekslerini düzelt (sparse array sorununu önle)
        enCategoryItems = enCategoryItems.map(item => item);
        enCategoryItems.push(newItemEN);
        updatePromises.push(
          enRef.child(enCategoryKey).child("items").set(enCategoryItems)
        );
        
        // Tüm güncellemeleri uygula
        console.log("Toplam 2 güncelleme yapılacak (TR ve EN)");
        return Promise.all(updatePromises);
      })
      .then(() => {
        console.log("Tüm güncellemeler başarıyla tamamlandı");
        resolve();
      })
      .catch(error => {
        console.error("Hata:", error);
        reject(error.message || error);
      });
    });
  }
  
  
