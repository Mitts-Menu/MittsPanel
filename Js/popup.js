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

firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        window.location.href = "../index.html";
    } else {
        loadPopupData();
    }
});

let currentImageUrl = null;
let selectedExistingImageUrl = null;

function loadPopupData() {
    db.ref("popup").once("value").then(snapshot => {
        const data = snapshot.val();
        if (data) {
            document.getElementById("popupIsActive").checked = data.isActive || false;

            const alwaysShow = data.alwaysShow !== undefined ? data.alwaysShow : true;
            const alwaysShowEl = document.getElementById("popupAlwaysShow");
            if (alwaysShowEl) {
                alwaysShowEl.checked = alwaysShow;
                document.getElementById("timeLimitsContainer").style.display = alwaysShow ? "none" : "block";
            }

            document.getElementById("popupStartTime").value = data.startTime || "";
            document.getElementById("popupEndTime").value = data.endTime || "";

            if (data.imageUrl && data.imageUrl !== "") {
                currentImageUrl = data.imageUrl;
                const imgEl = document.getElementById("currentPopupImage");

                // Caching or getting download URL might be necessary, but since it's the admin panel, doing storage ref logic
                if (data.imageUrl.startsWith("MittsWebp/")) {
                    storage.ref().child(data.imageUrl).getDownloadURL().then(url => {
                        imgEl.src = url;
                        imgEl.style.display = "block";
                    }).catch(err => console.log("Görsel yüklenemedi", err));
                } else {
                    imgEl.src = data.imageUrl;
                    imgEl.style.display = "block";
                }
            }
        }
        loadExistingImages();
    });
}

function loadExistingImages() {
    const listRef = storage.ref("MittsWebp");
    listRef.listAll().then((res) => {
        const container = document.getElementById("existingImagesList");
        container.innerHTML = "";

        const popupItems = res.items.filter(itemRef => itemRef.name.startsWith("popup_"));

        if (popupItems.length === 0) {
            container.innerHTML = '<span style="color: gray; font-size: 0.9em;">Henüz görsel bulunamadı.</span>';
            return;
        }

        popupItems.sort((a, b) => b.name.localeCompare(a.name));

        popupItems.forEach((itemRef) => {
            itemRef.getDownloadURL().then((url) => {
                const img = document.createElement("img");
                img.src = url;
                img.className = "gallery-img";
                img.dataset.storagePath = "MittsWebp/" + itemRef.name;
                img.title = itemRef.name;

                img.onclick = function () {
                    document.querySelectorAll(".gallery-img").forEach(el => el.classList.remove("selected"));
                    img.classList.add("selected");
                    selectedExistingImageUrl = img.dataset.storagePath;

                    document.getElementById("popupImage").value = "";

                    const previewEl = document.getElementById("currentPopupImage");
                    previewEl.src = url;
                    previewEl.style.display = "block";
                };

                container.appendChild(img);

                if (currentImageUrl === img.dataset.storagePath) {
                    img.classList.add("selected");
                    selectedExistingImageUrl = currentImageUrl;
                }
            }).catch(error => console.log("Görsel alınamadı", error));
        });
    }).catch((error) => {
        document.getElementById("existingImagesList").innerHTML = '<span style="color: red; font-size: 0.9em;">Görseller yüklenirken hata oluştu.</span>';
    });
}

function getNextImageSequence() {
    const counterRef = db.ref("counters/image_seq");
    return counterRef.transaction(current => (current || 0) + 1)
        .then(result => {
            if (!result.committed) {
                throw new Error("Görsel sayaç güncellenemedi");
            }
            return result.snapshot.val();
        });
}

function uploadImage(file) {
    return new Promise((resolve, reject) => {
        getNextImageSequence().then(seq => {
            const fileName = "popup_" + seq + ".webp"; // generic logic
            const storagePath = "MittsWebp/" + fileName;
            const storageRef = storage.ref().child(storagePath);

            const uploadTask = storageRef.put(file);
            uploadTask.on(
                "state_changed",
                (snapshot) => { },
                (error) => { reject(error); },
                () => { resolve("MittsWebp/" + fileName); }
            );
        }).catch(reject);
    });
}

document.getElementById("popupForm").addEventListener("submit", function (e) {
    e.preventDefault();

    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Kaydediliyor...";

    const isActive = document.getElementById("popupIsActive").checked;
    const alwaysShow = document.getElementById("popupAlwaysShow").checked;
    const startTime = document.getElementById("popupStartTime").value;
    const endTime = document.getElementById("popupEndTime").value;
    const imageFile = document.getElementById("popupImage").files[0];

    if (imageFile) {
        uploadImage(imageFile).then(imageUrl => {
            saveData(isActive, alwaysShow, startTime, endTime, imageUrl, submitButton);
        }).catch(err => {
            alert("Resim yüklenemedi: " + err);
            submitButton.disabled = false;
            submitButton.textContent = "Kaydet";
        });
    } else if (selectedExistingImageUrl) {
        saveData(isActive, alwaysShow, startTime, endTime, selectedExistingImageUrl, submitButton);
    } else {
        // Keep existing image if no new file is selected at all
        saveData(isActive, alwaysShow, startTime, endTime, currentImageUrl, submitButton);
    }
});

function saveData(isActive, alwaysShow, startTime, endTime, imageUrl, submitButton) {
    db.ref("popup").set({
        isActive: isActive,
        alwaysShow: alwaysShow,
        startTime: startTime,
        endTime: endTime,
        imageUrl: imageUrl || ""
    }).then(() => {
        alert("Popup ayarları başarıyla kaydedildi!");
        submitButton.disabled = false;
        submitButton.textContent = "Kaydet";
    }).catch(err => {
        alert("Hata oluştu: " + err.message);
        submitButton.disabled = false;
        submitButton.textContent = "Kaydet";
    });
}

// Event Listeners for UI
document.addEventListener("DOMContentLoaded", function () {
    const alwaysShowCb = document.getElementById("popupAlwaysShow");
    if (alwaysShowCb) {
        alwaysShowCb.addEventListener("change", function () {
            document.getElementById("timeLimitsContainer").style.display = this.checked ? "none" : "block";
        });
    }

    const imageInput = document.getElementById("popupImage");
    if (imageInput) {
        imageInput.addEventListener("change", function (e) {
            const file = e.target.files[0];
            if (file) {
                document.querySelectorAll(".gallery-img").forEach(el => el.classList.remove("selected"));
                selectedExistingImageUrl = null;

                const reader = new FileReader();
                reader.onload = function (event) {
                    const imgEl = document.getElementById("currentPopupImage");
                    imgEl.src = event.target.result;
                    imgEl.style.display = "block";
                };
                reader.readAsDataURL(file);
            }
        });
    }
});
