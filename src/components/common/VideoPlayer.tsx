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

  // Check if this is a Bunny embed URL (standardized format)
  const isBunnyEmbedUrl = React.useMemo(() => {
    return videoUrl?.includes("iframe.mediadelivery.net/embed");
  }, [videoUrl]);

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
      {isBunnyEmbedUrl ? (
        // Use WebView for Bunny iframe embed
        <WebView
          source={{ uri: videoUrl }}
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
          onError={(syntheticEvent) => {
            setIsLoading(false);
            setHasError(true);
            console.error("WebView error:", syntheticEvent.nativeEvent);
          }}
        />
      ) : (
        // Fallback to native Video player (for HLS or other formats)
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
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

      {!isLoading && !hasError && !isBunnyEmbedUrl && (
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
            Unable to load video. Please try again later.
          </Text>
          <TouchableOpacity onPress={() => setHasError(false)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          {videoUrl && (
            <TouchableOpacity onPress={() => Linking.openURL(videoUrl)}>
              <Text style={[styles.retryText, { marginTop: 8 }]}>
                Open in browser
              </Text>
            </TouchableOpacity>
          )}
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
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: 16,
  },
  errorText: {
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
    fontSize: 14,
  },
  retryText: {
    color: "#7CB2FF",
    fontWeight: "700",
    textAlign: "center",
  },
});

export default VideoPlayer;
