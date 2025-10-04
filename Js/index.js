

const firebaseConfig = {
  apiKey: "AIzaSyAtW4wclUxX21J8oAOUYckOtzHOyf464qk",
  authDomain: "testmenu-776bf.firebaseapp.com",
  projectId: "testmenu-776bf",
  storageBucket: "testmenu-776bf.firebasestorage.app",
  messagingSenderId: "247652590137",
  appId: "1:247652590137:web:978f304f086de50c8da3e8",
  measurementId: "G-0ZZT7HNYNZ"
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