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

## Deploy with Docker Desktop

From project root:

```bash
docker compose up --build -d
```

Open:

- `http://localhost:4000`

Stop:

```bash
docker compose down
```

Notes:

- The container serves the web app and API from `design/apps/web`.
- `data/` and `model/` are mounted read-only into the container.
- Optional OpenAI settings can be provided as environment variables before `docker compose up`.

## Deploy on Render (from GitHub)

This repository includes `render.yaml` for Render Blueprint deployment.

1. Push this repository to GitHub.
2. In Render, choose **New +** → **Blueprint** and select this GitHub repo.
3. Render will detect `render.yaml` and create service `perisai-dashboard`.
4. Set `OPENAI_API_KEY` in Render Environment Variables (if market update AI feature is used).
5. Deploy and open the generated Render URL.

Notes:

- Runtime assets in `data/` and `model/` are copied into the Docker image for Render.
- The app listens on `PORT` provided by Render and uses `/app` as workspace root.

## Notes

- Keep large raw data files in `data/`.
- Keep model artifacts under `model/production/`.
- Avoid adding generated files to version control.
