# akimbocomics.com

A non-wordpress re-hosting of akimbocomics.com

## Run it

```
docker compose up -d --build
```

Then open http://localhost:8080. To serve on another port (e.g. 80 on a server):

```
PORT=80 docker compose up -d --build
```

Without compose:

```
docker build -t akimbocomics .
docker run -d -p 80:80 --restart unless-stopped akimbocomics
```

## Layout

| Path | What |
|---|---|
| `site/` | The whole static site: HTML, comic images (`site/comic/`), theme CSS/JS. Any static host can serve this folder as-is. |
| `nginx/default.conf` | nginx server config: caching, gzip, and redirects. |
| `nginx/redirects.conf` | Maps old WordPress links (`/?p=123`, `/?page_id=2`, `/?cat=6`) to their new paths as 301 redirects. Generated; don't edit by hand. |
| `Dockerfile` | `nginx:alpine` with the config and `site/` baked in. |

Old `?p=` links also redirect via a small script in `site/index.html`, so they
keep working on hosts without nginx (e.g. GitHub Pages).

Comments, search and RSS feeds were WordPress features and don't exist here;
existing comments are preserved on each post.
