package app.ring.spamblocker.core

/**
 * The judgement engine. Ported from the Web layer's checkNumber
 * (spam-blocker/index.html) so both layers return identical verdicts
 * for identical inputs.
 *
 * Judgement order (fixed):
 *   invalid -> allowlist -> exact block -> prefix block
 *   -> known spam DB (warn) -> reported by the user (warn) -> no match.
 */

enum class VerdictAction { ALLOW, BLOCK, WARN, NONE, INVALID }

/** A known-spam database entry. The bundled DB is dummy sample data only. */
data class KnownSpam(
    val number: String,
    val category: String,
    val reportCount: Int,
    val lastReported: String
)

data class Verdict(
    val action: VerdictAction,
    val reason: String,
    val normalized: NormalizedNumber,
    val matchedRule: PrefixRule? = null,
    val category: String? = null,
    val reportCount: Int = 0,
    val sample: Boolean = false
)

object SpamJudge {

    val CATEGORIES = listOf("fraud", "solicitation", "sales", "onering", "survey", "other")

    /**
     * Dummy sample data ONLY. Numbers use unassigned 000-patterns and are
     * format examples, not real subscribers. Identical to the Web layer's
     * SAMPLE_SPAM_DB; replace only with a properly licensed dataset.
     */
    val SAMPLE_SPAM_DB: List<KnownSpam> = listOf(
        KnownSpam("08000000001", "solicitation", 128, "2026-10-28"),
        KnownSpam("08000000002", "fraud", 342, "2026-11-02"),
        KnownSpam("05000000003", "fraud", 256, "2026-11-05"),
        KnownSpam("05000000004", "onering", 89, "2026-09-19"),
        KnownSpam("0120000005", "sales", 87, "2026-10-11"),
        KnownSpam("0570000006", "survey", 41, "2026-08-30"),
        KnownSpam("07000000007", "solicitation", 173, "2026-11-08"),
        KnownSpam("0300000008", "sales", 63, "2026-10-02")
    )

    fun countReports(e164: String?, reports: List<ReportEntry>): Int {
        if (e164 == null) return 0
        return reports.count { it.number == e164 }
    }

    fun findSample(e164: String?, db: List<KnownSpam> = SAMPLE_SPAM_DB): KnownSpam? {
        if (e164 == null) return null
        val digits = e164.removePrefix("+")
        return db.firstOrNull { "81" + it.number.substring(1) == digits }
    }

    /**
     * Judge a raw incoming number against the block lists.
     * A null or unparseable number yields VerdictAction.INVALID and must
     * never be blocked (e.g. withheld numbers are let through).
     */
    fun check(
        raw: String?,
        lists: BlockLists,
        db: List<KnownSpam> = SAMPLE_SPAM_DB
    ): Verdict {
        val n = PhoneNumbers.normalize(raw)
        if (!n.valid) {
            return Verdict(VerdictAction.INVALID, "invalid-number", n)
        }
        val e164 = n.e164!!

        if (lists.allow.contains(e164)) {
            return Verdict(VerdictAction.ALLOW, "allowlist", n)
        }

        if (lists.blockExact.contains(e164)) {
            return Verdict(VerdictAction.BLOCK, "blocklist-exact", n)
        }

        for (rule in lists.prefixes) {
            val target = if (rule.scope == PrefixRule.SCOPE_E164) {
                e164.removePrefix("+")
            } else {
                n.national ?: ""
            }
            if (target.isNotEmpty() && target.startsWith(rule.prefix)) {
                return Verdict(VerdictAction.BLOCK, "blocklist-prefix", n, matchedRule = rule)
            }
        }

        val sample = findSample(e164, db)
        if (sample != null) {
            return Verdict(
                action = VerdictAction.WARN,
                reason = "known-spam",
                normalized = n,
                category = sample.category,
                reportCount = sample.reportCount + countReports(e164, lists.reports),
                sample = true
            )
        }

        val own = countReports(e164, lists.reports)
        if (own > 0) {
            return Verdict(VerdictAction.WARN, "reported-by-you", n, reportCount = own)
        }

        return Verdict(VerdictAction.NONE, "no-match", n, reportCount = 0)
    }
}
