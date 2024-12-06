FROM node:18-alpine

WORKDIR /app
COPY http-folder/server.js .

ENV HTTP_FOLDER_ROOT_DIR=/data
ENV HTTP_FOLDER_PORT=8080

VOLUME [ "/data" ]
EXPOSE 8080

CMD ["node", "server.js"]