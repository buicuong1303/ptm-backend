# PHP Text Message - Backend Service
  ## Common
  - backup database

    ```docker exec -t {DB_PG_CONTAINER} pg_dump -U {POSTGRES_USER} {POSTGRES_DB} > {dump_name}```
    ```docker exec -t php_text_message-database pg_dump -U postgres php_text_message > php_text_message-dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql```
  - restore database

    ```docker exec -i {DB_PG_CONTAINER} psql -U {POSTGRES_USER} {POSTGRES_DB} < {dump_name}```
    ```docker exec -i php_text_message-database psql -U postgres php_text_message < php_text_message-dump_25-06-2020_20_41_30.sql```
  - start project
    - `yarn install`: install lib
    - `docker-compose up`: run project with docker
    - `docker-compose up php_text_message-backend php_text_message-database php_text_message-redis-queue php_text_message-rabbitmq`: run backend
    - `docker-compose up php_text_message-es php_text_message-kb`: run elastic search
    - `yarn run database:sync`: sync orm schema to database
    - ...others refer **package.json**
    - dump db with ssh and docker `ssh {USER}@{IP} "docker exec -t {CONTAINER_NAME} pg_dump -U postgres {DB_NAME}" > "{DB_NAME}_dump_`date +%d-%m-%Y"_"%H_%M_%S`.sql"`
    - restore db with ssh `ssh {USER}@{HOST} "docker exec -t {DB_CONTAINER} psql -U postgres {DB_NAME}" < {DUMP_FILE}`
    - restore db with psql `psql -h {HOST} -p ${PORT} -d {DB_NAME} -U postgres -f '${file_dump}'`
  ## Elasticsearch
  - kibana `url: http://localhost:5601/`
  ### I. ERROR
  #### 1. Docker 
  - <span style="color:red">"max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]"</span> : ````sysctl -w vm.max_map_count=262144````
  - `sysctl -w vm.max_map_count=262144` : max virtual memory areas vm.max_map_count [65530] is too low, increase to at least [262144]
    ### II. Note
    - use gagara/kibana-oss-arm64 for kibana run on arm64
    - arm64 and aarch64 is same thing
    - docker volume bind and mount is same thing, but bind is simple setup with one field, mount using multiple option. In docker-compose only using mount
    ### III. Learning
    #### 1. Check **cluster** health
    - ```
      GET /_cluster/health
      ```

    #### 2. Check **nodes** infomation
    - ```
      GET /_cat/nodes/?v
      ```

    #### 3. Check every **index** infomation
    - ```
      GET /_cat/indices/?v
      ```

    #### 4. Delete **products** index
    - ```
      DELETE /products
      ```

    #### 5. Create new **products** index
    - ```
      PUT /products
      ```

    #### 6. Create new **products** index with options
    - ```
      PUT /products
      {
        "settings": {
          "number_of_shards": 2,
          "number_of_replicas": 2
        }
      }
      ```
    #### 7. Insert new document with type is **_doc** to **products** index
    - ```
      POST /products/_doc 
      {
        "name": "Tea Maker",
        "price": 64,
        "in_stock": 10
      }
      ```

    #### 8. Get document with id = **100** in **products** index
    - ```
      GET /products/_doc/100
      ```

    #### 9. Replace document or insert **products** index
    - ```
      PUT /products/_doc/100 
      {
        "name": "Beer Maker",
        "price": 64,
        "in_stock": 10
      }
      ```

    #### 10. Update document
    - ```
      POST /products/_update/100 
      {
        "doc": {
          "in_stock": 9
        }
      }
      ```

    #### 11. Update document with script
    - ```
      POST /products/_update/100 
      {
        "script": {
          "source": "ctx._source.in_stock = 11"
        }
      }
      ```

    - ```
      POST /products/_update/100 
      {
        "script": {
          "source": "ctx._source.in_stock = params.quantity",
          "params": {
            "quantity": 0
          }
        }
      }
      ```

    - ```
      POST /products/_update/100 
      {
        "script": {
          "source": """
            if(ctx._source.in_stock == 0) {
              ctx.op ='noop';
            }
            
            ctx._source.in_stock--;
          """,
          "params": {
            "quantity": 4
          }
        }
      }
      ```

    - ```
      POST /products/_update/101
      {
        "script": {
          "source": "ctx._source.in_stock++"
        },
        "upsert": {
          "name": "Blender",
          "price": 399,
          "in_stock": 5
        }
      }
      ```

    #### 11. Delete document with id
    - ```
      DELETE /products/_doc/101
      ```

    #### 12. Optimistic concurrency control
    - **if_primary_term** : using today
    - **if_seq_no** : using today
    - **if_version**: traditional
    - ```
      POST /products/_update/101?if_primary_term=1&if_seq_no=1 
      {
        "doc": {
          "in_stock": 9
        }
      }
      ```

    #### 13. Search all
    - ```
      GET /products/_search
      ```
    - ```
      GET /products/_search
      {
        "query": {
          "match_all": {}
        }
      }
      ```
    #### 14. Update by query
    - ```
      POST /products/_update_by_query
      {
        "script": {
          "source": "ctx._source.in_stock++"
        },
        "query": {
          "match_all": {}
        }
      }
      ```

    #### 15. Update by query
    - ```
      POST /products/_delete_by_query
      {
        "query": {
          "match_all": {}
        }
      }
      ```

    #### 16. Using Bulk API
    - ```
      POST /_bulk
      { "index": { "_index": "products", "_id": 200 }}
      { "name": "Hai Nguyen", "price": 900}
      { "create": {"_index": "products", "_id": 201} }
      ```