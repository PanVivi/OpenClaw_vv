import assert from "node:assert/strict";
import {
  buildDispatchArgs,
  buildShowArgs,
  resolveCliInvocation
} from "../dist/index.js";

assert.deepEqual(buildDispatchArgs({}), [
  "workboard",
  "dispatch",
  "--json"
]);

assert.deepEqual(
  buildDispatchArgs({ board_id: "production" }),
  [
    "workboard",
    "dispatch",
    "--json",
    "--board",
    "production"
  ]
);

assert.deepEqual(
  buildShowArgs({ card_id: "1606d140-e7e8-4e3d-842b-b251c3f498d2" }),
  [
    "workboard",
    "show",
    "1606d140-e7e8-4e3d-842b-b251c3f498d2",
    "--json"
  ]
);

const invocation = resolveCliInvocation();
assert.equal(typeof invocation.command, "string");
assert.ok(invocation.command.length > 0);
assert.ok(Array.isArray(invocation.prefix));

console.log("housekeeper-workboard-control integration tests passed");
