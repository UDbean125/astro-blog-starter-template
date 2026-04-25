import SwiftUI

struct ContentView: View {
    @StateObject private var meetingStore = MeetingStore()
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                RecordingView()
            }
            .tabItem {
                Label("Record", systemImage: "mic.circle.fill")
            }
            .tag(0)

            NavigationStack {
                MeetingsListView()
            }
            .tabItem {
                Label("Meetings", systemImage: "list.bullet.rectangle")
            }
            .tag(1)

            NavigationStack {
                SettingsView()
            }
            .tabItem {
                Label("Settings", systemImage: "gearshape")
            }
            .tag(2)
        }
        .environmentObject(meetingStore)
        .tint(.blue)
    }
}
