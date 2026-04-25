import SwiftUI
import MessageUI

struct MeetingDetailView: View {
    let meeting: Meeting
    @EnvironmentObject var meetingStore: MeetingStore
    @StateObject private var exportService = ExportService()
    @State private var topTab = 0
    @State private var selectedTab = 0
    @State private var showMailComposer = false
    @State private var showMailUnavailable = false

    var body: some View {
        VStack(spacing: 0) {
            // Top-level tab: Notes vs Bryan's G2
            Picker("Section", selection: $topTab) {
                Text("Notes").tag(0)
                Text("Bryan's G2").tag(1)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.top, 8)

            if topTab == 0 {
                notesContent
            } else {
                BryansG2View(meeting: meeting)
                    .environmentObject(meetingStore)
            }
        }
        .navigationTitle(meeting.displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    exportMenu
                } label: {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .sheet(isPresented: $showMailComposer) {
            if let emailData = exportService.prepareEmailExport(meeting: meeting) {
                MailComposerView(
                    subject: emailData.subject,
                    body: emailData.htmlBody,
                    isHTML: true
                )
            }
        }
        .sheet(isPresented: $exportService.showShareSheet) {
            ShareSheet(items: exportService.shareItems)
        }
        .alert("Export Successful", isPresented: $exportService.showExportSuccess) {
            Button("OK") {}
        } message: {
            Text(exportService.exportMessage)
        }
        .alert("Email Unavailable", isPresented: $showMailUnavailable) {
            Button("Copy to Clipboard") {
                if let emailData = exportService.prepareEmailExport(meeting: meeting) {
                    UIPasteboard.general.string = emailData.body
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Mail is not configured on this device. You can copy the notes to your clipboard instead.")
        }
    }

    // MARK: - Notes Content

    private var notesContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                meetingHeader

                if meeting.analysis != nil {
                    Picker("View", selection: $selectedTab) {
                        Text("Summary").tag(0)
                        Text("Key Points").tag(1)
                        Text("Next Steps").tag(2)
                        Text("Transcript").tag(3)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    switch selectedTab {
                    case 0: summaryView
                    case 1: keyPointsView
                    case 2: nextStepsView
                    case 3: transcriptView
                    default: EmptyView()
                    }
                } else if meeting.transcript != nil {
                    transcriptView
                } else {
                    noAnalysisView
                }
            }
            .padding(.bottom, 30)
        }
    }

    // MARK: - Header

    private var meetingHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label(meeting.date.formatted(date: .long, time: .shortened), systemImage: "calendar")
                Spacer()
                Label(meeting.formattedDuration, systemImage: "clock")
            }
            .font(.subheadline)
            .foregroundColor(.secondary)

            if let participants = meeting.analysis?.participants, !participants.isEmpty {
                Label(participants.joined(separator: ", "), systemImage: "person.2")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - Summary Tab

    private var summaryView: some View {
        VStack(alignment: .leading, spacing: 16) {
            if let analysis = meeting.analysis {
                CardView(title: "Summary", icon: "doc.text") {
                    Text(analysis.summary)
                        .font(.body)
                        .lineSpacing(4)
                }

                if !analysis.decisions.isEmpty {
                    CardView(title: "Decisions Made", icon: "checkmark.seal") {
                        ForEach(analysis.decisions, id: \.self) { decision in
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "arrow.right.circle.fill")
                                    .foregroundColor(.orange)
                                    .font(.caption)
                                    .padding(.top, 3)
                                Text(decision)
                                    .font(.subheadline)
                            }
                        }
                    }
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Key Points Tab

    private var keyPointsView: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let analysis = meeting.analysis {
                CardView(title: "Key Points", icon: "list.bullet.circle") {
                    ForEach(Array(analysis.keyPoints.enumerated()), id: \.offset) { index, point in
                        HStack(alignment: .top, spacing: 10) {
                            Text("\(index + 1)")
                                .font(.caption.bold())
                                .foregroundColor(.white)
                                .frame(width: 22, height: 22)
                                .background(Color.blue)
                                .clipShape(Circle())

                            Text(point)
                                .font(.subheadline)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Next Steps Tab

    private var nextStepsView: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let analysis = meeting.analysis {
                CardView(title: "Action Items", icon: "arrow.right.circle") {
                    ForEach(Array(analysis.nextSteps.enumerated()), id: \.offset) { index, step in
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "circle")
                                .foregroundColor(.green)
                                .font(.caption)
                                .padding(.top, 3)

                            Text(step)
                                .font(.subheadline)
                        }
                        .padding(.vertical, 2)
                    }
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Transcript Tab

    private var transcriptView: some View {
        VStack(alignment: .leading, spacing: 8) {
            CardView(title: "Transcript", icon: "text.alignleft") {
                Text(meeting.transcript ?? "No transcript available.")
                    .font(.subheadline)
                    .lineSpacing(4)
                    .foregroundColor(.primary.opacity(0.8))
            }
        }
        .padding(.horizontal)
    }

    // MARK: - No Analysis State

    private var noAnalysisView: some View {
        VStack(spacing: 12) {
            Image(systemName: "brain")
                .font(.system(size: 40))
                .foregroundColor(.secondary.opacity(0.4))

            Text("Analysis not available")
                .font(.headline)
                .foregroundColor(.secondary)

            Text("Set your Claude API key in Settings to enable AI analysis.")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(40)
    }

    // MARK: - Export Menu

    @ViewBuilder
    private var exportMenu: some View {
        Button {
            exportService.exportToAppleNotes(meeting: meeting)
        } label: {
            Label("Apple Notes", systemImage: "note.text")
        }

        Button {
            if MFMailComposeViewController.canSendMail() {
                showMailComposer = true
            } else {
                showMailUnavailable = true
            }
        } label: {
            Label("Email", systemImage: "envelope")
        }

        Button {
            exportService.shareAsFile(meeting: meeting)
        } label: {
            Label("Word Document", systemImage: "doc.richtext")
        }

        Divider()

        Button {
            exportService.shareAsText(meeting: meeting)
        } label: {
            Label("Share as Text", systemImage: "square.and.arrow.up")
        }

        Button {
            if let text = meeting.analysis?.formattedNotes ?? meeting.transcript {
                UIPasteboard.general.string = text
                exportService.exportMessage = "Copied to clipboard"
                exportService.showExportSuccess = true
            }
        } label: {
            Label("Copy to Clipboard", systemImage: "doc.on.doc")
        }
    }
}

// MARK: - Card View Component

struct CardView<Content: View>: View {
    let title: String
    let icon: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(title, systemImage: icon)
                .font(.headline)

            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Mail Composer

struct MailComposerView: UIViewControllerRepresentable {
    let subject: String
    let body: String
    let isHTML: Bool

    func makeUIViewController(context: Context) -> MFMailComposeViewController {
        let composer = MFMailComposeViewController()
        composer.mailComposeDelegate = context.coordinator
        composer.setSubject(subject)
        composer.setMessageBody(body, isHTML: isHTML)
        return composer
    }

    func updateUIViewController(_ uiViewController: MFMailComposeViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator() }

    class Coordinator: NSObject, MFMailComposeViewControllerDelegate {
        func mailComposeController(_ controller: MFMailComposeViewController,
                                   didFinishWith result: MFMailComposeResult,
                                   error: Error?) {
            controller.dismiss(animated: true)
        }
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
