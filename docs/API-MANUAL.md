# CRM API Manual - Leads & Customers

คู่มือ API สำหรับการจัดการ Leads และ Customers พร้อมการใช้งานกับ Agent OpenCLaw

> Base URL: `{BASE_URL}/api/...`

---

## สารบัญ

1. [Authentication](#authentication)
2. [Base URL](#base-url)
3. [API ตรวจสอบข้อมูลซ้ำ](#api-ตรวจสอบข้อมูลซ้ำ)
4. [Leads API](#leads-api)
5. [Customers API](#customers-api)
6. [Related APIs](#related-apis)
7. [รหัสข้อผิดพลาด](#รหัสข้อผิดพลาด)

---

## Authentication

API ทั้งหมดใช้ **NextAuth Session** (Cookie-based)

### สำหรับ Agent / การเรียกจากภายนอก

1. **Login ก่อน** - ส่ง POST ไปที่ `/api/auth/callback/credentials` หรือใช้ signIn
2. **เก็บ Session Cookie** - คุกกี้จะถูกตั้งค่าหลัง login สำเร็จ
3. **ส่ง Cookie ในทุก Request** - ต้องใช้ `credentials: 'include'` เมื่อเรียก fetch

### ตัวอย่างการ Login (สำหรับ Agent)

```http
POST {BASE_URL}/api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded

username=your_username&password=your_password
```

หลัง login สำเร็จ ให้เก็บ cookies และส่งต่อในทุก API call

---

## Base URL

- **Local:** `http://localhost:3000`
- **Production:** `https://your-crm-domain.com`

API path เริ่มที่ `/api/...` เสมอ

---

## API ตรวจสอบข้อมูลซ้ำ

### ตรวจสอบว่า Customer ID (externalId) มีในระบบแล้วหรือยัง

ก่อนเพิ่ม Lead หรือ Customer ใหม่ ควรเรียก API นี้เพื่อตรวจสอบว่าจะไม่เกิดข้อมูลซ้ำ

```
GET /api/entities/check
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| externalId | string | ใช่ | รหัสลูกค้าภายนอก (Customer ID) ที่ต้องการตรวจสอบ |
| brandId | string | ถ้ามี activeBrand ใน session | Brand ID สำหรับกรองข้อมูล |

#### Response 200

```json
{
  "exists": true,
  "externalId": "CUST-001",
  "brandId": "clxxx...",
  "inLeads": true,
  "inCustomers": false,
  "lead": {
    "id": "clxxx...",
    "title": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "stage": "prospecting"
  },
  "customer": null
}
```

เมื่อ `exists: false` แสดงว่าสามารถเพิ่มข้อมูลใหม่ได้

---

## Leads API

### 1. รายการ Leads (List)

```
GET /api/leads
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| search | string | - | ค้นหา name, email, phone |
| stage | string | - | prospecting, qualification, proposal, negotiation, closed_won, closed_lost |
| status | string | - | new, contacted, qualified, unqualified |
| page | number | 1 | หน้าปัจจุบัน |
| limit | number | 50 | จำนวนต่อหน้า |

#### Response 200

```json
{
  "leads": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

---

### 2. Pipeline (Kanban)

```
GET /api/leads/pipeline?brandId=xxx
```

#### Response 200

```json
[
  {
    "stage": "prospecting",
    "label": "Prospecting",
    "leads": [...],
    "count": 5
  },
  ...
]
```

---

### 3. สร้าง Lead

```
POST /api/leads
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | ใช่* | *ใช้ activeBrand ถ้าไม่ส่ง |
| title | string | ใช่ | หัวข้อ/ชื่อ |
| externalId | string | - | รหัสลูกค้าภายนอก (ป้องกันข้อมูลซ้ำ) |
| titlePrefix | string | - | Mr., Mrs., Ms., Dr. |
| titlePrefixTh | string | - | คำนำหน้า (ไทย) |
| firstName | string | - | ชื่อ |
| firstNameTh | string | - | ชื่อ (ไทย) |
| lastName | string | - | นามสกุล |
| lastNameTh | string | - | นามสกุล (ไทย) |
| nickname | string | - | ชื่อเล่น |
| sex | string | - | male, female, other |
| phone | string | - | เบอร์โทร |
| email | string | - | อีเมล |
| source | string | - | แหล่งที่มา |
| stage | string | - | prospecting (default) |
| interest | string | - | ความสนใจ |
| birthDate | string | - | วันเกิด (YYYY-MM-DD) |
| idCard | string | - | เลขบัตร |
| address | string | - | ที่อยู่ |
| city | string | - | จังหวัด |
| state | string | - | รัฐ |
| postalCode | string | - | รหัสไปรษณีย์ |
| country | string | - | ประเทศ |
| notes | string | - | หมายเหตุ |
| assignedToId | string | - | ผู้รับผิดชอบ |

#### Response 201

```json
{
  "id": "clxxx...",
  "title": "John Doe",
  "externalId": "CUST-001",
  ...
}
```

---

### 4. ดู Lead รายละเอียด

```
GET /api/leads/{id}
```

#### Response 200

```json
{
  "id": "clxxx...",
  "brandId": "...",
  "externalId": "CUST-001",
  "title": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "0812345678",
  "stage": "prospecting",
  "customer": {...},
  "assignedTo": {...},
  "activities": [...]
}
```

---

### 5. แก้ไข Lead

```
PUT /api/leads/{id}
Content-Type: application/json
```

ส่งเฉพาะฟิลด์ที่ต้องการแก้ไข (Partial Update)

---

### 6. ลบ Lead

```
DELETE /api/leads/{id}
```

#### Response 200

```json
{ "success": true }
```

---

### 7. แปลง Lead เป็น Customer

```
POST /api/leads/{id}/convert
```

แปลง Lead เป็น Customer พร้อมโอนข้อมูลที่เกี่ยวข้อง

#### Response 200

```json
{
  "message": "Lead converted to customer",
  "customerId": "clxxx...",
  "customerName": "John Doe"
}
```

---

### 8. Chat Logs (Lead)

```
GET    /api/leads/{id}/chat-logs       # ดึง log
POST   /api/leads/{id}/chat-logs       # เพิ่ม log
DELETE /api/leads/{id}/chat-logs?logId=xxx  # ลบ log
```

#### POST Body (เพิ่ม Chat Log)

```json
{
  "channel": "LINE",
  "senderName": "ลูกค้า",
  "message": "ข้อความที่สนทนา",
  "sentAt": "2025-03-08T10:00:00Z"
}
```

---

### 9. Extras (Address, Job, Education, etc.)

```
GET    /api/leads/{id}/extras
POST   /api/leads/{id}/extras    # { "type": "addresses", "data": {...} }
PUT    /api/leads/{id}/extras    # { "type": "addresses", "recordId": "xxx", "data": {...} }
DELETE /api/leads/{id}/extras?type=addresses&recordId=xxx
```

---

## Customers API

### 1. รายการ Customers (List)

```
GET /api/customers
```

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| search | string | - | ค้นหา name, email, phone, company |
| status | string | - | active, inactive, prospect |
| page | number | 1 | หน้าปัจจุบัน |
| limit | number | 20 | จำนวนต่อหน้า |

---

### 2. สร้าง Customer

```
POST /api/customers
Content-Type: application/json
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | ใช่* | *ใช้ activeBrand ถ้าไม่ส่ง |
| name | string | ใช่ | ชื่อลูกค้า |
| externalId | string | - | รหัสลูกค้าภายนอก (ป้องกันข้อมูลซ้ำ) |
| titlePrefix | string | - | คำนำหน้า |
| titlePrefixTh | string | - | คำนำหน้า (ไทย) |
| firstName | string | - | ชื่อ |
| firstNameTh | string | - | ชื่อ (ไทย) |
| lastName | string | - | นามสกุล |
| lastNameTh | string | - | นามสกุล (ไทย) |
| nickname | string | - | ชื่อเล่น |
| sex | string | - | male, female, other |
| email | string | - | อีเมล |
| phone | string | - | เบอร์โทร |
| source | string | - | แหล่งที่มา |
| stage | string | - | new, contacted, qualified, converted, lost |
| interest | string | - | ความสนใจ |
| birthDate | string | - | วันเกิด |
| idCard | string | - | เลขบัตร |
| address | string | - | ที่อยู่ |
| city | string | - | จังหวัด |
| state | string | - | รัฐ |
| postalCode | string | - | รหัสไปรษณีย์ |
| country | string | - | ประเทศ |
| company | string | - | บริษัท |
| tags | string[] | - | แท็ก |
| notes | string | - | หมายเหตุ |
| status | string | - | active (default), inactive, prospect |

---

### 3. ดู Customer รายละเอียด

```
GET /api/customers/{id}
```

---

### 4. แก้ไข Customer

```
PUT /api/customers/{id}
Content-Type: application/json
```

---

### 5. ลบ Customer

```
DELETE /api/customers/{id}
```

---

### 6. Chat Logs (Customer)

```
GET    /api/customers/{id}/chat-logs
POST   /api/customers/{id}/chat-logs
DELETE /api/customers/{id}/chat-logs?logId=xxx
```

---

### 7. Extras (Customer)

```
GET    /api/customers/{id}/extras
POST   /api/customers/{id}/extras
PUT    /api/customers/{id}/extras
DELETE /api/customers/{id}/extras?type=...&recordId=...
```

---

## Related APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/sources | GET | รายการ Sources (active=true) |
| /api/brands | GET | รายการ Brands (super admin) |
| /api/deals | GET/POST | จัดการ Deals |
| /api/leads/import | POST | นำเข้า Leads จาก CSV |
| /api/leads/export | GET | Export Leads เป็น CSV |
| /api/customers/import | POST | นำเข้า Customers จาก CSV |
| /api/customers/export | GET | Export Customers เป็น CSV |

---

## รหัสข้อผิดพลาด

| Status | ความหมาย |
|--------|----------|
| 200 | สำเร็จ |
| 201 | สร้างสำเร็จ |
| 400 | ข้อมูลไม่ถูกต้อง (Bad Request) |
| 401 | ไม่ได้ล็อกอิน (Unauthorized) |
| 403 | ไม่มีสิทธิ์ (Forbidden) |
| 404 | ไม่พบข้อมูล (Not Found) |
| 409 | ขัดแย้ง (Conflict) เช่น ข้อมูลซ้ำ |
| 500 | ข้อผิดพลาดเซิร์ฟเวอร์ |

---

## ขั้นตอนแนะนำสำหรับ Agent ก่อนเพิ่ม Lead/Customer

1. เรียก `GET /api/entities/check?externalId={รหัสลูกค้า}&brandId={brandId}`
2. ถ้า `exists: true` → ไม่ต้องเพิ่ม ให้ใช้ข้อมูลที่มีอยู่หรืออัปเดตแทน
3. ถ้า `exists: false` → สร้างใหม่ได้ด้วย `POST /api/leads` หรือ `POST /api/customers` พร้อมส่ง `externalId` ใน body
