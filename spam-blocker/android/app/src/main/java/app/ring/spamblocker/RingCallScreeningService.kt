package app.ring.spamblocker

import android.telecom.Call
import android.telecom.CallScreeningService
import app.ring.spamblocker.core.SpamJudge
import app.ring.spamblocker.core.VerdictAction

/**
 * Screens incoming calls with the same judgement order as the Web layer
 * (SpamJudge): allowlist > exact block > prefix block > known spam (warn)
 * > reported by the user (warn).
 *
 * Only BLOCK verdicts are rejected. WARN verdicts are let through:
 * CallScreeningService has no in-call UI, so warnings are surfaced by
 * checking the number in the app instead (same as the design note in
 * spam-blocker/README.md).
 *
 * This service only receives the incoming number from the OS. It never
 * accesses the call log or contacts, and the app declares no permissions
 * for them.
 *
 * The service is only invoked while the user has chosen this app as the
 * call screening app (ROLE_CALL_SCREENING); see MainActivity.
 */
class RingCallScreeningService : CallScreeningService() {

    override fun onScreenCall(callDetails: Call.Details) {
        val raw = callDetails.handle?.schemeSpecificPart
        val lists = BlockListStore.load(this)
        val verdict = SpamJudge.check(raw, lists)

        val builder = CallResponse.Builder()
        if (verdict.action == VerdictAction.BLOCK) {
            builder.setDisallowCall(true)
            builder.setRejectCall(true)
            // Keep the attempt visible in the system call log.
            builder.setSkipCallLog(false)
            builder.setSkipNotification(true)
        }
        respondToCall(callDetails, builder.build())
    }
}
