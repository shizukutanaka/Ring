package app.ring.spamblocker.core

/**
 * Block-list data model and JSON schema v1 import/export.
 *
 * Schema v1 is the shared contract between the Web layer and this native
 * layer (see spam-blocker/README.md):
 *
 * {
 *   "version": 1,
 *   "allow": ["+81312345678"],
 *   "blockExact": ["+819012345678"],
 *   "prefixes": [{ "prefix": "0800", "scope": "national" }, { "prefix": "8190", "scope": "e164" }],
 *   "reports": [{ "number": "+815012345678", "category": "fraud", "note": "", "ts": 1762000000000 }]
 * }
 */

/** A prefix (leading-digits) block rule. scope is "national" or "e164". */
data class PrefixRule(val prefix: String, val scope: String) {
    companion object {
        const val SCOPE_NATIONAL = "national"
        const val SCOPE_E164 = "e164"
    }
}

/** A user report record. category: fraud | solicitation | sales | onering | survey | other. */
data class ReportEntry(
    val number: String,
    val category: String? = null,
    val note: String? = null,
    val ts: Long? = null
)

/** The four block-list collections. allow / blockExact hold E.164 numbers. */
data class BlockLists(
    val allow: List<String> = emptyList(),
    val blockExact: List<String> = emptyList(),
    val prefixes: List<PrefixRule> = emptyList(),
    val reports: List<ReportEntry> = emptyList()
)

/**
 * Canonicalize a user-entered prefix rule.
 * "0800" / "0501234" -> national scope; "+8190" -> e164 scope.
 * Returns null when unusable. Ported from the Web layer's canonicalPrefixRule.
 */
fun canonicalPrefixRule(input: String?): PrefixRule? {
    if (input == null) return null
    var s = PhoneNumbers.toHalfWidthDigits(input)
        .filterNot { it.isWhitespace() || it == '\u00A0' || it == '-' || it == '(' || it == ')' }
        .replace('＋', '+')
    var scope = PrefixRule.SCOPE_NATIONAL
    if (s.startsWith("+")) {
        scope = PrefixRule.SCOPE_E164
        s = s.substring(1)
    }
    if (!Regex("^\\d{3,15}$").matches(s)) return null
    if (scope == PrefixRule.SCOPE_NATIONAL && !s.startsWith("0")) return null
    if (scope == PrefixRule.SCOPE_E164 && s.startsWith("0")) return null
    return PrefixRule(s, scope)
}

/** JSON schema v1 serialization, mirroring the Web layer's exportBlockList / importBlockList. */
object BlockListJson {

    const val VERSION = 1

    fun export(lists: BlockLists): String {
        val root = LinkedHashMap<String, Any?>()
        root["version"] = VERSION
        root["allow"] = lists.allow
        root["blockExact"] = lists.blockExact
        root["prefixes"] = lists.prefixes.map { rule ->
            linkedMapOf<String, Any?>("prefix" to rule.prefix, "scope" to rule.scope)
        }
        root["reports"] = lists.reports.map { report ->
            val m = LinkedHashMap<String, Any?>()
            m["number"] = report.number
            if (report.category != null) m["category"] = report.category
            if (report.note != null) m["note"] = report.note
            if (report.ts != null) m["ts"] = report.ts
            m
        }
        return MiniJson.stringify(root, pretty = true)
    }

    /**
     * Parse schema v1 JSON. Malformed entries are filtered out instead of
     * crashing (same behavior as the Web layer).
     *
     * @throws IllegalArgumentException "invalid JSON" or "unsupported blocklist version"
     */
    fun import(json: String): BlockLists {
        val parsed = try {
            MiniJson.parse(json)
        } catch (e: Exception) {
            throw IllegalArgumentException("invalid JSON")
        }
        val obj = parsed as? Map<*, *>
            ?: throw IllegalArgumentException("unsupported blocklist version")
        val version = (obj["version"] as? Double)?.toInt()
        if (version != VERSION) throw IllegalArgumentException("unsupported blocklist version")

        return BlockLists(
            allow = stringList(obj["allow"]),
            blockExact = stringList(obj["blockExact"]),
            prefixes = prefixList(obj["prefixes"]),
            reports = reportList(obj["reports"])
        )
    }

    private fun stringList(value: Any?): List<String> =
        (value as? List<*>)?.mapNotNull { it as? String } ?: emptyList()

    private fun prefixList(value: Any?): List<PrefixRule> =
        (value as? List<*>)?.mapNotNull { item ->
            val m = item as? Map<*, *> ?: return@mapNotNull null
            val prefix = m["prefix"] as? String ?: return@mapNotNull null
            val scope = m["scope"] as? String ?: return@mapNotNull null
            if (scope != PrefixRule.SCOPE_NATIONAL && scope != PrefixRule.SCOPE_E164) {
                null
            } else {
                PrefixRule(prefix, scope)
            }
        } ?: emptyList()

    private fun reportList(value: Any?): List<ReportEntry> =
        (value as? List<*>)?.mapNotNull { item ->
            val m = item as? Map<*, *> ?: return@mapNotNull null
            val number = m["number"] as? String ?: return@mapNotNull null
            ReportEntry(
                number = number,
                category = m["category"] as? String,
                note = m["note"] as? String,
                ts = (m["ts"] as? Double)?.toLong()
            )
        } ?: emptyList()
}
