// (window.browser && browser.runtime) ? extension=browser: extension=chrome
// Import and configure the Firebase SDK
// These scripts are made available when the app is served or deployed on Firebase Hosting
// If you do not serve/host your project using Firebase Hosting see https://firebase.google.com/docs/web/setup

// importScripts('/__/firebase/9.2.0/firebase-app-compat.js');
// importScripts('/__/firebase/9.2.0/firebase-messaging-compat.js');
// importScripts('/__/firebase/init.js');

// const messaging = firebase.messaging();

/**
 * Here is is the code snippet to initialize Firebase Messaging in the Service
 * Worker when your app is not hosted on Firebase Hosting.
 **/

 // Give the service worker access to Firebase Messaging.
 // Note that you can only use Firebase Messaging here. Other Firebase libraries
 // are not available in the service worker.
 // Initialize Firebase app and retrieve Firebase Messaging instance
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyA-NiIDQH5k11rFPvkSbZeofE2a7D1SqX0",
    authDomain: "serpaid-b0725.firebaseapp.com",
    projectId: "serpaid-b0725",
    storageBucket: "serpaid-b0725.appspot.com",
    messagingSenderId: "682386215952",
    appId: "1:682386215952:web:2442833d6e1b0fe8b3a695",
    measurementId: "G-3S7Z73B5P1"
});

const messaging = firebase.messaging();

// Create a Broadcast Channel
const channel = new BroadcastChannel('background-messages');

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    
    // // Customize notification here
    // const notificationTitle = 'Background Message Title';
    // const notificationOptions = {
    //     body: 'Background Message body.',
    //     icon: '/firebase-logo.png'
    // };

    // self.registration.showNotification(notificationTitle, notificationOptions);
    
    // Send a message through the Broadcast Channel
    channel.postMessage({ payload: payload, message: 'NewDash' });
});