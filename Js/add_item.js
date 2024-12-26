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
    const itemName = document.getElementById("itemName").value.trim();
    let itemPrice = parseFloat(document.getElementById("itemPrice").value);
    const itemDescription = document.getElementById("itemDescription").value.trim();
    const itemIsPopular = document.getElementById("itemIsPopular").checked;
  
    if (!itemName) {
      alert("Ürün adı boş olamaz.");
      return;
    }
    if (isNaN(itemPrice)) {
      alert("Geçerli bir fiyat giriniz.");
      return;
    }
  
    // Resim dosyası
    const imageFile = document.getElementById("itemImage").files[0];
  
    if (imageFile) {
      // 1) Resim seçilmişse, önce Firebase Storage'a yükleyelim
      uploadImage(imageFile)
        .then(downloadURL => {
          // 2) Download URL'yi alıp DB'ye ekle
          addItemToCategory(categoryName, itemName, itemPrice, itemDescription, itemIsPopular, downloadURL)
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
      addItemToCategory(categoryName, itemName, itemPrice, itemDescription, itemIsPopular, "")
        .then(() => {
          alert("Ürün (resimsiz) başarıyla eklendi!");
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
  function addItemToCategory(catName, name, price, desc, isPopular, imageUrl) {
    return new Promise((resolve, reject) => {
      // 1) menu/tr altındaki kategoriyi bul
      db.ref("menu/tr")
        .orderByChild("category_name")
        .equalTo(catName)
        .once("value", (snapshot) => {
          if (!snapshot.exists()) {
            return reject("Kategori (TR) bulunamadı.");
          }
          // TR tarafı ekleme promiseleri
          const updatePromises = [];
          snapshot.forEach((childSnapshot) => {
            const catRef = childSnapshot.ref;
            updatePromises.push(updateItemsArray(catRef, name, price, desc, isPopular, imageUrl));
          });
  
          // 2) menu/en altındaki kategoriyi bul
          db.ref("menu/en")
            .orderByChild("category_name")
            .equalTo(catName)
            .once("value", (enSnapshot) => {
              // eğer enSnapshot yoksa, en tarafına ekleme yapmayız
              if (enSnapshot.exists()) {
                enSnapshot.forEach((childSnapshot) => {
                  const catRef = childSnapshot.ref;
                  updatePromises.push(updateItemsArray(catRef, name, price, desc, isPopular, imageUrl));
                });
              }
              // Tüm update'leri bitince
              Promise.all(updatePromises)
                .then(() => resolve())
                .catch((err) => reject(err));
            });
        });
    });
  }
  
  // ----------------------------------------------------
  // Verilen kategori ref'inin items dizisine yeni ürün ekler
  // ----------------------------------------------------
  function updateItemsArray(catRef, name, price, desc, isPopular, imageUrl) {
    return new Promise((resolve, reject) => {
      // Kategori verisini tek seferde oku
      catRef.once("value")
        .then(snapshot => {
          const catData = snapshot.val();
          if (!catData) {
            return reject("Kategori verisi bulunamadı.");
          }
  
          const catId = catData.category_id;   // => Örneğin 9
          let items = catData.items || [];     // => Mevcut item dizisi veya boş
  
          let newItemId = 0;
          if (items.length === 0) {
            // Eğer henüz item yoksa, ilk item ID’si: category_id * 100 + 1
            // Kategori 9 ise ilk item: 901
            newItemId = catId * 100 + 1;
          } else {
            // Zaten ürünler varsa, en yüksek ID’yi bulalım
            let maxId = items.reduce((acc, item) => Math.max(acc, item.id), 0);
            // maxId 903 ise bir sonraki 904 olsun
            newItemId = maxId + 1;
          }
  
          // Yeni ürün objesi
          const newItem = {
            id: newItemId,
            name: name,
            price: price,
            description: desc,
            image_url: imageUrl,
            is_active: true,
            is_popular: isPopular,
            allergens: []
          };
  
          // items dizisine ekle
          items.push(newItem);
  
          // Değişikliği Firebase’e yaz
          return catRef.update({ items });
        })
        .then(() => {
          resolve(); // Başarılı
        })
        .catch(err => {
          reject(err);
        });
    });
  }
  
  