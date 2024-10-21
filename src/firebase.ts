import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCaYK1w647me88YOpGcn7gxiPb0-YUBcyw",
  authDomain: "forbolt2-a67ce.firebaseapp.com",
  projectId: "forbolt2-a67ce",
  storageBucket: "forbolt2-a67ce.appspot.com",
  messagingSenderId: "383468774613",
  appId: "1:383468774613:web:6fb8cffec789417ec12e5c",
  measurementId: "G-H253CB4S19"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);
const messaging = getMessaging(app);

export { app, analytics, auth, database, storage, messaging };