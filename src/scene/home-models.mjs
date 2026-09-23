import { NIULAI_ASSET } from "./niulai.mjs";

export const HOME_MODELS = [
  {
    id: "niulai",
    name: "牛来",
    asset: NIULAI_ASSET,
    color: "#5b9c91",
    mouth: true,
  },
  {
    id: "nailong",
    name: "奶龙",
    asset: "/models/nailong-web.glb",
    color: "#efbd37",
    mouth: false,
  },
  {
    id: "spiderman",
    name: "蜘蛛侠",
    asset: "/models/spiderman-web.glb",
    color: "#d95e55",
    mouth: false,
  },
  {
    id: "black-dragon",
    name: "小黑龙",
    asset: "/models/black-dragon-web.glb",
    color: "#30343c",
    mouth: false,
  },
];
export const DEFAULT_HOME_MODEL = HOME_MODELS[0];
export function modelForPage(mode, selected) {
  return mode === "home" ? selected : DEFAULT_HOME_MODEL;
}
