// ----------------------------------------------------
// Firebase Config (aynen tekrar)
// ----------------------------------------------------
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
      return;
    }
    if (isNaN(itemPrice)) {
      alert("Geçerli bir fiyat giriniz.");
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
        .then(downloadURL => {
          // 2) Download URL'yi alıp DB'ye ekle
          addItemToCategory(itemNameTR, finalNameEN, itemPrice, itemDescriptionTR, finalDescriptionEN, itemIsPopular, itemIsActive, downloadURL)
            .then(() => {
              alert("Ürün ve resmi başarıyla eklendi!");
              window.location.href = "./main.html"; // Ana sayfaya dön
            })
            .catch(err => {
              alert("Ürün eklenirken hata: " + err);
            });
        })
        .catch(err => {
          alert("Resim yüklenemedi: " + err);
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
        });
    }
  });
  
  // ----------------------------------------------------
  // Firebase Storage'a resmi yükleyen fonksiyon
  // ----------------------------------------------------
  function uploadImage(file) {
    return new Promise((resolve, reject) => {
      // Storage içinde "item_images" klasörüne yükleyelim (isteğe göre isimlendir)
      const storageRef = storage.ref().child("item_images/" + file.name);
  
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
          uploadTask.snapshot.ref
            .getDownloadURL()
            .then((downloadURL) => {
              resolve(downloadURL);
            })
            .catch((err) => reject(err));
        }
      );
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
            trCategoryItems = Array.isArray(child.val().items) ? [...child.val().items] : [];
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
            enCategoryItems = Array.isArray(child.val().items) ? [...child.val().items] : [];
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
        const { trCategory, trCategoryKey, trCategoryItems, enCategory, enCategoryKey, enCategoryItems } = data;
        
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
        trCategoryItems.push(newItemTR);
        updatePromises.push(
          trRef.child(trCategoryKey).child("items").set(trCategoryItems)
        );
        
        // EN kategorisine ürünü ekle
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
  
  