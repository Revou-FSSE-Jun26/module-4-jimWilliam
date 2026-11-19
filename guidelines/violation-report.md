# Guideline violation report

Violations found while reviewing AI-generated RevoTask code against `/guidelines`, each with the rule it breaks and the fix that was applied. Entries are added as reviews happen; each fix is in the commit history.

| # | Where | Guideline | What was wrong | Fix applied |
|---|---|---|---|---|
| 1 | `backend/tests/` (first generated suite) | BE-11 Every route has tests for success and each documented error | The suite covered the main paths but skipped documented errors for many routes: no 401 check on most routes, no 403 for non-members on B14–B20, no 404 for unknown ids on B10–B22, and no test of the 500 handler. | Added `tests/test_access_matrix.py`: a 401 check over every protected route, a non-member 403 matrix that also asserts nothing changed, a member-vs-admin 403 matrix, parametrised 404s for unknown ids, and a 500 test that asserts no stack trace. 51 → 71 tests. |
