# Kost Management DevOps & Deployment Guide

Dokumen ini menjelaskan arsitektur deployment (*DevOps pipeline*) yang telah kita konfigurasi menggunakan **Docker**, **Kubernetes**, dan **GitHub Actions**, serta panduan langkah demi langkah tentang cara mengatur ini di server pribadimu (*self-hosted server*).

---

## 1. Arsitektur CI/CD

Kita menggunakan sistem CI/CD standar industri dengan alur kerja (workflow) berikut saat kamu melakukan `push` ke branch `main`:

1. **Build**: GitHub Actions merakit (build) `client/Dockerfile` (Next.js) dan `server-go/Dockerfile` (Golang).
2. **Scan Vulnerability**: **Trivy** akan memindai kontainer (images) yang baru di-build untuk mencari celah keamanan kritikal pada sistem operasi dan *library* yang digunakan.
3. **Push to Registry**: Jika aman, *images* tersebut akan diunggah ke **GitHub Container Registry (GHCR)** sebagai `ghcr.io/username/repo-backend` dan `repo-frontend`.
4. **Deploy**: GitHub Actions akan melempar tugas (*job*) "Deploy" ke **Self-Hosted Runner** yang terpasang di server pribadimu. Runner tersebut akan mengubah label versi image di dalam file `.yaml` dan mengeksekusi `kubectl apply -f k8s/`.
5. **Rolling Update**: Kubernetes menarik *image* versi terbaru dari GHCR dan me-restart *pods* aplikasi secara perlahan tanpa waktu henti (*zero-downtime*).

---

## 2. Prasyarat Server (Server Requirements)

Server pribadimu (bisa berupa VPS Ubuntu, Debian, CentOS, dll) harus sudah terpasang:
1. **Docker**: Untuk menjalankan *container* secara umum.
2. **Kubernetes (K8s)**: Sangat direkomendasikan menggunakan distribusi ringan seperti **[K3s](https://k3s.io/)** atau **MicroK8s** (karena server tunggal).
   * Cek dengan menjalankan `kubectl get nodes`.
3. **GitHub Actions Runner**: Aplikasi *agent* kecil yang menghubungkan servermu dengan repositori GitHub.

---

## 3. Cara Setup di Servermu Langkah-demi-Langkah

### A. Install K3s (Jika belum ada Kubernetes)
Jika servermu benar-benar kosong, install K3s (versi K8s yang sangat ringan):
```bash
curl -sfL https://get.k3s.io | sh -
# Berikan hak akses kubectl (Opsional, agar tidak selalu pakai sudo)
sudo chmod 644 /etc/rancher/k3s/k3s.yaml
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

### B. Pasang GitHub Actions Self-Hosted Runner
GitHub Actions membutuhkan cara untuk menjalankan perintah `kubectl` langsung di dalam servermu.
1. Buka Repositori GitHub kamu di *browser*.
2. Pergi ke tab **Settings** -> **Actions** -> **Runners**.
3. Klik tombol **New self-hosted runner**.
4. Pilih sistem operasi servermu (misal: Linux, x64).
5. GitHub akan memberikan sekumpulan perintah `curl`, `tar`, dan `./config.sh`. Jalankan semua perintah tersebut secara berurutan di terminal servermu.
6. Saat ditanya *labels*, biarkan default atau pastikan ada label `self-hosted` (ini sesuai dengan `runs-on: self-hosted` di `deploy.yml`).
7. Terakhir, jalankan `./svc.sh install` dan `./svc.sh start` agar runner berjalan di latar belakang (sebagai service).

### C. Berikan Akses GHCR ke Kubernetes (Image Pull Secret)
Karena repositori GHCR terkadang butuh autentikasi (terutama jika repo kamu *Private*), server Kubernetes-mu harus tahu cara login ke GitHub Container Registry.

Buat sebuah **Personal Access Token (PAT)** di GitHub (dengan permission `read:packages`). Lalu buat *secret* di Kubernetes servermu:
```bash
kubectl create secret docker-registry github-ghcr \
  --docker-server=ghcr.io \
  --docker-username=USERNAME_GITHUB_KAMU \
  --docker-password=TOKEN_PAT_GITHUB_KAMU \
  --docker-email=EMAIL_KAMU
```

*Catatan: Konfigurasi default di `k8s/backend.yaml` saat ini tidak memakai `imagePullSecrets`. Tambahkan blok ini di bawah `containers:` jika repomu Private:*
```yaml
      imagePullSecrets:
        - name: github-ghcr
```

### D. Konfigurasi Endpoint API
Saat aplikasi *frontend* dirender, aplikasi tersebut membutuhkan alamat server publik untuk berkomunikasi dengan *backend* Go.
Sebelum menjalankan *pipeline*, kamu perlu mengganti IP/Domain yang ada di dalam `k8s/frontend.yaml` dengan Alamat IP Publik servermu atau Domain aslimu.
1. Buka `k8s/frontend.yaml`.
2. Cari variabel `NEXT_PUBLIC_API_URL`.
3. Ganti nilainya menjadi IP Servermu, misal: `"http://103.111.222.111:30300"` atau `"https://api.kost-kamu.com"`.

---

## 4. Eksekusi Pertama (The First Run)

Setelah kamu menyelesaikan langkah A, B, dan C, kamu hanya perlu **melakukan Push (Commit) ke branch `main` di GitHub**.
1. Lakukan `git add .`, `git commit -m "Deploy to production"`, lalu `git push`.
2. Buka tab **Actions** di GitHub, kamu akan melihat *pipeline* "Build, Scan & Deploy" sedang berjalan.
3. Setelah semuanya berwarna hijau (Sukses), buka terminal servermu dan ketik:
```bash
kubectl get pods
```
Kamu akan melihat 3 pods berjalan: `kost-db-...`, `kost-backend-...`, dan `kost-frontend-...`.

## 5. Mengakses Aplikasi dari Luar Server
Berdasarkan manifest default kita:
* Aplikasi Next.js (Frontend) bisa diakses di port NodePort: **30301** (misal: `http://IP-SERVER:30301`).
* Golang Backend bisa diakses di port NodePort: **30300** (misal: `http://IP-SERVER:30300`).

*(Sangat disarankan kamu memasang `Nginx` Ingress Controller atau *Reverse Proxy* di server untuk merutekan lalu lintas `Port 80/443` ke port `30301` / `30300` agar URL-nya cantik, contohnya `kost-kamu.com` tanpa nomor port).*
