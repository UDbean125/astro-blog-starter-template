import SwiftUI

struct MeetingsListView: View {
    @EnvironmentObject var meetingStore: MeetingStore
    @State private var searchText = ""

    var filteredMeetings: [Meeting] {
        if searchText.isEmpty {
            return meetingStore.meetings
        }
        return meetingStore.meetings.filter {
            $0.displayTitle.localizedCaseInsensitiveContains(searchText) ||
            ($0.transcript?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        Group {
            if meetingStore.meetings.isEmpty {
                emptyState
            } else {
                List {
                    ForEach(filteredMeetings) { meeting in
                        NavigationLink(destination: MeetingDetailView(meeting: meeting)) {
                            MeetingRowView(meeting: meeting)
                        }
                    }
                    .onDelete(perform: meetingStore.delete)
                }
                .searchable(text: $searchText, prompt: "Search meetings")
            }
        }
        .navigationTitle("Meetings")
        .toolbar {
            if !meetingStore.meetings.isEmpty {
                EditButton()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "waveform.circle")
                .font(.system(size: 64))
                .foregroundColor(.secondary.opacity(0.4))

            Text("No Meetings Yet")
                .font(.title2.bold())

            Text("Record your first meeting to get\nAI-powered notes and summaries.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
}

struct MeetingRowView: View {
    let meeting: Meeting

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(meeting.displayTitle)
                    .font(.headline)
                    .lineLimit(1)

                Spacer()

                if meeting.analysis != nil {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.green)
                        .font(.caption)
                }
            }

            HStack {
                Label(meeting.date.formatted(date: .abbreviated, time: .shortened), systemImage: "calendar")

                Spacer()

                Label(meeting.formattedDuration, systemImage: "clock")
            }
            .font(.caption)
            .foregroundColor(.secondary)

            if let summary = meeting.analysis?.summary {
                Text(summary)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                    .padding(.top, 2)
            }
        }
        .padding(.vertical, 4)
    }
}
