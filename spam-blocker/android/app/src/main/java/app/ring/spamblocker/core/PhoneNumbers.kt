package app.ring.spamblocker.core

/**
 * Phone number normalization, classification and display formatting.
 *
 * This is a line-for-line port of the Web layer's core
 * (spam-blocker/index.html, the ==CORE-START== .. ==CORE-END== section).
 * The two layers must produce identical results for identical inputs;
 * the unit tests in src/test use the same vectors as tests/spam-blocker.test.js.
 */

/** Result of normalizing a phone number. Never throws; invalid input yields valid=false. */
data class NormalizedNumber(
    val valid: Boolean,
    val e164: String?,
    val national: String?,
    val type: String,
    val country: String?
)

object PhoneNumbers {

    val INVALID = NormalizedNumber(false, null, null, "invalid", null)

    private val JP_NATIONAL_REGEX = Regex("^0\\d{9,10}$")
    private val JP_FIXED_REGEX = Regex("^0\\d{9}$")

    /** Full-width digits (U+FF10..U+FF19) to ASCII digits. */
    fun toHalfWidthDigits(s: String): String {
        val sb = StringBuilder(s.length)
        for (c in s) {
            sb.append(if (c in '０'..'９') (c.code - 0xFEE0).toChar() else c)
        }
        return sb.toString()
    }

    /** Classify a JP national number (0...). */
    fun classifyJP(national: String): String {
        if (national.startsWith("0800") || national.startsWith("0120")) return "tollfree"
        if (national.startsWith("050")) return "ip"
        if (national.startsWith("070") || national.startsWith("080") ||
            national.startsWith("090") || national.startsWith("060")
        ) return "mobile"
        if (national.startsWith("0570")) return "navi"
        if (JP_FIXED_REGEX.matches(national)) return "fixedline"
        return "other"
    }

    /**
     * Normalize a phone number.
     * Accepts JP domestic (0...), +81..., 0081..., 01081..., and other +CC numbers.
     */
    fun normalize(raw: String?): NormalizedNumber {
        if (raw == null) return INVALID
        var s = toHalfWidthDigits(raw)
            .filterNot {
                it.isWhitespace() || it == '\u00A0' || it == '-' || it == '(' || it == ')' ||
                    it == '．' || it == '・'
            }
            .replace('＋', '+')
        if (s.isEmpty()) return INVALID

        var intl = false
        if (s.startsWith("+")) {
            intl = true
            s = s.substring(1)
        }
        if (s.isEmpty() || !s.all { it.isDigit() }) return INVALID

        if (!intl && (s.startsWith("0081") || s.startsWith("01081"))) {
            s = "81" + when {
                s.startsWith("01081") -> s.substring(5)
                else -> s.substring(4)
            }
            intl = true
        }

        if (intl || (s.startsWith("81") && s.length >= 12)) {
            if (s.startsWith("81") && s.length in 11..13) {
                val national = "0" + s.substring(2)
                return if (JP_NATIONAL_REGEX.matches(national)) {
                    NormalizedNumber(true, "+$s", national, classifyJP(national), "JP")
                } else {
                    INVALID
                }
            }
            // Non-JP international: E.164 allows 7..15 digits total.
            if (s.length in 8..15) {
                return NormalizedNumber(true, "+$s", null, "international", "INTL")
            }
            return INVALID
        }

        // JP domestic
        if (JP_NATIONAL_REGEX.matches(s)) {
            return NormalizedNumber(true, "+81" + s.substring(1), s, classifyJP(s), "JP")
        }
        return INVALID
    }

    /** Human-readable grouping for JP national numbers. */
    fun formatNational(national: String?): String {
        if (national == null) return ""
        val d = national
        if (d.length == 11) return d.substring(0, 3) + "-" + d.substring(3, 7) + "-" + d.substring(7)
        if (d.length == 10) {
            if (d.startsWith("0120") || d.startsWith("0570") || d.startsWith("0990")) {
                return d.substring(0, 4) + "-" + d.substring(4, 7) + "-" + d.substring(7)
            }
            if (d.startsWith("03") || d.startsWith("06")) {
                return d.substring(0, 2) + "-" + d.substring(2, 6) + "-" + d.substring(6)
            }
            return d.substring(0, 3) + "-" + d.substring(3, 6) + "-" + d.substring(6)
        }
        return d
    }
}
