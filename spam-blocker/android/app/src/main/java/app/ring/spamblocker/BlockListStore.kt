package app.ring.spamblocker

import android.content.Context
import app.ring.spamblocker.core.BlockListJson
import app.ring.spamblocker.core.BlockLists
import java.io.File

/**
 * Loads and saves the block list (JSON schema v1) in app-private storage.
 *
 * The data never leaves the device: no network, no call log, no contacts.
 * A missing or unreadable file yields an empty list (nothing is blocked),
 * which is the safe failure mode for a screening service.
 */
object BlockListStore {

    private const val FILE_NAME = "blocklist.json"

    fun load(context: Context): BlockLists {
        val file = File(context.filesDir, FILE_NAME)
        if (!file.exists()) return BlockLists()
        return try {
            BlockListJson.import(file.readText(Charsets.UTF_8))
        } catch (e: Exception) {
            BlockLists()
        }
    }

    fun save(context: Context, lists: BlockLists) {
        File(context.filesDir, FILE_NAME)
            .writeText(BlockListJson.export(lists), Charsets.UTF_8)
    }

    /**
     * Parses JSON schema v1 text (e.g. exported from the Web layer),
     * stores it, and returns the parsed lists.
     *
     * @throws IllegalArgumentException on invalid JSON or unsupported version
     */
    fun importJson(context: Context, json: String): BlockLists {
        val lists = BlockListJson.import(json)
        save(context, lists)
        return lists
    }
}
