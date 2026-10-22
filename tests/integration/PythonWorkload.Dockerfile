FROM python:3.11

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /src
COPY setup.py pyproject.toml README.md requirements.txt ./
COPY ydb/ ydb/
RUN pip install --no-cache-dir .
COPY tests/slo/requirements.txt tests/slo/requirements.txt
RUN pip install --no-cache-dir -r tests/slo/requirements.txt
COPY tests/slo/src /src/tests/slo/src
COPY tests/slo/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
