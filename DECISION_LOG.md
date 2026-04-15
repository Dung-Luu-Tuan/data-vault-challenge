# DECISION LOG

## 1. Technical Choices

### Giao thức giao tiếp

Vì Main App và Data Vault không được truy cập trực tiếp vào nhau, toàn bộ giao tiếp đi qua 'postMessage'. Vấn đề là 'postMessage' không có khái niệm request/response — gửi đi rồi không biết response nào khớp với request nào, đặc biệt khi có nhiều request chạy cùng lúc.

Giải pháp: mỗi request được gán một UUID ('requestId'), Data Vault đính kèm UUID đó vào response khi trả về. Phía Main App giữ một danh sách các request đang chờ, khi response về thì tìm đúng UUID và resolve Promise tương ứng. Nhờ đó có thể dùng 'async/await' bình thường thay vì phải xử lý callback thủ công.

Ngoài ra mỗi message còn kèm 'nonce' và 'timestamp'. Nonce được nhúng trong URL hash của iframe khi load, Data Vault đọc ra và dùng để xác minh mỗi message có thật sự đến từ Main App hay không. Timestamp dùng để bỏ qua các message cũ hơn 30 giây.

### Lưu trữ

Dùng IndexedDB vì đây là lựa chọn duy nhất phù hợp khi cần lưu trữ lâu dài hàng trăm nghìn records trên browser. LocalStorage giới hạn khoảng 5MB và chỉ lưu được string, SessionStorage mất dữ liệu khi đóng tab.

### Tìm kiếm

Tìm kiếm trực tiếp trên IndexedDB quá chậm vì mỗi lần phải mở transaction, đọc từng record, lọc — với 500k records mất vài giây mỗi lần gõ.

Thay vào đó, sau khi load data lên, toàn bộ được đưa vào một index trong RAM. Index này không lưu theo dạng array of objects mà tách từng field thành array riêng biệt — ví dụ tất cả tên nằm trong một array, tất cả email nằm trong một array khác. Khi search chỉ cần vòng lặp qua array đó, không cần truy cập object hay mở transaction. Cách này giúp đạt tốc độ search dưới 100ms ngay cả với 500k records.

### Web Worker

Mọi tác vụ nặng như ghi dữ liệu vào IndexedDB, tạo mock data, build index, xử lý search đều chạy trong Web Worker. Thread chính của iframe chỉ nhận và chuyển tiếp message, không bao giờ bị block. Nhờ vậy UI không bị đơ dù đang insert số lượng lớn records.

### Hiển thị dữ liệu

Dùng virtual scrolling — chỉ render những row đang hiển thị trong màn hình thay vì toàn bộ dataset. Dù có 500k records, DOM thực tế chỉ chứa khoảng 20-30 row tại một thời điểm.

---

## 2. Optimization

### BULK_INSERT bị timeout khi insert số lượng lớn

Lúc đầu mỗi lần insert chia thành các chunk 2.000 records, mỗi chunk là một transaction riêng. Với 500k records tức là 250 transactions, mỗi transaction tốn chi phí khởi tạo khá lớn trên Windows. Tăng chunk lên 5.000 records giảm còn 100 transactions, tốc độ cải thiện rõ rệt.

Ngoài ra code cũ yield sau mỗi chunk để gửi progress update lên UI, nhưng yield quá nhiều lần cũng tốn thêm thời gian. Đổi sang chỉ yield mỗi 2 chunk là đủ để progress cập nhật mượt mà.

### Đọc toàn bộ data từ IndexedDB quá chậm

Khi build index, cần đọc toàn bộ records từ IndexedDB lên RAM. Cách ban đầu dùng cursor — đọc từng record một. Với hơn 500k records mỗi record tạo ra một bước async riêng, tổng cộng block Worker thread hàng phút.

Đổi sang store.getAll() — một request duy nhất trả về toàn bộ mảng ngay lập tức. Cùng số lượng records, thời gian giảm từ hàng phút xuống còn vài giây.

### CLEAR_ALL xong nhưng data vẫn còn

clearAll() ban đầu báo xong ngay khi request được đặt vào transaction, chưa phải khi transaction thực sự commit. Main App nhận được "done", query lại ngay và vẫn thấy data cũ vì IndexedDB chưa xóa xong. Fix bằng cách chờ đến sự kiện tx.oncomplete — lúc đó transaction mới thực sự hoàn thành.

### Bỏ IndexedDB index để tăng tốc ghi

Ban đầu tạo 7 index (name, email, department, status, salary, createdAt, dept_status) với ý định dùng IndexedDB để query trực tiếp — lọc theo department hay tìm theo tên thì có index sẵn sẽ nhanh hơn scan toàn bộ.

Sau khi chuyển toàn bộ search/filter sang in-memory columnar index trong Worker, các IndexedDB index này không còn được dùng đến nữa. Nhưng chúng vẫn tồn tại và vẫn phải cập nhật mỗi lần ghi — mỗi record = 8 lần ghi B-tree thay vì 1. Với 500k records là 3.5 triệu lần ghi thừa.

Bỏ hết, chỉ giữ lại keyPath 'id' — tốc độ ghi tăng lên mà không mất tính năng nào vì search đã được xử lý ở tầng khác rồi.

### Index bị ghi đè sau CLEAR_ALL

Nếu đang build index (đọc data từ IndexedDB) mà CLEAR_ALL chạy xen vào, sau khi đọc xong data cũ vẫn được đưa vào index — dù database đã rỗng. Fix bằng một biến đếm indexGeneration, tăng lên mỗi khi CLEAR_ALL chạy. Trước khi đọc data, lưu lại giá trị hiện tại. Sau khi đọc xong, so sánh lại — nếu khác thì bỏ qua kết quả, không build index.

---

## 3. AI Usage & Critical Thinking

AI được dùng như một công cụ hỗ trợ viết nhanh các phần boilerplate: cấu trúc thư mục, setup IndexedDB, cấu hình Vite và CSP, các React component cơ bản. Các quyết định kiến trúc và xử lý vấn đề hiệu suất đều tự thực hiện: thiết kế giao thức Correlation ID, chọn columnar array thay vì object array cho index, giữ index trong Worker RAM, two-server setup để tận dụng Same-Origin Policy, và toàn bộ phần debug các vấn đề ở mục Optimization phía trên.

Trường hợp AI đưa ra giải pháp chưa tối ưu: khi implement hàm đọc toàn bộ data từ IndexedDB để build index, AI dùng cursor và giải thích là "memory-efficient" vì đọc từng record một thay vì load hết cùng lúc.

```javascript
const cursor = tx.objectStore(STORE_NAME).openCursor();
cursor.onsuccess = (e) => {
  const cur = e.target.result;
  if (cur) { results.push(cur.value); cur.continue(); }
  else resolve(results);
};
```

Thực tế khi test với hơn 500k records, hàm này chạy cả phút vì mỗi 'cur.continue()' là một bước async riêng — hàng trăm nghìn bước nối tiếp nhau block hoàn toàn Worker thread. "Memory-efficient" đúng trong trường hợp cần xử lý từng record rồi bỏ (ví dụ export file), nhưng ở đây mục đích là load hết vào RAM nên cursor không phù hợp.

Tôi thay bằng store.getAll() — IndexedDB engine tự đọc và trả về toàn bộ array trong một request duy nhất, nhanh hơn nhiều lần.
