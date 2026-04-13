import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import { getLandingFormSortTime, landingFormFromFirestore } from '../models/LandingForm.js';

const landingFormsRef = collection(db, 'landingforms');

export const landingFormsService = {
  subscribeToLandingForms(callback, onError) {
    return onSnapshot(
      landingFormsRef,
      (snapshot) => {
        const rows = snapshot.docs.map((d) => landingFormFromFirestore(d));
        rows.sort((a, b) => getLandingFormSortTime(b) - getLandingFormSortTime(a));
        callback(rows);
      },
      (err) => {
        if (onError) onError(err);
      }
    );
  },
};
