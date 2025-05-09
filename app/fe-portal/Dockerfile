FROM nginx:latest

COPY dist /usr/share/nginx/html
COPY nginx.conf /usr/share/nginx/conf/nginx.conf
COPY mime.types /usr/share/nginx/conf/mime.types


CMD ["nginx", "-c", "/usr/share/nginx/conf/nginx.conf", "-g", "daemon off;"]
