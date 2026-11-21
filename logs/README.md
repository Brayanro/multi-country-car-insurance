# Original Agent Session Evidence

The assessment requires unedited logs or exports of agent sessions. Do not replace them with summaries or invented transcripts.

For the Codex desktop app:
1. Preserve original chats and subagent threads in the app; inspect activity to verify which roles actually ran.
2. Use a native export or copy mechanism only if the installed app actually provides one. Do **not** assume the CLI-only `/export` command is available in the app.
3. If needed and supported by your environment, locate Codex's locally persisted session records and copy the relevant originals unchanged into `logs/` (the exact location and format can vary by version/platform).
4. Record the source, original timestamp, actual model/effort, session or thread identifier, and related story/commit in `FLOW.md` or a separate index. Keep notes separate from raw exports.
5. Before publishing, inspect originals for credentials, personal data, tokens and other sensitive information. Avoid putting such data in prompts in the first place; do not publish unsafe originals.
6. If no safe, unedited export is possible, disclose that limitation rather than manufacturing evidence.

No agent session has been executed by this starter package.
