FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=8080
ENV GUNICORN_TIMEOUT=300

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--timeout", "300", "main:app"] 