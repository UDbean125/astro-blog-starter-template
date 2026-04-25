import SwiftUI

struct SettingsView: View {
    @AppStorage("claude_api_key") private var apiKey = ""
    @State private var showAPIKey = false
    @State private var tempKey = ""

    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Claude API Key")
                        .font(.headline)

                    Text("Required for AI-powered meeting analysis. Get your key from console.anthropic.com")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    HStack {
                        if showAPIKey {
                            TextField("sk-ant-...", text: $tempKey)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(.body, design: .monospaced))
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                        } else {
                            SecureField("sk-ant-...", text: $tempKey)
                                .textFieldStyle(.roundedBorder)
                                .font(.system(.body, design: .monospaced))
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                        }

                        Button {
                            showAPIKey.toggle()
                        } label: {
                            Image(systemName: showAPIKey ? "eye.slash" : "eye")
                        }
                    }

                    if !tempKey.isEmpty && tempKey != apiKey {
                        Button("Save Key") {
                            apiKey = tempKey
                        }
                        .buttonStyle(.borderedProminent)
                    }

                    if !apiKey.isEmpty {
                        Label("API key configured", systemImage: "checkmark.circle.fill")
                            .foregroundColor(.green)
                            .font(.caption)
                    }
                }
            } header: {
                Text("AI Configuration")
            }

            Section {
                HStack {
                    Label("Microphone", systemImage: "mic")
                    Spacer()
                    PermissionStatusBadge(type: .microphone)
                }

                HStack {
                    Label("Speech Recognition", systemImage: "waveform")
                    Spacer()
                    PermissionStatusBadge(type: .speechRecognition)
                }
            } header: {
                Text("Permissions")
            } footer: {
                Text("Microphone access is needed to record meetings. Speech recognition is needed for transcription.")
            }

            Section {
                Link(destination: URL(string: "https://console.anthropic.com")!) {
                    Label("Anthropic Console", systemImage: "key")
                }

                Link(destination: URL(string: "https://docs.anthropic.com")!) {
                    Label("API Documentation", systemImage: "book")
                }
            } header: {
                Text("Resources")
            }

            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Bryan's Notes")
                        .font(.headline)
                    Text("Version 1.0.0")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Built by Hen Solutions LLC")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } header: {
                Text("About")
            }
        }
        .navigationTitle("Settings")
        .onAppear {
            tempKey = apiKey
        }
    }
}

struct PermissionStatusBadge: View {
    enum PermissionType {
        case microphone, speechRecognition
    }

    let type: PermissionType
    @State private var status: String = "Unknown"
    @State private var statusColor: Color = .gray

    var body: some View {
        Text(status)
            .font(.caption)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(statusColor.opacity(0.15))
            .foregroundColor(statusColor)
            .cornerRadius(8)
            .onAppear(perform: checkStatus)
    }

    private func checkStatus() {
        switch type {
        case .microphone:
            switch AVAudioSession.sharedInstance().recordPermission {
            case .granted:
                status = "Granted"
                statusColor = .green
            case .denied:
                status = "Denied"
                statusColor = .red
            case .undetermined:
                status = "Not Asked"
                statusColor = .orange
            @unknown default:
                break
            }
        case .speechRecognition:
            switch SFSpeechRecognizer.authorizationStatus() {
            case .authorized:
                status = "Granted"
                statusColor = .green
            case .denied, .restricted:
                status = "Denied"
                statusColor = .red
            case .notDetermined:
                status = "Not Asked"
                statusColor = .orange
            @unknown default:
                break
            }
        }
    }
}

import AVFoundation
import Speech
