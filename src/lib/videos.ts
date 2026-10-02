// Converts YouTube API video resources into database rows.
import { isLikelyShort, parseIsoDuration } from "./duration";

export type VideoResource = {
  id: string;
  snippet: {
    title: string;
    publishedAt: string;
    liveBroadcastContent?: string;
    thumbnails?: Record<string, { url: string }>;
  };
  contentDetails: { duration?: string };
  status?: { privacyStatus?: string };
};

export type VideoRow = {
  id: string;
  channel_id: string;
  title: string;
  published_at: string;
  duration_seconds: number | null;
  is_short: boolean;
  privacy_status: string | null;
  thumbnail_url: string | null;
};

export function toVideoRow(channelId: string, v: VideoResource): VideoRow | null {
  // Scheduled premieres/streams that haven't happened yet have no stats.
  if (v.snippet.liveBroadcastContent === "upcoming") return null;
  const seconds = parseIsoDuration(v.contentDetails.duration);
  const thumbs = v.snippet.thumbnails ?? {};
  return {
    id: v.id,
    channel_id: channelId,
    title: v.snippet.title,
    published_at: v.snippet.publishedAt,
    duration_seconds: seconds,
    is_short: isLikelyShort(seconds),
    privacy_status: v.status?.privacyStatus ?? null,
    thumbnail_url: (thumbs.medium ?? thumbs.high ?? thumbs.default)?.url ?? null,
  };
}
