import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { clientIp } from "@/lib/server/rate-limit";
import {
  createDriverSessionToken,
  driverSessionCookieOptions,
  DRIVER_SESSION_COOKIE,
  verifyDriverPin,
  pinNeedsRehash,
  hashDriverPin,
  updateDriverPinHash,
  checkPinRateLimit,
  recordFailedPinAttempt,
  clearPinRateLimit,
} from "@/lib/server/driver-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = clientIp(req);

  // Rate limit by driver ID and IP
  const driverKey = `driver_pin:${id}`;
  const ipKey = `driver_pin_ip:${ip}`;

  const driverLimit = checkPinRateLimit(driverKey);
  if (!driverLimit.allowed) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later.", retryAfter: driverLimit.retryAfter },
      { status: 429 }
    );
  }

  const ipLimit = checkPinRateLimit(ipKey);
  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later.", retryAfter: ipLimit.retryAfter },
      { status: 429 }
    );
  }

  let body: { pin?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { pin } = body;
  if (!pin) {
    return NextResponse.json({ error: "PIN required" }, { status: 400 });
  }

  const driver = await prisma.tramDriver.findUnique({
    where: { id },
    select: { id: true, pin: true, active: true, communityId: true, name: true },
  });

  if (!driver || !driver.active) {
    // Record failed attempt even for non-existent driver to prevent enumeration
    recordFailedPinAttempt(driverKey);
    recordFailedPinAttempt(ipKey);
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Reject drivers without a PIN set (null or empty)
  if (!driver.pin) {
    return NextResponse.json(
      { error: "PIN not configured. Contact your administrator." },
      { status: 401 }
    );
  }

  // Constant-time PIN verification
  if (!verifyDriverPin(pin, driver.pin)) {
    const driverLockResult = recordFailedPinAttempt(driverKey);
    const ipLockResult = recordFailedPinAttempt(ipKey);
    
    if (driverLockResult.locked || ipLockResult.locked) {
      const retryAfter = Math.max(
        driverLockResult.locked ? driverLockResult.retryAfter : 0,
        ipLockResult.locked ? ipLockResult.retryAfter : 0
      );
      return NextResponse.json(
        { error: "Too many failed attempts. Account locked.", retryAfter },
        { status: 429 }
      );
    }
    
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Success - clear rate limits
  clearPinRateLimit(driverKey);
  clearPinRateLimit(ipKey);

  // Rehash plaintext PIN to scrypt
  if (pinNeedsRehash(driver.pin)) {
    const newHash = hashDriverPin(pin);
    await updateDriverPinHash(driver.id, newHash);
  }

  // Issue JWT session token
  const token = await createDriverSessionToken({
    sub: driver.id,
    communityId: driver.communityId,
    name: driver.name,
  });

  const response = NextResponse.json({
    success: true,
    token, // For mobile shell bearer auth
    driverId: driver.id,
  });

  response.cookies.set(DRIVER_SESSION_COOKIE, token, driverSessionCookieOptions);
  return response;
}
