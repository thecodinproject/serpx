// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-app.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-analytics.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA-NiIDQH5k11rFPvkSbZeofE2a7D1SqX0",
  authDomain: "serpaid-b0725.firebaseapp.com",
  projectId: "serpaid-b0725",
  storageBucket: "serpaid-b0725.appspot.com",
  messagingSenderId: "682386215952",
  appId: "1:682386215952:web:2442833d6e1b0fe8b3a695",
  measurementId: "G-3S7Z73B5P1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);


// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);	

function requestPermission() {
    console.log('Requesting permission...');
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
      } else {
        console.log('Do not have permision!')
      }
    })
}

requestPermission()


getToken(messaging,{vapidKey:'BObLH-BlrFZkWfpAuY_Mu4MFYtxPud7XqWj6U15vwxfOn65hzBkRYLbQ0UgeDU77uucv9gZSjTWJ1VbqGvUm5nA'})
.then((currentToken) => {
    if (currentToken) {
        console.log('currentToken: ', currentToken)
        localStorage.setItem('fcmToken',currentToken)
    }
    else {
        console.log('cannot get token')
    }
})

