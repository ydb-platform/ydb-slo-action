#!/bin/sh
set -eu
cd "$(dirname "$0")"
fixture_tmp=$(mktemp -d)
trap 'rm -rf "$fixture_tmp"' EXIT HUP INT TERM
openssl req -x509 -newkey rsa:2048 -nodes -days 3650 \
  -subj '/CN=YDB SLO test CA' \
  -addext 'basicConstraints=critical,CA:TRUE' \
  -addext 'keyUsage=critical,keyCertSign,cRLSign' \
  -keyout "$fixture_tmp/ca.key" -out ca.crt
openssl req -newkey rsa:2048 -nodes -subj '/CN=ydb' \
  -keyout server.key -out "$fixture_tmp/server.csr"
cat > "$fixture_tmp/server.ext" <<'EXT'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:ydb,DNS:localhost,IP:127.0.0.1,DNS:ydb-storage-1,DNS:ydb-storage-2,DNS:ydb-database-1,DNS:ydb-database-2,DNS:ydb-database-3,DNS:ydb-database-4,DNS:ydb-database-5,IP:172.28.0.10,IP:172.28.0.11,IP:172.28.0.12,IP:172.28.0.13,IP:172.28.0.14,IP:172.28.0.15,IP:172.28.0.16
EXT
openssl x509 -req -in "$fixture_tmp/server.csr" -CA ca.crt -CAkey "$fixture_tmp/ca.key" \
  -CAcreateserial -CAserial "$fixture_tmp/ca.srl" -days 3650 \
  -extfile "$fixture_tmp/server.ext" -out server.crt
chmod 644 ca.crt server.crt server.key
