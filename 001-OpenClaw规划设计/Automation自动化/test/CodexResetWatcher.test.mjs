#!/usr/bin/env node

import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyReset,
  mergeEvents,
  migrateState,
  nextState,
  parseNitterRss,
  parseWebsite,
  verifyOEmbed,
} from "../CodexResetWatcher.mjs";

const targetId = "2081096447718723984";
const targetText =
  "We have reset usage limits for all Codex and ChatGPT Work users.";
const targetUrl = `https://x.com/thsottiaux/status/${targetId}`;

const rss = `<?xml version="1.0"?>
<rss><channel>
<item>
  <title><![CDATA[${targetText}]]></title>
  <description><![CDATA[<p>${targetText}</p>]]></description>
  <pubDate>Sat, 25 Jul 2026 19:17:12 GMT</pubDate>
  <link>https://nitter.net/thsottiaux/status/${targetId}#m</link>
</item>
<item>
  <title><![CDATA[Here is an ordinary Codex release update.]]></title>
  <description><![CDATA[No quota event.]]></description>
  <pubDate>Sat, 25 Jul 2026 20:17:12 GMT</pubDate>
  <link>https://nitter.net/thsottiaux/status/2081096447718723999#m</link>
</item>
</channel></rss>`;

const website = `<script>
$R[1]={id:"${targetId}",createdAt:"2026-07-25T19:17:12.000Z",author:"Tibo",avatarUrl:"x",handle:"@thsottiaux",title:"Reset",summary:"${targetText}",reasoning:"public",kind:"confirmed-reset",confidence:100,engagement:{},sourceUrl:"${targetUrl}"}
</script>`;

const oembed = {
  url: targetUrl,
  author_name: "Tibo",
  author_url: "https://x.com/thsottiaux",
  html: `<blockquote><p>${targetText}<br>Recovered.</p>— Tibo (@thsottiaux)</blockquote>`,
};

test("high-confidence confirmed reset is classified", () => {
  assert.equal(classifyReset(targetText)?.kind, "confirmed-reset");
});

test("ordinary product post is rejected", () => {
  assert.equal(classifyReset("Codex has a new feature today."), null);
});

test("Nitter RSS finds only the qualifying Tibo event", () => {
  const events = parseNitterRss(rss);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, targetId);
  assert.equal(events[0].createdAt, "2026-07-25T19:17:12.000Z");
});

test("Nitter RSS rejects reset posts whose status URL is another author", () => {
  const other = rss.replaceAll("/thsottiaux/status/", "/other/status/");
  assert.equal(parseNitterRss(other).length, 0);
});

test("codexreset.org parser finds the same event", () => {
  const events = parseWebsite(website);
  assert.equal(events.length, 1);
  assert.equal(events[0].id, targetId);
});

test("X oEmbed verifies ID, author and body", () => {
  const candidate = parseNitterRss(rss)[0];
  const verified = verifyOEmbed(oembed, candidate);
  assert.ok(verified.verifiedBy.includes("x-oembed"));
  assert.equal(verified.id, targetId);
});

test("X oEmbed rejects a wrong author", () => {
  const candidate = parseNitterRss(rss)[0];
  assert.throws(
    () => verifyOEmbed({ ...oembed, author_url: "https://x.com/other" }, candidate),
    /author mismatch/,
  );
});

test("verified X event does not wait for website ingestion", () => {
  const candidate = verifyOEmbed(oembed, parseNitterRss(rss)[0]);
  const merged = mergeEvents([candidate], []);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].corroborated, false);
});

test("website remains usable when X discovery fails", () => {
  const merged = mergeEvents([], parseWebsite(website));
  assert.equal(merged[0].discoveredBy, "codexreset.org");
});

test("same ID from both paths is merged and corroborated", () => {
  const xEvent = verifyOEmbed(oembed, parseNitterRss(rss)[0]);
  const merged = mergeEvents([xEvent], parseWebsite(website));
  assert.equal(merged.length, 1);
  assert.equal(merged[0].corroborated, true);
  assert.deepEqual(merged[0].verifiedBy.sort(), [
    "codexreset.org",
    "x-oembed",
  ]);
});

test("legacy state migrates without replaying previously seen IDs", () => {
  const state = migrateState({
    schemaVersion: 1,
    checkedAt: "2026-07-25T20:00:00.000Z",
    seenIds: [targetId],
  });
  assert.equal(state.schemaVersion, 2);
  assert.deepEqual(state.notifiedIds, [targetId]);
});

test("next state preserves notified IDs and adds observed IDs", () => {
  const event = parseWebsite(website)[0];
  const state = nextState(
    { checkedAt: "x", seenIds: [], notifiedIds: ["old"] },
    [event],
    { website: { ok: true } },
    "2026-07-26T00:00:00.000Z",
  );
  assert.deepEqual(state.notifiedIds, ["old"]);
  assert.ok(state.seenIds.includes(targetId));
  assert.equal(state.sources.website.ok, true);
});
