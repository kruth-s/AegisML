FROM python:3.11-slim
WORKDIR /app
COPY services/registry/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY services/registry/app ./app
COPY core ./core
ENV PYTHONPATH=/app
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8001"]
