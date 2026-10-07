import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isTaskClosed,
  parseTaskPriority,
  parseTaskStatus,
  splitTaskText,
  taskBodyText,
  taskEventSentence,
  taskOf,
} from "./task-format.ts";

// Same cases as the phone's task_card_test.dart.

test("unknown wire values fall back to the defaults", () => {
  assert.equal(parseTaskPriority("urgent"), "urgent");
  assert.equal(parseTaskPriority("nope"), "medium");
  assert.equal(parseTaskStatus("in_progress"), "in_progress");
  assert.equal(parseTaskStatus(undefined), "todo");
});

test("only done and cancelled are closed", () => {
  assert.equal(isTaskClosed("done"), true);
  assert.equal(isTaskClosed("cancelled"), true);
  assert.equal(isTaskClosed("blocked"), false);
});

test("a message is a task only with meta.task and while not deleted", () => {
  assert.equal(taskOf({ meta: null }), null);
  assert.equal(taskOf({ meta: { task: { priority: "high" } }, deleted_at: "x" }), null);
  assert.deepEqual(taskOf({ meta: { task: { priority: "high", status: "done" } } }), {
    priority: "high",
    status: "done",
  });
});

test("title is the first line, description the rest", () => {
  assert.equal(taskBodyText(" Fix\nlogin ", "  "), "Fix login");
  assert.equal(taskBodyText("Fix login", " step 1\nstep 2 "), "Fix login\nstep 1\nstep 2");
  assert.deepEqual(splitTaskText("Fix login\nstep 1\nstep 2"), {
    title: "Fix login",
    description: "step 1\nstep 2",
  });
  assert.deepEqual(splitTaskText("  Only title "), { title: "Only title", description: "" });
});

test("change lines name the task when its title is known", () => {
  assert.equal(
    taskEventSentence("task_status_changed", "done", "You", "Fix login"),
    'You marked "Fix login" as Done',
  );
  assert.equal(
    taskEventSentence("task_priority_changed", "urgent", "Alice", ""),
    "Alice set the priority of a task to Urgent",
  );
  assert.equal(taskEventSentence("member_added", "", "You", ""), null);
  assert.match(
    taskEventSentence("task_status_changed", "review", "You", "x".repeat(60)),
    /^You marked "x{40}…" as Review$/,
  );
});
