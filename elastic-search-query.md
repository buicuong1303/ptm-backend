I. Query DSL
- https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html
- https://viblo.asia/p/23-cau-truy-van-huu-ich-trong-elasticsearch-phan-1-Ljy5VoMbKra
  
1. Create Demo Data:
  PUT /bookdb_index
  {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 2
    }
  }

  POST /_bulk
  { "index": { "_index": "bookdb_index", "_id": 1 } }
  { "title": "Elasticsearch: The Definitive Guide", "authors": ["clinton gormley", "zachary tong"], "summary": "A distibuted real-time search and analytics engine", "publish_date": "2015-02-07", "num_reviews": 20, "publisher": "oreilly" }
  { "index": { "_index": "bookdb_index", "_id": 2 } }
  { "title": "Taming Text: How to Find, Organize, and Manipulate It", "authors": ["grant ingersoll", "thomas morton", "drew farris"], "summary": "organize text using approaches such as full-text search, proper name recognition, clustering, tagging, information extraction, and summarization", "publish_date": "2013-01-24", "num_reviews": 12, "publisher": "manning" }
  { "index": { "_index": "bookdb_index", "_id": 3 } }
  { "title": "Elasticsearch in Action", "authors": ["radu gheorge", "matthew lee hinman", "roy russo"], "summary": "build scalable search applications using Elasticsearch without having to do complex low-level programming or understand advanced data science algorithms", "publish_date": "2015-12-03", "num_reviews": 18, "publisher": "manning" }
  { "index": { "_index": "bookdb_index", "_id": 4 } }
  { "title": "Solr in Action", "authors": ["trey grainger", "timothy potter"], "summary": "Comprehensive guide to implementing a scalable search engine using Apache Solr", "publish_date": "2014-04-05", "num_reviews": 23, "publisher": "manning" }

2. Query
- Basic Match Query:
  + Có hai cách để thực hiện full-text search (matching) cơ bản:
    * Search Lite API: tất cả các thông số tìm kiếm sẽ trở thành URL params.
    * Full JSON request body: sử dụng đầy đủ Elasticsearch DSL.

  + Example:
    * Truy vấn match cơ bản nhằm tìm kiếm một string guide trong tất cả các fields.
      - Search Lite API:
      GET /bookdb_index/_search?q=guide
      [Results]
      "hits": [
        {
          "_index": "bookdb_index",
          "_type": "book",
          "_id": "4",
          "_score": 1.3278645,
          "_source": {
            "title": "Solr in Action",
            "authors": [
              "trey grainger",
              "timothy potter"
            ],
            "summary": "Comprehensive guide to implementing a scalable search engine using Apache Solr",
            "publish_date": "2014-04-05",
            "num_reviews": 23,
            "publisher": "manning"
          }
        },
        {
          "_index": "bookdb_index",
          "_type": "book",
          "_id": "1",
          "_score": 1.2871116,
          "_source": {
            "title": "Elasticsearch: The Definitive Guide",
            "authors": [
              "clinton gormley",
              "zachary tong"
            ],
            "summary": "A distibuted real-time search and analytics engine",
            "publish_date": "2015-02-07",
            "num_reviews": 20,
            "publisher": "oreilly"
          }
        }
      ]

      - Full JSON request body:
      {
        "query": {
          "multi_match": { // thay thế  match để chỉ định dùng một truy vấn cho nhiều fields
            "query": "guide", // từ khóa dùng để truy vấn
            "fields": ["_all"] // danh sách các fields sẽ được truy vấn
          }
        }
      }

      POST /bookdb_index/_search
      {
        "query": {
          "match": {
            "title": "in action"
          }
        },
        "size": 2, // xác định trước số lượng kết quả muốn trả về
        "from": 0,
        "_source": [ "title", "summary", "publish_date" ], // xác định trước các fields muốn nhận
        "highlight": {
          "fields": {
            "title": {} // xác định các chuỗi có trong fields sẽ được highlight
          }
        }
      }
      [Results]
      "hits": {
        "total": 2,
        "max_score": 1.6323128,
        "hits": [
          {
            "_index": "bookdb_index",
            "_type": "book",
            "_id": "3",
            "_score": 1.6323128,
            "_source": {
              "summary": "build scalable search applications using Elasticsearch without having to do complex low-level programming or understand advanced data science algorithms",
              "title": "Elasticsearch in Action",
              "publish_date": "2015-12-03"
            },
            "highlight": {
              "title": [
                "Elasticsearch <em>in</em> <em>Action</em>"
              ]
            }
          },
          {
            "_index": "bookdb_index",
            "_type": "book",
            "_id": "4",
            "_score": 1.6323128,
            "_source": {
              "summary": "Comprehensive guide to implementing a scalable search engine using Apache Solr",
              "title": "Solr in Action",
              "publish_date": "2014-04-05"
            },
            "highlight": {
              "title": [
                "Solr <em>in</em> <em>Action</em>"
              ]
            }
          }
        ]

- Multi-field Search:
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "multi_match": {
          "query": "elasticsearch guide",
          "fields": ["title", "summary"]
        }
      }
    }

- Boosting
  + Tăng trọng số  cho fields: default = 1
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "multi_match": {
          "query": "elasticsearch guide",
          "fields": ["title", "summary^3"] // tăng trọng số  cho field summary lên gấp 3 lần
        }
      },
      "_source": ["title", "summary", "publish_date"]
    }
    [Results]
    "hits": {
      "total": 3,
      "max_score": 3.9835935,
      "hits": [
        {
          "_index": "bookdb_index",
          "_type": "book",
          "_id": "4",
          "_score": 3.9835935,
          "_source": {
            "summary": "Comprehensive guide to implementing a scalable search engine using Apache Solr",
            "title": "Solr in Action",
            "publish_date": "2014-04-05"
          }
        },
        {
          "_index": "bookdb_index",
          "_type": "book",
          "_id": "3",
          "_score": 3.1001682,
          "_source": {
            "summary": "build scalable search applications using Elasticsearch without having to do complex low-level programming or understand advanced data science algorithms",
            "title": "Elasticsearch in Action",
            "publish_date": "2015-12-03"
          }
        },
        {
          "_index": "bookdb_index",
          "_type": "book",
          "_id": "1",
          "_score": 2.0281231,
          "_source": {
            "summary": "A distibuted real-time search and analytics engine",
            "title": "Elasticsearch: The Definitive Guide",
            "publish_date": "2015-02-07"
          }
        }
      ]

- Bool Query
  + Toán tử  AND/ OR/ NOT có thể được sử dụng để tinh chỉnh các truy vấn tìm kiếm để kết quả có độ liên quan hoặc cụ thể  hơn.
  + Truy vấn bool có thể bao goomf:
    * must <=> AND
    * must_not <=> NOT
    * should <=> OR
  
  + Example
    * muốn tìm kiếm một cuốn sách có từ "Elasticsearch" HOẶC "Solr" trong tiêu đề ,
      và của tác giả của "clinton gormley" nhưng KHÔNG phải do tác giả "radu gheorge" viết:

      POST /bookdb_index/_search
      {
        "query": {
          "bool": {
            "must": {
              "bool": {
                "should": [
                  { "match": { "title": "Elasticsearch" }},
                  { "match": { "title": "Solr" }}
                ]
              }
            },
            "must": { "match": { "authors": "clinton gormely" }},
            "must_not": { "match": {"authors": "radu gheorge" }}
          }
        }
      }
      [Results]
      "hits": [
        {
          "_index": "bookdb_index",
          "_type": "book",
          "_id": "1",
          "_score": 2.0749094,
          "_source": {
            "title": "Elasticsearch: The Definitive Guide",
            "authors": [
              "clinton gormley",
              "zachary tong"
            ],
            "summary": "A distibuted real-time search and analytics engine",
            "publish_date": "2015-02-07",
            "num_reviews": 20,
            "publisher": "oreilly"
          }
        }
      ]
  
- Fuzzy Queries
  + Levenshtein: Khoảng cách Levenshtein thể hiện khoảng cách khác biệt giữa 2 chuỗi ký tự.
  + Khoảng cách Levenshtein giữa chuỗi S1 và chuỗi S2 là số bước ít nhất biến chuỗi S1 thành chuỗi S2 thông qua 3 phép biến đổi là:
    * Xoá 1 ký tự.
    * Thêm 1 ký tự.
    * Thay ký tự này bằng ký tự khác.
    * Example
      - Khoảng cách Levenshtein giữa 2 chuỗi "kitten" và "sitting" là 3, vì phải dùng ít nhất 3 lần biến đổi.
        + kitten -> sitten (thay "k" bằng "s").
        + sitten -> sittin (thay "e" bằng "i").
        + sittin -> sitting (thêm ký tự "g").

    * khoảng cách Levenshtein lớn nhất được chấp thuận là: 0, 1, 2.
      - AUTO: Sẽ tự động điều chỉnh kết quả dựa trên độ dài của term.
        + 0..2: bắt buộc match chính xác (khoảng cách Levenshtein lớn nhất là 0).
        + 3..5: khoảng cách Levenshtein lớn nhất là 1.
        + 5 trở lên: khoảng cách Levenshtein lớn nhất là 2.

    * Example
      POST /bookdb_index/_search
      {
        "query": {
          "multi_match": {
            "query": "comprihensiv guide",
            "fields": ["title", "summary"],
            "fuzziness": "AUTO"
          }
        },
        "_source": ["title", "summary", "publish_date"],
        "size": 4
      }
      [Results]
      "hits": [
        {
          "_index": "bookdb_index",
          "_type": "book",
          "_id": "4",
          "_score": 0.5961596,
          "_source": {
            "summary": "Comprehensive guide to implementing a scalable search engine using Apache Solr",
            "title": "Solr in Action",
            "publish_date": "2014-04-05"
          }
        }
      ]

- Wildcard Query
  + Wildcard cho phép bán truy vấn theo pattern thay vì phải match cả đoạn text.
    * Match bất cứ kí tự nào: ?
    * Match 0 hoặc nhiều kí tự: *

  * Example
    POST /bookdb_index/_search
    {
      "query": {
        "wildcard": {
          "authors": "t*"
        }
      },
      "_source": ["title", "authors"],
      "highlight": {
        "fields": {
          "authors": {}
        }
      }
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "1",
        "_score": 1,
        "_source": {
          "title": "Elasticsearch: The Definitive Guide",
          "authors": [
            "clinton gormley",
            "zachary tong"
          ]
        },
        "highlight": {
          "authors": [
            "zachary <em>tong</em>"
          ]
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "2",
        "_score": 1,
        "_source": {
          "title": "Taming Text: How to Find, Organize, and Manipulate It",
          "authors": [
            "grant ingersoll",
            "thomas morton",
            "drew farris"
          ]
        },
        "highlight": {
          "authors": [
            "<em>thomas</em> morton"
          ]
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "4",
        "_score": 1,
        "_source": {
          "title": "Solr in Action",
          "authors": [
            "trey grainger",
            "timothy potter"
          ]
        },
        "highlight": {
          "authors": [
            "<em>trey</em> grainger",
            "<em>timothy</em> potter"
          ]
        }
      }
    ]

- Regexp Query
  + Regexp cho phép tìm kiếm theo các pattern phức tạp hơn so với wildcard.
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "regexp": {
          "authors": "t[a-z]*y"
        }
      },
      "_source": ["title", "authors"],
      "highlight": {
        "fields": {
          "authors": {}
        }
      }
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "4",
        "_score": 1,
        "_source": {
          "title": "Solr in Action",
          "authors": [
            "trey grainger",
            "timothy potter"
          ]
        },
        "highlight": {
          "authors": [
            "<em>trey</em> grainger",
            "<em>timothy</em> potter"
          ]
        }
      }
    ]

- Match Phrase Query
  + Match phrase query yêu cầu tất cả các term trong query string phải xuất hiện trong document,
    theo đúng trật tự trong query string và phải nằm gần nhau.
  + Default thì các term phảm nằm chính xác cạnh nhau,
    tuy nhiên khoảng cách đó có thể thay đổi nếu ta thêm tham số  slop.

  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "multi_match": {
          "query": "search engine",
          "fields": ["title", "summary"],
          "type": "phrase",
          "slop": 3
        }
      },
      "_source": [ "title", "summary", "publish_date" ]
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "4",
        "_score": 0.22327082,
        "_source": {
          "summary": "Comprehensive guide to implementing a scalable search engine using Apache Solr",
          "title": "Solr in Action",
          "publish_date": "2014-04-05"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "1",
        "_score": 0.16113183,
        "_source": {
          "summary": "A distibuted real-time search and analytics engine",
          "title": "Elasticsearch: The Definitive Guide",
          "publish_date": "2015-02-07"
        }
      }
    ]

- Match Phrase Prefix
  + Match phrase prefix gần tương tự với match phrase query, chỉ khác là ta không cần type đủ nguyên query string,
    mà chỉ cần một phần và nó sẽ autocomplete query string vào thời điểm query time.
  + Nó cũng chấp nhận tham số  slop như match phrase query.

  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "match_phrase_prefix": {
          "summary": {
            "query": "search en",
            "slop": 3,
            "max_expansions": 10
          }
        }
      },
      "_source": [ "title", "summary", "publish_date" ]
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "4",
        "_score": 0.5161346,
        "_source": {
          "summary": "Comprehensive guide to implementing a scalable search engine using Apache Solr",
          "title": "Solr in Action",
          "publish_date": "2014-04-05"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "1",
        "_score": 0.37248808,
        "_source": {
          "summary": "A distibuted real-time search and analytics engine",
          "title": "Elasticsearch: The Definitive Guide",
          "publish_date": "2015-02-07"
        }
      }
    ]

- Range Query
  + Range Query cung cấp khả năng truy vẫn theo phạm vi
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "range": {
          "publish_date": {
            "gte": "2015-01-01",
            "lte": "2015-12-31"
          }
        }
      },
      "_source": ["title","publish_date","publisher"]
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "1",
        "_score": 1,
        "_source": {
          "publisher": "oreilly",
          "title": "Elasticsearch: The Definitive Guide",
          "publish_date": "2015-02-07"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "3",
        "_score": 1,
        "_source": {
          "publisher": "manning",
          "title": "Elasticsearch in Action",
          "publish_date": "2015-12-03"
        }
      }
    ]

- Query String
  + query_string cung cấp phương tiện thực hiện các truy vấn
    multi_match, bool, boosting, fuzzy matching, wildcards, regexp, và range queries
    bằng cú pháp viết tắt ngắn gọn

  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "query_string": {
          "query": "(saerch~1 algorithm~1) AND (grant ingersoll)  OR (tom morton)",
          "fields": ["title", "authors" , "summary^2"]
        }
      },
      "_source": [ "title", "summary", "authors" ],
      "highlight": {
        "fields": {
          "summary": {}
        }
      }
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "2",
        "_score": 3.571021,
        "_source": {
          "summary": "organize text using approaches such as full-text search, proper name recognition, clustering, tagging, information extraction, and summarization",
          "title": "Taming Text: How to Find, Organize, and Manipulate It",
          "authors": [
            "grant ingersoll",
            "thomas morton",
            "drew farris"
          ]
        },
        "highlight": {
          "summary": [
            "organize text using approaches such as full-text <em>search</em>, proper name recognition, clustering, tagging"
          ]
        }
      }
    ]

- Simple Query String
  + Là phiên bản của truy vấn query_string
  + Thay thế  AND/OR/NOT bằng +/|/-
  + loại bỏ các phần không hợp lệ của một truy vấn thay vì ném một ngoại lệ nếu người dùng mắc lỗi
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "simple_query_string": {
          "query": "(saerch~1 algorithm~1) + (grant ingersoll)  | (tom morton)",
          "fields": ["title", "authors" , "summary^2"]
        }
      },
      "_source": [ "title", "summary", "authors" ],
      "highlight": {
        "fields": {
          "summary": {}
        }
      }
    }
 
- Term/Terms Query
  + Truy vấn kết quả phù hợp chính xác theo một hoặc nhiều term.
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "term": {
          "publisher": "manning"
        }
      },
      "_source": ["title","publish_date","publisher"]
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "2",
        "_score": 1.2231436,
        "_source": {
          "publisher": "manning",
          "title": "Taming Text: How to Find, Organize, and Manipulate It",
          "publish_date": "2013-01-24"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "3",
        "_score": 1.2231436,
        "_source": {
          "publisher": "manning",
          "title": "Elasticsearch in Action",
          "publish_date": "2015-12-03"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "4",
        "_score": 1.2231436,
        "_source": {
          "publisher": "manning",
          "title": "Solr in Action",
          "publish_date": "2014-04-05"
        }
      }
    ]

    POST /bookdb_index/_search
    {
      "query": {
        "terms": {
          "publisher": ["oreilly", "packt"]
        }
      }
    }

- Term Query - Sorted
  + Cũng là truy vấn theo term, nhưng có thể  sort resource data
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "term": {
          "publisher": "manning"
        }
      },
      "_source": ["title","publish_date","publisher"],
      "sort": [
        { "publish_date": {"order":"desc"}}
      ]
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "3",
        "_score": null,
        "_source": {
          "publisher": "manning",
          "title": "Elasticsearch in Action",
          "publish_date": "2015-12-03"
        },
        "sort": [
          1449100800000
        ]
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "4",
        "_score": null,
        "_source": {
          "publisher": "manning",
          "title": "Solr in Action",
          "publish_date": "2014-04-05"
        },
        "sort": [
          1396656000000
        ]
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "2",
        "_score": null,
        "_source": {
          "publisher": "manning",
          "title": "Taming Text: How to Find, Organize, and Manipulate It",
          "publish_date": "2013-01-24"
        },
        "sort": [
          1358985600000
        ]
      }
    ]

- Filtered Bool Query
  + Lọc kết quả từ truy vấn bool
  + Nhiều bộ lọc có thể được kết hợp thông qua việc sử dụng bộ lọc bool
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "bool": {
          "must": {
            "multi_match": {
              "query": "elasticsearch",
              "fields": ["title","summary"]
            }
          },
          "filter": {
            "range": {
              "num_reviews": {
                "gte": 20
              }
            }
          }
        }
      },
      "_source": ["title","summary","publisher", "num_reviews"]
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "_doc",
        "_id": "1",
        "_score": 0.52354836,
        "_source": {
          "summary": "A distibuted real-time search and analytics engine",
          "publisher": "oreilly",
          "num_reviews": 20,
          "title": "Elasticsearch: The Definitive Guide"
        }
      }
    ]

    POST /bookdb_index/_search
    {
      "query": {
        "bool": {
          "must": {
            "multi_match": {
              "query": "elasticsearch",
              "fields": ["title","summary"]
            }
          },
          "filter": {
            "bool": {
              "must": {
                "range": { "num_reviews": { "gte": 10 } }
              },
              "must_not": {
                "range": { "publish_date": { "lte": "2015-01-31" } }
              },
              "should": {
                "term": { "publisher": "oreilly" }
              }
            }
          }
        }
      },
      "_source": ["title","summary","publisher", "num_reviews", "publish_date"]
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "_doc",
        "_id": "3",
        "_score": 0.87223125,
        "_source": {
          "summary": "build scalable search applications using Elasticsearch without having to do complex low-level programming or understand advanced data science algorithms",
          "publisher": "manning",
          "num_reviews": 18,
          "title": "Elasticsearch in Action",
          "publish_date": "2015-12-03"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "_doc",
        "_id": "1",
        "_score": 0.52354836,
        "_source": {
          "summary": "A distibuted real-time search and analytics engine",
          "publisher": "oreilly",
          "num_reviews": 20,
          "title": "Elasticsearch: The Definitive Guide",
          "publish_date": "2015-02-07"
        }
      }
    ] 

- Function Score: Field Value Factor
  + Sử  dụng giá trị cụ thể của một trường làm điều kiện tính điểm phù hợp
  + Function Score sẽ làm mất Levenshtein từ Fuzzy Queries
  + Để  tráng mất Levenshtein từ Fuzzy Queries ta cần tham khảo một số  thuộc tính
    “modifier”, “factor”, “boost_mode” - https://www.elastic.co/guide/en/elasticsearch/guide/current/boosting-by-popularity.html
  
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "function_score": {
          "query": {
            "multi_match": {
              "query": "search engine",
              "fields": ["title", "summary"]
            }
          },
          "field_value_factor": {
            "field": "num_reviews",
            "modifier": "log1p",
            "factor": 2
          }
        }
      },
      "_source": ["title", "summary", "publish_date", "num_reviews"]
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "1",
        "_score": 0.44831306,
        "_source": {
          "summary": "A distibuted real-time search and analytics engine",
          "num_reviews": 20,
          "title": "Elasticsearch: The Definitive Guide",
          "publish_date": "2015-02-07"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "4",
        "_score": 0.3718407,
        "_source": {
          "summary": "Comprehensive guide to implementing a scalable search engine using Apache Solr",
          "num_reviews": 23,
          "title": "Solr in Action",
          "publish_date": "2014-04-05"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "3",
        "_score": 0.046479136,
        "_source": {
          "summary": "build scalable search applications using Elasticsearch without having to do complex low-level programming or understand advanced data science algorithms",
          "num_reviews": 18,
          "title": "Elasticsearch in Action",
          "publish_date": "2015-12-03"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "2",
        "_score": 0.041432835,
        "_source": {
          "summary": "organize text using approaches such as full-text search, proper name recognition, clustering, tagging, information extraction, and summarization",
          "num_reviews": 12,
          "title": "Taming Text: How to Find, Organize, and Manipulate It",
          "publish_date": "2013-01-24"
        }
      }
    ]

- Function Score: Decay Functions
  + Thay vì muốn tăng dần theo giá trị của một trường, bạn có một giá trị lý tưởng mà bạn muốn nhắm mục tiêu
    và bạn muốn hệ số tăng giảm dần khi bạn di chuyển càng xa giá trị.
  
  + Example
    POST /bookdb_index/_search
    {
      "query": {
        "function_score": {
          "query": {
            "multi_match": {
              "query": "search engine",
              "fields": ["title", "summary"]
            }
          },
          "functions": [
            {
              "exp": {
                "publish_date": {
                  "origin": "2014-06-15",
                  "offset": "7d",
                  "scale": "30d"
                }
              }
            }
          ],
          "boost_mode": "replace"
        }
      },
      "_source": ["title", "summary", "publish_date", "num_reviews"]
    }
    [Results]
    "hits": [
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "4",
        "_score": 0.27420625,
        "_source": {
          "summary": "Comprehensive guide to implementing a scalable search engine using Apache Solr",
          "num_reviews": 23,
          "title": "Solr in Action",
          "publish_date": "2014-04-05"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "1",
        "_score": 0.005920768,
        "_source": {
          "summary": "A distibuted real-time search and analytics engine",
          "num_reviews": 20,
          "title": "Elasticsearch: The Definitive Guide",
          "publish_date": "2015-02-07"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "2",
        "_score": 0.000011564,
        "_source": {
          "summary": "organize text using approaches such as full-text search, proper name recognition, clustering, tagging, information extraction, and summarization",
          "num_reviews": 12,
          "title": "Taming Text: How to Find, Organize, and Manipulate It",
          "publish_date": "2013-01-24"
        }
      },
      {
        "_index": "bookdb_index",
        "_type": "book",
        "_id": "3",
        "_score": 0.0000059171475,
        "_source": {
          "summary": "build scalable search applications using Elasticsearch without having to do complex low-level programming or understand advanced data science algorithms",
          "num_reviews": 18,
          "title": "Elasticsearch in Action",
          "publish_date": "2015-12-03"
        }
      }
    ]














































































































- Function Score: Script Scoring
  + Sử  dụng script custom để  tính toán điểm đánh giá
