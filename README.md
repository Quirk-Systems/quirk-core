# quirk-core

Candidate doctrine for a possible Quirk Preference Graph language and evidence model.

This repository is **not admitted**. It has no named owner, applying runtime, deployment evidence, or consumer authority. The current executable surface is the dependency-free [preference evidence wedge](docs/canon/preference-evidence-wedge.md): a closed, content-addressed simulation for one explicit, non-sensitive response-density preference in `Quirk-Systems/project-scaffold`.

Validate it with:

```bash
python -m unittest discover -s tests -v
python scripts/validate_preference_wedge.py --schema schemas/preference-evidence-wedge.v1.schema.json examples/preference-evidence-wedge/*.json
```

Historical Supabase migrations remain candidate artifacts and are not proof of deployment or final database enforcement. See [candidate language boundaries](docs/canon/preference-language.md).
