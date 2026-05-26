"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PartFinderModType, PartFinderSearchItem, VehicleFormState } from "./part-finder";

export type SavedBuildPartFinderResult = {
  modKey: PartFinderModType;
  query: string;
  items: PartFinderSearchItem[];
};

export type SavedBuildSelectedMod = {
  modId: string;
  modLabel: string;
  optionId: string | null;
  optionLabel: string | null;
};

export type SavedBuildBuilderSnapshot = {
  extraPrompt: string;
  selectedMods: SavedBuildSelectedMod[];
};

export type SavedBuild = {
  id: string;
  prompt: string;
  originalImage: string | null;
  resultImage: string;
  vehicleLabel: string | null;
  vehicleForm: VehicleFormState | null;
  builderSnapshot: SavedBuildBuilderSnapshot | null;
  partFinderResults: SavedBuildPartFinderResult[];
  createdAt: string;
};

type SavedBuildRow = {
  id: string;
  prompt: string;
  original_image: string | null;
  result_image: string;
  vehicle_label: string | null;
  vehicle_form: VehicleFormState | null;
  builder_snapshot: SavedBuildBuilderSnapshot | null;
  part_finder_results: SavedBuildPartFinderResult[] | null;
  created_at: string;
};

const SAVED_BUILD_SELECT =
  "id, prompt, original_image, result_image, vehicle_label, vehicle_form, builder_snapshot, part_finder_results, created_at";

export async function listSavedBuilds(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("saved_builds")
    .select(SAVED_BUILD_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSavedBuildRow);
}

export async function getSavedBuild(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("saved_builds")
    .select(SAVED_BUILD_SELECT)
    .eq("id", id)
    .single();

  if (error) throw error;
  return mapSavedBuildRow(data);
}

export async function createSavedBuild(
  supabase: SupabaseClient,
  input: Omit<SavedBuild, "id" | "createdAt">,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be signed in to save builds.");
  }

  const { data, error } = await supabase
    .from("saved_builds")
    .insert({
      user_id: user.id,
      prompt: input.prompt,
      original_image: input.originalImage,
      result_image: input.resultImage,
      vehicle_label: input.vehicleLabel,
      vehicle_form: input.vehicleForm ?? {},
      builder_snapshot: input.builderSnapshot ?? {},
      part_finder_results: input.partFinderResults,
    })
    .select(SAVED_BUILD_SELECT)
    .single();

  if (error) {
    if (
      /vehicle_label|vehicle_form|builder_snapshot|part_finder_results/i.test(
        error.message,
      )
    ) {
      throw new Error(
        "Your saved_builds table needs the latest profile fields first. Apply supabase/saved_builds.sql, then try saving again.",
      );
    }
    throw error;
  }
  return mapSavedBuildRow(data);
}

export async function deleteSavedBuild(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("saved_builds").delete().eq("id", id);
  if (error) throw error;
}

export async function clearSavedBuilds(supabase: SupabaseClient) {
  const { error } = await supabase.from("saved_builds").delete().neq("id", "");
  if (error) throw error;
}

function mapSavedBuildRow(row: SavedBuildRow): SavedBuild {
  return {
    id: row.id,
    prompt: row.prompt,
    originalImage: row.original_image,
    resultImage: row.result_image,
    vehicleLabel: row.vehicle_label,
    vehicleForm: row.vehicle_form,
    builderSnapshot: normalizeBuilderSnapshot(row.builder_snapshot),
    partFinderResults: row.part_finder_results ?? [],
    createdAt: row.created_at,
  };
}

function normalizeBuilderSnapshot(
  snapshot: SavedBuildBuilderSnapshot | null,
): SavedBuildBuilderSnapshot | null {
  if (!snapshot) return null;

  const selectedMods = Array.isArray(snapshot.selectedMods)
    ? snapshot.selectedMods.filter(Boolean)
    : [];
  const extraPrompt =
    typeof snapshot.extraPrompt === "string" ? snapshot.extraPrompt : "";

  if (!selectedMods.length && !extraPrompt.trim()) {
    return null;
  }

  return {
    extraPrompt,
    selectedMods,
  };
}
