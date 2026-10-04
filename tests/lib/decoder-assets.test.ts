import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";
import {
  DECODER_ASSETS,
  decoderMimeType,
  decoderSourcePath,
} from "@/lib/decoderAssets";
import { DRACO_DECODER_DIR, IFC_WASM_DIR } from "@/lib/constants";

const root = resolve(__dirname, "../..");

describe("self-hosted decoder assets (regression #586)", () => {
  it.each([
    ["DRACO_DECODER_DIR", DRACO_DECODER_DIR],
    ["IFC_WASM_DIR", IFC_WASM_DIR],
  ])("%s is a same-origin directory relative to Vite base", (_name, dir) => {
    expect(dir).toBeTypeOf("string");
    expect(dir).not.toMatch(/^[a-z][a-z0-9+.-]*:/i);
    expect(dir.startsWith("/")).toBe(false);
    expect(dir.endsWith("/")).toBe(true);
  });

  it("copies every file DRACOLoader and web-ifc fetch at runtime", () => {
    const outputs = DECODER_ASSETS.map((a) => a.to);
    expect(outputs).toContain(`${DRACO_DECODER_DIR}draco_decoder.wasm`);
    expect(outputs).toContain(`${DRACO_DECODER_DIR}draco_wasm_wrapper.js`);
    expect(outputs).toContain(`${DRACO_DECODER_DIR}draco_decoder.js`);
    expect(outputs).toContain(`${IFC_WASM_DIR}web-ifc.wasm`);
  });

  it("every output stays inside one of the decoder directories", () => {
    for (const asset of DECODER_ASSETS) {
      expect(
        asset.to.startsWith(DRACO_DECODER_DIR) || asset.to.startsWith(IFC_WASM_DIR),
        asset.to,
      ).toBe(true);
      expect(asset.to).not.toContain("..");
    }
  });

  it.each(DECODER_ASSETS.filter((a) => !a.optional).map((a) => [`${a.pkg}/${a.from}`, a] as const))(
    "required source %s exists in node_modules",
    (_label, asset) => {
      expect(existsSync(decoderSourcePath(root, asset))).toBe(true);
    },
  );

  it("serves .wasm as application/wasm and .js as JavaScript", () => {
    expect(decoderMimeType("decoders/web-ifc/web-ifc.wasm")).toBe("application/wasm");
    expect(decoderMimeType("decoders/draco/gltf/draco_wasm_wrapper.js")).toBe("text/javascript");
  });
});
