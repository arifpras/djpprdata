FROM node:20-bookworm-slim AS web-build

WORKDIR /app/design/apps/web
COPY design/apps/web/package*.json ./
RUN npm ci --legacy-peer-deps
COPY design/apps/web ./
RUN npx react-router build

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  python3 \
  python3-venv \
  python3-pip \
  libgomp1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY model/requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

COPY --from=web-build /app/design/apps/web /app/design/apps/web
COPY data /app/data
COPY model/predict_bond_prices.py /app/model/predict_bond_prices.py
COPY model/dbtrain.csv /app/model/dbtrain.csv
COPY model/production/models /app/model/production/models

ENV NODE_ENV=production
ENV PORT=4000
ENV DASHBOARD_WORKSPACE_ROOT=/app
ENV BOND_PREDICT_PYTHON=/opt/venv/bin/python
ENV SQLITE_DB_PATH=/app/data/Database_Domestik_Internasional.db
ENV PATH="/opt/venv/bin:${PATH}"

WORKDIR /app/design/apps/web

EXPOSE 4000

CMD ["npx", "react-router-serve", "build/server/index.js"]
