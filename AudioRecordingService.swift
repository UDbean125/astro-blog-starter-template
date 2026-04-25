import AVFoundation
import Combine

@MainActor
class AudioRecordingService: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var recordingTime: TimeInterval = 0
    @Published var audioLevel: Float = 0

    private var audioRecorder: AVAudioRecorder?
    private var timer: Timer?
    private var startTime: Date?

    var currentFileURL: URL?

    private var documentsDirectory: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Recordings", isDirectory: true)
    }

    override init() {
        super.init()
        createRecordingsDirectory()
    }

    private func createRecordingsDirectory() {
        try? FileManager.default.createDirectory(at: documentsDirectory, withIntermediateDirectories: true)
    }

    func requestPermission() async -> Bool {
        if #available(iOS 17.0, *) {
            return await AVAudioApplication.requestRecordPermission()
        } else {
            return await withCheckedContinuation { continuation in
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        }
    }

    func startRecording() async throws -> URL {
        let granted = await requestPermission()
        guard granted else {
            throw RecordingError.permissionDenied
        }

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try session.setActive(true)

        let fileName = "meeting_\(Date().timeIntervalSince1970).m4a"
        let fileURL = documentsDirectory.appendingPathComponent(fileName)

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
        ]

        audioRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
        audioRecorder?.isMeteringEnabled = true
        audioRecorder?.record()

        currentFileURL = fileURL
        isRecording = true
        startTime = Date()
        recordingTime = 0

        startTimer()

        return fileURL
    }

    func stopRecording() -> (url: URL, duration: TimeInterval)? {
        guard let recorder = audioRecorder, recorder.isRecording else { return nil }

        let duration = recordingTime
        let url = recorder.url

        recorder.stop()
        audioRecorder = nil
        isRecording = false

        stopTimer()

        try? AVAudioSession.sharedInstance().setActive(false)

        return (url: url, duration: duration)
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, let start = self.startTime else { return }
                self.recordingTime = Date().timeIntervalSince(start)
                self.audioRecorder?.updateMeters()
                self.audioLevel = self.audioRecorder?.averagePower(forChannel: 0) ?? -160
            }
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
        recordingTime = 0
        audioLevel = -160
    }
}

enum RecordingError: LocalizedError {
    case permissionDenied
    case recordingFailed

    var errorDescription: String? {
        switch self {
        case .permissionDenied: return "Microphone permission is required to record meetings."
        case .recordingFailed: return "Failed to start recording."
        }
    }
}
