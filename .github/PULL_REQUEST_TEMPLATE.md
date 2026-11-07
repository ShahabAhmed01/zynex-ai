## Summary

<!-- What changed and why? Keep it focused. -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactor or maintenance
- [ ] Tests or CI

## Verification

<!-- List the exact commands you ran and their results. -->

```text
ruff check backend tests scripts
pytest -q
python scripts/test_pipeline.py
```

## Checklist

- [ ] I kept the change narrowly scoped and consistent with the existing architecture.
- [ ] I added or updated tests when behavior changed.
- [ ] I did not commit API keys, `.env` files, generated databases, or private data.
- [ ] I updated documentation when user-facing behavior changed.
- [ ] The PR does not claim results that were not actually verified.
