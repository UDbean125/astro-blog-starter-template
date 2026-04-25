import Foundation

@MainActor
class MeetingStore: ObservableObject {
    @Published var meetings: [Meeting] = []

    private let saveKey = "saved_meetings"

    init() {
        load()
    }

    func add(_ meeting: Meeting) {
        meetings.insert(meeting, at: 0)
        save()
    }

    func update(_ meeting: Meeting) {
        if let index = meetings.firstIndex(where: { $0.id == meeting.id }) {
            meetings[index] = meeting
            save()
        }
    }

    func delete(_ meeting: Meeting) {
        meetings.removeAll { $0.id == meeting.id }

        // Clean up audio file
        if let fileName = meeting.audioFileName {
            let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                .appendingPathComponent("Recordings")
                .appendingPathComponent(fileName)
            try? FileManager.default.removeItem(at: url)
        }

        save()
    }

    func delete(at offsets: IndexSet) {
        for index in offsets {
            let meeting = meetings[index]
            if let fileName = meeting.audioFileName {
                let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                    .appendingPathComponent("Recordings")
                    .appendingPathComponent(fileName)
                try? FileManager.default.removeItem(at: url)
            }
        }
        meetings.remove(atOffsets: offsets)
        save()
    }

    private func save() {
        if let data = try? JSONEncoder().encode(meetings) {
            UserDefaults.standard.set(data, forKey: saveKey)
        }
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: saveKey),
              let decoded = try? JSONDecoder().decode([Meeting].self, from: data) else {
            return
        }
        meetings = decoded
    }
}
