Reseach Elasticsearch
    - Là cái gì ?
    - Dùng để  làm gì ?
    - Có những gì ?
    - Ưu nhược điểm là gì ?


    I. Elasticsearch (ES) là gì ?
        - Elasticsearch là một công cụ tìm kiếm dựa trên nền tảng Apache Lucene. Nó cung cấp một bộ máy tìm kiếm dạng phân tán,
        có đầy đủ công cụ với một giao diện web HTTP có hỗ trợ dữ liệu JSON.
        Elasticsearch được phát triển bằng Java và được phát hành dạng nguồn mở theo giấy phép Apache.(Theo wikipedia).
        
        • Elasticsearch là một search engine.
        • Elasticsearch được kế thừa từ Lucene Apache.
        • Elasticsearch thực chất hoặt động như 1 web server, có khả năng tìm kiếm nhanh chóng (near realtime) thông qua giao thức RESTful.
        • Elasticsearch có khả năng phân tích và thống kê dữ liệu.
        • Elasticsearch chạy trên server riêng và đồng thời giao tiếp thông qua RESTful
          do vậy nên nó không phụ thuộc vào client viết bằng gì hay hệ thống hiện tại của bạn viết bằng gì.
          điều đó làm cho việc tích hợp nó vào hệ thống bạn là dễ dàng, bạn chỉ cần gửi request http lên là nó trả về kết quả.
        • Elasticsearch là 1 hệ thống phân tán và có khả năng mở rộng tuyệt vời (horizontal scalability).
          Lắp thêm node cho nó là nó tự động auto mở rộng cho bạn.
        • Elasticsearch là 1 open source được phát triển bằng Java.
    
    II. Các khái niệm cần biết
        1. Document
            - Document là một bộ dữ liệu dạng json object, là đơn vị nhỏ nhất hay còn gọi là đơn vị cơ bản để lưu trữ dữ liệu trong ES.
        2. Index (Inverted index)
            - Inverted index là một cấu trúc dữ liệu được xây dựng để cho phép tìm kiếm full-text-search.
            - Full-text-search là kĩ thuật tìm kiếm hiệu quả trên full-text-database.
            - Full-text-database là cơ sở dữ liệu chứa toàn bộ các Terms từ một hoặc một số các đoạn text, tài liệu, bài báo, hoặc là websites...
            - Terms là định nghĩa cho một từ hay một ký tự không trùng lặp trong Inverted index của ES.

            => Inverted index là một cấu trúc dữ liệu được xây dựng để cho phép tìm kiếm một cách hiệu quả dữ liệu căn bản
            bên trong một hoặc một số các đoạn text, tài liệu, bài báo, hoặc là websites...
            
            *  VD:
            - Ta có 2 đoạn text sau:
                Doc_1: “The quick brown fox jumped over the lazy dog”.
                Doc_2: “Quick brown foxes leap over lazy dogs in summer”.

            - Từ 2 đoạn text trên ta được các terms:
                [Quick, The, brown, dog, dogs, fox, foxes, in, jumped, lazy, leap, over, quick, summer, the]

            - Mô phỏng một thành một inverted index như sau:
                Term        Doc_1       Doc_2
                -----------------------------
                Quick                     x
                The           X           
                brown         X           x
                dog           X
                dogs                      x
                fox           X
                foxes                     X
                in                        X
                jumped        X
                lazy          X           X
                leap                      X
                over          X           X
                quick         X
                summer                    X
                the           X
                -----------------------------

        3. Shard
            - Shard là đối tượng của Lucene, là tập con các documents của 1 Inverted Index. Một inverted Index có thể được chia thành nhiều shard.
            - Mỗi Node bao gồm nhiều Shard. Chính vì thế Shard là đối tượng nhỏ nhất, hoạt động ở mức thấp nhất, đóng vai trò lưu trữ dữ liệu.
            - Elasticsearch đã support toàn bộ việc giao tiếp cũng như tự động thay đổi các Shard khi cần thiết.
            - Có 2 loại Shard là :primary shard và replica shard.
                • Primary Shard là sẽ lưu trữ dữ liệu và đánh index . Sau khi đánh xong dữ liệu sẽ được vận chuyển tới các Replica Shard.
                • Mặc định của Elasticsearch là mỗi index sẽ có 5 Primary shard và với mỗi Primary shard thì sẽ đi kèm với 1 Replica Shard.
                • Replica Shard là nơi lưu trữ dữ liệu nhân bản của Primary Shard, đảm bảo tính toàn vẹn của dữ liệu khi Primary Shard xảy ra vấn đề.
                • Replica Shard có thể giúp tăng cường tốc độ tìm kiếm vì chúng ta có thể setup lượng Replica Shard nhiều hơn mặc định của ES.

        4. Node
            - Là trung tâm hoạt động của ES. Là nơi lưu trữ dữ liệu, tham gia thực hiện đánh index của cluster cũng như thực hiện các thao tác tìm kiếm.
            - Mỗi node được định danh bằng 1 unique name.

        5. Cluster
            - Là tập hợp các node hoạt động cùng với nhau, chia sẽ cùng thuộc tính luster.name, được xác định bằng 1 'unique name'.
            - Mỗi cluster có một node chính (master), được lựa chọn một cách tự động và có thể thay thế nếu sự cố xảy ra.
            - Một cluster có thể gồm 1 hoặc nhiều node.
            - Các node có thể hoạt động trên cùng 1 server.
            - Trong thực tế , một cluster sẽ gồm nhiều node hoạt động trên các server khác nhau.
            - Các node có thể tìm thấy nhau để hoạt động trên cùng 1 cluster qua giao thức unicast.

            => Chức năng chính của Cluster đó chính là quyết định xem shards nào được phân bổ cho node nào và khi nào thì di chuyển các Cluster để cân bằng lại Cluster.

    III. Ưu nhược điểm của ES
        1. Ưu Điểm
            - Tìm kiếm dữ liệu rất nhanh chóng, mạnh mẽ dựa trên Apache Lucene (near-realtime searching).
            - Có khả năng phân tích dữ liệu (Analysis data).
            - Khả năng mở rộng theo chiều ngang.
            - Hỗ trợ tìm kiếm mờ (fuzzy), tức là từ khóa tìm kiếm có thể bị sai lỗi chính tả hay không đúng cú pháp thì vẫn có khả năng elasticsearch trả về kết quả tốt.
            - Hỗ trợ Structured Query DSL (Domain-Specific Language ), cung cấp việc đặc tả những câu truy vấn phức tạp một cách cụ thể và rõ ràng bằng JSON.
            - Hỗ trợ nhiều Elasticsearc client như Java, PhP, Javascript, Ruby, .NET, Python.

           2. Nhược Điểm
            - Khả năng CRUD hạn chế.
            - Không có khái niệm transaction tức là không đảm bảo toàn vẹn dữ liệu khi thực hiện các hoạt động ghi.
            - Không thích hợp với những hệ thống thường xuyên cập nhật dữ liệu. Sẽ rất tốn kém cho việc đánh index dữ liệu.