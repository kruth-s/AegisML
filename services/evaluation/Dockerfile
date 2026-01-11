FROM python:3.11-slim
WORKDIR /app
COPY services/evaluation/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY services/evaluation/app ./app
COPY core ./core
ENV PYTHONPATH=/app
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8004"]
