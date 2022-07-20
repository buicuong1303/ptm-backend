FROM node:14 As development

#becuase ENV cant set directly from commandline so use ARG set default ENV because ARG can set in build time
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install

COPY . .

RUN yarn run build

FROM node:14 as production

#becuase ENV cant set directly from commandline so use ARG set default ENV because ARG can set in build time
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

# dist still using node_modules to run production
RUN yarn install --only=production

# because config cannot load without this lib
RUN yarn add js-yaml

COPY . .

COPY --from=development /usr/src/app/dist ./dist
# ENTRYPOINT [ "node", "dist/main.js" ]

# custom plugin elasticsearch
FROM docker.elastic.co/elasticsearch/elasticsearch:7.3.1 as elasticsearch

ARG extension=https://github.com/duydo/elasticsearch-analysis-vietnamese/releases/download/v7.3.1/elasticsearch-analysis-vietnamese-7.3.1.zip

RUN cd /usr/share/elasticsearch \
    # dua ve dang khong dau
    && bin/elasticsearch-plugin install analysis-icu \
    # 
    && bin/elasticsearch-plugin install $extension --batch
