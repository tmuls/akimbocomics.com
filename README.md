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
docker run -d -p 80:8080 --restart unless-stopped akimbocomics
```

Or use the prebuilt image (arm64 and amd64), rebuilt on every push to `main`
by the "Build container image" workflow:

```
docker run -d -p 80:8080 ghcr.io/tmuls/akimbocomics.com:latest
```

In the homelab k3s cluster it's deployed by `akimbocomics/akimbocomics.yaml`
in the `homelab` repo.

## Layout

| Path | What |
|---|---|
| `site/` | The whole static site: HTML, comic images (`site/comic/`), theme CSS/JS. Any static host can serve this folder as-is. |
| `nginx/default.conf` | nginx server config: listens on 8080, `/healthz` for Kubernetes, caching, gzip, and redirects. |
| `nginx/redirects.conf` | Maps old WordPress links (`/?p=123`, `/?page_id=2`, `/?cat=6`) to their new paths as 301 redirects. Generated; don't edit by hand. |
| `Dockerfile` | `nginx-unprivileged` (runs as a normal user) with the config and `site/` baked in. |
| `.github/workflows/build-image.yml` | Builds and pushes `ghcr.io/tmuls/akimbocomics.com` (`latest` and `sha-<commit>`). |

Old `?p=` links also redirect via a small script in `site/index.html`, so they
keep working on hosts without nginx (e.g. GitHub Pages).

Comments, search and RSS feeds were WordPress features and don't exist here;
existing comments are preserved on each post.
