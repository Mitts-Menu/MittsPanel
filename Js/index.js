

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

  // Firebase'i başlat
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Giriş fonksiyonu
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      window.location.href = "Html/main.html";
    })
    .catch(error => {
      alert("Hatalı giriş");
    });
}
