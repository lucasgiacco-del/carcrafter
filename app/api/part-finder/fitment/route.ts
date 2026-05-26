import { type NextRequest, NextResponse } from "next/server";
import { resolveVehicleFitmentProfile } from "../../../server/vehicle-fitment";
import type { VehicleFitmentLookupResponse } from "../../../shared/part-finder";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const year = req.nextUrl.searchParams.get("year") || "";
  const make = req.nextUrl.searchParams.get("make") || "";
  const model = req.nextUrl.searchParams.get("model") || "";
  const generation = req.nextUrl.searchParams.get("generation") || "";

  if (!year || !make || !model) {
    return NextResponse.json(
      { error: "Missing year, make, or model." },
      { status: 400 },
    );
  }

  try {
    const profile = resolveVehicleFitmentProfile({
      year,
      make,
      model,
      generation,
    });

    const response: VehicleFitmentLookupResponse = profile
      ? {
          status: "ok",
          profile,
        }
      : {
          status: "unsupported",
          profile: null,
        };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Fitment profile lookup failed.";

    const response: VehicleFitmentLookupResponse = {
      status: "error",
      profile: null,
      error: message,
    };

    return NextResponse.json(response, { status: 500 });
  }
}
