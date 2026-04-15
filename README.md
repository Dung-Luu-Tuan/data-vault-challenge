# Data Vault Challenge

## Cài đặt

```bash
npm install
npm run install:all
```

## Chạy

```bash
npm run dev
```

Sau khi chạy:

- Main App: [http://localhost:5173](http://localhost:5173)
- Data Vault: [http://localhost:5174](http://localhost:5174)

## Cấu trúc

```
data-vault-challenge/
├── main-app/        # React app (Vite + TypeScript)
└── data-vault/      # Iframe storage layer (Vanilla JS + Web Worker)
```

Hai thành phần chạy trên hai server riêng biệt, giao tiếp hoàn toàn qua postMessage. Main App không truy cập trực tiếp vào database — mọi thao tác đều đi qua Data Vault.