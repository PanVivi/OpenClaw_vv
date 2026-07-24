# Housekeeper Workboard Control

This plugin registers two narrow tools only for the configured housekeeper
agent:

- `housekeeper_workboard_start` invokes the fixed `workboard dispatch` command
  and accepts only an optional board id.
- `housekeeper_workboard_show` invokes the fixed `workboard show <UUID> --json`
  command and accepts only a UUID card id. It exists so terminal-event
  notifications can include the verified title and current state without a
  worker claim token.

Dispatcher concurrency remains controlled by the official Workboard
configuration. Neither tool exposes arbitrary command, path, environment,
shell, message, configuration, or file access.

The plugin owns no task database. Workboard cards and the native OpenClaw
Tasks/Task Flow ledger remain authoritative.
