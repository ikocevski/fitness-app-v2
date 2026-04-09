/**
 * Bunny Stream Video Service
 *
 * Setup Instructions:
 * 1. Sign up at bunny.net
 * 2. Create a Stream Library
 * 3. Get your Library ID and API Key from the dashboard
 * 4. Add to .env.local:
 *    EXPO_PUBLIC_BUNNY_LIBRARY_ID=your_library_id
 *    EXPO_PUBLIC_BUNNY_API_KEY=your_api_key
 *
 * Pricing: $10/month + $0.005 per GB storage + $0.01 per GB bandwidth
 */

import Constants from "expo-constants";

const BUNNY_LIBRARY_ID =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BUNNY_LIBRARY_ID || "";
const BUNNY_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BUNNY_API_KEY || "";
const BUNNY_STREAM_API = "https://video.bunnycdn.com";

interface BunnyVideo {
  guid: string;
  videoLibraryId: number;
  title: string;
  thumbnailUrl?: string;
  playUrl: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  guid?: string;
  videoLibraryId?: number;
}

/**
 * Create a video object in Bunny Stream
 * This is the first step - creates a video entry before uploading the file
 */
export const createVideo = async (
  title: string,
): Promise<{ guid: string; videoLibraryId: number } | null> => {
  try {
    console.log("[Bunny] Creating video with title:", title);
    console.log("[Bunny] Library ID:", BUNNY_LIBRARY_ID);
    console.log("[Bunny] API Key present:", !!BUNNY_API_KEY);

    const response = await fetch(
      `${BUNNY_STREAM_API}/library/${BUNNY_LIBRARY_ID}/videos`,
      {
        method: "POST",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Bunny] Create video failed:", response.status, errorText);
      throw new Error(`Failed to create video: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[Bunny] Video created successfully:", data.guid);
    return {
      guid: data.guid,
      videoLibraryId: data.videoLibraryId,
    };
  } catch (error) {
    console.error("Error creating video in Bunny:", error);
    return null;
  }
};

/**
 * Upload video file to Bunny Stream
 * Use this after creating a video object with createVideo()
 */
export const uploadVideoFile = async (
  videoId: string,
  fileUri: string,
  fileName: string,
  onProgress?: (progress: number) => void,
): Promise<boolean> => {
  console.log("[Bunny] Starting file upload for video ID:", videoId);
  console.log("[Bunny] File URI:", fileUri);

  try {
    // Read file as blob
    console.log("[Bunny] Reading file as blob...");
    const response = await fetch(fileUri);
    const blob = await response.blob();
    console.log(
      "[Bunny] File size:",
      blob.size,
      "bytes",
      (blob.size / 1024 / 1024).toFixed(2),
      "MB",
    );

    // Upload to Bunny
    console.log("[Bunny] Uploading to Bunny Stream...");
    const uploadResponse = await fetch(
      `${BUNNY_STREAM_API}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "PUT",
        headers: {
          AccessKey: BUNNY_API_KEY,
          "Content-Type": "application/octet-stream",
        },
        body: blob,
      },
    );

    console.log("[Bunny] Upload response status:", uploadResponse.status);
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[Bunny] Upload failed:", errorText);
    } else {
      console.log("[Bunny] Upload successful!");
    }

    return uploadResponse.ok;
  } catch (error) {
    console.error("Error uploading video to Bunny:", error);
    return false;
  }
};

/**
 * Get video details from Bunny Stream
 */
export const getVideo = async (videoId: string): Promise<BunnyVideo | null> => {
  try {
    const response = await fetch(
      `${BUNNY_STREAM_API}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        headers: {
          AccessKey: BUNNY_API_KEY,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to get video: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      guid: data.guid,
      videoLibraryId: data.videoLibraryId,
      title: data.title,
      thumbnailUrl: data.thumbnailUrl,
      playUrl: getVideoPlayUrl(data.guid),
    };
  } catch (error) {
    console.error("Error getting video from Bunny:", error);
    return null;
  }
};

/**
 * Delete video from Bunny Stream
 */
export const deleteVideo = async (videoId: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `${BUNNY_STREAM_API}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
      {
        method: "DELETE",
        headers: {
          AccessKey: BUNNY_API_KEY,
        },
      },
    );

    return response.ok;
  } catch (error) {
    console.error("Error deleting video from Bunny:", error);
    return false;
  }
};

/**
 * Get the playable video URL for a Bunny video
 */
export const getVideoPlayUrl = (videoId: string): string => {
  return `https://vz-${BUNNY_LIBRARY_ID}.b-cdn.net/${videoId}/playlist.m3u8`;
};

/**
 * Get thumbnail URL for a Bunny video
 */
export const getVideoThumbnailUrl = (videoId: string): string => {
  return `https://vz-${BUNNY_LIBRARY_ID}.b-cdn.net/${videoId}/thumbnail.jpg`;
};

/**
 * Complete upload workflow: create video + upload file
 */
export const uploadVideo = async (
  title: string,
  fileUri: string,
  fileName: string,
  onProgress?: (progress: number) => void,
): Promise<{ success: boolean; videoId?: string; playUrl?: string }> => {
  try {
    // Step 1: Create video object
    const videoData = await createVideo(title);
    if (!videoData) {
      return { success: false };
    }

    // Step 2: Upload file
    const uploadSuccess = await uploadVideoFile(
      videoData.guid,
      fileUri,
      fileName,
      onProgress,
    );

    if (!uploadSuccess) {
      return { success: false };
    }

    // Step 3: Return video info
    return {
      success: true,
      videoId: videoData.guid,
      playUrl: getVideoPlayUrl(videoData.guid),
    };
  } catch (error) {
    console.error("Error in complete upload workflow:", error);
    return { success: false };
  }
};
