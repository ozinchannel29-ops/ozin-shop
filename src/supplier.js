// Pilih supplier lewat SUPPLIER = digiflazz (bawaan) | vipayment
import { digiflazz } from "./digiflazz.js";
import { vipayment } from "./vip.js";

export const SUPPLIERS = { digiflazz, vipayment };

export const getSupplier = (env) => SUPPLIERS[String(env.SUPPLIER || "digiflazz").toLowerCase()] || digiflazz;
