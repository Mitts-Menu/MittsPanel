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

const urlParams = new URLSearchParams(window.location.search);
const categoryName = urlParams.get("category");
const categoryId = urlParams.get("id");
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

window.onload = () => {
    if (categoryId && itemId) {
        loadItemData(categoryId, itemId);
    } else {
        alert("Kategori veya ürün bilgileri eksik.");
    }
};
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
function loadItemData(categoryId, itemId) {
    Promise.all([
        db.ref("menu/tr").once("value"),
        db.ref("menu/en").once("value")
    ]).then(([trSnapshot, enSnapshot]) => {
        let trItem = null;
        let enItem = null;
        let itemNumericId = null;

        trSnapshot.forEach(categorySnapshot => {
            if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                const itemsArray = categorySnapshot.val().items || [];
                const foundItem = itemsArray.find(item => item.name === itemId);

                if (foundItem) {
                    trItem = foundItem;
                    itemNumericId = foundItem.id;

                    document.getElementById("itemNameTR").value = foundItem.name;
                    document.getElementById("itemDescriptionTR").value = foundItem.description;
                    document.getElementById("itemPrice").value = foundItem.price;
                    document.getElementById("itemIsActive").checked = foundItem.is_active;

                    const itemImage = document.getElementById("itemImage");

                    if (!foundItem.image_url || foundItem.image_url === "" || foundItem.image_url === "undefined") {
                        itemImage.src = "../img/mitts_logo.png";
                    } else {
                        itemImage.src = foundItem.image_url;
                    }
                }
            }
        });

        if (itemNumericId) {
            enSnapshot.forEach(categorySnapshot => {
                if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                    const itemsArray = categorySnapshot.val().items || [];
                    const foundItem = itemsArray.find(item => item.id === itemNumericId);

                    if (foundItem) {
                        enItem = foundItem;

                        document.getElementById("itemNameEN").value = foundItem.name;
                        document.getElementById("itemDescriptionEN").value = foundItem.description;
                    }
                }
            });
        }

        if (!enItem && trItem) {
            document.getElementById("itemNameEN").value = trItem.name;
            document.getElementById("itemDescriptionEN").value = trItem.description;
        }
    });
}
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
                const fileName = '0J6A282x' + seq + '.webp';
                const storagePath = 'MittsWebp/' + fileName;
                const storageRef = firebase.storage().ref(storagePath);
                const uploadTask = storageRef.put(file);

                uploadTask.on('state_changed',
                    (snapshot) => {
                    },
                    (error) => {
                        reject(error);
                    },
                    () => {
                        const imageUrl = 'MittsWebp/0J6A282x' + seq + '.webp';
                        resolve({ downloadURL: imageUrl, storagePath });
                    }
                );
            })
            .catch(reject);
    });
}
document.getElementById("editItemForm").addEventListener("submit", function (event) {
    event.preventDefault();

    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Güncelleniyor...";

    const updatedNameTR = document.getElementById("itemNameTR").value.trim();
    const updatedNameEN = document.getElementById("itemNameEN").value.trim();
    const updatedDetailsTR = document.getElementById("itemDescriptionTR").value.trim();
    const updatedDetailsEN = document.getElementById("itemDescriptionEN").value.trim();

    if (!updatedNameTR) {
        alert("Türkçe ürün adı boş olamaz.");
        submitButton.disabled = false;
        submitButton.textContent = "Ürünü Güncelle";
        return;
    }

    const finalNameEN = updatedNameEN || updatedNameTR;
    const finalDetailsEN = updatedDetailsEN || updatedDetailsTR;

    let updatedPrice = document.getElementById("itemPrice").value;
    updatedPrice = parseInt(updatedPrice);

    if (isNaN(updatedPrice)) {
        alert("Lütfen geçerli bir fiyat giriniz.");
        submitButton.disabled = false;
        submitButton.textContent = "Ürünü Güncelle";
        return;
    }

    const updatedIsActive = document.getElementById("itemIsActive").checked;

    const fileInput = document.getElementById("itemImageUpload");
    const newImageFile = fileInput.files[0];

    let currentImageUrl = document.getElementById("itemImage").src;

    const isPlaceholder = currentImageUrl.includes("mitts_logo.png");

    let originalImageUrl = null;

    db.ref("menu/tr").once("value", snapshot => {
        snapshot.forEach(categorySnapshot => {
            if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                const itemsArray = categorySnapshot.val().items || [];

                const foundItem = itemsArray.find(item => item.name === itemId);

                if (foundItem) {
                    originalImageUrl = foundItem.image_url;

                    if (newImageFile) {
                        uploadImage(newImageFile).then(({ downloadURL, storagePath }) => {
                            updateItemInDatabase(updatedNameTR, finalNameEN, updatedPrice, updatedDetailsTR, finalDetailsEN, downloadURL, updatedIsActive);
                        }).catch((error) => {
                            alert("Resim yüklenirken bir hata oluştu: " + error.message);
                            submitButton.disabled = false;
                            submitButton.textContent = "Ürünü Güncelle";
                        });
                    } else {
                        let finalImageUrl;

                        if (originalImageUrl && originalImageUrl !== "" && !isPlaceholder && originalImageUrl !== "undefined") {
                            finalImageUrl = originalImageUrl;
                        } else if (isPlaceholder) {
                            finalImageUrl = "../img/mitts_logo.png";
                        } else {
                            finalImageUrl = "../img/mitts_logo.png";
                        }

                        updateItemInDatabase(updatedNameTR, finalNameEN, updatedPrice, updatedDetailsTR, finalDetailsEN, finalImageUrl, updatedIsActive);
                    }
                }
            }
        });
    });
});

function updateItemInDatabase(updatedNameTR, updatedNameEN, updatedPrice, updatedDetailsTR, updatedDetailsEN, updatedImageUrl, updatedIsActive) {
    let updatePromises = [];

    const trPromise = db.ref("menu/tr").once("value");
    const enPromise = db.ref("menu/en").once("value");

    Promise.all([trPromise, enPromise])
        .then(([trSnapshot, enSnapshot]) => {
            let itemNumericId = null;

            trSnapshot.forEach(categorySnapshot => {
                if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                    const itemsArray = categorySnapshot.val().items || [];

                    const itemIndex = itemsArray.findIndex(item => item.name === itemId);

                    if (itemIndex !== -1) {
                        itemNumericId = itemsArray[itemIndex].id;

                        itemsArray[itemIndex] = {
                            ...itemsArray[itemIndex],
                            name: updatedNameTR,
                            price: updatedPrice,
                            description: updatedDetailsTR,
                            image_url: updatedImageUrl,
                            is_active: updatedIsActive
                        };

                        updatePromises.push(
                            categorySnapshot.ref.child("items").set(itemsArray)
                        );
                    }
                }
            });

            if (!itemNumericId) {
                throw new Error("Güncellenecek ürün ID'si bulunamadı");
            }

            enSnapshot.forEach(categorySnapshot => {
                if (categorySnapshot.val().category_id === parseInt(categoryId)) {
                    const itemsArray = categorySnapshot.val().items || [];

                    const itemIndex = itemsArray.findIndex(item => item.id === itemNumericId);

                    if (itemIndex !== -1) {
                        itemsArray[itemIndex] = {
                            ...itemsArray[itemIndex],
                            name: updatedNameEN,
                            price: updatedPrice,
                            description: updatedDetailsEN,
                            image_url: updatedImageUrl,
                            is_active: updatedIsActive
                        };

                        updatePromises.push(
                            categorySnapshot.ref.child("items").set(itemsArray)
                        );
                    } else {
                        const newItem = {
                            id: itemNumericId,
                            name: updatedNameEN,
                            price: updatedPrice,
                            description: updatedDetailsEN,
                            image_url: updatedImageUrl,
                            is_active: updatedIsActive,
                            is_popular: false,
                            allergens: []
                        };

                        itemsArray.push(newItem);

                        updatePromises.push(
                            categorySnapshot.ref.child("items").set(itemsArray)
                        );
                    }
                }
            });

            return Promise.all(updatePromises);
        })
        .then(() => {
            alert("Ürün TR ve EN menülerinde eşzamanlı olarak güncellendi.");
            window.location.href = "main.html";
        })
        .catch(error => {
            alert("Veri güncellenirken bir hata oluştu: " + error.message);
            const submitButton = document.querySelector('#editItemForm button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = "Ürünü Güncelle";
            }
        });
}
