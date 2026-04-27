import SwiftUI

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
            .padding(.bottom, 40)
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

        let fileName = result.url.lastPathComponent

        var meeting = Meeting(
            title: meetingTitle.isEmpty ? "" : meetingTitle,
            date: Date(),
            duration: result.duration
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
                let transcript = try await transcriber.transcribe(audioURL: result.url)
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
