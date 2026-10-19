# Two stages: Node builds the site (Stencil prerenders every page from
# content/, tools/build-site.py adds site/'s static files and the redirect
# files and checks every known URL still works), then nginx serves the
# result, plain static files. nginx-unprivileged runs as a normal user and
# listens on 8080.

# The build output is the same on every platform, so build it natively
# (fast) even when the image is for arm64.
FROM --platform=$BUILDPLATFORM node:22.20.0-alpine AS build
RUN apk add --no-cache python3
WORKDIR /src
COPY stencil/package.json stencil/package-lock.json stencil/
RUN cd stencil && npm ci --no-audit --no-fund
COPY . .
RUN python3 tools/build-site.py

FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx/default.conf nginx/redirects.conf /etc/nginx/conf.d/
COPY --from=build /src/dist/ /usr/share/nginx/html/
EXPOSE 8080
