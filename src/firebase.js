import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
apiKey: "AIzaSyBF0gXrD0QT9NuceW1hGIexfCFOFXR37Bk",

 authDomain: "pikmin-map-01.firebaseapp.com",

 projectId: "pikmin-map-01",

 storageBucket: "pikmin-map-01.firebasestorage.app",

 messagingSenderId: "1037927470621",

 appId: "1:1037927470621:web:2731170a48d10be34958f4",

 measurementId: "G-S30KCJ8H5Q"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
