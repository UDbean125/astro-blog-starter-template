import Foundation

@MainActor
class AIAnalysisService: ObservableObject {
    @Published var isAnalyzing = false
    @Published var analysisProgress: String = ""

    private var apiKey: String {
        // Load from UserDefaults or Keychain in production
        UserDefaults.standard.string(forKey: "claude_api_key") ?? ""
    }

    func analyze(transcript: String, meetingTitle: String) async throws -> MeetingAnalysis {
        guard !apiKey.isEmpty else {
            throw AnalysisError.noAPIKey
        }

        isAnalyzing = true
        analysisProgress = "Analyzing meeting content..."

        defer {
            isAnalyzing = false
            analysisProgress = ""
        }

        let prompt = """
        You are an expert meeting analyst. Analyze the following meeting transcript and provide a structured breakdown.

        Meeting: \(meetingTitle)
        Transcript:
        \(transcript)

        Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
        {
            "summary": "A concise 2-3 sentence summary of the meeting",
            "keyPoints": ["point 1", "point 2", "point 3"],
            "nextSteps": ["action item 1 with owner if mentioned", "action item 2"],
            "decisions": ["decision 1", "decision 2"],
            "participants": ["name 1", "name 2"]
        }

        If participants cannot be identified, use an empty array.
        Focus on actionable insights and clear, professional language.
        """

        let data = try await callClaudeAPI(prompt: prompt, maxTokens: 2048)

        analysisProgress = "Processing results..."

        let apiResponse = try JSONDecoder().decode(ClaudeResponse.self, from: data)

        guard let textContent = apiResponse.content.first(where: { $0.type == "text" }),
              let rawText = textContent.text else {
            throw AnalysisError.parsingError
        }

        // Strip markdown code fences if present
        let cleanedText = Self.extractJSON(from: rawText)

        guard let analysisData = cleanedText.data(using: .utf8) else {
            throw AnalysisError.parsingError
        }

        let raw = try JSONDecoder().decode(RawAnalysis.self, from: analysisData)

        return MeetingAnalysis(
            summary: raw.summary,
            keyPoints: raw.keyPoints,
            nextSteps: raw.nextSteps,
            decisions: raw.decisions,
            participants: raw.participants,
            generatedAt: Date()
        )
    }

    static func extractJSON(from text: String) -> String {
        var cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleaned.hasPrefix("```") {
            if let firstNewline = cleaned.firstIndex(of: "\n") {
                cleaned = String(cleaned[cleaned.index(after: firstNewline)...])
            }
            if cleaned.hasSuffix("```") {
                cleaned = String(cleaned.dropLast(3))
            }
            cleaned = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return cleaned
    }

    // MARK: - Shared API call with retry + model fallback

    private func callClaudeAPI(prompt: String, maxTokens: Int) async throws -> Data {
        // Try models in order: sonnet first, then haiku as fallback
        let models = [
            "claude-sonnet-4-20250514",
            "claude-haiku-4-5-20251001"
        ]

        for (modelIndex, model) in models.enumerated() {
            let requestBody: [String: Any] = [
                "model": model,
                "max_tokens": maxTokens,
                "messages": [
                    ["role": "user", "content": prompt]
                ]
            ]

            let jsonData = try JSONSerialization.data(withJSONObject: requestBody)

            var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "content-type")
            request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
            request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
            request.httpBody = jsonData
            request.timeoutInterval = 90

            let maxRetries = 4
            for attempt in 0..<maxRetries {
                if attempt > 0 {
                    let delay = Double(attempt) * 3.0 // 3s, 6s, 9s
                    let modelName = modelIndex == 0 ? "Sonnet" : "Haiku"
                    analysisProgress = "\(modelName) busy, retry \(attempt + 1)/\(maxRetries) in \(Int(delay))s..."
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }

                let (data, response) = try await URLSession.shared.data(for: request)

                guard let httpResponse = response as? HTTPURLResponse else {
                    throw AnalysisError.networkError
                }

                if httpResponse.statusCode == 529 || httpResponse.statusCode == 503 || httpResponse.statusCode == 429 {
                    continue // retry
                }

                guard httpResponse.statusCode == 200 else {
                    let body = String(data: data, encoding: .utf8) ?? "Unknown"
                    throw AnalysisError.apiError("Status \(httpResponse.statusCode): \(body)")
                }

                return data // success
            }

            // This model exhausted retries — try next model
            if modelIndex < models.count - 1 {
                analysisProgress = "Switching to faster model..."
            }
        }

        throw AnalysisError.apiError("All models overloaded. Please try again in a moment.")
    }
}

// MARK: - Claude API Response Types

private struct ClaudeResponse: Codable {
    let content: [ContentBlock]

    struct ContentBlock: Codable {
        let type: String
        let text: String?
    }
}

private struct RawAnalysis: Codable {
    let summary: String
    let keyPoints: [String]
    let nextSteps: [String]
    let decisions: [String]
    let participants: [String]
}

enum AnalysisError: LocalizedError {
    case noAPIKey
    case networkError
    case apiError(String)
    case parsingError

    var errorDescription: String? {
        switch self {
        case .noAPIKey: return "Please set your Claude API key in Settings."
        case .networkError: return "Network connection failed."
        case .apiError(let msg): return "API error: \(msg)"
        case .parsingError: return "Failed to parse AI response."
        }
    }
}
