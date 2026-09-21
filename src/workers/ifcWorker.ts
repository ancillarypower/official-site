/**
 * IFC Web Worker — offloads web-ifc WASM processing from the main thread.
 *
 * Receives an ArrayBuffer of the IFC file plus the WASM CDN path,
 * processes all meshes, and returns typed arrays as Transferable
 * Objects for zero-copy transfer back to the main thread.
 */

import type { IfcAPI as IfcAPIType } from "web-ifc";

export interface IfcWorkerInput {
  buffer: ArrayBuffer;
  wasmCdn: string;
}

export interface IfcMeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  flatTransformation: number[];
  transparent: boolean;
}

export interface IfcWorkerResult {
  type: "result";
  meshes: IfcMeshData[];
}

export interface IfcWorkerError {
  type: "error";
  message: string;
}

export type IfcWorkerMessage = IfcWorkerResult | IfcWorkerError;

self.onmessage = async (e: MessageEvent<IfcWorkerInput>) => {
  let ifcApi: IfcAPIType | null = null;
  let modelID = -1;

  try {
    const { buffer, wasmCdn } = e.data;

    const WebIFC = await import("web-ifc");
    ifcApi = new WebIFC.IfcAPI();
    ifcApi.SetWasmPath(wasmCdn, true);
    await ifcApi.Init();

    modelID = ifcApi.OpenModel(new Uint8Array(buffer), {
      COORDINATE_TO_ORIGIN: true,
    });

    if (modelID === -1) {
      throw new Error(
        "Failed to open IFC file: unsupported schema or invalid data",
      );
    }

    const meshes: IfcMeshData[] = [];

    ifcApi.StreamAllMeshes(modelID, (flatMesh) => {
      const placedGeometries = flatMesh.geometries;
      for (let i = 0; i < placedGeometries.size(); i++) {
        let geometry: ReturnType<IfcAPIType["GetGeometry"]> | null = null;
        try {
          const pg = placedGeometries.get(i);
          geometry = ifcApi!.GetGeometry(modelID, pg.geometryExpressID);
          const vertexData = ifcApi!.GetVertexArray(
            geometry.GetVertexData(),
            geometry.GetVertexDataSize(),
          );
          const indexData = ifcApi!.GetIndexArray(
            geometry.GetIndexData(),
            geometry.GetIndexDataSize(),
          );

          const vertexCount = vertexData.length / 6;
          const positions = new Float32Array(vertexCount * 3);
          const normals = new Float32Array(vertexCount * 3);
          const colors = new Float32Array(vertexCount * 4);

          for (let v = 0; v < vertexCount; v++) {
            const src = v * 6;
            const dst3 = v * 3;
            const dst4 = v * 4;

            positions[dst3] = vertexData[src]!;
            positions[dst3 + 1] = vertexData[src + 1]!;
            positions[dst3 + 2] = vertexData[src + 2]!;

            normals[dst3] = vertexData[src + 3]!;
            normals[dst3 + 1] = vertexData[src + 4]!;
            normals[dst3 + 2] = vertexData[src + 5]!;

            colors[dst4] = pg.color.x;
            colors[dst4 + 1] = pg.color.y;
            colors[dst4 + 2] = pg.color.z;
            colors[dst4 + 3] = pg.color.w;
          }

          meshes.push({
            positions,
            normals,
            colors,
            indices: new Uint32Array(indexData),
            flatTransformation: Array.from(pg.flatTransformation),
            transparent: pg.color.w !== 1,
          });
        } catch (meshErr) {
          console.warn("[IFC Worker] Skipping corrupted mesh:", meshErr);
        } finally {
          if (geometry) {
            (geometry as unknown as { delete: () => void }).delete();
          }
        }
      }
    });

    ifcApi.CloseModel(modelID);
    modelID = -1;
    ifcApi = null;

    const transferables: ArrayBuffer[] = [];
    for (const m of meshes) {
      transferables.push(
        m.positions.buffer,
        m.normals.buffer,
        m.colors.buffer,
        m.indices.buffer,
      );
    }

    self.postMessage(
      { type: "result", meshes } satisfies IfcWorkerResult,
      transferables as unknown as Transferable[],
    );
  } catch (err) {
    // Clean up on error
    if (ifcApi && modelID !== -1) {
      try {
        ifcApi.CloseModel(modelID);
      } catch {
        /* model may already be closed */
      }
    }
    self.postMessage({
      type: "error",
      message: err instanceof Error ? err.message : "IFC processing failed",
    } satisfies IfcWorkerError);
  }
};
