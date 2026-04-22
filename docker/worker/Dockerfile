FROM python:3.11-slim AS builder
WORKDIR /build
RUN pip install --upgrade pip
COPY backend/pyproject.toml ./
COPY backend/ ./
RUN pip install --no-cache-dir "."

FROM python:3.11-slim AS runtime
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser
WORKDIR /app
COPY --from=builder /build ./
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
USER appuser
CMD ["python", "-m", "app.workers.expiry_worker"]
