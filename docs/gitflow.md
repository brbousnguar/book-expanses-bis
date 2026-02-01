# Git flow for Book Tracker

Follow this workflow when starting a new feature or fix.

---

## Feature workflow

1. **Create a feature branch from `main`**
   - Branch name: `feat/what-i-implement` (e.g. `feat/add-export`, `feat/dark-mode`)
   - Track `main`:
     ```bash
     git fetch origin main
     git checkout -b feat/your-feature-name origin/main
     ```

2. **Before committing: pull rebase**
   - Rebase your branch on latest `main` so you’re up to date:
     ```bash
     git pull --rebase origin main
     ```

3. **Commit**
   - Use a short, clear message:
     ```bash
     git add .
     git commit -m "feat: short description of what you implemented"
     ```
   - Examples: `feat: add CSV export`, `feat: local API and loading fixes`

4. **Push and open a pull request**
   - Push the branch:
     ```bash
     git push -u origin feat/your-feature-name
     ```
   - Create a pull request (GitHub UI or CLI):
     ```bash
     gh pr create --base main --head feat/your-feature-name --title "feat: short description"
     ```

---

## Summary

| Step | Action |
|------|--------|
| 1 | Create branch `feat/what-i-implement` from `main` |
| 2 | Before commit: `git pull --rebase origin main` |
| 3 | Commit with message: `feat: short description` |
| 4 | Push branch and create PR into `main` |

---

## Fixes / chores

- For bug fixes use branch prefix: `fix/description` and commit message: `fix: description`
- For chores (deps, config): `chore: description`
