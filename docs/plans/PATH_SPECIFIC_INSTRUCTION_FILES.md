Here’s a practical step-by-step plan to **split an existing single GitHub Copilot custom instructions file into multiple path-specific instruction files**, using the path-specific instruction file support described in the GitHub Docs.([GitHub Docs][1])

---

## 🧩 1. **Audit Your Current Instructions**

Start by reviewing your existing `.github/copilot-instructions.md` to see what guidance applies to which parts of your codebase:

- List all instructions.
- Categorize them by language, feature area, or directory (e.g., frontend, backend, tests, build scripts).
- Note which instructions are generic vs. path-specific.

This gives you a blueprint for what should move into specific files.

---

## 📁 2. **Create the Path Instructions Directory**

Make sure the `.github/instructions` directory exists in your repository:

```sh
mkdir -p .github/instructions
```

If you prefer structure by team or component, create nested folders inside it.([GitHub Docs][1])

---

## ✂️ 3. **Split Instructions into Files by Scope**

For each logical grouping you found:

### a) Create a Named Instruction File

Name files clearly to indicate the scope. For example:

```
.github/instructions/frontend.instructions.md
.github/instructions/backend.tests.instructions.md
.github/instructions/scripts.instructions.md
```

---

### b) Add Frontmatter with `applyTo`

At the top of each file include a YAML frontmatter block using `applyTo` with a glob pattern for the files it applies to:

```markdown
---
applyTo: 'frontend/**/*.{js,ts,jsx,tsx}'
---
```

Glob tips:

- `"**/*.py"` – all Python files.
- `"src/services/**/*.ts"` – all TS files under services.
- You may separate multiple patterns with commas if needed.([GitHub Docs][1])

Repeat this for each file type or folder where specific behavior is needed.

---

### c) Move Relevant Instructions

After the frontmatter, put only the Copilot rules that belong to that scope.

For example, in `frontend.instructions.md`:

```markdown
---
applyTo: 'frontend/**/*.{js,ts,jsx,tsx}'
---

- Always prefer React hooks over class components.
- When suggesting code, include associated CSS modules.
```

Make sure nothing in this file duplicates unrelated rules from others.

---

## 🧠 4. **Keep or Update the Repository-Wide Instructions**

Decide whether to:

- Leave global instructions in `.github/copilot-instructions.md`, **or**
- Remove them entirely in favor of scoped files.

As a rule of thumb:

- Keep only truly universal guidance at the repo level.
- Move everything else to path-specific files.

This avoids redundant instructions being applied everywhere.

---

## 🔍 5. **Test and Validate in Your IDE**

After you’ve added the files:

1. Open VS Code (or your preferred IDE).
2. Ensure Copilot custom instructions are enabled in your settings.
3. Open or edit files under each path category.
4. Trigger Copilot suggestions and verify the right file’s instructions are being applied.

Some tips for reliable testing:

- Use clear, distinct instructions so you can detect if they’re being used.
- Touch files in different directories to confirm your glob patterns work.

---

## 🧹 6. **Maintain and Update Over Time**

Once split:

- Review periodically if teams or code structure changes.
- Add new path-specific files for new subsystems.
- Avoid conflicts: if two files match the same path and contain contradictory instructions, outcomes may be unpredictable.

---

## 📌 Summary

| Step | Action                                          |
| ---- | ----------------------------------------------- |
| 1    | Review and categorize existing instructions     |
| 2    | Create `.github/instructions` directory         |
| 3    | Create path-specific files with `applyTo` globs |
| 4    | Keep or adjust repository-wide file             |
| 5    | Test coverage and effectiveness                 |
| 6    | Maintain files as code changes                  |

---

By organizing your Copilot guidance this way, you ensure that each part of your codebase gets targeted, context-sensitive instructions instead of one generic blob.([GitHub Docs][1])

If you want, I can also help you generate example instruction files from your current one—just paste the content here!

[1]: https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions?tool=vscode&utm_source=chatgpt.com 'Adding repository custom instructions for GitHub Copilot - GitHub Docs'
