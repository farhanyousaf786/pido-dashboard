import { db } from '../firebase/firebaseConfig.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const settingsRef = doc(db, 'appSettings', 'appSettings');

function normalizeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAppSettings() {
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) {
    return {
      autoCancelTimeInMin: 0,
      distance: { distanceInMiles: 0, travelFee: 0 },
    };
  }
  const data = snap.data() || {};
  const distance = data.distance || {};
  return {
    autoCancelTimeInMin: normalizeNumber(data.autoCancelTimeInMin, 0),
    distance: {
      distanceInMiles: normalizeNumber(distance.distanceInMiles, 0),
      travelFee: normalizeNumber(distance.travelFee, 0),
    },
  };
}

export async function saveAppSettings(values) {
  const autoCancelTimeInMin = normalizeNumber(values.autoCancelTimeInMin, 0);
  const distanceInMiles = normalizeNumber(values.distanceInMiles, 0);
  const travelFee = normalizeNumber(values.travelFee, 0);

  const next = {
    autoCancelTimeInMin,
    distance: {
      distanceInMiles,
      travelFee,
    },
  };

  await setDoc(settingsRef, next, { merge: true });
  return next;
}
