# Project workspace — page override

This page is an in-product coding workspace, not a product demo or marketing page. These rules override `MASTER.md` here.

## Hierarchy and layout

- Keep the conversation visible as the primary surface; open the project workspace as a right-side inspector.
- Use a compact file navigator beside the selected file on desktop. On narrow screens, make the file list a horizontal strip above the editor.
- Keep file path, project context, and close/back actions visible in the header. Put Code and Preview in a quiet tab row.
- Use the existing Idealy theme tokens and typography. Avoid introducing a new accent palette or large cards.

## Interaction and trust

- Every file row selects its actual artifact. Copy and download operate on that selected file.
- Only label a preview as runnable when a project runtime is connected. A sandboxed HTML document is a static preview, not a running app.
- Show only mission stages observable from the client/API. Show plan agents as planned roles until backend execution events exist.
- Keep preview content isolated from the parent application; support keyboard focus, reduced motion, and narrow screens.
