import Speech
import AVFoundation

@MainActor
class TranscriptionService: ObservableObject {
    @Published var transcriptionProgress: Double = 0
    @Published var isTranscribing = false
    @Published var partialTranscript = ""

    func requestPermission() async -> Bool {
        return await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
    }

    func transcribe(audioURL: URL) async throws -> String {
        let granted = await requestPermission()
        guard granted else {
            throw TranscriptionError.permissionDenied
        }

        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")),
              recognizer.isAvailable else {
            throw TranscriptionError.recognizerUnavailable
        }

        isTranscribing = true
        transcriptionProgress = 0
        partialTranscript = ""

        defer {
            isTranscribing = false
            transcriptionProgress = 1.0
        }

        let request = SFSpeechURLRecognitionRequest(url: audioURL)
        request.shouldReportPartialResults = true
        request.addsPunctuation = true

        // Cloud-based SFSpeechURLRecognitionRequest silently stalls on
        // recordings longer than ~1 minute. Force on-device recognition when
        // the recognizer supports it (English on iOS 13+ / macOS 10.15+ does)
        // so meeting-length audio actually transcribes.
        if recognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
        }

        // Get audio duration for progress tracking
        let asset = AVURLAsset(url: audioURL)
        let totalDuration = try await asset.load(.duration).seconds

        return try await withCheckedThrowingContinuation { continuation in
            recognizer.recognitionTask(with: request) { [weak self] result, error in
                Task { @MainActor in
                    if let error {
                        if let result {
                            // Partial result before error — use what we have
                            continuation.resume(returning: result.bestTranscription.formattedString)
                        } else {
                            continuation.resume(throwing: TranscriptionError.failed(error.localizedDescription))
                        }
                        return
                    }

                    guard let result else { return }

                    // Update progress based on transcribed segments
                    if totalDuration > 0 {
                        let segments = result.bestTranscription.segments
                        if let lastSegment = segments.last {
                            let progress = min(lastSegment.timestamp / totalDuration, 1.0)
                            self?.transcriptionProgress = progress
                        }
                    }

                    self?.partialTranscript = result.bestTranscription.formattedString

                    if result.isFinal {
                        continuation.resume(returning: result.bestTranscription.formattedString)
                    }
                }
            }
        }
    }
}

enum TranscriptionError: LocalizedError {
    case permissionDenied
    case recognizerUnavailable
    case failed(String)

    var errorDescription: String? {
        switch self {
        case .permissionDenied: return "Speech recognition permission is required."
        case .recognizerUnavailable: return "Speech recognizer is not available."
        case .failed(let msg): return "Transcription failed: \(msg)"
        }
    }
}
