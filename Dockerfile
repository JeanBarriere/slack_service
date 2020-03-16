FROM node:alpine

WORKDIR /app

COPY package.json yarn.lock tsconfig.json /app/
RUN yarn

COPY . /app/
RUN yarn compile

ENTRYPOINT ["node", "/app/build/src/main.js"]