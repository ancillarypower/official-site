import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoaderContext } from "@/components/models/modelLoaders";

/**
 * Regression #586: decoders must be fetched from our own origin (under Vite's
 * BASE_URL), never from a third-party CDN. Uses the real constants on purpose.
 */
const { mockSetDecoderPath, mockParse, mockPostMessage } = vi.hoisted(() => ({
  mockSetDecoderPath: vi.fn(),
  mockParse: vi.fn(
    (_p: unknown, _b: string, onSuccess: (r: { scene: unknown }) => void) => {
      onSuccess({ scene: {} });
    },
  ),
  mockPostMessage: vi.fn(),
}));

vi.mock("three", async () => ({}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: vi.fn().mockImplementation(() => ({
    setDRACOLoader: vi.fn(),
    parse: mockParse,
  })),
}));

vi.mock("three/examples/jsm/loaders/DRACOLoader.js", () => ({
  DRACOLoader: vi.fn().mockImplementation(() => ({
    setDecoderPath: mockSetDecoderPath,
    dispose: vi.fn(),
  })),
}));

vi.mock("three/examples/jsm/utils/BufferGeometryUtils.js", () => ({
  mergeGeometries: vi.fn(),
}));

class MockWorker {
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  terminate = vi.fn();
  postMessage = mockPostMessage;
}

function createCtx(): LoaderContext {
  return {
    fitToView: vi.fn(),
    isDisposed: () => false,
    setStatus: vi.fn(),
    setErrorMsg: vi.fn(),
  };
}

const origin = window.location.origin;
const base = import.meta.env.BASE_URL;

describe("decoders load from our own origin (regression #586)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("Worker", MockWorker);
  });

  it("DRACOLoader decoder path is same-origin under BASE_URL", async () => {
    const { loadGltfModel, createLoaderResources } = await import(
      "@/components/models/modelLoaders"
    );
    await loadGltfModel(new ArrayBuffer(8), "glb", createCtx(), createLoaderResources());

    expect(mockSetDecoderPath).toHaveBeenCalledTimes(1);
    const path = String(mockSetDecoderPath.mock.calls[0]![0]);
    expect(new URL(path).origin).toBe(origin);
    expect(path).toBe(`${origin}${base}decoders/draco/gltf/`);
  });

  it("IFC worker receives a same-origin absolute WASM path", async () => {
    const { loadIfcModel, createLoaderResources } = await import(
      "@/components/models/modelLoaders"
    );
    await loadIfcModel(new ArrayBuffer(8), createCtx(), createLoaderResources());

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const msg = mockPostMessage.mock.calls[0]![0] as Record<string, unknown>;
    const path = String(msg.wasmPath);
    expect(path).toBe(`${origin}${base}decoders/web-ifc/`);
  });
});
