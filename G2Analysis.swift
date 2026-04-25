import Foundation

struct G2Analysis: Codable {
    let spotlight: String
    let actionItems: [G2ActionItem]
    let meddic: MEDDICScorecard
    let topicTrackers: [TopicTracker]
    let generatedAt: Date
}

struct G2ActionItem: Codable, Identifiable {
    var id: String { "\(category)-\(owner)-\(action)" }
    let category: ActionCategory
    let owner: String
    let action: String
    let deadline: String?

    enum ActionCategory: String, Codable {
        case external = "External"
        case `internal` = "Internal"

        var color: String {
            switch self {
            case .external: return "blue"
            case .internal: return "purple"
            }
        }
    }
}

struct MEDDICScorecard: Codable {
    let metrics: MEDDICItem
    let economicBuyer: MEDDICItem
    let decisionCriteria: MEDDICItem
    let decisionProcess: MEDDICItem
    let identifyPain: MEDDICItem
    let champion: MEDDICItem

    var items: [(label: String, item: MEDDICItem)] {
        [
            ("Metrics", metrics),
            ("Economic Buyer", economicBuyer),
            ("Decision Criteria", decisionCriteria),
            ("Decision Process", decisionProcess),
            ("Identify Pain", identifyPain),
            ("Champion", champion)
        ]
    }
}

struct MEDDICItem: Codable {
    let status: MEDDICStatus
    let detail: String

    enum MEDDICStatus: String, Codable {
        case green = "green"
        case yellow = "yellow"
        case red = "red"

        var emoji: String {
            switch self {
            case .green: return "🟢"
            case .yellow: return "🟡"
            case .red: return "🔴"
            }
        }
    }
}

struct TopicTracker: Codable, Identifiable {
    var id: String { category }
    let category: String
    let mentions: [TopicMention]
}

struct TopicMention: Codable, Identifiable {
    var id: String { "\(timestamp)-\(text)" }
    let timestamp: String
    let text: String
}

struct AskAnythingMessage: Identifiable {
    let id = UUID()
    let role: Role
    let content: String
    let timestamp: Date

    enum Role {
        case user
        case assistant
    }
}
