FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libmupdf-dev \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install backend deps first for layer caching
COPY Backend/agent-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app
COPY Backend/agent-service/app ./app

ENV PORT=7860
EXPOSE 7860

# Hugging Face Spaces sets $PORT at runtime. Default to 7860.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
