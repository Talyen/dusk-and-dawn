# Repository worktrees and integration

Use one task branch and worktree per implementation chat. Start from committed local `main`, or reuse that chat's existing suitable worktree. Preserve unrelated work and never overwrite a dirty main checkout.

All integrations use the shared lock in the Git common directory through `node scripts/integrate.mjs <main-worktree> <verified-full-commit>`. First incorporate current main in the task worktree, resolve understood conflicts, commit the result, and verify that exact commit. The integration command waits at most 30 seconds, checks both worktrees are clean and the verified commit contains current main, and fast-forwards main while holding the lock. If the command stops or the lock is ambiguous, preserve it and investigate rather than removing another process's lock. Run tests and builds before acquiring the lock.

Pushes, publication, and external changes require user authorization. Keep local checks focused; use CI for broader checks and desktop packaging.
