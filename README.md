# Dashboard Workspace

Top-level structure:

- `data/` — source datasets and extracted market data files.
- `design/` — frontend apps (`web`, `mobile`) and design assets.
- `model/` — notebooks, training/prediction scripts, and production model artifacts.

## Quick start

### Web app

```bash
cd design/apps/web
npm install
npm run dev
```

### Mobile app

```bash
cd design/apps/mobile
npm install
npm start
```

### Python model scripts

Use the workspace virtual environment if available:

```bash
./.venv/bin/python model/predict_bond_prices.py --help
```

## Notes

- Keep large raw data files in `data/`.
- Keep model artifacts under `model/production/`.
- Avoid adding generated files to version control.
