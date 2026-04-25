import Foundation

@MainActor
class G2AnalysisService: ObservableObject {
    @Published var isAnalyzing = false
    @Published var analysisProgress: String = ""

    private var apiKey: String {
        UserDefaults.standard.string(forKey: "claude_api_key") ?? ""
    }

    func analyzeG2(transcript: String, meetingTitle: String) async throws -> G2Analysis {
        guard !apiKey.isEmpty else {
            throw G2Error.noAPIKey
        }

        isAnalyzing = true
        analysisProgress = "Generating Bryan's G2 intelligence..."

        defer {
            isAnalyzing = false
            analysisProgress = ""
        }

        let prompt = """
        You are Bryan's G2, an elite sales intelligence analyst. Analyze this meeting transcript and produce a structured sales intelligence report.

        Meeting: \(meetingTitle)
        Transcript:
        \(transcript)

        Respond ONLY with valid JSON (no markdown, no code fences) in this exact format:

        {
            "spotlight": "A highly condensed 3-4 sentence executive summary. Ignore small talk. Focus purely on business intent, current state of the deal, and immediate outcome.",
            "actionItems": [
                {
                    "category": "external",
                    "owner": "Name of person responsible",
                    "action": "Specific deliverable or task",
                    "deadline": "Timeline mentioned or null"
                },
                {
                    "category": "internal",
                    "owner": "Team or person responsible",
                    "action": "Specific deliverable or task",
                    "deadline": "Timeline mentioned or null"
                }
            ],
            "meddic": {
                "metrics": {
                    "status": "red|yellow|green",
                    "detail": "What was discussed about metrics, or flag as gap if not discussed"
                },
                "economicBuyer": {
                    "status": "red|yellow|green",
                    "detail": "Who is the economic buyer, their involvement level"
                },
                "decisionCriteria": {
                    "status": "red|yellow|green",
                    "detail": "What criteria must be met for a decision"
                },
                "decisionProcess": {
                    "status": "red|yellow|green",
                    "detail": "What is the process to reach a decision"
                },
                "identifyPain": {
                    "status": "red|yellow|green",
                    "detail": "What pain points were identified"
                },
                "champion": {
                    "status": "red|yellow|green",
                    "detail": "Who is championing this internally"
                }
            },
            "topicTrackers": [
                {
                    "category": "Competitor Mentions",
                    "mentions": [
                        {"timestamp": "[MM:SS]", "text": "What was said"}
                    ]
                },
                {
                    "category": "Objections",
                    "mentions": [
                        {"timestamp": "[MM:SS]", "text": "The objection raised"}
                    ]
                },
                {
                    "category": "Pricing Pushback",
                    "mentions": [
                        {"timestamp": "[MM:SS]", "text": "What was said about pricing"}
                    ]
                },
                {
                    "category": "Key Requirements",
                    "mentions": [
                        {"timestamp": "[MM:SS]", "text": "Requirement mentioned"}
                    ]
                },
                {
                    "category": "Timeline Pressure",
                    "mentions": [
                        {"timestamp": "[MM:SS]", "text": "Deadline or urgency mentioned"}
                    ]
                }
            ]
        }

        RULES:
        - For MEDDIC: use "green" if clearly discussed and identified, "yellow" if partially discussed or unclear, "red" if not discussed at all (flag as gap).
        - For action items: categorize as "external" (client-facing) or "internal" (your team). Include the specific person's name as owner.
        - For topic trackers: estimate timestamps based on position in transcript. Only include categories that have actual mentions. If a category has zero mentions, include it with an empty mentions array.
        - The spotlight should be ruthlessly concise and business-focused. No fluff.
        - Action items must be specific and actionable, not vague like "follow up."
        """

        analysisProgress = "Mapping MEDDIC framework..."

        let data = try await callClaudeWithFallback(prompt: prompt, maxTokens: 4096)

        analysisProgress = "Building intelligence report..."

        let apiResponse = try JSONDecoder().decode(ClaudeAPIResponse.self, from: data)

        guard let textBlock = apiResponse.content.first(where: { $0.type == "text" }),
              let rawText = textBlock.text else {
            throw G2Error.parsingError
        }

        // Strip markdown code fences if present
        let cleanedText = Self.extractJSON(from: rawText)

        guard let analysisData = cleanedText.data(using: .utf8) else {
            throw G2Error.parsingError
        }

        let raw = try JSONDecoder().decode(RawG2.self, from: analysisData)

        return G2Analysis(
            spotlight: raw.spotlight,
            actionItems: raw.actionItems.map { item in
                G2ActionItem(
                    category: item.category == "internal" ? .internal : .external,
                    owner: item.owner,
                    action: item.action,
                    deadline: item.deadline
                )
            },
            meddic: MEDDICScorecard(
                metrics: parseMEDDIC(raw.meddic.metrics),
                economicBuyer: parseMEDDIC(raw.meddic.economicBuyer),
                decisionCriteria: parseMEDDIC(raw.meddic.decisionCriteria),
                decisionProcess: parseMEDDIC(raw.meddic.decisionProcess),
                identifyPain: parseMEDDIC(raw.meddic.identifyPain),
                champion: parseMEDDIC(raw.meddic.champion)
            ),
            topicTrackers: raw.topicTrackers.map { tracker in
                TopicTracker(
                    category: tracker.category,
                    mentions: tracker.mentions.map { TopicMention(timestamp: $0.timestamp, text: $0.text) }
                )
            },
            generatedAt: Date()
        )
    }

    // MARK: - Ask Anything

    func askQuestion(_ question: String, transcript: String) async throws -> String {
        guard !apiKey.isEmpty else {
            throw G2Error.noAPIKey
        }

        let prompt = """
        You are Bryan's G2 AI assistant. You have access ONLY to this specific meeting transcript. Answer the user's question based solely on what was discussed in the meeting. If the answer isn't in the transcript, say so clearly.

        When referencing specific moments, estimate the timestamp based on position in the transcript.

        TRANSCRIPT:
        \(transcript)

        USER QUESTION: \(question)

        Provide a concise, direct answer. If you reference a specific moment, include the estimated timestamp in [MM:SS] format.
        """

        let data = try await callClaudeWithFallback(prompt: prompt, maxTokens: 1024)

        let apiResponse = try JSONDecoder().decode(ClaudeAPIResponse.self, from: data)

        guard let textBlock = apiResponse.content.first(where: { $0.type == "text" }),
              let text = textBlock.text else {
            throw G2Error.parsingError
        }

        return text
    }

    // MARK: - Shared API call with retry + model fallback

    private func callClaudeWithFallback(prompt: String, maxTokens: Int) async throws -> Data {
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
                    let delay = Double(attempt) * 3.0
                    let modelName = modelIndex == 0 ? "Sonnet" : "Haiku"
                    analysisProgress = "\(modelName) busy, retry \(attempt + 1)/\(maxRetries) in \(Int(delay))s..."
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }

                let (data, response) = try await URLSession.shared.data(for: request)

                guard let httpResponse = response as? HTTPURLResponse else {
                    throw G2Error.networkError
                }

                if httpResponse.statusCode == 529 || httpResponse.statusCode == 503 || httpResponse.statusCode == 429 {
                    continue
                }

                guard httpResponse.statusCode == 200 else {
                    let body = String(data: data, encoding: .utf8) ?? "Unknown"
                    throw G2Error.apiError(body)
                }

                return data
            }

            if modelIndex < models.count - 1 {
                analysisProgress = "Switching to faster model..."
            }
        }

        throw G2Error.apiError("All models overloaded. Please try again in a moment.")
    }

    static func extractJSON(from text: String) -> String {
        var cleaned = text.trimmingCharacters(in: .whitespacesAndNewlines)
        // Remove ```json ... ``` or ``` ... ```
        if cleaned.hasPrefix("```") {
            // Remove opening fence (with optional language tag)
            if let firstNewline = cleaned.firstIndex(of: "\n") {
                cleaned = String(cleaned[cleaned.index(after: firstNewline)...])
            }
            // Remove closing fence
            if cleaned.hasSuffix("```") {
                cleaned = String(cleaned.dropLast(3))
            }
            cleaned = cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return cleaned
    }

    private func parseMEDDIC(_ raw: RawMEDDICItem) -> MEDDICItem {
        let status: MEDDICItem.MEDDICStatus
        switch raw.status.lowercased() {
        case "green": status = .green
        case "yellow": status = .yellow
        default: status = .red
        }
        return MEDDICItem(status: status, detail: raw.detail)
    }
}

// MARK: - Raw JSON Types

private struct ClaudeAPIResponse: Codable {
    let content: [ContentBlock]
    struct ContentBlock: Codable {
        let type: String
        let text: String?
    }
}

private struct RawG2: Codable {
    let spotlight: String
    let actionItems: [RawActionItem]
    let meddic: RawMEDDIC
    let topicTrackers: [RawTopicTracker]
}

private struct RawActionItem: Codable {
    let category: String
    let owner: String
    let action: String
    let deadline: String?
}

private struct RawMEDDIC: Codable {
    let metrics: RawMEDDICItem
    let economicBuyer: RawMEDDICItem
    let decisionCriteria: RawMEDDICItem
    let decisionProcess: RawMEDDICItem
    let identifyPain: RawMEDDICItem
    let champion: RawMEDDICItem
}

private struct RawMEDDICItem: Codable {
    let status: String
    let detail: String
}

private struct RawTopicTracker: Codable {
    let category: String
    let mentions: [RawMention]
}

private struct RawMention: Codable {
    let timestamp: String
    let text: String
}

enum G2Error: LocalizedError {
    case noAPIKey
    case networkError
    case apiError(String)
    case parsingError

    var errorDescription: String? {
        switch self {
        case .noAPIKey: return "Set your Claude API key in Settings."
        case .networkError: return "Network connection failed."
        case .apiError(let msg): return "API error: \(msg)"
        case .parsingError: return "Failed to parse G2 analysis."
        }
    }
}
