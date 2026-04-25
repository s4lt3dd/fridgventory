FROM python:3.11-slim AS builder
WORKDIR /build
# hadolint ignore=DL3013
RUN pip install --no-cache-dir --upgrade pip
COPY backend/pyproject.toml ./
COPY backend/ ./
# hadolint ignore=DL3013
RUN pip install --no-cache-dir ".[dev]"

FROM python:3.11-slim AS runtime
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser
WORKDIR /app
COPY --from=builder /build ./
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
USER appuser
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
