package app.ring.spamblocker

import android.app.Activity
import android.app.role.RoleManager
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast

/**
 * Minimal management UI:
 *  - request the ROLE_CALL_SCREENING role (required for the screening
 *    service to be invoked by the OS),
 *  - import a block list in JSON schema v1 (the file the Web layer exports),
 *  - show the current list counts.
 *
 * No call-history or contacts access; the imported file is stored only in
 * app-private storage.
 */
class MainActivity : Activity() {

    private lateinit var statusView: TextView

    companion object {
        private const val REQ_IMPORT = 1001
        private const val REQ_ROLE = 1002
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val padding = (16 * resources.displayMetrics.density).toInt()
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(padding, padding, padding, padding)
        }

        val title = TextView(this).apply {
            text = "Ring 迷惑電話ブロック"
            textSize = 20f
        }
        statusView = TextView(this).apply { textSize = 14f }

        val roleButton = Button(this).apply {
            text = "迷惑電話対策アプリとして設定する"
            setOnClickListener { requestScreeningRole() }
        }
        val importButton = Button(this).apply {
            text = "ブロックリスト (JSON) を読み込む"
            setOnClickListener { pickBlockListFile() }
        }
        val note = TextView(this).apply {
            text = "通話履歴・連絡先にはアクセスしません。ブロックリストは端末内だけに保存され、外部送信はしません。"
            textSize = 12f
        }

        root.addView(title)
        root.addView(statusView)
        root.addView(roleButton)
        root.addView(importButton)
        root.addView(note)
        setContentView(root)

        refreshStatus()
    }

    override fun onResume() {
        super.onResume()
        if (::statusView.isInitialized) refreshStatus()
    }

    private fun isRoleHeld(): Boolean {
        val roleManager = getSystemService(RoleManager::class.java) ?: return false
        return roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
    }

    private fun refreshStatus() {
        val lists = BlockListStore.load(this)
        statusView.text = buildString {
            append("スクリーニング設定: ")
            append(if (isRoleHeld()) "有効" else "未設定（下のボタンから設定してください）")
            append("\n許可リスト: ").append(lists.allow.size).append(" 件")
            append("\nブロック（完全一致）: ").append(lists.blockExact.size).append(" 件")
            append("\nブロック（前方一致）: ").append(lists.prefixes.size).append(" 件")
            append("\n通報: ").append(lists.reports.size).append(" 件")
        }
    }

    private fun requestScreeningRole() {
        val roleManager = getSystemService(RoleManager::class.java)
        if (roleManager == null || !roleManager.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
            Toast.makeText(
                this,
                "この端末では迷惑電話対策アプリの役割が利用できません",
                Toast.LENGTH_LONG
            ).show()
            return
        }
        if (roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
            Toast.makeText(this, "すでに設定済みです", Toast.LENGTH_SHORT).show()
            return
        }
        @Suppress("DEPRECATION")
        startActivityForResult(
            roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING),
            REQ_ROLE
        )
    }

    private fun pickBlockListFile() {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "application/json"
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("application/json", "text/plain"))
        }
        @Suppress("DEPRECATION")
        startActivityForResult(intent, REQ_IMPORT)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            REQ_ROLE -> refreshStatus()
            REQ_IMPORT -> {
                if (resultCode != RESULT_OK) return
                val uri: Uri = data?.data ?: return
                importBlockList(uri)
            }
        }
    }

    private fun importBlockList(uri: Uri) {
        try {
            val json = contentResolver.openInputStream(uri)
                ?.bufferedReader(Charsets.UTF_8)
                ?.readText()
                ?: throw IllegalArgumentException("ファイルを読み取れませんでした")
            val lists = BlockListStore.importJson(this, json)
            refreshStatus()
            Toast.makeText(
                this,
                "読み込みました（完全一致 ${lists.blockExact.size} 件 / 前方一致 ${lists.prefixes.size} 件）",
                Toast.LENGTH_LONG
            ).show()
        } catch (e: Exception) {
            Toast.makeText(
                this,
                "読み込みに失敗しました: ${e.message}",
                Toast.LENGTH_LONG
            ).show()
        }
    }
}
