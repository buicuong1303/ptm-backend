https://www.elastic.co/guide/en/elasticsearch/reference/7.3/rest-apis.html
https://www.elastic.co/guide/en/elasticsearch/reference/7.3/docs.html

// 1. Check **cluster** health
    GET /_cluster/health;

    // !--- --- --- response --- --- ---!
    {
      "cluster_name" : "php_text_message-es-cluster",
      "status" : "yellow",
      "timed_out" : false,
      "number_of_nodes" : 1,
      "number_of_data_nodes" : 1,
      "active_primary_shards" : 5,
      "active_shards" : 5,
      "relocating_shards" : 0,
      "initializing_shards" : 0,
      "unassigned_shards" : 5,
      "delayed_unassigned_shards" : 0,
      "number_of_pending_tasks" : 0,
      "number_of_in_flight_fetch" : 0,
      "task_max_waiting_in_queue_millis" : 0,
      "active_shards_percent_as_number" : 50.0
    }


// 2. Check **nodes** information
    GET /_cat/nodes/?v

    // !--- --- --- response --- --- ---!
    // ip         heap.percent ram.percent cpu load_1m load_5m load_15m node.role master name
    // 172.18.0.6           30          89   8    0.73    0.78     0.82 dim       *      php_text_message-es-master


// 3. Check every **index** information
    GET /_cat/indices/?v

    // !--- --- --- response --- --- ---!
    // health status index                uuid                   pri rep docs.count docs.deleted store.size pri.store.size
    // green  open   .kibana_task_manager MS0w47x3Th645vY3y85zfA   1   0          2            0     29.5kb         29.5kb
    // yellow open   product              peSHnmo4SeKnY10L_QZbyA   2   2          0            0       566b           566b
    // green  open   .kibana_1            YeedB5h3QNC76A0vJuBVbw   1   0          4            1     24.1kb         24.1kb
    // yellow open   user                 LHFsDzwYRhG-Z40Arpri-Q   1   1          7            0     39.3kb         39.3kb


// 4. Delete **users** index
    DELETE /users

    // !--- --- --- response --- --- ---!
    {
      "acknowledged" : true
    }


// 5. Create new **users** index
    PUT /users

    // !--- --- --- response --- --- ---!
    {
      "acknowledged" : true,
      "shards_acknowledged" : true,
      "index" : "users"
    }


// 6. Create new **users** index with options
    PUT /users
    {
      "settings": {
        "number_of_shards": 2,
        "number_of_replicas": 2
      }
    }

    // !--- --- --- response --- --- ---!
    {
      "acknowledged" : true,
      "shards_acknowledged" : true,
      "index" : "users"
    }


// 7. Insert new document with type is **_doc** to **users** index
    POST /users/_doc/1
    {
      "name": "Brandon Nguyen",
      "birth": 1996,
      "address": "An Giang"
    }

    // !--- --- --- response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "1",
      "_version" : 1,
      "result" : "created",
      "_shards" : {
        "total" : 3,
        "successful" : 1,
        "failed" : 0
      },
      "_seq_no" : 0,
      "_primary_term" : 1
    }


// 8. Get document with id = **100** in **users** index
    GET /users/_doc/1

    // !--- --- --- response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "1",
      "_version" : 1,
      "_seq_no" : 0,
      "_primary_term" : 1,
      "found" : true,
      "_source" : {
        "name" : "Brandon Nguyen",
        "birth" : 1996,
        "address" : "An Giang"
      }
    }


// 9. Replace document or insert **users** index
    PUT /users/_doc/1
    {
      "name": "Thiet Nguyen",
      "birth": 1996,
      "address": "An Giang"
    }

    // !--- --- --- response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "1",
      "_version" : 2,
      "result" : "updated",
      "_shards" : {
        "total" : 3,
        "successful" : 1,
        "failed" : 0
      },
      "_seq_no" : 1,
      "_primary_term" : 1
    }

    // !--- --- --- or response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "1",
      "_version" : 1,
      "result" : "created",
      "_shards" : {
        "total" : 3,
        "successful" : 1,
        "failed" : 0
      },
      "_seq_no" : 2,
      "_primary_term" : 1
    }


// 10. Update document
    POST /users/_update/1 
    {
      "doc": {
        "name": "Brandon Nguyen"
      }
    }

    // !--- --- --- response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "1",
      "_version" : 3,
      "result" : "updated",
      "_shards" : {
        "total" : 3,
        "successful" : 1,
        "failed" : 0
      },
      "_seq_no" : 3,
      "_primary_term" : 1
    }


// 11. Update document with script
    POST /users/_update/1
    {
      "script": {
        "source": "ctx._source.name = 'Thiet Nguyen'"
      }
    }

    // !--- --- --- response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "1",
      "_version" : 4,
      "_seq_no" : 4,
      "_primary_term" : 1,
      "found" : true,
      "_source" : {
        "name" : "Thiet Nguyen",
        "birth" : 1996,
        "address" : "An Giang"
      }
    }


    POST /users/_update/1
    {
      "script": {
        "source": "ctx._source.name = params.name",
        "params": {
          "name": "Long Nguyen"
        }
      }
    }

    // !--- --- --- response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "1",
      "_version" : 5,
      "result" : "updated",
      "_shards" : {
        "total" : 3,
        "successful" : 1,
        "failed" : 0
      },
      "_seq_no" : 5,
      "_primary_term" : 1
    }


    POST /users/_update/1
    {
      "script": {
        "source": """
          if (ctx._source.name == params.name) {
            ctx.op ='noop';
          }
          
          ctx._source.name = params.name;
        """,
        "params": {
          "name": "Brandon Nguyen"
        }
      }
    }

    // !--- --- --- response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "1",
      "_version" : 6,
      "result" : "updated",
      "_shards" : {
        "total" : 3,
        "successful" : 1,
        "failed" : 0
      },
      "_seq_no" : 6,
      "_primary_term" : 1
    }


    POST /users/_update/3
    {
      "script": {
        "source": "ctx._source.name = 'User Update'"
      },
      "upsert": {
        "name": "User Create",
        "birth": 1996,
        "address": "An Giang"
      }
    }

    // !--- --- --- response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "3",
      "_version" : 1,
      "result" : "created",
      "_shards" : {
        "total" : 3,
        "successful" : 1,
        "failed" : 0
      },
      "_seq_no" : 20,
      "_primary_term" : 1
    }

    // !--- --- --- or response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "3",
      "_version" : 2,
      "result" : "updated",
      "_shards" : {
        "total" : 3,
        "successful" : 1,
        "failed" : 0
      },
      "_seq_no" : 21,
      "_primary_term" : 1
    }


11. Delete document with id
    DELETE /users/_doc/3

    // !--- --- --- response --- --- ---!
    {
      "_index" : "users",
      "_type" : "_doc",
      "_id" : "3",
      "_version" : 3,
      "result" : "deleted",
      "_shards" : {
        "total" : 3,
        "successful" : 1,
        "failed" : 0
      },
      "_seq_no" : 22,
      "_primary_term" : 1
    }


// 12. Optimistic concurrency control
//   - **if_primary_term** : Số  hạng chính của document (Có thể  bị thay đổi khi thực hiện request api update)
//   - **if_seq_no** : Số  hiệu của document (cộng thêm 1 khi thực hiện request api update)
//   - **if_version**: Phiên bản của document (cộng thêm 1 khi thực hiện request api update)
//   => Kết hợp 3 thông số  trên để  xác định một thay đổi dữ liệu duy nhất của document

//   => Sử dụng if_primary_term + if_seq_no trong request để  đảm bảo không ghi đè lên dữ liệu mới đã được cập nhật trước đó từ nguồn khác
    POST /users/_update/1?if_primary_term=1&if_seq_no=1
    {
      "doc": {
        "name": "Optimistic concurrency control"
      }
    }

    // !--- --- --- response error--- --- ---! vì /users/_doc/1 đang có "_primary_term":1 và "_seq_no":25
    {
      "error": {
        "root_cause": [
          {
            "type": "version_conflict_engine_exception",
            "reason": "[1]: version conflict, required seqNo [1], primary term [1]. current document has seqNo [24] and primary term [1]",
            "index_uuid": "sLZskSJ2Rk-xx-XKT1CAhg",
            "shard": "0",
            "index": "users"
          }
        ],
        "type": "version_conflict_engine_exception",
        "reason": "[1]: version conflict, required seqNo [1], primary term [1]. current document has seqNo [24] and primary term [1]",
        "index_uuid": "sLZskSJ2Rk-xx-XKT1CAhg",
        "shard": "0",
        "index": "users"
      },
      "status": 409
    }


// 13. Search all
    GET /products/_search

    GET /products/_search
    {
      "query": {
        "match_all": {}
      }
    }

    // !--- --- --- response --- --- ---!
    {
      "took" : 0,
      "timed_out" : false,
      "_shards" : {
        "total" : 2,
        "successful" : 2,
        "skipped" : 0,
        "failed" : 0
      },
      "hits" : {
        "total" : {
          "value" : 2,
          "relation" : "eq"
        },
        "max_score" : 1.0,
        "hits" : [
          {
            "_index" : "users",
            "_type" : "_doc",
            "_id" : "2",
            "_score" : 1.0,
            "_source" : {
              "name" : "Long Nguyen",
              "birth" : 1996,
              "address" : "An Giang"
            }
          },
          {
            "_index" : "users",
            "_type" : "_doc",
            "_id" : "1",
            "_score" : 1.0,
            "_source" : {
              "name" : "Optimistic concurrency control",
              "birth" : 1996,
              "address" : "An Giang"
            }
          }
        ]
      }
    }

  
// 14. Update by query
    POST /users/_update_by_query
    {
      "script": {
        "source": "ctx._source.name = 'Update by query'"
      },
      "query": {
        "match_all": {}
      }
    }

    // !--- --- --- response --- --- ---!
    {
      "took" : 125,
      "timed_out" : false,
      "total" : 2,
      "updated" : 2,
      "deleted" : 0,
      "batches" : 1,
      "version_conflicts" : 0,
      "noops" : 0,
      "retries" : {
        "bulk" : 0,
        "search" : 0
      },
      "throttled_millis" : 0,
      "requests_per_second" : -1.0,
      "throttled_until_millis" : 0,
      "failures" : [ ]
    }


// 15. Delete by query
    POST /users/_delete_by_query
    {
      "query": {
        "match_all": {}
      }
    }

    // !--- --- --- response --- --- ---!
    {
      "took" : 68,
      "timed_out" : false,
      "total" : 2,
      "deleted" : 2,
      "batches" : 1,
      "version_conflicts" : 0,
      "noops" : 0,
      "retries" : {
        "bulk" : 0,
        "search" : 0
      },
      "throttled_millis" : 0,
      "requests_per_second" : -1.0,
      "throttled_until_millis" : 0,
      "failures" : [ ]
    }


// 16. Using Bulk API
    POST /_bulk
    { "index": { "_index": "users", "_id": 200 }}
    { "name": "B Nguyen", "birth": 1998, "address": "Dong Thap"}
    { "create": {"_index": "users", "_id": 202} }
    { "name": "D Nguyen", "birth": 1998, "address": "Dong Thap"}

    // !--- --- --- response --- --- ---!
    {
      "took" : 45,
      "errors" : false,
      "items" : [
        {
          "index" : {
            "_index" : "users",
            "_type" : "_doc",
            "_id" : "200",
            "_version" : 1,
            "result" : "created",
            "_shards" : {
              "total" : 3,
              "successful" : 1,
              "failed" : 0
            },
            "_seq_no" : 0,
            "_primary_term" : 1,
            "status" : 201
          }
        },
        {
          "create" : {
            "_index" : "users",
            "_type" : "_doc",
            "_id" : "202",
            "_version" : 1,
            "result" : "created",
            "_shards" : {
              "total" : 3,
              "successful" : 1,
              "failed" : 0
            },
            "_seq_no" : 1,
            "_primary_term" : 1,
            "status" : 201
          }
        }
      ]
    }