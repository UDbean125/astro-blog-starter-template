import SwiftUI
import AVFoundation
import UniformTypeIdentifiers

struct RecordingView: View {
    @EnvironmentObject var meetingStore: MeetingStore
    @StateObject private var recorder = AudioRecordingService()
    @StateObject private var transcriber = TranscriptionService()
    @StateObject private var analyzer = AIAnalysisService()

    @State private var meetingTitle = ""
    @State private var currentMeeting: Meeting?
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var navigateToDetail = false
    @State private var showImporter = false

    var body: some View {
        VStack(spacing: 0) {
            // Title input
            VStack(spacing: 12) {
                TextField("Meeting title (optional)", text: $meetingTitle)
                    .font(.title3)
                    .textFieldStyle(.roundedBorder)
                    .disabled(recorder.isRecording)
                    .padding(.horizontal)
            }
            .padding(.top, 20)

            Spacer()

            // Recording visualization
            if recorder.isRecording {
                VStack(spacing: 16) {
                    AudioWaveformView(level: recorder.audioLevel)
                        .frame(height: 80)
                        .padding(.horizontal, 40)

                    Text(formatTime(recorder.recordingTime))
                        .font(.system(size: 48, weight: .light, design: .monospaced))
                        .foregroundColor(.red)

                    Text("Recording...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            } else if transcriber.isTranscribing {
                VStack(spacing: 16) {
                    ProgressView(value: transcriber.transcriptionProgress)
                        .progressViewStyle(.linear)
                        .padding(.horizontal, 40)

                    Text("Transcribing audio...")
                        .font(.headline)

                    Text("\(Int(transcriber.transcriptionProgress * 100))%")
                        .font(.title2.monospacedDigit())
                        .foregroundColor(.blue)
                }
            } else if analyzer.isAnalyzing {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.5)

                    Text(analyzer.analysisProgress)
                        .font(.headline)

                    Text("Generating notes & insights...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "mic.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.secondary.opacity(0.3))

                    Text("Tap to start recording")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()

            // Record button
            Button(action: toggleRecording) {
                ZStack {
                    Circle()
                        .fill(recorder.isRecording ? Color.red.opacity(0.15) : Color.red.opacity(0.1))
                        .frame(width: 100, height: 100)

                    Circle()
                        .fill(recorder.isRecording ? Color.red : Color.red)
                        .frame(width: recorder.isRecording ? 36 : 72)
                        .clipShape(
                            RoundedRectangle(cornerRadius: recorder.isRecording ? 8 : 36)
                        )
                }
            }
            .disabled(transcriber.isTranscribing || analyzer.isAnalyzing)
            .padding(.bottom, 12)

            // Import existing audio
            Button {
                showImporter = true
            } label: {
                Label("Import existing audio", systemImage: "square.and.arrow.down")
                    .font(.subheadline)
            }
            .disabled(recorder.isRecording || transcriber.isTranscribing || analyzer.isAnalyzing)
            .padding(.bottom, 28)
        }
        .navigationTitle("Record")
        .navigationDestination(isPresented: $navigateToDetail) {
            if let meeting = currentMeeting,
               let stored = meetingStore.meetings.first(where: { $0.id == meeting.id }) {
                MeetingDetailView(meeting: stored)
            }
        }
        .alert("Error", isPresented: $showError) {
            Button("OK") {}
        } message: {
            Text(errorMessage ?? "An unknown error occurred.")
        }
        .fileImporter(
            isPresented: $showImporter,
            allowedContentTypes: [.audio, .mpeg4Audio, .mp3, .wav, .audiovisualContent],
            allowsMultipleSelection: false
        ) { result in
            handleImport(result: result)
        }
    }

    private func toggleRecording() {
        if recorder.isRecording {
            stopAndProcess()
        } else {
            startRecording()
        }
    }

    private func startRecording() {
        Task {
            do {
                let _ = try await recorder.startRecording()
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    private func stopAndProcess() {
        guard let result = recorder.stopRecording() else { return }
        process(audioURL: result.url, duration: result.duration, fileName: result.url.lastPathComponent)
    }

    private func handleImport(result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            guard let pickedURL = urls.first else { return }
            Task {
                do {
                    let copied = try copyImportedAudio(from: pickedURL)
                    let duration = try await audioDuration(at: copied.url)
                    process(audioURL: copied.url, duration: duration, fileName: copied.fileName)
                } catch {
                    errorMessage = "Couldn't import audio: \(error.localizedDescription)"
                    showError = true
                }
            }
        case .failure(let error):
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    /// Copy a user-picked audio file into the app's Recordings directory so it
    /// outlives the security-scoped resource and lives next to native recordings.
    private func copyImportedAudio(from sourceURL: URL) throws -> (url: URL, fileName: String) {
        let needsScope = sourceURL.startAccessingSecurityScopedResource()
        defer { if needsScope { sourceURL.stopAccessingSecurityScopedResource() } }

        let recordingsDir = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Recordings", isDirectory: true)
        try FileManager.default.createDirectory(at: recordingsDir, withIntermediateDirectories: true)

        let ext = sourceURL.pathExtension.isEmpty ? "m4a" : sourceURL.pathExtension
        let fileName = "imported_\(Date().timeIntervalSince1970).\(ext)"
        let destination = recordingsDir.appendingPathComponent(fileName)
        try FileManager.default.copyItem(at: sourceURL, to: destination)
        return (destination, fileName)
    }

    private func audioDuration(at url: URL) async throws -> TimeInterval {
        let asset = AVURLAsset(url: url)
        return try await asset.load(.duration).seconds
    }

    private func process(audioURL: URL, duration: TimeInterval, fileName: String) {
        var meeting = Meeting(
            title: meetingTitle.isEmpty ? "" : meetingTitle,
            date: Date(),
            duration: duration
        )
        meeting.audioFileName = fileName

        // Persist the meeting up front so the audio file is never lost if
        // transcription or analysis later fails. We update the same record
        // in place as transcript/analysis become available.
        meetingStore.add(meeting)
        meetingTitle = ""

        Task {
            var transcriptionError: Error?
            var analysisError: Error?

            do {
                let transcript = try await transcriber.transcribe(audioURL: audioURL)
                meeting.transcript = transcript
                meetingStore.update(meeting)

                do {
                    let analysis = try await analyzer.analyze(
                        transcript: transcript,
                        meetingTitle: meeting.displayTitle
                    )
                    meeting.analysis = analysis
                    meetingStore.update(meeting)
                } catch {
                    analysisError = error
                }
            } catch {
                transcriptionError = error
            }

            currentMeeting = meeting

            if let transcriptionError {
                errorMessage = "Couldn't transcribe \"\(meeting.displayTitle)\": \(transcriptionError.localizedDescription) The audio is saved in Meetings — you can retry transcription from there."
                showError = true
            } else if let analysisError {
                errorMessage = "Transcription succeeded but AI analysis failed: \(analysisError.localizedDescription)"
                showError = true
                navigateToDetail = true
            } else {
                navigateToDetail = true
            }
        }
    }

    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        let tenths = Int((time.truncatingRemainder(dividingBy: 1)) * 10)
        return String(format: "%02d:%02d.%d", minutes, seconds, tenths)
    }
}

// MARK: - Audio Waveform Visualization

struct AudioWaveformView: View {
    let level: Float
    @State private var bars: [CGFloat] = Array(repeating: 0.1, count: 30)

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<bars.count, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(Color.red.opacity(0.7))
                    .frame(width: 4, height: max(4, bars[index] * 80))
            }
        }
        .onChange(of: level) { newLevel in
            withAnimation(.easeOut(duration: 0.1)) {
                bars.removeFirst()
                let normalized = CGFloat(max(0, (newLevel + 50) / 50))
                bars.append(normalized)
            }
        }
    }
}
