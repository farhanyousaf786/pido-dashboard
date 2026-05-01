import { db } from "../firebase/firebaseConfig.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

const settingsRef = doc(db, "appSettings", "appSettings");

function normalizeNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function getAppSettings() {
  const snap = await getDoc(settingsRef);
  if (!snap.exists()) {
    return {
      autoCancelTimeInMin: 0,
      distanceTravelFee: [],
      providerDistanceInMiles: 0,
    };
  }
  const data = snap.data() || {};
  const distanceTravelFee = Array.isArray(data.distanceTravelFee)
    ? data.distanceTravelFee
    : [];

  return {
    autoCancelTimeInMin: normalizeNumber(data.autoCancelTimeInMin, 0),
    distanceTravelFee: distanceTravelFee.map((item) => ({
      distanceInMiles: normalizeNumber(item?.distanceInMiles, 0),
      travelFee: normalizeNumber(item?.travelFee, 0),
    })),
    providerDistanceInMiles: normalizeNumber(data.providerDistanceInMiles, 0),
  };
}

export async function saveAppSettings(values) {
  const autoCancelTimeInMin = normalizeNumber(values.autoCancelTimeInMin, 0);
  const providerDistanceInMiles = normalizeNumber(
    values.providerDistanceInMiles,
    0,
  );

  const distanceTravelFee = Array.isArray(values.distanceTravelFee)
    ? values.distanceTravelFee.map((item) => ({
        distanceInMiles: normalizeNumber(item?.distanceInMiles, 0),
        travelFee: normalizeNumber(item?.travelFee, 0),
      }))
    : [];

  const next = {
    autoCancelTimeInMin,
    distanceTravelFee,
    providerDistanceInMiles,
  };

  await setDoc(settingsRef, next, { merge: true });
  return next;
}
