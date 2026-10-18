#!/bin/bash
# Rebuild site/ and url-map.csv from the WordPress site archive.
#
# Usage:  conversion/convert.sh path/to/site-akimbocomics.com.tar.gz
#
# Needs Docker, wget and python3. Uses port 8080 and a scratch folder
# (conversion/work, or $WORK). Replaces site/ and url-map.csv, then
# regenerates the redirects. See conversion/README.md.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
REPO=$(dirname "$HERE")
ARCHIVE=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
export WORK=${WORK:-$HERE/work}
COMPOSE=(docker compose -f "$HERE/wordpress/docker-compose.yml")
step() { printf '\n==> %s\n' "$*"; }

step "Extracting $ARCHIVE into $WORK"
"${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
rm -rf "$WORK" && mkdir -p "$WORK"
tar -xzf "$ARCHIVE" -C "$WORK"
WP="$WORK/akimbocomics.com"
test -f "$WP/wp-config.php" && test -f "$WORK/akimbocomics.sql"

step "Pointing the WordPress copy at the local database and http://localhost:8080"
sed -i.orig \
  -e "s|define( *'WP_HOME', *'[^']*' *);|define('WP_HOME','http://localhost:8080');|" \
  -e "s|define( *'WP_SITEURL', *'[^']*' *);|define('WP_SITEURL','http://localhost:8080');|" \
  -e "s|define( *'DB_HOST', *'[^']*' *);|define('DB_HOST', 'db');|" \
  -e "s|define( *'DB_PASSWORD', *'[^']*' *);|define('DB_PASSWORD', 'akimbo-local');|" \
  "$WP/wp-config.php"
rm "$WP/wp-config.php.orig"
mkdir -p "$WP/wp-content/mu-plugins"
cp "$HERE"/wordpress/mu-plugins/*.php "$WP/wp-content/mu-plugins/"
cp "$HERE/wordpress/htaccess" "$WP/.htaccess"

step "Starting WordPress (PHP 7.0 + MariaDB) in Docker"
"${COMPOSE[@]}" up -d --build
for i in $(seq 1 60); do
  "${COMPOSE[@]}" exec -T db mariadb -uakimbo -pakimbo-local akimbocomics -e "SELECT 1 FROM wp_options LIMIT 1" >/dev/null 2>&1 && break
  sleep 3
done
"${COMPOSE[@]}" exec -T db mariadb -uakimbo -pakimbo-local akimbocomics -e \
  "UPDATE wp_options SET option_value='/%postname%/' WHERE option_name='permalink_structure'; DELETE FROM wp_options WHERE option_name='rewrite_rules';"
curl -sf -o /dev/null http://localhost:8080/eatshitanddie/ || { echo "WordPress isn't answering on :8080"; exit 1; }

step "Exporting WordPress URL data"
"${COMPOSE[@]}" cp "$HERE/wordpress/export-urls.php" web:/export-urls.php
"${COMPOSE[@]}" exec -T web php /export-urls.php > "$WORK/wordpress-urls.json"

step "Crawling http://localhost:8080 into static files (a few minutes)"
wget --mirror --page-requisites --adjust-extension --convert-links --no-parent \
  --restrict-file-names=windows -e robots=off -nH -P "$WORK/export" \
  --reject-regex '(wp-admin|wp-login|xmlrpc|wp-json|/feed/|/feed$|replytocom|/trackback/|wp-comments-post|[?&]s=)' \
  -o "$WORK/crawl.log" http://localhost:8080/ || true
echo "broken links during crawl: $(grep -c 'ERROR 404' "$WORK/crawl.log" || true)"

step "Cleaning up the crawl"
python3 -I "$HERE/postprocess.py" "$WORK/export" "$WP"

step "Moving each page's images next to its HTML"
python3 -I "$HERE/normalize.py" "$WORK/export" "$WORK/moves.json"

step "Writing url-map.csv"
python3 -I "$HERE/build-urlmap.py" "$WORK/wordpress-urls.json" "$WORK/moves.json" "$WORK/export" "$REPO/url-map.csv"

step "Replacing site/ and regenerating redirects"
rm -rf "$REPO/site"
mv "$WORK/export" "$REPO/site"
python3 -I "$REPO/tools/build-redirects.py"

step "Stopping WordPress"
"${COMPOSE[@]}" down -v
echo "Done. Review with: git status; docker compose up -d --build"
