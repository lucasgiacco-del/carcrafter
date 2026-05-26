import { type NextRequest, NextResponse } from "next/server";
import { listVehicleGenerations } from "../../../server/car-data";
import { normalizeGenerationSearchText } from "../../../shared/part-finder";

export const runtime = "nodejs";

type VpicResult = {
  Make_Name?: string;
  Model_Name?: string;
};

type VpicResponse = {
  Results?: VpicResult[];
};

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const year = req.nextUrl.searchParams.get("year");
  const make = req.nextUrl.searchParams.get("make");
  const model = req.nextUrl.searchParams.get("model");

  try {
    if (type === "makes") {
      const response = await fetch(
        "https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json",
        {
          next: { revalidate: 60 * 60 * 24 * 30 },
        },
      );

      if (!response.ok) {
        throw new Error(`NHTSA makes lookup failed (${response.status})`);
      }

      const data = (await response.json()) as VpicResponse;
      const makes = uniqueSorted(
        (data.Results || []).map((item) => item.Make_Name || ""),
      );

      return NextResponse.json({ makes });
    }

    if (type === "models") {
      if (!year || !make) {
        return NextResponse.json(
          { error: "Missing year or make for model lookup." },
          { status: 400 },
        );
      }

      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(
          make,
        )}/modelyear/${encodeURIComponent(year)}/vehicletype/car?format=json`,
        {
          next: { revalidate: 60 * 60 * 24 * 7 },
        },
      );

      if (!response.ok) {
        throw new Error(`NHTSA model lookup failed (${response.status})`);
      }

      const data = (await response.json()) as VpicResponse;
      const models = uniqueSorted(
        (data.Results || []).map((item) => item.Model_Name || ""),
      );

      return NextResponse.json({ models });
    }

    if (type === "generations") {
      if (!year || !make || !model) {
        return NextResponse.json(
          { error: "Missing year, make, or model for generation lookup." },
          { status: 400 },
        );
      }

      const generations = uniqueSorted(
        listVehicleGenerations({ year, make, model }).map((rule) =>
          normalizeGenerationSearchText(rule.name, make, model),
        ),
      );

      return NextResponse.json({ generations });
    }

    return NextResponse.json(
      { error: "Unsupported vehicle lookup type." },
      { status: 400 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Vehicle lookup failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function uniqueSorted(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}
