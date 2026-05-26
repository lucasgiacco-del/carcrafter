import {
  buildVehicleLabel,
  type VehicleFitmentProfile,
  type VehicleFormState,
} from "../shared/part-finder";
import {
  baseModelKey,
  modelAliasKey,
  normalizeMakeKey,
  normalizeModelKey,
} from "./car-data";

type FitmentRule = {
  make: string;
  yearStart: number;
  yearEnd: number;
  modelPatterns: RegExp[];
  profile: Omit<VehicleFitmentProfile, "car" | "source">;
};

const DEFAULT_PROFILE_NOTE =
  "Platform-level fitment profile matched from the selected chassis. Always confirm wheel width, brake clearance, and tire sizing before buying.";

const FITMENT_RULES: FitmentRule[] = [
  makeRule(
    "acura",
    2013,
    2022,
    ["ilx"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "64.1",
      wheelSizes: ["17", "18"],
      offsetRange: [40, 48],
    }),
  ),
  makeRule(
    "acura",
    2015,
    2025,
    ["tlx"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "64.1",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "acura",
    2023,
    2025,
    ["integra", "integra type s"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "64.1",
      wheelSizes: ["18", "19"],
      offsetRange: [38, 48],
    }),
  ),
  makeRule(
    "audi",
    2017,
    2025,
    ["a4", "a4 quattro", "s4"],
    exactProfile({
      boltPattern: "5x112",
      hubBore: "66.6",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [30, 45],
      confidence: "high",
    }),
  ),
  makeRule(
    "audi",
    2021,
    2025,
    ["a4 allroad", "a4 allroad quattro"],
    profile({
      boltPattern: "5x112",
      hubBore: "66.6",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [25, 40],
    }),
  ),
  makeRule(
    "audi",
    2013,
    2025,
    ["a5", "s5", "s5 coupe", "rs5"],
    profile({
      boltPattern: "5x112",
      hubBore: "66.6",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [25, 40],
    }),
  ),
  makeRule(
    "audi",
    2018,
    2025,
    ["q5", "sq5"],
    profile({
      boltPattern: "5x112",
      hubBore: "66.6",
      wheelSizes: ["19", "20", "21"],
      offsetRange: [25, 40],
    }),
  ),
  makeRule(
    "bmw",
    2012,
    2018,
    ["3 series", "320i", "328i", "330i", "335i", "340i", "m3"],
    profile({
      boltPattern: "5x120",
      hubBore: "72.6",
      wheelSizes: ["18", "19"],
      offsetRange: [30, 45],
    }),
  ),
  makeRule(
    "bmw",
    2019,
    2025,
    ["3 series", "330i", "330e", "340i", "m340i", "m3"],
    profile({
      boltPattern: "5x112",
      hubBore: "66.6",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [25, 40],
    }),
  ),
  makeRule(
    "bmw",
    2014,
    2025,
    ["4 series", "430i", "440i", "m440i", "m4"],
    profile({
      boltPattern: "5x112",
      hubBore: "66.6",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [20, 38],
    }),
  ),
  makeRule(
    "bmw",
    2017,
    2025,
    ["5 series", "530i", "530e", "540i", "550i", "m550i", "m5"],
    profile({
      boltPattern: "5x112",
      hubBore: "66.6",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [25, 40],
    }),
  ),
  makeRule(
    "cadillac",
    2013,
    2019,
    ["ats", "cts", "ats-v", "cts-v"],
    profile({
      boltPattern: "5x120",
      hubBore: "66.9",
      wheelSizes: ["18", "19"],
      offsetRange: [30, 42],
    }),
  ),
  makeRule(
    "cadillac",
    2020,
    2025,
    ["ct4", "ct4-v", "ct5", "ct5-v", "blackwing"],
    profile({
      boltPattern: "5x120",
      hubBore: "66.9",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [28, 40],
    }),
  ),
  makeRule(
    "chevrolet",
    2016,
    2025,
    ["camaro", "camaro ss", "camaro zl1"],
    profile({
      boltPattern: "5x120",
      hubBore: "66.9",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [20, 35],
    }),
  ),
  makeRule(
    "chevrolet",
    2016,
    2025,
    ["malibu"],
    profile({
      boltPattern: "5x115",
      hubBore: "70.3",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "dodge",
    2008,
    2023,
    ["challenger", "challenger srt", "challenger hellcat"],
    profile({
      boltPattern: "5x115",
      hubBore: "71.5",
      wheelSizes: ["18", "20"],
      offsetRange: [18, 28],
    }),
  ),
  makeRule(
    "dodge",
    2011,
    2023,
    ["charger", "charger srt", "charger hellcat"],
    profile({
      boltPattern: "5x115",
      hubBore: "71.5",
      wheelSizes: ["18", "20"],
      offsetRange: [20, 30],
    }),
  ),
  makeRule(
    "ford",
    2013,
    2020,
    ["fusion", "fusion sport"],
    profile({
      boltPattern: "5x108",
      hubBore: "63.4",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [38, 50],
    }),
  ),
  makeRule(
    "ford",
    2013,
    2018,
    ["focus st", "focus rs"],
    profile({
      boltPattern: "5x108",
      hubBore: "63.4",
      wheelSizes: ["18", "19"],
      offsetRange: [38, 50],
    }),
  ),
  makeRule(
    "ford",
    2015,
    2025,
    ["mustang", "mustang gt", "mustang ecoboost", "shelby gt350"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "70.5",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [30, 45],
    }),
  ),
  makeRule(
    "genesis",
    2019,
    2025,
    ["g70"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "67.1",
      wheelSizes: ["18", "19"],
      offsetRange: [30, 42],
    }),
  ),
  makeRule(
    "genesis",
    2017,
    2025,
    ["g80", "g90"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "67.1",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [32, 45],
    }),
  ),
  makeRule(
    "honda",
    2018,
    2025,
    ["accord"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "64.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [35, 50],
    }),
  ),
  makeRule(
    "honda",
    2016,
    2025,
    ["civic", "civic si", "civic type r"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "64.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [35, 48],
    }),
  ),
  makeRule(
    "honda",
    2017,
    2025,
    ["cr-v", "crv"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "64.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [38, 50],
    }),
  ),
  makeRule(
    "honda",
    2019,
    2025,
    ["hr-v", "hrv"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "64.1",
      wheelSizes: ["17", "18"],
      offsetRange: [38, 48],
    }),
  ),
  makeRule(
    "hyundai",
    2017,
    2025,
    ["elantra", "elantra n"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "67.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [40, 50],
    }),
  ),
  makeRule(
    "hyundai",
    2015,
    2025,
    ["sonata", "sonata n line"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "67.1",
      wheelSizes: ["17", "18", "19", "20"],
      offsetRange: [38, 50],
    }),
  ),
  makeRule(
    "hyundai",
    2019,
    2022,
    ["veloster n"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "67.1",
      wheelSizes: ["18", "19"],
      offsetRange: [45, 55],
    }),
  ),
  makeRule(
    "infiniti",
    2008,
    2013,
    ["g37", "g37 sedan", "g37 coupe"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "66.1",
      wheelSizes: ["18", "19"],
      offsetRange: [30, 45],
    }),
  ),
  makeRule(
    "infiniti",
    2014,
    2024,
    ["q50", "q60", "red sport 400"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "66.1",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [30, 45],
    }),
  ),
  makeRule(
    "kia",
    2016,
    2025,
    ["k5", "optima", "k5 gt"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "67.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [38, 50],
    }),
  ),
  makeRule(
    "kia",
    2018,
    2023,
    ["stinger", "stinger gt"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "67.1",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [30, 40],
    }),
  ),
  makeRule(
    "lexus",
    2014,
    2025,
    ["is", "is 300", "is 350", "rc", "rc 350", "rc f"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "60.1",
      wheelSizes: ["18", "19"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "lexus",
    2013,
    2020,
    ["gs", "gs 350", "gs f"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "60.1",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "lexus",
    2019,
    2025,
    ["es", "es 350", "es 300h"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "60.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [38, 45],
    }),
  ),
  makeRule(
    "mazda",
    2014,
    2021,
    ["mazda6", "6"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "67.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [38, 50],
    }),
  ),
  makeRule(
    "mazda",
    2019,
    2025,
    ["mazda3", "3", "mazda3 hatchback"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "67.1",
      wheelSizes: ["18", "19"],
      offsetRange: [40, 50],
    }),
  ),
  makeRule(
    "mercedes-benz",
    2015,
    2025,
    ["c 300", "c300", "c 43 amg", "c43 amg", "c 63 amg", "c63 amg"],
    profile({
      boltPattern: "5x112",
      hubBore: "66.6",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [25, 40],
    }),
  ),
  makeRule(
    "nissan",
    2013,
    2025,
    ["altima"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "66.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "nissan",
    2016,
    2023,
    ["maxima"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "66.1",
      wheelSizes: ["18", "19"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "nissan",
    2009,
    2025,
    ["370z", "z", "z nismo"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "66.1",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [15, 35],
    }),
  ),
  makeRule(
    "porsche",
    2012,
    2025,
    ["911", "911 carrera", "911 turbo"],
    profile({
      boltPattern: "5x130",
      hubBore: "71.6",
      wheelSizes: ["19", "20", "21"],
      offsetRange: [40, 60],
    }),
  ),
  makeRule(
    "porsche",
    2017,
    2025,
    ["718 boxster", "718 cayman"],
    profile({
      boltPattern: "5x130",
      hubBore: "71.6",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [45, 60],
    }),
  ),
  makeRule(
    "porsche",
    2020,
    2025,
    ["taycan"],
    profile({
      boltPattern: "5x130",
      hubBore: "71.6",
      wheelSizes: ["19", "20", "21"],
      offsetRange: [45, 60],
    }),
  ),
  makeRule(
    "subaru",
    2015,
    2025,
    ["wrx", "wrx sti", "sti"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "56.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "subaru",
    2013,
    2025,
    ["brz"],
    profile({
      boltPattern: "5x100",
      hubBore: "56.1",
      wheelSizes: ["17", "18"],
      offsetRange: [35, 48],
    }),
  ),
  makeRule(
    "tesla",
    2017,
    2025,
    ["model 3"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "64.1",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [35, 40],
    }),
  ),
  makeRule(
    "tesla",
    2020,
    2025,
    ["model y"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "64.1",
      wheelSizes: ["19", "20", "21"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "toyota",
    2018,
    2025,
    ["camry"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "60.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "toyota",
    2019,
    2025,
    ["corolla", "gr corolla"],
    profile({
      boltPattern: "5x100",
      hubBore: "54.1",
      wheelSizes: ["16", "17", "18"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "toyota",
    2019,
    2025,
    ["rav4"],
    profile({
      boltPattern: "5x114.3",
      hubBore: "60.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [35, 45],
    }),
  ),
  makeRule(
    "volkswagen",
    2015,
    2025,
    ["golf gti", "gti", "golf r"],
    profile({
      boltPattern: "5x112",
      hubBore: "57.1",
      wheelSizes: ["17", "18", "19"],
      offsetRange: [35, 48],
    }),
  ),
  makeRule(
    "volkswagen",
    2019,
    2025,
    ["jetta gli", "gli"],
    profile({
      boltPattern: "5x112",
      hubBore: "57.1",
      wheelSizes: ["18", "19"],
      offsetRange: [35, 48],
    }),
  ),
  makeRule(
    "volkswagen",
    2019,
    2025,
    ["arteon", "passat"],
    profile({
      boltPattern: "5x112",
      hubBore: "57.1",
      wheelSizes: ["18", "19", "20"],
      offsetRange: [35, 48],
    }),
  ),
];

export function resolveVehicleFitmentProfile({
  year,
  make,
  model,
  generation,
}: VehicleFormState): VehicleFitmentProfile | null {
  const numericYear = Number(year);
  if (!numericYear || Number.isNaN(numericYear) || !make || !model) {
    return null;
  }

  const normalizedMake = normalizeMakeKey(make);
  const normalizedModel = normalizeModelKey(model);
  const aliasModel = modelAliasKey(make, model);
  const baseModel = baseModelKey(model);
  const searchableModels = uniqueModelCandidates([
    normalizedModel,
    aliasModel,
    baseModel,
  ]);

  const rule = FITMENT_RULES.find((entry) => {
    return (
      entry.make === normalizedMake &&
      numericYear >= entry.yearStart &&
      numericYear <= entry.yearEnd &&
      entry.modelPatterns.some((pattern) =>
        searchableModels.some((candidate) => pattern.test(candidate)),
      )
    );
  });

  if (!rule) {
    return null;
  }

  return {
    car: buildVehicleLabel({ year, make, model, generation }),
    boltPattern: rule.profile.boltPattern,
    hubBore: rule.profile.hubBore,
    wheelSizes: [...rule.profile.wheelSizes],
    offsetRange: [...rule.profile.offsetRange] as [number, number],
    source: "platform_profile",
    confidence: rule.profile.confidence,
    notes: rule.profile.notes,
  };
}

function makeRule(
  make: string,
  yearStart: number,
  yearEnd: number,
  models: string[],
  profileValue: Omit<VehicleFitmentProfile, "car" | "source">,
): FitmentRule {
  return {
    make,
    yearStart,
    yearEnd,
    modelPatterns: models.map((model) => toExactModelPattern(model)),
    profile: profileValue,
  };
}

function toExactModelPattern(model: string) {
  return new RegExp(`^${escapeRegex(model)}$`, "i");
}

function profile(
  values: Omit<
    VehicleFitmentProfile,
    "car" | "source" | "confidence" | "notes"
  >,
): Omit<VehicleFitmentProfile, "car" | "source"> {
  return {
    ...values,
    confidence: "medium",
    notes: DEFAULT_PROFILE_NOTE,
  };
}

function exactProfile(
  values: Omit<VehicleFitmentProfile, "car" | "source" | "notes">,
): Omit<VehicleFitmentProfile, "car" | "source"> {
  return {
    ...values,
    notes: DEFAULT_PROFILE_NOTE,
  };
}

function uniqueModelCandidates(values: Array<string | null>) {
  return Array.from(
    new Set(values.map((value) => value?.trim()).filter(Boolean)),
  ) as string[];
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
