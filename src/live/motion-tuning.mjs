import { evolutionAssets } from "../evolution-assets.mjs";
import {
  ACTION_CATALOG,
  ACTION_CONTRACT_VERSION,
} from "../../shared/action-catalog.mjs";
export const TUNING_KEY = "cowcoming-motion-tuning-v1";
export const DEFAULT_TUNING = Object.freeze({ speed: 1, amplitude: 1 });
export const TUNING_LIMITS = { speed: [0.5, 1.5], amplitude: [0.5, 1.25] };
export function validateTuning(value) {
  if (!value || Object.keys(value).sort().join() !== "amplitude,speed")
    throw Error("Invalid motion parameters");
  for (const [key, [min, max]] of Object.entries(TUNING_LIMITS))
    if (!Number.isFinite(value[key]) || value[key] < min || value[key] > max)
      throw Error(`Invalid ${key}`);
  return { speed: value.speed, amplitude: value.amplitude };
}
export function defaultTuningDocument() {
  return {
    format: "cowcoming-motion-tuning",
    version: 1,
    actionContractVersion: ACTION_CONTRACT_VERSION,
    scope: "software-only",
    forms: Object.fromEntries(
      Object.entries(evolutionAssets).map(([id, asset]) => [
        id,
        {
          modelSha256: asset.sha256,
          actions: Object.fromEntries(
            Object.keys(ACTION_CATALOG).map((action) => [
              action,
              { ...DEFAULT_TUNING },
            ]),
          ),
        },
      ]),
    ),
  };
}
export function parseTuningDocument(text) {
  if (typeof text !== "string" || text.length > 32768)
    throw Error("Invalid tuning file");
  const input = JSON.parse(text),
    output = defaultTuningDocument();
  for (const key of ["format", "version", "actionContractVersion", "scope"])
    if (input?.[key] !== output[key]) throw Error("Incompatible tuning format");
  if (
    Object.keys(input.forms || {})
      .sort()
      .join() !== Object.keys(output.forms).sort().join()
  )
    throw Error("Incompatible forms");
  for (const [id, form] of Object.entries(output.forms)) {
    const source = input.forms[id];
    if (source?.modelSha256 !== form.modelSha256)
      throw Error("Model version differs");
    if (
      Object.keys(source.actions || {})
        .sort()
        .join() !== Object.keys(ACTION_CATALOG).sort().join()
    )
      throw Error("Incompatible actions");
    for (const action of Object.keys(ACTION_CATALOG))
      form.actions[action] = validateTuning(source.actions[action]);
  }
  return output;
}
export function loadTuning(storage) {
  try {
    if (!storage) throw Error("Storage unavailable");
    const raw = storage.getItem(TUNING_KEY);
    return {
      document: raw ? parseTuningDocument(raw) : defaultTuningDocument(),
      error: false,
    };
  } catch {
    return { document: defaultTuningDocument(), error: true };
  }
}
export function saveTuning(storage, document) {
  try {
    if (!storage) return false;
    storage.setItem(TUNING_KEY, JSON.stringify(document));
    return true;
  } catch {
    return false;
  }
}
export function browserTuningStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
