# คู่มือการติดตั้ง CRM

เอกสารนี้อธิบายวิธีติดตั้งระบบ CRM ทั้งแบบ Vercel (แนะนำ) และ Docker/VPS

> **หมายเหตุ:** แอปทำงานภายใต้ path `/crm` เช่น `https://your-domain.com/crm`

---

## วิธีที่ 1: Deploy บน Vercel (แนะนำ)

### สิ่งที่ต้องเตรียม

| Service | ใช้ทำอะไร | สมัครที่ |
|---------|----------|---------|
| **Vercel** | Hosting | https://vercel.com |
| **Neon** | Database (PostgreSQL) | https://neon.tech |
| **Bunny CDN** | File Storage + CDN | https://bunny.net |

---

### ขั้นตอนที่ 1: สร้าง Neon Database

1. ไปที่ https://console.neon.tech → สร้างโปรเจกต์ใหม่
2. เลือก Region ใกล้ (เช่น Singapore)
3. คัดลอก **Connection String** (pooled) เช่น:
   ```
   postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/dbname?sslmode=require
   ```

---

### ขั้นตอนที่ 2: สร้าง Bunny Storage

1. ไปที่ https://dash.bunny.net → Storage → Add Storage Zone
2. ตั้งชื่อ (เช่น `crm-files`) เลือก Region (เช่น Asia - Singapore)
3. สร้าง Pull Zone สำหรับ CDN (เชื่อมกับ Storage Zone)
4. จดค่า:
   - **Storage API Key** (อยู่ใน Storage Zone → FTP & API Access)
   - **Storage Zone Name** (เช่น `crm-files`)
   - **Region** (เช่น `sg`)
   - **Pull Zone URL** (เช่น `https://crm-files.b-cdn.net`)

---

### ขั้นตอนที่ 3: Deploy บน Vercel

1. Push โปรเจกต์ขึ้น GitHub
2. ไปที่ https://vercel.com → Import Project จาก GitHub
3. ตั้งค่า **Environment Variables**:

| Variable | ค่า | ตัวอย่าง |
|----------|-----|----------|
| `DATABASE_URL` | Neon connection string | `postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require` |
| `AUTH_SECRET` | สุ่มด้วย `openssl rand -base64 32` | `aBcDeFgH...` |
| `AUTH_URL` | URL ของ Vercel + /crm | `https://your-project.vercel.app/crm` |
| `BUNNY_STORAGE_API_KEY` | Bunny Storage API Key | `xxxxxxxx-xxxx-xxxx...` |
| `BUNNY_STORAGE_ZONE` | ชื่อ Storage Zone | `crm-files` |
| `BUNNY_STORAGE_REGION` | Region | `sg` |
| `BUNNY_CDN_URL` | Pull Zone URL (ไม่มี / ท้าย) | `https://crm-files.b-cdn.net` |

4. กด **Deploy**

---

### ขั้นตอนที่ 4: Initialize Database

หลัง deploy สำเร็จ ต้องสร้างตารางและ seed ข้อมูลเริ่มต้น:

```bash
# Clone โปรเจกต์ลงเครื่อง (ถ้ายังไม่มี)
git clone <repo-url> crm && cd crm

# ตั้งค่า DATABASE_URL ชี้ไป Neon
export DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require"

# สร้างตาราง
npx prisma db push

# Seed ข้อมูลเริ่มต้น (superadmin)
npm run db:seed
```

---

### ขั้นตอนที่ 5: ตั้ง Custom Domain (ถ้าต้องการ)

1. ใน Vercel → Settings → Domains → เพิ่มโดเมน
2. ตั้ง DNS Record ตามที่ Vercel แนะนำ
3. อัปเดต `AUTH_URL` ใน Environment Variables เป็น `https://crm.yourdomain.com/crm`
4. Redeploy

---

### Login ครั้งแรก

- **URL:** `https://your-project.vercel.app/crm`
- **Username:** `superadmin`
- **Password:** `@Superadmin252322`

**สำคัญ:** ควรเปลี่ยนรหัสผ่านทันทีหลัง login ครั้งแรก

---

## วิธีที่ 2: Deploy ด้วย Docker บน VPS

### สิ่งที่ต้องเตรียม

- VPS (Ubuntu 20.04+) มี Docker และ Docker Compose
- โดเมนชี้มาที่ IP ของ VPS

### ขั้นตอน

```bash
git clone <repo-url> crm && cd crm

# ต้องเพิ่ม output: "standalone" กลับใน next.config.ts ก่อน build Docker
# เพิ่ม: output: "standalone" ใน nextConfig

cp .env.example .env
# แก้ไข .env ตาม environment

docker compose up -d db app
docker compose --profile init run --rm db-init
```

> **หมายเหตุ Docker:** ต้องเพิ่ม `output: "standalone"` กลับเข้า `next.config.ts` ก่อน build Docker image เพราะ Vercel build ไม่ต้องใช้

---

## โครงสร้าง URL

| ส่วน | URL |
|------|-----|
| หน้า Login | `/crm/login` |
| หน้า Dashboard | `/crm/dashboard` |
| API Endpoints | `/crm/api/...` |
| Auth Callback | `/crm/api/auth/callback/credentials` |

---

## Troubleshooting

### ปัญหา: Login ไม่ได้ / Redirect ผิด

- ตรวจสอบ `AUTH_URL` ต้องลงท้ายด้วย `/crm` และตรงกับ URL ที่เข้า
- ถ้าใช้ Custom Domain ต้องอัปเดต `AUTH_URL` ใน Vercel Environment Variables แล้ว Redeploy

### ปัญหา: Upload ไฟล์ไม่ได้

- ตรวจสอบ `BUNNY_STORAGE_API_KEY` ถูกต้อง
- ตรวจสอบ `BUNNY_STORAGE_ZONE` ตรงกับชื่อ Storage Zone
- ตรวจสอบ `BUNNY_CDN_URL` ตรงกับ Pull Zone URL

### ปัญหา: Database connection error

- ตรวจสอบ `DATABASE_URL` ต้องเป็น pooled connection string จาก Neon
- ต้องมี `?sslmode=require` ต่อท้าย

### ปัญหา: หน้าเว็บ 404

- ต้องเข้าที่ `/crm` ไม่ใช่ `/` (เช่น `https://your-project.vercel.app/crm`)
