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

const urlParams = new URLSearchParams(window.location.search);
const categoryName = urlParams.get("category");
const categoryId = urlParams.get("id");

document.addEventListener("DOMContentLoaded", function () {
  const titleElement = document.querySelector(".edit-container h2");
  if (titleElement) {
    titleElement.textContent = `${categoryName} - Yeni Ürün Ekle`;
  }
});

firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "../index.html";
  }
});

document.getElementById("addItemForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const submitButton = this.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Ekleniyor...";

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

  const finalNameEN = itemNameEN || itemNameTR;
  const finalDescriptionEN = itemDescriptionEN || itemDescriptionTR;

  const imageFile = document.getElementById("itemImage").files[0];

  if (imageFile) {
    uploadImage(imageFile)
      .then(({ downloadURL, storagePath }) => {
        addItemToCategory(itemNameTR, finalNameEN, itemPrice, itemDescriptionTR, finalDescriptionEN, itemIsPopular, itemIsActive, downloadURL)
          .then(() => {
            alert("Ürün ve resmi başarıyla eklendi!");
            window.location.href = "./main.html";
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
        const ext = getFileExtension(file);
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
            const imageUrl = "MittsWebp/0J6A282x" + seq + ".webp";
            resolve({ downloadURL: imageUrl, storagePath });
          }
        );
      })
      .catch(reject);
  });
}

function addItemToCategory(nameTR, nameEN, price, descTR, descEN, isPopular, isActive, imageUrl) {
  return new Promise((resolve, reject) => {
    console.log("Ürün ekleme başladı:", nameTR, "(TR)", nameEN, "(EN)");
    console.log("Kategori ID:", categoryId);
    console.log("Aktif:", isActive, "Popüler:", isPopular);

    if (!nameTR || !nameEN || !imageUrl || isNaN(price)) {
      return reject("Eksik veya geçersiz veri. Lütfen tüm alanları kontrol edin.");
    }

    if (!categoryId) {
      console.error("Kategori ID'si bulunamadı!");
      return reject("Kategori ID'si bulunamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
    }

    const trRef = db.ref("menu/tr");
    const enRef = db.ref("menu/en");

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

        trFullSnapshot.forEach(child => {
          if (child.val().category_id === parseInt(categoryId)) {
            trCategory = child.val();
            trCategoryKey = child.key;
            trCategoryItems = Array.isArray(child.val().items) ?
              child.val().items.filter(item => item !== null && item !== undefined) : [];
            console.log("TR Kategori bulundu:", trCategory.category_name, "ID:", trCategory.category_id, "Key:", trCategoryKey);
          }
        });

        if (!trCategory) {
          throw new Error(`Kategori ID ${categoryId} ile eşleşen TR kategori bulunamadı!`);
        }

        enFullSnapshot.forEach(child => {
          if (child.val().category_id === parseInt(categoryId)) {
            enCategory = child.val();
            enCategoryKey = child.key;
            enCategoryItems = Array.isArray(child.val().items) ?
              child.val().items.filter(item => item !== null && item !== undefined) : [];
            console.log("EN Kategori bulundu:", enCategory.category_name, "ID:", enCategory.category_id, "Key:", enCategoryKey);
          }
        });

        if (!enCategory) {
          console.log("EN'de kategori bulunamadı, ID ile eşleşen yeni kategori oluşturuluyor.");

          let enMenuArray = [];
          enFullSnapshot.forEach(child => {
            enMenuArray.push(child.val());
          });

          const newEnCategory = {
            category_id: parseInt(categoryId),
            category_name: trCategory.category_name,
            items: []
          };

          enMenuArray.push(newEnCategory);

          return enRef.set(enMenuArray)
            .then(() => {
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

        return { trCategory, trCategoryKey, trCategoryItems, enCategory, enCategoryKey, enCategoryItems };
      })
      .then(data => {
        let { trCategory, trCategoryKey, trCategoryItems, enCategory, enCategoryKey, enCategoryItems } = data;

        console.log("İşleme devam, TR kategori:", trCategory.category_name, "EN kategori:", enCategory.category_name);

        let newItemId = 0;

        if (trCategoryItems.length === 0) {
          newItemId = trCategory.category_id * 100 + 1;
        } else {
          let maxId = 0;
          trCategoryItems.forEach(item => {
            if (item && item.id && item.id > maxId) {
              maxId = item.id;
            }
          });
          newItemId = maxId + 1;
        }

        console.log("Yeni ürün ID:", newItemId);

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

        const updatePromises = [];

        trCategoryItems = trCategoryItems.filter(item => item !== null && item !== undefined);
        trCategoryItems = trCategoryItems.map(item => item);
        trCategoryItems.push(newItemTR);
        updatePromises.push(
          trRef.child(trCategoryKey).child("items").set(trCategoryItems)
        );

        enCategoryItems = enCategoryItems.filter(item => item !== null && item !== undefined);
        enCategoryItems = enCategoryItems.map(item => item);
        enCategoryItems.push(newItemEN);
        updatePromises.push(
          enRef.child(enCategoryKey).child("items").set(enCategoryItems)
        );

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
