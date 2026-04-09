import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { WebView } from "react-native-webview";

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  thumbnailUrl,
}) => {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const normalizedVideoUrl = React.useMemo(() => {
    const iframeMatch = videoUrl.match(
      /iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-zA-Z0-9-]+)/,
    );
    if (iframeMatch?.[1] && iframeMatch?.[2]) {
      return `https://vz-${iframeMatch[1]}.b-cdn.net/${iframeMatch[2]}/playlist.m3u8`;
    }
    return videoUrl;
  }, [videoUrl]);

  const bunnyMatch = React.useMemo(() => {
    const iframeMatch = videoUrl.match(
      /iframe\.mediadelivery\.net\/embed\/(\d+)\/([a-zA-Z0-9-]+)/,
    );
    if (iframeMatch?.[1] && iframeMatch?.[2]) {
      return { libraryId: iframeMatch[1], videoId: iframeMatch[2] };
    }

    const hlsMatch = normalizedVideoUrl.match(
      /vz-(\d+)\.b-cdn\.net\/([a-zA-Z0-9-]+)\/playlist\.m3u8/,
    );
    if (hlsMatch?.[1] && hlsMatch?.[2]) {
      return { libraryId: hlsMatch[1], videoId: hlsMatch[2] };
    }

    return null;
  }, [videoUrl, normalizedVideoUrl]);

  const bunnyIframeUrl = bunnyMatch
    ? `https://iframe.mediadelivery.net/embed/${bunnyMatch.libraryId}/${bunnyMatch.videoId}?autoplay=false&preload=true`
    : null;

  const isBunnyVideo = Boolean(bunnyIframeUrl);

  const handlePlayPause = async () => {
    if (!videoRef.current) return;

    if (status?.isLoaded && status.isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  return (
    <View style={styles.container}>
      {isBunnyVideo && bunnyIframeUrl ? (
        <WebView
          key={`bunny-${retryCount}`}
          source={{ uri: bunnyIframeUrl }}
          style={styles.video}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      ) : (
        <Video
          ref={videoRef}
          source={{ uri: normalizedVideoUrl }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls
          onPlaybackStatusUpdate={(nextStatus) => setStatus(nextStatus)}
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => {
            setIsLoading(false);
            setHasError(false);
          }}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          posterSource={thumbnailUrl ? { uri: thumbnailUrl } : undefined}
          posterStyle={styles.poster}
        />
      )}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#5B7FFF" />
        </View>
      )}

      {!isLoading && !hasError && !isBunnyVideo && (
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <Text style={styles.playButtonText}>
            {status && status.isLoaded && status.isPlaying
              ? "Pause"
              : "Tap to Play"}
          </Text>
        </TouchableOpacity>
      )}

      {hasError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>
            Video unavailable in-app right now.
          </Text>
          <Text style={styles.errorHint}>
            Bunny might still be processing this video. Retry in 30-90s.
          </Text>
          <TouchableOpacity onPress={() => setRetryCount((count) => count + 1)}>
            <Text style={styles.openLink}>Retry video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(bunnyIframeUrl || normalizedVideoUrl)
            }
          >
            <Text style={[styles.openLink, { marginTop: 8 }]}>
              Open in browser
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  poster: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  playButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  playButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 16,
  },
  errorText: {
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  errorHint: {
    color: "rgba(255,255,255,0.8)",
    marginBottom: 10,
    textAlign: "center",
    fontSize: 12,
  },
  openLink: {
    color: "#7CB2FF",
    fontWeight: "700",
  },
});

export default VideoPlayer;
