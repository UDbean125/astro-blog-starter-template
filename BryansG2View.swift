import SwiftUI

struct BryansG2View: View {
    let meeting: Meeting
    @StateObject private var g2Service = G2AnalysisService()
    @EnvironmentObject var meetingStore: MeetingStore
    @State private var g2: G2Analysis?
    @State private var errorMessage: String?
    @State private var showError = false

    var body: some View {
        Group {
            if let g2 {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        spotlightSection(g2)
                        actionItemsSection(g2)
                        meddicSection(g2)
                        topicTrackersSection(g2)
                        askAnythingSection
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 30)
                }
            } else if g2Service.isAnalyzing {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.5)
                    Text(g2Service.analysisProgress)
                        .font(.headline)
                    Text("Building your G2 intelligence report...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "brain.head.profile")
                        .font(.system(size: 50))
                        .foregroundColor(.orange.opacity(0.6))

                    Text("Bryan's G2")
                        .font(.title2.bold())

                    Text("Generate sales intelligence from this meeting's transcript.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)

                    Button {
                        generateG2()
                    } label: {
                        Label("Generate G2 Report", systemImage: "bolt.fill")
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Color.orange)
                            .cornerRadius(12)
                    }
                    .disabled(meeting.transcript == nil)

                    if meeting.transcript == nil {
                        Text("Transcript required. Record a meeting first.")
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding()
            }
        }
        .alert("Error", isPresented: $showError) {
            Button("OK") {}
        } message: {
            Text(errorMessage ?? "Unknown error")
        }
        .onAppear {
            if let stored = meeting.g2Analysis {
                g2 = stored
            }
        }
    }

    private func generateG2() {
        guard let transcript = meeting.transcript else { return }
        Task {
            do {
                let analysis = try await g2Service.analyzeG2(
                    transcript: transcript,
                    meetingTitle: meeting.displayTitle
                )
                g2 = analysis

                // Persist to meeting store
                var updated = meeting
                updated.g2Analysis = analysis
                meetingStore.update(updated)
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    // MARK: - 1. Spotlight

    private func spotlightSection(_ g2: G2Analysis) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("The Spotlight", systemImage: "light.beacon.max")
                .font(.title3.bold())
                .foregroundColor(.orange)

            Text(g2.spotlight)
                .font(.body)
                .lineSpacing(5)
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.orange.opacity(0.08))
                .cornerRadius(12)
        }
    }

    // MARK: - 2. Action Items

    private func actionItemsSection(_ g2: G2Analysis) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Smart Action Items", systemImage: "checklist")
                .font(.title3.bold())
                .foregroundColor(.blue)

            ForEach(g2.actionItems) { item in
                HStack(alignment: .top, spacing: 10) {
                    Text(item.category == .external ? "EXT" : "INT")
                        .font(.caption2.bold())
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(item.category == .external ? Color.blue : Color.purple)
                        .cornerRadius(4)
                        .padding(.top, 2)

                    VStack(alignment: .leading, spacing: 3) {
                        Text(item.owner)
                            .font(.subheadline.bold())

                        Text(item.action)
                            .font(.subheadline)
                            .foregroundColor(.primary.opacity(0.85))

                        if let deadline = item.deadline, !deadline.isEmpty, deadline.lowercased() != "null" {
                            Label(deadline, systemImage: "clock")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }
        }
    }

    // MARK: - 3. MEDDIC Scorecard

    private func meddicSection(_ g2: G2Analysis) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("MEDDIC Scorecard", systemImage: "chart.bar.doc.horizontal")
                .font(.title3.bold())
                .foregroundColor(.green)

            ForEach(g2.meddic.items, id: \.label) { label, item in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(item.status.emoji)
                        Text(label)
                            .font(.subheadline.bold())
                        Spacer()
                        Text(item.status.rawValue.capitalized)
                            .font(.caption)
                            .foregroundColor(meddicColor(item.status))
                    }

                    Text(item.detail)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineSpacing(2)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(meddicColor(item.status).opacity(0.06))
                .cornerRadius(10)
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(meddicColor(item.status).opacity(0.2), lineWidth: 1)
                )
            }
        }
    }

    private func meddicColor(_ status: MEDDICItem.MEDDICStatus) -> Color {
        switch status {
        case .green: return .green
        case .yellow: return .orange
        case .red: return .red
        }
    }

    // MARK: - 4. Topic Trackers

    private func topicTrackersSection(_ g2: G2Analysis) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Topic Trackers", systemImage: "tag")
                .font(.title3.bold())
                .foregroundColor(.purple)

            ForEach(g2.topicTrackers) { tracker in
                VStack(alignment: .leading, spacing: 6) {
                    Text(tracker.category)
                        .font(.subheadline.bold())

                    if tracker.mentions.isEmpty {
                        Text("No mentions detected")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .italic()
                    } else {
                        ForEach(tracker.mentions) { mention in
                            HStack(alignment: .top, spacing: 8) {
                                Text(mention.timestamp)
                                    .font(.caption.monospaced())
                                    .foregroundColor(.blue)
                                    .frame(width: 50, alignment: .leading)

                                Text(mention.text)
                                    .font(.caption)
                                    .foregroundColor(.primary.opacity(0.8))
                            }
                        }
                    }
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemGray6))
                .cornerRadius(10)
            }
        }
    }

    // MARK: - 5. Ask Anything

    private var askAnythingSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Ask Anything", systemImage: "bubble.left.and.text.bubble.right")
                .font(.title3.bold())
                .foregroundColor(.indigo)

            NavigationLink {
                AskAnythingView(transcript: meeting.transcript ?? "")
            } label: {
                HStack {
                    Image(systemName: "magnifyingglass")
                    Text("Ask a question about this meeting...")
                        .font(.subheadline)
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .foregroundColor(.secondary)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
        }
    }
}
