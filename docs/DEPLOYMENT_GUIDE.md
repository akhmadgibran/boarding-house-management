# Panduan Deployment di Server (k3s + Caddy + Cloudflare Tunnel)

Panduan ini disesuaikan secara khusus dengan arsitektur server (Ubuntu dengan k3s, Caddy di Host, dan Cloudflare Tunnel) yang kamu miliki, berdasarkan profil `server-condition.md`.

---

## 1. Persiapan Domain & Routing Cloudflare

Kita akan menggunakan dua *subdomain* untuk proyek ini (asumsi domain utamamu adalah `nabilbuilds.my.id`):
1. **Frontend**: `coliving.nabilbuilds.my.id`
2. **Backend**: `api.coliving.nabilbuilds.my.id`

Buka terminal di servermu, dan tambahkan *routing* DNS Cloudflare ke *tunnel* yang sudah ada:
```bash
cloudflared tunnel route dns homelab-tunnel coliving.nabilbuilds.my.id
cloudflared tunnel route dns homelab-tunnel api.coliving.nabilbuilds.my.id
```

Tambahkan *ingress rule* di `/etc/cloudflared/config.yml`:
```yaml
# Tambahkan di atas rule -service: http_status:404
- hostname: coliving.nabilbuilds.my.id
  service: http://localhost:80
- hostname: api.coliving.nabilbuilds.my.id
  service: http://localhost:80
```
Lalu *restart* layanannya:
```bash
sudo systemctl restart cloudflared
```

---

## 2. Konfigurasi Reverse Proxy (Caddy)

Kita telah men-setting k8s manifests (`k8s/frontend.yaml` dan `k8s/backend.yaml`) untuk menggunakan NodePort yang statis:
- **Frontend**: Port `30301`
- **Backend**: Port `30300`

Tambahkan blok berikut ke dalam `/etc/caddy/Caddyfile` milikmu:
```caddyfile
coliving.nabilbuilds.my.id:80 {
    reverse_proxy localhost:30301
}

api.coliving.nabilbuilds.my.id:80 {
    reverse_proxy localhost:30300
}
```

Reload Caddy agar aturan baru aktif:
```bash
sudo systemctl reload caddy
```

---

## 3. Siapkan Konfigurasi Kubernetes (k8s)

Proses *build* sudah diotomatisasi melalui GitHub Actions (`.github/workflows/deploy.yml`). Saat kamu mem-*push* kode ke *branch* `main`, GitHub akan merakit *image* Docker dan mengunggahnya ke GHCR.

Sebelum mendeploy ke k3s di servermu, kamu perlu menyesuaikan sedikit variabel *environment* di file konfigurasi. Pada laptop klien/server-mu, ubah URL API di file `k8s/frontend.yaml`:

```yaml
# Di dalam k8s/frontend.yaml
env:
  - name: NEXT_PUBLIC_API_URL
    value: "https://api.coliving.nabilbuilds.my.id" # Ganti dengan domain backend-mu
```

*(Catatan: pastikan menggunakan `https://` karena Cloudflare Tunnel membungkus trafik dari luar dengan SSL/TLS.)*

---

## 4. Proses Deploy ke k3s

Pastikan kamu sudah berada di folder proyek `kost-project-main` yang berisi direktori `k8s/`, lalu jalankan perintah berikut:

```bash
# 1. Deploy Database (PostgreSQL) terlebih dahulu
kubectl apply -f k8s/postgres.yaml

# 2. Tunggu beberapa detik agar pod database siap (Ready)
kubectl get pods

# 3. Deploy Backend Golang
kubectl apply -f k8s/backend.yaml

# 4. Deploy Frontend Next.js
kubectl apply -f k8s/frontend.yaml
```

Kamu bisa memantau status pod untuk memastikan semuanya berjalan (berstatus `Running`):
```bash
kubectl get pods -w
```

---

## 5. Migrasi & Seeding Database (Opsional)

Jika database PostgreSQL baru saja dibuat melalui k8s dan masih kosong, kamu perlu memasukkan skema dan data *dummy* awal. 
Caranya, teruskan (port-forward) *database* ke *localhost* sementara, atau masuk (exec) langsung ke dalam pod:

```bash
# Eksekusi langsung file seeding dari dalam folder proyek
kubectl exec -i $(kubectl get pod -l app=kost-db -o jsonpath='{.items[0].metadata.name}') -- psql -U kost_user -d kost_db < docs/postgres_seed.sql
```

## Selesai! 🎉
Kini Kost Project sudah bisa diakses oleh publik secara aman melalui:
👉 **https://coliving.nabilbuilds.my.id**
