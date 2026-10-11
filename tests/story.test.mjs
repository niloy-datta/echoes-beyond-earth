import test from "node:test";
import assert from "node:assert/strict";
import {
  STORY_CHAPTERS,
  advanceStory,
  initialStoryProgress,
  recoverStoryMemory,
  sanitizeStoryProgress,
  storyPercent,
} from "../src/lib/story.ts";

test("story campaign has five ordered chapters with distinct recoverable memories", () => {
  assert.equal(STORY_CHAPTERS.length, 5);
  assert.deepEqual(STORY_CHAPTERS.map((chapter) => chapter.number), ["01", "02", "03", "04", "05"]);
  assert.equal(new Set(STORY_CHAPTERS.map((chapter) => chapter.memory)).size, 5);
  assert.ok(STORY_CHAPTERS.every((chapter) => chapter.title.en && chapter.title.bn && chapter.eko.en && chapter.eko.bn));
});

test("story progress sanitizes corrupted local state and advances deterministically", () => {
  const clean = sanitizeStoryProgress({ chapter: "storm", recovered: ["storm-light", "storm-light", "invalid"], completed: "yes" });
  assert.deepEqual(clean, { chapter: "storm", recovered: ["storm-light"], completed: false });
  const next = advanceStory(clean);
  assert.equal(next.chapter, "memories");
  assert.equal(storyPercent(next), 20);
});

test("recovering a memory is idempotent and final chapter completes", () => {
  let progress = initialStoryProgress();
  progress = recoverStoryMemory(progress, "silence");
  progress = recoverStoryMemory(progress, "silence");
  assert.equal(progress.recovered.length, 1);
  for (const chapter of STORY_CHAPTERS) progress = recoverStoryMemory(progress, chapter.id);
  assert.equal(progress.completed, true);
  progress = { ...progress, chapter: "legacy" };
  assert.equal(advanceStory(progress).completed, true);
  assert.equal(storyPercent(progress), 100);
});
