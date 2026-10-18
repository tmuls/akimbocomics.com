# The site is plain static files, so the image is just nginx plus site/.
# nginx-unprivileged runs as a normal user and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.29-alpine
COPY nginx/default.conf nginx/redirects.conf /etc/nginx/conf.d/
COPY site/ /usr/share/nginx/html/
EXPOSE 8080
