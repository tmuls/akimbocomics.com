FROM nginx:1.27-alpine
COPY nginx/default.conf nginx/redirects.conf /etc/nginx/conf.d/
COPY site/ /usr/share/nginx/html/
EXPOSE 80
