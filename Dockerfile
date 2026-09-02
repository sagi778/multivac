FROM python:3.11-slim

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

ENV HOST=0.0.0.0
CMD ["sh", "-c", "uvicorn main:app --host $HOST --port ${PORT:-8080}"]
