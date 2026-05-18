import type { MapPayload } from "./data-models";

export interface ErrorEnvelope {
  error_code: string;
  message: string;
}

export type GetMapPayloadResponse = MapPayload;

export type UpdateMapRequest = MapPayload;

export interface UpdateMapResponse {
  success: boolean;
  failed_edges?: string[];
}

export interface GetLockStatusResponse {
  is_locked: boolean;
  locked_by?: string;
}

export interface AcquireEditLockRequest {
  locked_by: string;
}

export interface AcquireEditLockResponse {
  success: boolean;
}

export interface ReleaseEditLockResponse {
  success: boolean;
}
