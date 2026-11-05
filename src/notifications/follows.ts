// Matches the user follows for alerts, persisted on the device.
// Small in-memory store + listeners so every bell button updates instantly.
// Persisted with expo-sqlite's key-value store; kept in memory only if that's unavailable.
import { useSyncExternalStore } from 'react';
import type { MatchState } from '@/api/espn';
import { Storage } from './storage';

export type FollowedMatch = {
  id: string;
  home: string;
  away: string;
  kickoff: string; // ISO date
  league?: string;
  // Last state we told the user about, used to detect new goals / full time.
  state: MatchState;
  homeScore: number;
  awayScore: number;
  kickoffNotificationId?: string;
};

const KEY = 'followed-matches:v1';
const KEEP_FINISHED_MS = 2 * 86400000;

let follows: Record<string, FollowedMatch> = {};
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  follows = { ...follows };
  listeners.forEach((l) => l());
}

/** Loads follows from storage once (safe to call repeatedly, also from the background task). */
export function loadFollows(): Promise<void> {
  loaded ??= Promise.resolve(Storage?.getItem(KEY) ?? null)
    .then((raw) => {
      const all: Record<string, FollowedMatch> = raw ? JSON.parse(raw) : {};
      // Drop matches that finished a while ago.
      const cutoff = Date.now() - KEEP_FINISHED_MS;
      follows = Object.fromEntries(Object.entries(all).filter(([, f]) => f.state !== 'post' || new Date(f.kickoff).getTime() > cutoff));
      emit();
    })
    .catch(() => {
      loaded = null;
    });
  return loaded;
}

async function save() {
  emit();
  await Storage?.setItem(KEY, JSON.stringify(follows));
}

export const getFollows = () => Object.values(follows);
export const isFollowed = (id: string) => !!follows[id];

export async function addFollow(match: FollowedMatch) {
  await loadFollows();
  follows[match.id] = match;
  await save();
}

export async function updateFollow(id: string, patch: Partial<FollowedMatch>) {
  if (!follows[id]) return;
  follows[id] = { ...follows[id], ...patch };
  await save();
}

export async function removeFollow(id: string) {
  await loadFollows();
  delete follows[id];
  await save();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Re-renders when the follow list changes. */
export function useFollows() {
  return useSyncExternalStore(
    subscribe,
    () => follows,
    () => follows,
  );
}
