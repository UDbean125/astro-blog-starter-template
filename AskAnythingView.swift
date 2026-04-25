import SwiftUI

struct AskAnythingView: View {
    let transcript: String
    @StateObject private var g2Service = G2AnalysisService()
    @State private var messages: [AskAnythingMessage] = []
    @State private var inputText = ""
    @State private var isLoading = false
    @FocusState private var isInputFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Chat messages
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        // Welcome message
                        if messages.isEmpty {
                            welcomeMessage
                        }

                        ForEach(messages) { message in
                            messageBubble(message)
                                .id(message.id)
                        }

                        if isLoading {
                            HStack(spacing: 8) {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Searching transcript...")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .padding(.horizontal)
                            .id("loading")
                        }
                    }
                    .padding()
                }
                .onChange(of: messages.count) { _ in
                    if let last = messages.last {
                        withAnimation {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            Divider()

            // Input bar
            HStack(spacing: 10) {
                TextField("Ask about this meeting...", text: $inputText, axis: .vertical)
                    .textFieldStyle(.plain)
                    .lineLimit(1...4)
                    .focused($isInputFocused)
                    .onSubmit { sendMessage() }

                Button(action: sendMessage) {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.title2)
                        .foregroundColor(inputText.trimmingCharacters(in: .whitespaces).isEmpty ? .gray : .orange)
                }
                .disabled(inputText.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
            }
            .padding(.horizontal)
            .padding(.vertical, 10)
            .background(Color(.systemBackground))
        }
        .navigationTitle("Ask Anything")
        .navigationBarTitleDisplayMode(.inline)
    }

    private var welcomeMessage: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "brain.head.profile")
                    .font(.title2)
                    .foregroundColor(.orange)
                Text("Bryan's G2")
                    .font(.headline)
            }

            Text("Ask me anything about this meeting. I'll search the transcript and give you a precise answer with timestamps.")
                .font(.subheadline)
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 6) {
                suggestedQuery("What specific dates or deadlines were mentioned?")
                suggestedQuery("Who raised objections and what were they?")
                suggestedQuery("What competitors were discussed?")
                suggestedQuery("What was the agreed next step?")
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }

    private func suggestedQuery(_ text: String) -> some View {
        Button {
            inputText = text
            sendMessage()
        } label: {
            HStack {
                Image(systemName: "arrow.turn.down.right")
                    .font(.caption2)
                Text(text)
                    .font(.caption)
            }
            .foregroundColor(.orange)
        }
    }

    private func messageBubble(_ message: AskAnythingMessage) -> some View {
        HStack {
            if message.role == .user { Spacer(minLength: 60) }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 4) {
                Text(message.content)
                    .font(.subheadline)
                    .padding(12)
                    .background(message.role == .user ? Color.orange : Color(.systemGray6))
                    .foregroundColor(message.role == .user ? .white : .primary)
                    .cornerRadius(16)
            }

            if message.role == .assistant { Spacer(minLength: 60) }
        }
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }

        let userMessage = AskAnythingMessage(role: .user, content: text, timestamp: Date())
        messages.append(userMessage)
        inputText = ""
        isLoading = true

        Task {
            do {
                let answer = try await g2Service.askQuestion(text, transcript: transcript)
                let aiMessage = AskAnythingMessage(role: .assistant, content: answer, timestamp: Date())
                messages.append(aiMessage)
            } catch {
                let errorMsg = AskAnythingMessage(
                    role: .assistant,
                    content: "Sorry, I couldn't process that question. \(error.localizedDescription)",
                    timestamp: Date()
                )
                messages.append(errorMsg)
            }
            isLoading = false
        }
    }
}
