import { NextResponse } from "next/server";
import { readLockStatus, writeLock, deleteLock } from "@/src/storage/file-manager";
import type { 
  GetLockStatusResponse, 
  AcquireEditLockRequest, 
  AcquireEditLockResponse, 
  ReleaseEditLockResponse,
  ErrorEnvelope 
} from "@/src/contracts/api-schemas";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<GetLockStatusResponse>> {
  const lock = await readLockStatus();
  return NextResponse.json({
    is_locked: lock.is_locked,
    locked_by: lock.is_locked ? lock.locked_by : undefined,
  });
}

export async function POST(req: Request): Promise<NextResponse<AcquireEditLockResponse | ErrorEnvelope>> {
  try {
    const currentLock = await readLockStatus();
    
    if (currentLock.is_locked) {
      return NextResponse.json(
        { error_code: "LOCK_EXISTS", message: `Locked by ${currentLock.locked_by}` },
        { status: 409 }
      );
    }

    const body = (await req.json()) as AcquireEditLockRequest;
    if (!body.locked_by) {
      return NextResponse.json(
        { error_code: "BAD_REQUEST", message: "locked_by is required" },
        { status: 400 }
      );
    }

    await writeLock(body.locked_by);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error_code: "INTERNAL_ERROR", message: "Failed to acquire lock" },
      { status: 500 }
    );
  }
}

export async function DELETE(): Promise<NextResponse<ReleaseEditLockResponse | ErrorEnvelope>> {
  try {
    await deleteLock();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error_code: "INTERNAL_ERROR", message: "Failed to release lock" },
      { status: 500 }
    );
  }
}
