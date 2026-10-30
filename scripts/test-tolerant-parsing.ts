import assert from "node:assert/strict";
import {
  extractJsonObject,
  type RawWorkspaceFrame,
  WorkspaceFrameParser,
} from "../supabase/functions/_shared/tolerantParsing";

// --- extractJsonObject
assert.deepEqual(extractJsonObject('{"a":1}'), { a: 1 });
assert.deepEqual(
  extractJsonObject(
    'Voici le plan :\n```json\n{"a":{"b":"}"}}\n```\nBonne chance !'
  ),
  { a: { b: "}" } }
);
assert.deepEqual(extractJsonObject('prose {not json} puis {"ok":true}'), {
  ok: true,
});
assert.equal(extractJsonObject("aucun json ici"), null);
assert.equal(extractJsonObject('{"a": '), null);

// --- WorkspaceFrameParser
const frameLines = [
  '{"type":"file_started","path":"package.json","language":"json"}',
  '{"type":"file_content","path":"package.json","content":"{\\"name\\":\\"x\\"}"}',
];

// clean input
{
  const p = new WorkspaceFrameParser();
  const frames = [...p.feed(`${frameLines.join("\n")}\n`), ...p.flush()];
  assert.equal(frames.length, 2);
  assert.equal(p.droppedFrames, 0);
}

// blank lines, fences, prose, file_saved are ignored instead of aborting
{
  const p = new WorkspaceFrameParser();
  const noisy = [
    "Voici les fichiers :",
    "```json",
    "",
    frameLines[0],
    "",
    '{"type":"file_saved","path":"package.json"}',
    frameLines[1],
    "```",
  ].join("\n");
  const frames = [...p.feed(noisy), ...p.flush()];
  assert.deepEqual(
    frames.map((f) => f.type),
    ["file_started", "file_content"]
  );
  assert.equal(p.droppedFrames, 0);
  assert.ok(p.ignoredLines >= 2);
}

// raw newlines inside a content string are re-assembled
{
  const p = new WorkspaceFrameParser();
  const broken =
    '{"type":"file_content","path":"src/App.tsx","content":"line1\nline2\n  line3"}';
  const frames = [...p.feed(`${broken}\n`), ...p.flush()];
  assert.equal(frames.length, 1);
  assert.equal(frames[0].content, "line1\nline2\n  line3");
}

// a broken frame is dropped when the next frame starts; later files survive
{
  const p = new WorkspaceFrameParser();
  const input = [
    '{"type":"file_started","path":"a.ts"}',
    '{"type":"file_content","path":"a.ts","content":"oups tronqué',
    '{"type":"file_started","path":"b.ts"}',
    '{"type":"file_content","path":"b.ts","content":"ok"}',
  ].join("\n");
  const frames = [...p.feed(input), ...p.flush()];
  assert.deepEqual(
    frames.map((f) => f.path),
    ["a.ts", "b.ts", "b.ts"]
  );
  assert.equal(p.droppedFrames, 1);
}

// chunks split anywhere give the same result
{
  const p = new WorkspaceFrameParser();
  const text = `${frameLines.join("\n")}\n`;
  const frames: RawWorkspaceFrame[] = [];
  for (let i = 0; i < text.length; i += 7) {
    frames.push(...p.feed(text.slice(i, i + 7)));
  }
  frames.push(...p.flush());
  assert.equal(frames.length, 2);
}

// truncated final frame is reported, not thrown
{
  const p = new WorkspaceFrameParser();
  const frames = [
    ...p.feed(
      `${frameLines[0]}\n{"type":"file_content","path":"x","content":"cut`
    ),
    ...p.flush(),
  ];
  assert.equal(frames.length, 1);
  assert.equal(p.droppedFrames, 1);
}

console.log("tolerant parsing contract: ok");
