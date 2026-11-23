# Original Agent Session Evidence

The assessment requires unedited logs or exports of agent sessions. Do not replace them with summaries or invented transcripts.

For the Codex desktop app:
1. Preserve original chats and subagent threads in the app; inspect activity to verify which roles actually ran.
2. Use a native export or copy mechanism only if the installed app actually provides one. Do **not** assume the CLI-only `/export` command is available in the app.
3. If needed and supported by your environment, locate Codex's locally persisted session records and copy the relevant originals unchanged into `logs/` (the exact location and format can vary by version/platform).
4. Record the source, original timestamp, actual model/effort, session or thread identifier, and related story/commit in `FLOW.md` or a separate index. Keep notes separate from raw exports.
5. Before publishing, inspect originals for credentials, personal data, tokens and other sensitive information. Avoid putting such data in prompts in the first place; do not publish unsafe originals.
6. If no safe, unedited export is possible, disclose that limitation rather than manufacturing evidence.

## Verified sources and manual export

- On the development Mac, all six original US-01 session IDs explicitly indexed in [FLOW.md](../FLOW.md) have matching `rollout-*.jsonl` filenames under `~/.codex/sessions/`. These cover intake, analysis, architecture, development, QA, and review. The filename check did not inspect or clear the file contents for sharing.
- For later activity indexed by collaboration path, open the original Codex Desktop project chat and inspect the delegated agent activity. Use any native export option the installed app exposes. If the app displays a session ID, match it to the corresponding original in `~/.codex/sessions/` or `~/.codex/archived_sessions/`. Later session-file matches remain unverified.
- The project owner must review each candidate original privately for sensitive content. Copy only safe originals into this directory, preserving their bytes, and index each copy by story, role, session ID, and corresponding commit. For a sensitive original, leave it private and ask the evaluator whether a secure review channel is acceptable. Disclose any gaps that remain. No original files have been copied into this repository.
