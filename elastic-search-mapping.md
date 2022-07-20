I. Mapping Document - https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html
  - Mapping là quá trình xác định cách một document và các fields của nó được lưu trữ và lập chỉ mục.
  - Mỗi document là một tập hợp các fields, mỗi field có kiểu dữ liệu riêng.
    Khi mapping dữ liệu ta cần tạo một định nghĩa mapping chứa danh sách các fields liên quan đến document.
  - Có 2 phương pháp mapping là Dynamic Mapping và Explicit Mapping.
  
  1. Dynamic Mapping
    - Dynamic mapping giúp thử nghiệm và khám phá dữ liệu khi ta chỉ mới bắt đầu.
    - Khi Elasticsearch phát hiện một fields mới trong tài liệu, nó sẽ tự động thêm fields vào ánh xạ type theo mặc định.
      Tham số dynamic: [true, runtime, false, strict] kiểm soát hành vi này.
      + EX:
        PUT users
        {
          "mappings": {
            "dynamic": false,
            "properties": {
              "user": { 
                "properties": {
                  "name": {
                    "dynamic": true,
                    "type": "object",
                    "properties": {}
                  },
                  "social_networks": {
                    "type": "object",
                    "properties": {}
                  }
                }
              }
            }
          }
        }

    - Sử dụng Dynamic Templates để xác định mapping tùy chỉnh áp dụng cho các fields được thêm động dựa trên điều kiện đối sánh.
      + match_mapping_type hoạt động trên loại dữ liệu mà Elasticsearch phát hiện.
      + match và unmatch sử dụng một mẫu để khớp trên field name.
      + path_match và path_unmatch hoạt động trên đường dẫn đầy đủ có dấu chấm đến field.
      + Nếu một mẫu động không xác định match_mapping_type, match hoặc path_match, nó sẽ không phù hợp với bất kỳ field nào.
      + Template:
        "dynamic_templates": [
          {
            "my_template_name": { // Tên mẫu có thể là bất kỳ giá trị chuỗi nào.
              ... match conditions ... // Các điều kiện phù hợp có thể bao gồm bất kỳ [match_mapping_type, match, match_pattern, unmatch, path_match, path_unmatch]
              "mapping": { ... } // Ánh xạ mà fields phù hợp sẽ sử dụng.
            }
          },
          ...
        ]
      + Example:
        PUT users
        {
          "mappings": {
            "dynamic_templates": [
              {
                "longs_as_strings": {
                  "match_mapping_type": "string", // Lấy tất cả các fields có kiểu dữ liệu "string"
                  "match":   "long_*", // Tên bắt đầu bằng "long_"
                  "unmatch": "*_text", // Tên kết thúc khác "_text"
                  "mapping": {
                    "type": "long" // Chuyển sang kiểu dữ liệu "long"
                  }
                }
              }
            ]
          }
        }

        PUT users
        {
          "mappings": {
            "dynamic_templates": [
              {
                "full_name": {
                  "path_match":   "name.*", // Lấy giá trị của tất cả các fields trong đối tượng "name"
                  "path_unmatch": "*.middle", // Ngoại trừ filed "middle"
                  "mapping": {
                    "type":       "text", // Chuyển sang kiểu dữ liệu "text"
                    "copy_to":    "full_name" // Coppy vào field "full_name"
                  }
                }
              }
            ]
          }
        }

  2. Explicit Mapping
    - Tuy Dynamic mapping hữu ích khi bát đầu nhưng đôi khi chúng ta cần chỉ đỉnh những explicit mappings của riêng mình
    - Có 2 chánh tạo explicit mapping:
      + field mappings when Create an index.
      + Add fields to an existing index.

    a. Create an index with an explicit mapping
    - Sử dụng API tạo chỉ mục để tạo chỉ mục mới với explicit mapping.
    PUT /users
    {
      "mappings": {
        "properties": {
          "age":    { "type": "integer" },  
          "email":  { "type": "keyword" }, 
          "name":   { "type": "text" }     
        }
      }
    }

    b. Add a field to an existing mapping
    - Sử dụng API update mapping để thêm một hoặc nhiều fields mới vào chỉ mục hiện có.
    PUT /users/_mapping
    {
      "properties": {
        "employee-id": {
          "type": "keyword",
          "index": false
        }
      }
    }

II. Mapping Parameters - https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-params.html
  * Data
    messages = [
      {
        id: string,
        text: string,
        attachments: [
          {
            name: string,
            url: string
          }
        ],
        creationTime: timestamp,
        conversation: {
          id: string,
          participant: [
            {
              id: string,
              user: {
                id: string,
                name: string,
                avatar: string
              }
            }
          ],
          lastUser: {
            id: string,
            name: string,
            avatar: string
          },
          customer: {
            id: string,
            phoneNumber: string
            companyCustomer: {
              id: string,
              companyName: string,
              optStatus: string
            }
          }
        }
      }
    ]

  * Mapping Example
  {
    "settings":{
      "analysis":{
         "analyzer":{
            "my_analyzer":{ 
               "type":"custom",
               "tokenizer":"standard",
               "filter":[
                  "lowercase"
               ]
            },
            "my_stop_analyzer":{ 
               "type":"custom",
               "tokenizer":"standard",
               "filter":[
                  "lowercase",
                  "english_stop"
               ]
            }
         },
         "filter":{
            "english_stop":{
               "type":"stop",
               "stopwords":"_english_"
            }
         }
      }
    },
    "mappings": {
      "properties": {
        "property_name": { 
          "type": "text", // Kiểu dữ liệu.
          "null_value": "NULL", // Thay giá trị null  với giá trị nhất định để  nó có thể được lập chỉ mục và tìm kiếm.
          "boost": 2 // Thiết lặp trọng số trường (mặc định là 1).
          "dynamic": true, // Quyết định xem khi thêm property mới vào chỉ mục, có tự động thêm property đó vào mapping không (default từ cha).
          "format": "yyyy-MM-dd", // Quy định format dữ liệu (hữu dụng với ngày giờ).
          "fields": { // Đây là mục đích của đa trường từ một property.
            "english": { 
              "type":     "text",
              "analyzer": "english"
            },
            "vietnam": { 
              "type":     "text",
              "analyzer": "vietnam"
            }
          },
          "fields": {
            "raw": { 
              "type":  "keyword"
            }
          }
          "properties": { // Ánh xạ cho cá property con của property hiện tại (kiểu object và kiểu nested).
            "age":  { "type": "integer" },
            "name": { "type": "text"  }
          },
          --"copy_to": "property_name_other", // Copy dữ liệu sang một property khác (không làm thay đổi _source).
          --"analyzer": "my_analyzer", // Chỉ định bộ phân tích sẽ được sử dụng tại thời điểm lập chỉ mục (phù hợp trong phần settings).
          --"search_analyzer": "my_stop_analyzer", // Chỉ định bộ phân tích sẽ được sử dụng tại thời điểm truy vấn (phù hợp trong phần settings).
          --"search_quote_analyzer": "my_analyzer", // Chỉ định một máy phân tích cho các cụm từ (phù hợp trong phần settings).
          --"coerce": false, // Có cố gắng làm sạch các giá trị bẩn để phù hợp với kiểu dữ liệu của property hay không ?  (default từ cha).
          --"doc_values": true, // Hỗ trợ truy xuất tài liệu để tìm thuật ngữ (mặc đinh true).
          --"eager_global_ordinals": false,
          --"enabled": false, // Quyết định xem property có được lập chỉ mục không (default true).
          --"ignore_above": 20, // Quy định độ dài tối đa của chuỗi (đếm bằng byte) mà property có thể  được lập chỉ mục. 
          --"ignore_malformed": true, // Quyết định xem có bỏ qua việc ném ngoại lệ khi dữ liệu đầu vào sai kiểu không ?
          --"index": true, // Quyết định xem property có được lập chỉ mục không (không lặp chỉ mục sẽ không thể truy vấn)
          --"index_options": "offsets", // Điều khiển tham số những thông tin nào sẽ được thêm vào chỉ số đảo ngược để tìm kiếm và mục đích làm nổi bật.
          --"index_phrases": true, // Các tổ  hợp từ gồm hai từ ( bệnh zona ) sẽ được lập chỉ mục vào một trường riêng biệt
          --"index_prefixes": "max_chars", // Các index_prefixes tham số cho phép việc lập chỉ mục các tiền tố hạn để tăng tốc độ tìm kiếm tiền tố
          --"unit": "ms",
          --"normalizer": "my_normalizer", //
          --"norms": false, // Định mức lưu trữ các yếu tố chuẩn hóa khác nhau, sử dụng tại thời điểm truy vấn để  tính điểm.
          --"position_increment_gap": 0, // Tạo khoản cách giả giữa các giá trị bên trong một trường có nhiều giá trị tránh trùng khớp cụm từ khi truy vấn.
          --"similarity": "boolean", // Cho phép định cấu hình thuật toán tính điểm hoặc độ tương tự cho mỗi trường.
          --"store" : true, // Không quan trọng.
          --term_vector: "with_positions_offsets", // Term vectors chứa thông tin về các term được tạo ra bởi quá trình phân tích
        }
      }
    }
  }

  * Mapping Setup
  {
    "mappings": {
      "properties": {
        "id": { 
          "type": "text",
          "index": false
        },
        "text": { 
          "type": "text",
          "fields": {
            "english": { 
              "type":     "text",
              "analyzer": "english"
            },
            "vietnam": { 
              "type":     "text",
              "analyzer": "vietnam"
            }
          }
        }
      }
    }
  }
  
  1. Analyzer
    - Tham số  analyzer chỉ định bộ phân tích được sử dụng để phân tích văn bản khi lập chỉ mục hoặc tìm kiếm fields văn bản.
    - Chỉ hỗ trợ các fields có type là text.
    - Nếu không được ghi đè bằng search_analyzer thì analyzer sẽ được sử dụng luôn cho phần search.
    - Các thiết lập analyzer có thể không được cập nhật trên các fields đang tồn tại bằng cách sử dụng "update mapping API".
    - Cài đặt search_quote_analyzer cho phép chỉ định một trình phân tích cho các cụm từ, hữu ích khi xử lý truy vấn các cụm từ viết tắt.
    - Để tắt các "stop words - https://www.ranks.nl/stopwords" cho các cụm từ, một fields sử dụng ba cài đặt máy phân tích sẽ được yêu cầu:
      + Cài đặt analyzer để lập chỉ mục tất cả các thuật ngữ bao gồm cả các stop words.
      + Cài đặt search_analyzer cho các truy vấn không phải cụm từ sẽ loại bỏ các stop words.
      + Cài đặt search_quote_analyzer cho các truy vấn cụm từ sẽ không loại bỏ các stop words.

      PUT users
      {
        "settings":{
          "analysis":{
            "analyzer":{
              "my_analyzer":{ // Phân tích tokens tất cả các terms bao gồm các stop words 
                "type":"custom",
                "tokenizer":"standard",
                "filter":[
                  "lowercase"
                ]
              },
              "my_stop_analyzer":{ // Phân tích loại bỏ các stop words
                "type":"custom",
                "tokenizer":"standard",
                "filter":[
                  "lowercase",
                  "english_stop"
                ]
              }
            },
            "filter":{
              "english_stop":{
                "type":"stop",
                "stopwords":"_english_"
              }
            }
          }
        },
        "mappings":{
          "properties":{
            "title": {
              "type":"text",
              "analyzer":"my_analyzer", // Chỉ định my_analyzer sẽ được sử dụng tại thời điểm lập chỉ mục
              "search_analyzer":"my_stop_analyzer", // Trỏ đến my_stop_analyzer và xóa các stop words cho các truy vấn không phải cụm từ (các truy vấn không để trong "")
              "search_quote_analyzer":"my_analyzer" // Trỏ đến trình phân tích my_analyzer và đảm bảo rằng các stop words không bị xóa khỏi các truy vấn cụm từ
            }
          }
        }
      }

      PUT users/_doc/1
      {
        "title":"The Quick Brown Fox"
      }

      PUT users/_doc/2
      {
        "title":"A Quick Brown Fox"
      }

      GET users/_search
      {
        "query":{
            "query_string":{
              "query":"\"the quick brown fox\"" 
            }
        }
      }

  2. Boost
    - Tăng trọng số cho fields nhưng chỉ được áp dụng cho các truy vấn thuật ngữ (tiền tố, phạm vi và các truy vấn mờ không được tăng cường ).

  3. Coerce
    - Coerce cố gắng làm sạch các giá trị bẩn để phù hợp với kiểu dữ liệu của một fields
    - Các giá trị thiết lập coerce có thể được cập nhật trên các fields đang tồn tại bằng cách sử dụng "update mapping API".
    - Example:
      + Các chuỗi sẽ được ép buộc thành số.
      + Các dấu chấm động sẽ bị cắt bớt đối với các giá trị nguyên.
      
      PUT numbers
      {
        "settings": {
          "index.mapping.coerce": false
        },
        "mappings": {
          "properties": {
            "number_one": {
              "type": "integer",
              "coerce": true
            },
            "number_two": {
              "type": "integer"
            }
          }
        }
      }

      PUT my-index-000001/_doc/1
      { "number_one": "10" } // PUT success

      PUT my-index-000001/_doc/2
      { "number_two": "10" } // PUT failure vì coerce không được bật
  
  4. Copy_to
    - Copy_to cho phép sao chép các giá trị của nhiều fields vào một nhóm fields, và sau đó có thể được truy vấn như một fields duy nhất.
    - Nếu cần thường tìm kiếm trên nhiều fields, có thể  cải thiện tốc độ tìm kiếm bằng cách sử dụng copy_to để tìm kiếm ít fields hơn.
    * Note:
      + Đây là giá trị fields được sao chép.
      + Fields gốc _source sẽ không được sửa đổi để hiển thị các giá trị đã sao chép.
      + Có thể sao chép cùng một giá trị sang nhiều fields, với "copy_to": ["field_1", "field_2"].
      + Không thể sao chép đệ quy thông qua các fields trung gian.

  5. Doc_values

  6. Dynamic
    - Khi lập chỉ mục tài liệu có chứa fields mới, Elasticsearch sẽ tự động thêm fields vào tài liệu hoặc vào các đối tượng bên trong tài liệu.
    - Các Inner objects kế thừa dynamic setting từ đối tượng mẹ của chúng hoặc từ kiểu mapping.

  7.  Eager_global_ordinals

  8.  Enabled
    - Enabled dùng để chỉ định bỏ qua phân tích dữ liệu hay truy vấn, nhưng vẫn được lưu và truy xuất qua field _source.
    - Enabled setting chỉ có thể  áp dụng cho định nghĩa top-level mapping và cho các object fields.
    - Không thể cập nhật Enabled setting cho các fields hiện có và top-level mapping.
    - Tài liệu được thêm thành công, ngay cả khi field chứa dữ liệu không phải object.

  9.  Format
    - Format giúp thiết lặp định dạng dữ liệu (chủ yếu là ngày giờ).

  10.  Ignore_above
    - Các chuỗi dài hơn ignore_above setup sẽ không được lập chỉ mục hoặc lưu trữ. 
      Đối với mảng chuỗi, ignore_above sẽ được áp dụng cho từng phần tử mảng riêng biệt và các phần tử chuỗi dài hơn ignore_above
      sẽ không được lập chỉ mục hoặc lưu trữ.

  11.  Ignore_malformed
    - Ignore_malformed được đặt thành true để  ngăn hệ thống ném ngoại lệ khi cố  gắ n lặp chỉ mục cho một fields với dữ liệu sai.
    - không thể sử dụng ignore_malformed với các loại dữ liệu sau:
      + Nested data type
      + Object data type
      + Range data types
    - Nếu bạn một đối tượng JSON đến một fields không được hỗ trợ, 
      Elasticsearch sẽ trả về lỗi và từ chối toàn bộ tài liệu bất kể ignore_malformed cài đặt là gì.

  12.  index
    - Index để  xác định xem các fields có được lập chỉ mục hay không. Nó chấp nhận true hoặc false và mặc định là true.
      Các fields không được lập chỉ mục không thể truy vấn.

  13.  index_options
  
  14.  index_phrases
  
  15.  index_prefixes
  
  16.  meta
  
  17.  fields
  
  18.  normalizer
  
  19.  norms
  
  20.  null_value
  
  21.  position_increment_gap
  
  22.  properties
  
  23.  search_analyzer
    - Thông thường, cùng một analyzer nên được áp dụng tại thời điểm lập chỉ mục và tại thời điểm tìm kiếm.
    - Search_analyzer dùng để ghi đè analyzer trong các trường hợp cần thiết khi tìm kiếm.

  24.  similarity
    - Các similarity setup cung cấp một cách đơn giản để lựa chọn một thuật toán tương tự khác với mặc định BM25, chẳng hạn như TF/IDF.

  25.  store
  
  26.  term_vector

III. Analyzer - https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-overview.html#analysis-customization
  1. Tổng Quan 
    - Phân tích văn bản cho phép Elasticsearch thực hiện tìm kiếm toàn văn bản,
      nơi tìm kiếm trả về tất cả các kết quả có liên quan thay vì chỉ các kết quả phù hợp chính xác.
  
  2. Mã Hóa (Tokenization)
    - mã hóa là chia văn bản thành các phần nhỏ hơn, được gọi là  mã thông báo.
      Trong hầu hết các trường hợp, các mã thông báo này là các từ riêng lẻ.
  
  3. Chuẩn Hóa (Normalization)
    - Làm cho các từ tìm kiếm không khớp hoàn toàn với các mã thông báo nhưng vẫn đủ tương tự để có liên quan
  
  4. Tùy chỉnh phân tích văn bản (Customize text analysis)
    - Phân tích văn bản được thực hiện bởi một bộ phân tích, một tập hợp các quy tắc chi phối toàn bộ quy trình.
    - Elasticsearch bao gồm một bộ phân tích mặc định, được gọi là bộ phân tích tiêu chuẩn (standard analyzer),
      ngoài ra có thể  tích hợp một bộ phân tích sẳn có hoặc tự tự cấu hình một bộ phân tích tùy chỉnh.
  
  5. Cấu trúc một bộ phân tích (Analyzer)
    - Bộ lọc ký tự (Character filters)
      + Transform văn bản đầu vào thành dữ liệu mong muốn.
      + Một bộ phân tích có thể có nhiều bộ lọc ký tự, được áp dụng theo thứ tự.

    - Máy Phân tích (Tokenizer)
      + Chia văn bản thành các mã thông báo riêng lex (thường là các từ riêng lẽ) theo ký tự như: khoản trắng, dấu phẩy, dấu chấm,...
      + Tokenizer cũng có trách nhiệm ghi lại thứ tự hoặc vị trí của từng thuật ngữ và các ký tự bắt đầu và kết thúc của từ gốc mà thuật ngữ đó đại diện.
      + Một bộ phân tích có đúng một Tokenizer

    - Bộ lọc mã thông báo (Token filters)
      + Thêm, sửa, xóa mã thông báo: lowercase, stop (loại bỏ các stop words), synonym (thêm từ đòng nghĩa).
      + Bộ lọc mã thông báo không được phép thay đổi vị trí hoặc độ lệch ký tự của mỗi mã thông báo.
      + Một bộ phân tích có thể có không hoặc nhiều bộ lọc mã thông báo, được áp dụng theo thứ tự.

    - Create a custom analyzer
      + Configuration
        * type: Loại máy phân tích.
        * tokenizer: Một tokenizer tích hợp hoặc tùy chỉnh. (Required)
        * char_filter: Một mảng tùy chọn của các bộ lọc ký tự được tích hợp sẵn hoặc tùy chỉnh.
        * filter: Một mảng tùy chọn gồm các bộ lọc mã thông báo được tích hợp sẵn hoặc tùy chỉnh.
        * position_increment_gap: khoảng cách giả giữa thuật ngữ cuối cùng của một giá trị và thuật ngữ đầu tiên của giá trị tiếp theo.

      + Example - https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-custom-analyzer.html
        PUT my-index-000001
        {
          "settings": {
            "analysis": {
              "analyzer": {
                "my_analyzer": {
                  "type": "custom", 
                  "tokenizer": "standard",
                  "char_filter": [
                    "html_strip"
                  ],
                  "filter": [
                    "lowercase",
                    "asciifolding"
                  ]
                },
                "my_stop_analyzer":{ 
                  "type":"custom",
                  "tokenizer":"standard",
                  "char_filter": [
                    "html_strip"
                  ],
                  "filter":[
                    "lowercase",
                    "asciifolding",
                    "english_stop"
                  ]
                }
              }
            },
            "filter":{
              "english_stop":{
                "type":"stop",
                "stopwords":"_english_"
              }
            }
          },
          "mappings":{
            "properties":{
              "title": {
                "type":"text",
                "analyzer":"my_analyzer", 
                "search_analyzer":"my_stop_analyzer", 
                "search_quote_analyzer":"my_analyzer" 
              }
            }
          }
        }

        PUT my-index-000002
        {
          "settings": {
            "analysis": {
              "analyzer": {
                "my_custom_analyzer": { 
                  "char_filter": [
                    "emoticons"
                  ],
                  "tokenizer": "punctuation",
                  "filter": [
                    "lowercase",
                    "english_stop"
                  ]
                }
              },
              "tokenizer": {
                "punctuation": {
                  "type": "pattern",
                  "pattern": "[ .,!?]"
                }
              },
              "char_filter": {
                "emoticons": { 
                  "type": "mapping",
                  "mappings": [
                    ":) => _happy_",
                    ":( => _sad_"
                  ]
                }
              },
              "filter": {
                "english_stop": { 
                  "type": "stop",
                  "stopwords": "_english_"
                }
              }
            }
          }
        }