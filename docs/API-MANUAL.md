# CRM API Manual — Complete Reference

> Base URL: `https://your-crm-domain.com`

---

## สารบัญ

1. [Authentication](#authentication)
2. [วิธีเรียกใช้ API (Quick Start)](#วิธีเรียกใช้-api-quick-start)
3. [API Keys Management](#api-keys-management)
4. [Entities — ตรวจสอบข้อมูลซ้ำ](#entities--ตรวจสอบข้อมูลซ้ำ)
5. [Leads API](#leads-api)
6. [Lead Stages API](#lead-stages-api)
7. [Customers API](#customers-api)
8. [Deals API](#deals-api)
9. [Activities API](#activities-api)
10. [Dashboard API](#dashboard-api)
11. [Comments API](#comments-api)
12. [Sources API](#sources-api)
13. [Brands API](#brands-api)
14. [Campaigns API](#campaigns-api)
15. [Tickets API](#tickets-api)
16. [Vouchers API](#vouchers-api)
17. [Users API](#users-api)
18. [Roles API](#roles-api)
19. [Notifications API](#notifications-api)
20. [Reports API](#reports-api)
21. [รหัสข้อผิดพลาด](#รหัสข้อผิดพลาด)
22. [สรุป API ทั้งหมด](#สรุป-api-ทั้งหมด)
23. [ขั้นตอนแนะนำสำหรับ n8n / Agent](#ขั้นตอนแนะนำสำหรับ-n8n--agent)

---

## Authentication

API รองรับ 2 รูปแบบ:

### วิธีที่ 1: API Key (แนะนำสำหรับ n8n / ระบบภายนอก)

```http
GET /api/leads?brandId=xxx
x-api-key: crm_a1b2c3d4e5f6...
```

- สร้าง key ได้ที่หน้า **Management > API Keys** หรือ `POST /api/api-keys`
- key จะแสดงเพียงครั้งเดียวตอนสร้าง — ให้ copy เก็บไว้ทันที
- key ผูกกับ brand เดียว — ถ้าต้องการเข้าถึงหลาย brand ให้สร้างหลาย key
- สามารถกำหนด permissions และวันหมดอายุได้

### วิธีที่ 2: NextAuth Session (Cookie-based)

สำหรับ browser / frontend ใช้ session cookie ตามปกติ

### สิ่งสำคัญเรื่อง Brand

- ทุก API ที่ query ข้อมูลจะกรองตาม **brandId**
- ถ้าใช้ API Key → `brandId` จะถูก set อัตโนมัติจาก Brand ที่ key ผูกอยู่
- ข้อมูลที่สร้างผ่าน API Key จะเข้าไปอยู่ใน Brand ของ key นั้น
- **ใน Web UI ต้องสลับ Brand ให้ตรง** จึงจะเห็นข้อมูลที่สร้างผ่าน API

---

## วิธีเรียกใช้ API (Quick Start)

### ขั้นตอนที่ 1: สร้าง API Key

เข้าหน้า **Management > API Keys** ใน CRM Web แล้วกด "+ New Key"

หรือให้ Super Admin สร้างผ่าน API (ต้อง login ผ่าน session):

```bash
curl -X POST https://your-crm-domain.com/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=YOUR_SESSION_COOKIE" \
  -b "authjs.session-token=YOUR_SESSION_COOKIE" \
  -d '{
    "name": "n8n Production",
    "brandId": "YOUR_BRAND_ID",
    "permissions": ["leads:read", "leads:write", "customers:read", "customers:write"]
  }'
```

> **สำคัญ:** Key จะแสดงเพียงครั้งเดียว — copy เก็บไว้ทันที!

### ขั้นตอนที่ 2: เรียก API ด้วย API Key

ทุก request ต้องส่ง header `x-api-key`:

#### ตัวอย่าง: ดูรายการ Leads

```bash
curl -X GET "https://your-crm-domain.com/api/leads?page=1&limit=10" \
  -H "x-api-key: crm_a1b2c3d4e5f6..."
```

#### ตัวอย่าง: สร้าง Lead ใหม่

```bash
curl -X POST https://your-crm-domain.com/api/leads \
  -H "Content-Type: application/json" \
  -H "x-api-key: crm_a1b2c3d4e5f6..." \
  -d '{
    "title": "คุณสมชาย ใจดี",
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "phone": "0891234567",
    "email": "somchai@example.com",
    "source": "Facebook"
  }'
```

#### ตัวอย่าง: สร้าง Customer ใหม่

```bash
curl -X POST https://your-crm-domain.com/api/customers \
  -H "Content-Type: application/json" \
  -H "x-api-key: crm_a1b2c3d4e5f6..." \
  -d '{
    "name": "สมชาย ใจดี",
    "firstName": "สมชาย",
    "lastName": "ใจดี",
    "phone": "0891234567",
    "email": "somchai@example.com",
    "status": "active"
  }'
```

#### ตัวอย่าง: แก้ไข Lead

```bash
curl -X PUT https://your-crm-domain.com/api/leads/LEAD_ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: crm_a1b2c3d4e5f6..." \
  -d '{
    "phone": "0899999999",
    "notes": "ลูกค้าสนใจแพ็คเกจดำน้ำ"
  }'
```

#### ตัวอย่าง: ลบ Lead

```bash
curl -X DELETE https://your-crm-domain.com/api/leads/LEAD_ID \
  -H "x-api-key: crm_a1b2c3d4e5f6..."
```

#### ตัวอย่าง: เพิ่ม Comment

```bash
curl -X POST https://your-crm-domain.com/api/leads/LEAD_ID/comments \
  -H "Content-Type: application/json" \
  -H "x-api-key: crm_a1b2c3d4e5f6..." \
  -d '{"text": "ลูกค้าสนใจแพ็คเกจดำน้ำ ติดต่อกลับ"}'
```

#### ตัวอย่าง: เพิ่ม Chat Log

```bash
curl -X POST https://your-crm-domain.com/api/leads/LEAD_ID/chat-logs \
  -H "Content-Type: application/json" \
  -H "x-api-key: crm_a1b2c3d4e5f6..." \
  -d '{
    "channel": "LINE",
    "senderName": "สมชาย",
    "message": "สนใจแพ็คเกจดำน้ำ ราคาเท่าไหร่"
  }'
```

#### ตัวอย่าง: ตรวจสอบข้อมูลซ้ำก่อนสร้าง

```bash
curl -X GET "https://your-crm-domain.com/api/entities/check?externalId=CUST-001" \
  -H "x-api-key: crm_a1b2c3d4e5f6..."
```

### ตัวอย่างสำหรับ n8n (HTTP Request Node)

| Field | Value |
|-------|-------|
| Method | GET / POST / PUT / DELETE |
| URL | `https://your-crm-domain.com/api/leads` |
| Authentication | None (ใช้ Header แทน) |
| Header | `x-api-key` = `crm_a1b2c3d4e5f6...` |
| Header | `Content-Type` = `application/json` (สำหรับ POST/PUT) |
| Body | JSON ตามที่ API ต้องการ |

### ข้อควรระวัง

1. **ต้องส่ง `x-api-key` ทุกครั้ง** — ถ้าไม่ส่งจะได้ HTML login page แทน JSON
2. **brandId ไม่ต้องส่ง** ถ้าใช้ API Key (ระบบดึงจาก key อัตโนมัติ)
3. **ข้อมูลจะเข้า Brand ตาม key** — ต้องสลับ Brand ใน web ให้ตรงจึงจะเห็นข้อมูล
4. **Key หมดอายุหรือถูกปิด** จะได้ `401 Unauthorized`
5. **Permission ไม่พอ** จะได้ `403 Forbidden`

---

## API Keys Management

> Super Admin only | Auth: Session only (ไม่รองรับ API key auth สำหรับ endpoint นี้)

### สร้าง API Key

```
POST /api/api-keys
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | ใช่ | ชื่อ key เช่น "n8n Production" |
| brandId | string | ใช่ | Brand ID ที่ key นี้เข้าถึงได้ |
| permissions | string[] | ไม่ | รายการ permission เช่น `["leads:read","leads:write"]` |
| expiresAt | string | ไม่ | วันหมดอายุ ISO 8601 |

**Response 201:**

```json
{
  "id": "clxxx...",
  "name": "n8n Production",
  "keyPrefix": "crm_a1b2c3d4",
  "key": "crm_a1b2c3d4e5f6...",
  "permissions": ["leads:read", "leads:write"],
  "brand": { "id": "...", "name": "..." },
  "isActive": true,
  "expiresAt": null,
  "createdAt": "..."
}
```

> `key` จะแสดงเพียงครั้งเดียว

### ดูรายการ API Keys

```
GET /api/api-keys?brandId=xxx
```

### ดูรายละเอียด API Key

```
GET /api/api-keys/{id}
```

### แก้ไข API Key

```
PUT /api/api-keys/{id}
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | เปลี่ยนชื่อ |
| permissions | string[] | เปลี่ยน permission |
| isActive | boolean | เปิด/ปิด key |
| expiresAt | string \| null | เปลี่ยนวันหมดอายุ |

### ลบ API Key

```
DELETE /api/api-keys/{id}
```

---

## Entities — ตรวจสอบข้อมูลซ้ำ

### ตรวจสอบว่า externalId มีในระบบแล้วหรือยัง

```
GET /api/entities/check?externalId=CUST-001&brandId=xxx
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| externalId | string | ใช่ | รหัสลูกค้าภายนอก |
| brandId | string | ไม่ | ใช้ activeBrand ถ้าไม่ส่ง |

**Response 200:**

```json
{
  "exists": true,
  "externalId": "CUST-001",
  "brandId": "clxxx...",
  "inLeads": true,
  "inCustomers": false,
  "lead": { "id": "...", "title": "...", "firstName": "...", "lastName": "...", "email": "...", "stage": "..." },
  "customer": null
}
```

---

## Leads API

### 1. รายการ Leads

```
GET /api/leads
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| search | string | — | ค้นหา title, firstName, lastName, email, phone, customer name |
| stage | string | — | กรองตาม stage ID |
| status | string | — | new, contacted, qualified, unqualified (ถ้าไม่ส่ง จะซ่อน converted) |
| page | number | 1 | หน้า |
| limit | number | 50 | จำนวนต่อหน้า |

**Response 200:**

```json
{
  "leads": [
    {
      "id": "...",
      "title": "John Doe",
      "stage": "clxxx...",
      "status": "new",
      "customer": { "id": "...", "name": "..." },
      "assignedTo": { "id": "...", "fullName": "...", "avatarUrl": "..." },
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 100, "totalPages": 2 }
}
```

### 2. Pipeline (Kanban)

```
GET /api/leads/pipeline?brandId=xxx
```

แสดง leads จัดกลุ่มตาม stage (ไม่รวม converted)

**Response 200:**

```json
[
  { "stage": { "id": "...", "name": "Prospecting", "color": "#..." }, "leads": [...], "count": 5 }
]
```

### 3. สร้าง Lead

```
POST /api/leads
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | ไม่* | *ใช้ activeBrand ถ้าไม่ส่ง |
| title | string | **ใช่** | หัวข้อ/ชื่อ |
| externalId | string | ไม่ | รหัสลูกค้าภายนอก (ป้องกันซ้ำ) |
| titlePrefix | string | ไม่ | Mr., Mrs., Ms., Dr. |
| titlePrefixTh | string | ไม่ | คำนำหน้า (ไทย) |
| firstName | string | ไม่ | ชื่อ |
| firstNameTh | string | ไม่ | ชื่อ (ไทย) |
| lastName | string | ไม่ | นามสกุล |
| lastNameTh | string | ไม่ | นามสกุล (ไทย) |
| nickname | string | ไม่ | ชื่อเล่น |
| sex | string | ไม่ | male, female, other |
| phone | string | ไม่ | เบอร์โทร |
| email | string | ไม่ | อีเมล |
| source | string | ไม่ | แหล่งที่มา |
| stage | string | ไม่ | Stage ID (ถ้าไม่ส่งใช้ stage แรกของ brand) |
| status | string | ไม่ | new (default), contacted, qualified, unqualified |
| interest | string | ไม่ | ความสนใจ |
| birthDate | string | ไม่ | วันเกิด (YYYY-MM-DD) |
| idCard | string | ไม่ | เลขบัตร |
| address | string | ไม่ | ที่อยู่ |
| city | string | ไม่ | จังหวัด |
| state | string | ไม่ | รัฐ |
| postalCode | string | ไม่ | รหัสไปรษณีย์ |
| country | string | ไม่ | ประเทศ |
| notes | string | ไม่ | หมายเหตุ |
| assignedToId | string | ไม่ | User ID ผู้รับผิดชอบ (default: ตัวเอง) |
| customerId | string | ไม่ | ผูกกับ Customer ที่มีอยู่ |

**Response 201:** Lead object

### 4. ดู Lead รายละเอียด

```
GET /api/leads/{id}
```

**Response 200:** Lead พร้อม customer, assignedTo, createdBy, deals, activities (50 รายการล่าสุด)

### 5. แก้ไข Lead

```
PUT /api/leads/{id}
```

ส่งเฉพาะ field ที่ต้องการแก้ (partial update) — ใช้ field เดียวกับ POST

### 6. ลบ Lead

```
DELETE /api/leads/{id}
```

**Response 200:** `{ "success": true }`

### 7. แปลง Lead → Customer

```
POST /api/leads/{id}/convert
```

แปลง Lead เป็น Customer โดยอัตโนมัติ:
- สร้าง Customer จากข้อมูล Lead
- โอน extras ทั้งหมด (ที่อยู่, งาน, การศึกษา, ฯลฯ)
- โอน deals และ campaign members
- เปลี่ยน stage เป็น "Closed Won" และ status เป็น "converted"

**Response 200:**

```json
{
  "message": "Lead converted to customer",
  "customerId": "clxxx...",
  "customerName": "John Doe"
}
```

### 8. Chat Logs (Lead)

#### ดึง Chat Logs

```
GET /api/leads/{id}/chat-logs
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 0 (ทั้งหมด) | จำนวนต่อหน้า (0 = ดึงทั้งหมด) |
| page | number | 1 | หน้า (ใช้คู่กับ limit) |
| order | string | asc | `asc` = เก่าไปใหม่, `desc` = ใหม่ไปเก่า |

**ตัวอย่าง: ดึง 10 ข้อความล่าสุด**

```
GET /api/leads/{id}/chat-logs?limit=10&order=desc
```

**Response 200 (เมื่อระบุ limit):**

```json
{
  "logs": [...],
  "pagination": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 }
}
```

**Response 200 (ไม่ระบุ limit):** Array ของ chat logs ทั้งหมด

#### เพิ่ม Chat Log

```
POST /api/leads/{id}/chat-logs
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| channel | string | ใช่ | LINE, Facebook, Instagram, WhatsApp, Phone, Email, Walk-in, Other |
| senderName | string | ใช่ | ชื่อผู้ส่ง |
| message | string | ใช่ | ข้อความ |
| sentAt | string | ไม่ | เวลาส่ง ISO 8601 (default: now) |

#### ลบ Chat Log

```
DELETE /api/leads/{id}/chat-logs?logId=xxx
```

### 9. Comments (Lead)

#### ดึง Comments

```
GET /api/leads/{id}/comments
```

**Response 200:**

```json
[
  {
    "id": "clxxx...",
    "text": "ลูกค้าสนใจแพ็คเกจดำน้ำ",
    "createdAt": "2026-03-13T10:30:00Z",
    "updatedAt": "2026-03-13T10:30:00Z",
    "user": { "id": "...", "fullName": "John Admin", "avatarUrl": null }
  }
]
```

#### เพิ่ม Comment

```
POST /api/leads/{id}/comments
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | ใช่ | ข้อความ comment |

**Response 201:** Comment object (พร้อม user)

- บันทึกวันเวลาและผู้ submit อัตโนมัติ

#### แก้ไข Comment

```
PUT /api/leads/{id}/comments?commentId=xxx
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | ใช่ | ข้อความใหม่ |

- แก้ไขได้เฉพาะ comment ของตัวเอง (Super Admin แก้ไขได้ทุก comment)

#### ลบ Comment

```
DELETE /api/leads/{id}/comments?commentId=xxx
```

- ลบได้เฉพาะ comment ของตัวเอง (Super Admin ลบได้ทุก comment)

### 10. Extras (Lead)

ข้อมูลเพิ่มเติม: ที่อยู่, งาน, การศึกษา, ผู้ติดต่อฉุกเฉิน, การแพทย์, ดำน้ำ, โซเชียล

#### ดึง Extras ทั้งหมด

```
GET /api/leads/{id}/extras
```

**Response 200:**

```json
{
  "addresses": [...],
  "jobs": [...],
  "education": [...],
  "emergencyContacts": [...],
  "medical": [...],
  "diving": [...],
  "socials": [...]
}
```

#### เพิ่ม Extra

```
POST /api/leads/{id}/extras
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | ใช่ | addresses, jobs, education, emergencyContacts, medical, diving, socials |
| data | object | ใช่ | ข้อมูลตาม type |

**ตัวอย่าง:**

```json
{
  "type": "addresses",
  "data": { "street": "123/4", "city": "Bangkok", "postalCode": "10110", "country": "Thailand" }
}
```

#### แก้ไข Extra

```
PUT /api/leads/{id}/extras
```

| Field | Type | Required |
|-------|------|----------|
| type | string | ใช่ |
| recordId | string | ใช่ |
| data | object | ใช่ |

#### ลบ Extra

```
DELETE /api/leads/{id}/extras?type=addresses&recordId=xxx
```

### 11. Files (Lead)

#### อัปโหลดไฟล์

```
POST /api/leads/{id}/files
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | ใช่ | ไฟล์ที่ต้องการอัปโหลด |
| notes | string | ไม่ | หมายเหตุ |

#### ลบไฟล์

```
DELETE /api/leads/{id}/files?fileId=xxx
```

### 12. นำเข้า Leads (CSV)

```
POST /api/leads/import
Content-Type: multipart/form-data
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File (CSV) | ใช่ | ไฟล์ CSV |
| brandId | string | ไม่ | ใช้ activeBrand ถ้าไม่ส่ง |

**CSV columns:** externalId, titlePrefix, titlePrefixTh, firstName, firstNameTh, lastName, lastNameTh, nickname, sex, phone, email, source, stage, status, interest, birthDate, idCard, address, city, state, postalCode, country, notes

**Response 200:**

```json
{ "imported": 45, "skipped": 5 }
```

### 13. ส่งออก Leads (CSV)

```
GET /api/leads/export?brandId=xxx
```

Download ไฟล์ CSV ของ leads ทั้งหมด (รวม converted)

---

## Lead Stages API

> Super Admin only (POST, PUT, DELETE)

### ดูรายการ Stages

```
GET /api/lead-stages?brandId=xxx
```

จะสร้าง default stages อัตโนมัติถ้ายังไม่มี (Prospecting, Qualification, Proposal, Negotiation, Closed Won, Closed Lost)

### สร้าง Stage

```
POST /api/lead-stages
```

| Field | Type | Required |
|-------|------|----------|
| brandId | string | ใช่ |
| name | string | ใช่ |
| color | string | ไม่ (default: #6b7280) |

### แก้ไข Stages (Bulk)

```
PUT /api/lead-stages
```

| Field | Type | Required |
|-------|------|----------|
| stages | array | ใช่ |
| stages[].id | string | ใช่ |
| stages[].name | string | ไม่ |
| stages[].color | string | ไม่ |
| stages[].order | number | ไม่ |

### ลบ Stage

```
DELETE /api/lead-stages?id=xxx
```

ไม่สามารถลบได้ถ้ามี lead ใช้อยู่

---

## Customers API

### 1. รายการ Customers

```
GET /api/customers
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| search | string | — | ค้นหา name, firstName, lastName, email, phone, company |
| status | string | — | active, inactive, prospect |
| page | number | 1 | หน้า |
| limit | number | 20 | จำนวนต่อหน้า |

**Response 200:**

```json
{
  "customers": [...],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

### 2. สร้าง Customer

```
POST /api/customers
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | ไม่* | *ใช้ activeBrand ถ้าไม่ส่ง |
| name | string | **ใช่** | ชื่อลูกค้า |
| externalId | string | ไม่ | รหัสลูกค้าภายนอก (ป้องกันซ้ำ) |
| titlePrefix | string | ไม่ | คำนำหน้า |
| titlePrefixTh | string | ไม่ | คำนำหน้า (ไทย) |
| firstName | string | ไม่ | ชื่อ |
| firstNameTh | string | ไม่ | ชื่อ (ไทย) |
| lastName | string | ไม่ | นามสกุล |
| lastNameTh | string | ไม่ | นามสกุล (ไทย) |
| nickname | string | ไม่ | ชื่อเล่น |
| sex | string | ไม่ | male, female, other |
| email | string | ไม่ | อีเมล |
| phone | string | ไม่ | เบอร์โทร |
| source | string | ไม่ | แหล่งที่มา |
| stage | string | ไม่ | new, contacted, qualified, converted, lost |
| status | string | ไม่ | active (default), inactive, prospect |
| interest | string | ไม่ | ความสนใจ |
| birthDate | string | ไม่ | วันเกิด |
| idCard | string | ไม่ | เลขบัตร |
| customerAddress | string | ไม่ | ที่อยู่ (field หลัก) |
| address | string | ไม่ | ที่อยู่ |
| city | string | ไม่ | จังหวัด |
| state | string | ไม่ | รัฐ |
| postalCode | string | ไม่ | รหัสไปรษณีย์ |
| country | string | ไม่ | ประเทศ |
| company | string | ไม่ | บริษัท |
| tags | string[] | ไม่ | แท็ก |
| notes | string | ไม่ | หมายเหตุ |

**Response 201:** Customer object

### 3. ดู Customer รายละเอียด

```
GET /api/customers/{id}
```

**Response 200:** Customer พร้อม leads (10), tickets (10), deals (10), activities (50)

### 4. แก้ไข Customer

```
PUT /api/customers/{id}
```

ส่งเฉพาะ field ที่ต้องการแก้ (partial update) — field เดียวกับ POST + `assignedTo`

### 5. ลบ Customer

```
DELETE /api/customers/{id}
```

**Response 200:** `{ "success": true }`

### 6. Chat Logs (Customer)

#### ดึง Chat Logs

```
GET /api/customers/{id}/chat-logs
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 0 (ทั้งหมด) | จำนวนต่อหน้า (0 = ดึงทั้งหมด) |
| page | number | 1 | หน้า (ใช้คู่กับ limit) |
| order | string | asc | `asc` = เก่าไปใหม่, `desc` = ใหม่ไปเก่า |

**ตัวอย่าง: ดึง 10 ข้อความล่าสุด**

```
GET /api/customers/{id}/chat-logs?limit=10&order=desc
```

**Response 200 (เมื่อระบุ limit):**

```json
{
  "logs": [...],
  "pagination": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 }
}
```

**Response 200 (ไม่ระบุ limit):** Array ของ chat logs ทั้งหมด

#### เพิ่ม Chat Log

```
POST /api/customers/{id}/chat-logs
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| channel | string | ใช่ | LINE, Facebook, Instagram, WhatsApp, Phone, Email, Walk-in, Other |
| senderName | string | ใช่ | ชื่อผู้ส่ง |
| message | string | ใช่ | ข้อความ |
| sentAt | string | ไม่ | เวลาส่ง ISO 8601 |

#### ลบ Chat Log

```
DELETE /api/customers/{id}/chat-logs?logId=xxx
```

### 7. Comments (Customer)

#### ดึง Comments

```
GET /api/customers/{id}/comments
```

**Response 200:**

```json
[
  {
    "id": "clxxx...",
    "text": "ลูกค้า VIP ดูแลพิเศษ",
    "createdAt": "2026-03-13T10:30:00Z",
    "updatedAt": "2026-03-13T10:30:00Z",
    "user": { "id": "...", "fullName": "John Admin", "avatarUrl": null }
  }
]
```

#### เพิ่ม Comment

```
POST /api/customers/{id}/comments
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | ใช่ | ข้อความ comment |

**Response 201:** Comment object (พร้อม user)

- บันทึกวันเวลาและผู้ submit อัตโนมัติ

#### แก้ไข Comment

```
PUT /api/customers/{id}/comments?commentId=xxx
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| text | string | ใช่ | ข้อความใหม่ |

- แก้ไขได้เฉพาะ comment ของตัวเอง (Super Admin แก้ไขได้ทุก comment)

#### ลบ Comment

```
DELETE /api/customers/{id}/comments?commentId=xxx
```

- ลบได้เฉพาะ comment ของตัวเอง (Super Admin ลบได้ทุก comment)

### 8. Extras (Customer)

เหมือนกับ Lead Extras — รองรับ type: addresses, jobs, education, emergencyContacts, medical, diving, socials

```
GET    /api/customers/{id}/extras
POST   /api/customers/{id}/extras        — { "type": "addresses", "data": {...} }
PUT    /api/customers/{id}/extras        — { "type": "addresses", "recordId": "xxx", "data": {...} }
DELETE /api/customers/{id}/extras?type=addresses&recordId=xxx
```

### 9. Files (Customer)

#### อัปโหลดไฟล์

```
POST /api/customers/{id}/files
Content-Type: multipart/form-data
```

| Field | Type | Required |
|-------|------|----------|
| file | File | ใช่ |
| notes | string | ไม่ |

#### ลบไฟล์

```
DELETE /api/customers/{id}/files?fileId=xxx
```

### 10. Rewards (Customer)

#### ดูคะแนนสะสม

```
GET /api/customers/{id}/rewards
```

**Response 200:**

```json
{
  "rewards": [...],
  "totalVouchers": 5,
  "totalPoints": 1200
}
```

#### เพิ่มคะแนน

```
POST /api/customers/{id}/rewards
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | ใช่ | point, voucher |
| amount | number | ใช่ | จำนวน |
| notes | string | ไม่ | หมายเหตุ |

### 11. Vouchers (Customer)

#### ดู Vouchers ที่ assign ให้ลูกค้า

```
GET /api/customers/{id}/vouchers
```

#### Assign Voucher

```
POST /api/customers/{id}/vouchers
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| voucherId | string | ใช่ | Voucher ID |
| quantity | number | ไม่ | จำนวน (default: 1) |
| notes | string | ไม่ | หมายเหตุ |

#### แก้ไข Customer Voucher

```
PUT /api/customers/{id}/vouchers?recordId=xxx
```

| Field | Type | Description |
|-------|------|-------------|
| quantity | number | จำนวนใหม่ |
| status | string | assigned, used, expired (ถ้า "used" จะ set usedAt) |

#### ลบ Customer Voucher

```
DELETE /api/customers/{id}/vouchers?recordId=xxx
```

### 12. Campaigns ของ Customer

```
GET /api/customers/{id}/campaigns
```

แสดง campaigns ที่ลูกค้าเป็นสมาชิก พร้อม campaign info, stage, addedBy

### 13. Deals ของ Customer

```
GET /api/customers/{id}/deals
```

แสดง deals ที่ผูกกับลูกค้า พร้อม lead, openedBy, closedBy

### 14. นำเข้า Customers (CSV)

```
POST /api/customers/import
Content-Type: multipart/form-data
```

| Field | Type | Required |
|-------|------|----------|
| file | File (CSV) | ใช่ |
| brandId | string | ไม่ |

**CSV columns:** externalId, name, titlePrefix, titlePrefixTh, firstName, firstNameTh, lastName, lastNameTh, nickname, sex, email, phone, company, source, stage, status, interest, birthDate, idCard, address, city, state, postalCode, country, tags (คั่นด้วย ;), notes

**Response 200:** `{ "imported": 45, "skipped": 5 }`

### 15. ส่งออก Customers (CSV)

```
GET /api/customers/export?brandId=xxx
```

Download ไฟล์ CSV ของ customers ทั้งหมด

---

## Deals API

### 1. รายการ Deals

```
GET /api/deals
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| stage | string | — | proposal, negotiation, contract, closed_won, closed_lost |
| search | string | — | ค้นหา title, customer name, lead title |
| page | number | 1 | หน้า |
| limit | number | 50 | จำนวนต่อหน้า |

**Response 200:**

```json
{
  "deals": [
    {
      "id": "...",
      "title": "Website Project",
      "value": 150000,
      "stage": "proposal",
      "probability": 50,
      "expectedCloseDate": "2026-06-01T00:00:00Z",
      "customer": { "id": "...", "name": "..." },
      "lead": { "id": "...", "title": "..." },
      "openedBy": { "id": "...", "fullName": "..." },
      "closedBy": null,
      "openedAt": "...",
      "closedAt": null
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 25, "totalPages": 1 }
}
```

### 2. สร้าง Deal

```
POST /api/deals
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | ไม่* | *ใช้ activeBrand ถ้าไม่ส่ง |
| title | string | **ใช่** | ชื่อ Deal |
| value | number | **ใช่** | มูลค่า |
| stage | string | ไม่ | proposal (default), negotiation, contract, closed_won, closed_lost |
| probability | number | ไม่ | ความน่าจะเป็น 0-100 (default: 50) |
| expectedCloseDate | string | ไม่ | วันที่คาดว่าจะปิด |
| leadId | string | ไม่ | ผูกกับ Lead |
| customerId | string | ไม่ | ผูกกับ Customer |
| notes | string | ไม่ | หมายเหตุ |

**Response 201:** Deal object

### 3. ดู Deal รายละเอียด

```
GET /api/deals/{id}
```

**Response 200:** Deal พร้อม customer, lead (รวม assignedTo), openedBy, closedBy

### 4. แก้ไข Deal

```
PUT /api/deals/{id}
```

ส่งเฉพาะ field ที่ต้องการแก้ — field เดียวกับ POST

**Business logic:**
- เปลี่ยน stage เป็น `closed_won` หรือ `closed_lost` → ระบบจะ set `closedAt` และ `closedById` อัตโนมัติ
- เปลี่ยนจาก closed กลับเป็น open stage → ระบบจะ clear `closedAt` และ `closedById`

### 5. ลบ Deal

```
DELETE /api/deals/{id}
```

**Response 200:** `{ "success": true }`

---

## Activities API

### ดูรายการ Activities

```
GET /api/activities
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| entityType | string | — | customer, lead, deal, ticket |
| entityId | string | — | ID ของ entity |
| limit | number | 50 | จำนวน |

### สร้าง Activity

```
POST /api/activities
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | ไม่* | *ใช้ activeBrand ถ้าไม่ส่ง |
| entityType | string | **ใช่** | customer, lead, deal, ticket |
| entityId | string | **ใช่** | ID ของ entity |
| type | string | **ใช่** | note, call, email, meeting, status_change, assignment |
| title | string | **ใช่** | หัวข้อ |
| description | string | ไม่ | รายละเอียด |
| metadata | object | ไม่ | ข้อมูลเพิ่มเติม |

**Response 201:** Activity object

---

## Dashboard API

```
GET /api/dashboard?brandId=xxx
```

Super Admin สามารถไม่ส่ง `brandId` เพื่อดู global stats

**Response 200:**

```json
{
  "stats": {
    "totalCustomers": 150,
    "activeLeads": 45,
    "totalDeals": 30,
    "openDeals": 18,
    "totalVouchers": 20,
    "activeVouchers": 15,
    "totalCampaigns": 8,
    "activeCampaigns": 3,
    "totalRevenue": 5000000,
    "wonRevenue": 2500000,
    "totalVoucherUsed": 42
  },
  "dealsByStage": [
    { "stage": "proposal", "_count": 5, "_sum": { "value": 500000 } }
  ],
  "leadsByStage": [
    { "stage": "clxxx...", "_count": { "_all": 10 } }
  ],
  "monthlyTrend": [...],
  "recentActivities": [...]
}
```

---

## Comments API

Comments สามารถเพิ่มได้ทั้งใน Lead และ Customer — บันทึกวันเวลาและผู้ submit อัตโนมัติ

### Permissions

| Permission | Description |
|------------|-------------|
| `comments:read` | ดู comments |
| `comments:write` | เพิ่ม/แก้ไข comments |
| `comments:delete` | ลบ comments |

- แก้ไข/ลบได้เฉพาะ comment ของตัวเอง
- Super Admin แก้ไข/ลบได้ทุก comment
- Role **Admin** ได้ทุก permission อัตโนมัติ
- Role **Sales** ได้ `comments:read` + `comments:write` อัตโนมัติ
- จัดการ permission ได้ที่หน้า Management > Roles

### Endpoints

| Endpoint | GET | POST | PUT | DELETE |
|----------|-----|------|-----|--------|
| `/api/leads/{id}/comments` | ดึง | เพิ่ม | แก้ไข (`?commentId=`) | ลบ (`?commentId=`) |
| `/api/customers/{id}/comments` | ดึง | เพิ่ม | แก้ไข (`?commentId=`) | ลบ (`?commentId=`) |

---

## Sources API

### ดูรายการ Sources

```
GET /api/sources?active=true
```

| Parameter | Type | Description |
|-----------|------|-------------|
| active | string | "true" = เฉพาะ active |

### สร้าง Source (Super Admin)

```
POST /api/sources
```

| Field | Type | Required |
|-------|------|----------|
| name | string | ใช่ |
| isActive | boolean | ไม่ (default: true) |

### แก้ไข Source (Super Admin)

```
PUT /api/sources/{id}
```

| Field | Type |
|-------|------|
| name | string |
| isActive | boolean |

### ลบ Source (Super Admin)

```
DELETE /api/sources/{id}
```

---

## Brands API

> Super Admin only

### ดูรายการ Brands

```
GET /api/brands
```

**Response 200:**

```json
[
  {
    "id": "clxxx...",
    "name": "My Brand",
    "logoUrl": null,
    "domain": null,
    "isActive": true,
    "createdAt": "...",
    "_count": { "userBrands": 5, "customers": 120, "leads": 80 }
  }
]
```

### สร้าง Brand

```
POST /api/brands
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | **ใช่** | ชื่อ Brand (1-100 ตัวอักษร) |
| logoUrl | string | ไม่ | URL ของโลโก้ |
| domain | string | ไม่ | โดเมน |
| settings | object | ไม่ | ตั้งค่าเพิ่มเติม |

สร้าง Brand พร้อม Roles เริ่มต้น: Admin, Sales, Marketing, Support

**Response 201:** Brand object

### ดู Brand รายละเอียด

```
GET /api/brands/{id}
```

**Response 200:** Brand พร้อม roles และ userBrands

### แก้ไข Brand

```
PUT /api/brands/{id}
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | ชื่อใหม่ |
| logoUrl | string | URL โลโก้ |
| domain | string | โดเมน |
| settings | object | ตั้งค่า |
| isActive | boolean | เปิด/ปิด |

### ลบ Brand

```
DELETE /api/brands/{id}
```

**Response 200:** `{ "success": true }`

### ดู Brands พร้อม Roles (สำหรับ dropdown)

```
GET /api/brands/with-roles
```

---

## Campaigns API

### 1. รายการ Campaigns

```
GET /api/campaigns
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| search | string | — | ค้นหาชื่อ, subject |
| status | string | — | draft, scheduled, running, completed, paused |
| type | string | — | email, sms, social, event, custom |
| page | number | 1 | หน้า |
| limit | number | 20 | จำนวนต่อหน้า |

**Response 200:**

```json
{
  "campaigns": [
    {
      "id": "...",
      "name": "Summer Sale 2026",
      "type": "email",
      "status": "running",
      "subject": "โปรโมชั่นพิเศษ",
      "startDate": "2026-06-01",
      "endDate": "2026-06-30",
      "budget": 50000,
      "createdBy": { "id": "...", "fullName": "Admin" },
      "_count": { "members": 120, "stages": 5 },
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "totalPages": 1 }
}
```

### 2. สร้าง Campaign

```
POST /api/campaigns
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | ไม่* | *ใช้ activeBrand ถ้าไม่ส่ง |
| name | string | **ใช่** | ชื่อ Campaign |
| type | string | ไม่ | email, sms, social, event, custom (default: custom) |
| status | string | ไม่ | draft (default), scheduled, running, completed, paused |
| subject | string | ไม่ | หัวข้อ |
| content | string | ไม่ | เนื้อหา |
| targetSegment | object | ไม่ | กลุ่มเป้าหมาย |
| budget | number | ไม่ | งบประมาณ |
| startDate | string | ไม่ | วันเริ่ม |
| endDate | string | ไม่ | วันสิ้นสุด |
| scheduledAt | string | ไม่ | เวลา schedule (ISO 8601) |

สร้าง Campaign พร้อม default stages ตาม type:
- **email:** Targeted → Sent → Opened → Clicked → Converted
- **sms:** Targeted → Sent → Responded → Converted
- **social:** Targeted → Reached → Engaged → Converted
- **event:** Invited → Registered → Attended → Follow-up → Converted
- **custom:** New → In Progress → Completed

**Response 201:** Campaign object

### 3. ดู Campaign รายละเอียด

```
GET /api/campaigns/{id}
```

**Response 200:** Campaign พร้อม createdBy, member count, stage count

### 4. แก้ไข Campaign

```
PUT /api/campaigns/{id}
```

ส่งเฉพาะ field ที่ต้องการแก้ (partial update)

### 5. ลบ Campaign

```
DELETE /api/campaigns/{id}
```

**Response 200:** `{ "success": true }`

### 6. Campaign Members

#### ดูรายการสมาชิก

```
GET /api/campaigns/{id}/members?search=xxx&stageId=xxx&type=lead
```

| Parameter | Type | Description |
|-----------|------|-------------|
| search | string | ค้นหาชื่อ, email, phone |
| stageId | string | กรองตาม stage (ใช้ `__none__` สำหรับไม่มี stage) |
| type | string | `lead` หรือ `customer` |

**Response 200:**

```json
{
  "members": [
    {
      "id": "...",
      "customer": { "id": "...", "name": "...", "email": "...", "phone": "..." },
      "lead": null,
      "stage": { "id": "...", "name": "Sent", "color": "#..." },
      "addedBy": { "id": "...", "fullName": "Admin" },
      "_count": { "checklists": 2, "comments": 3, "attachments": 1 }
    }
  ]
}
```

#### เพิ่มสมาชิก

```
POST /api/campaigns/{id}/members
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| customerIds | string[] | ไม่ | รายการ Customer IDs |
| leadIds | string[] | ไม่ | รายการ Lead IDs |
| stageId | string | ไม่ | Stage เริ่มต้น |

**Response 201:** `{ "added": 5, "skipped": 2 }`

#### แก้ไขสมาชิก

```
PUT /api/campaigns/{id}/members?memberId=xxx
```

| Field | Type | Description |
|-------|------|-------------|
| stageId | string | เปลี่ยน stage |
| status | string | เปลี่ยนสถานะ |
| notes | string | หมายเหตุ |
| description | string | คำอธิบาย |
| priority | string | ความสำคัญ |
| dueDate | string | วันกำหนด |
| labels | string[] | ป้ายกำกับ |

#### ลบสมาชิก

```
DELETE /api/campaigns/{id}/members?memberId=xxx
```

### 7. Campaign Stages

```
GET    /api/campaigns/{id}/stages
POST   /api/campaigns/{id}/stages           — { "name": "Stage Name", "color": "#hex" }
PUT    /api/campaigns/{id}/stages           — { "stages": [{ "id": "...", "order": 0, "name": "..." }] }
DELETE /api/campaigns/{id}/stages?stageId=xxx
```

### 8. Campaign Member Details

```
GET /api/campaigns/{id}/members/{memberId}
```

#### Member Checklists

```
POST   /api/campaigns/{id}/members/{memberId}/checklists   — { "label": "ส่ง email", "checked": false }
PUT    /api/campaigns/{id}/members/{memberId}/checklists   — { "itemId": "xxx", "checked": true }
DELETE /api/campaigns/{id}/members/{memberId}/checklists?itemId=xxx
```

#### Member Comments

```
POST   /api/campaigns/{id}/members/{memberId}/comments   — { "text": "ลูกค้าตอบรับ" }
DELETE /api/campaigns/{id}/members/{memberId}/comments?commentId=xxx
```

#### Member Attachments

```
POST   /api/campaigns/{id}/members/{memberId}/attachments   — FormData: file
DELETE /api/campaigns/{id}/members/{memberId}/attachments?attachmentId=xxx
```

### 9. นำเข้าสมาชิก (CSV)

```
POST /api/campaigns/{id}/members/import
Content-Type: multipart/form-data
```

---

## Tickets API

### 1. รายการ Tickets

```
GET /api/tickets
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| search | string | — | ค้นหา subject |
| status | string | — | open, in_progress, waiting, resolved, closed |
| priority | string | — | low, medium, high, urgent |
| page | number | 1 | หน้า |
| limit | number | 20 | จำนวนต่อหน้า |

**Response 200:**

```json
{
  "tickets": [
    {
      "id": "...",
      "subject": "ปัญหาการชำระเงิน",
      "description": "...",
      "priority": "high",
      "status": "open",
      "category": "billing",
      "customer": { "id": "...", "name": "..." },
      "assignee": { "id": "...", "fullName": "..." },
      "createdAt": "..."
    }
  ],
  "counts": { "open": 5, "in_progress": 3, "waiting": 2, "resolved": 10 },
  "pagination": { "page": 1, "limit": 20, "total": 20, "totalPages": 1 }
}
```

### 2. สร้าง Ticket

```
POST /api/tickets
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | ไม่* | *ใช้ activeBrand ถ้าไม่ส่ง |
| subject | string | **ใช่** | หัวข้อ |
| description | string | ไม่ | รายละเอียด |
| priority | string | ไม่ | low, medium (default), high, urgent |
| status | string | ไม่ | open (default), in_progress, waiting, resolved, closed |
| category | string | ไม่ | หมวดหมู่ |
| customerId | string | ไม่ | ผูกกับ Customer |
| assigneeId | string | ไม่ | ผู้รับผิดชอบ |

**Response 201:** Ticket object

### 3. ดู Ticket รายละเอียด

```
GET /api/tickets/{id}
```

### 4. แก้ไข Ticket

```
PUT /api/tickets/{id}
```

ส่งเฉพาะ field ที่ต้องการแก้ — field เดียวกับ POST

### 5. ลบ Ticket

```
DELETE /api/tickets/{id}
```

**Response 200:** `{ "success": true }`

---

## Vouchers API

### 1. รายการ Vouchers

```
GET /api/vouchers
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| search | string | — | ค้นหาชื่อ, code, description |
| status | string | — | active, inactive |
| type | string | — | fixed_amount, percentage, free_item |
| page | number | 1 | หน้า |
| limit | number | 20 | จำนวนต่อหน้า |

**Response 200:**

```json
{
  "vouchers": [
    {
      "id": "...",
      "name": "ส่วนลด 10%",
      "code": "SAVE10",
      "type": "percentage",
      "value": 10,
      "status": "active",
      "usageLimit": 100,
      "usedCount": 42,
      "startDate": "2026-01-01",
      "expiryDate": "2026-12-31",
      "createdBy": { "id": "...", "fullName": "Admin" },
      "_count": { "customerVouchers": 50 }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 }
}
```

### 2. สร้าง Voucher

```
POST /api/vouchers
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | ไม่* | *ใช้ activeBrand ถ้าไม่ส่ง |
| name | string | **ใช่** | ชื่อ Voucher |
| code | string | ไม่ | รหัส Voucher |
| type | string | ไม่ | fixed_amount (default), percentage, free_item |
| value | number | ไม่ | มูลค่า/เปอร์เซ็นต์ |
| description | string | ไม่ | คำอธิบาย |
| minPurchase | number | ไม่ | ยอดซื้อขั้นต่ำ |
| maxDiscount | number | ไม่ | ส่วนลดสูงสุด |
| usageLimit | number | ไม่ | จำนวนครั้งที่ใช้ได้ |
| startDate | string | ไม่ | วันเริ่ม |
| expiryDate | string | ไม่ | วันหมดอายุ |
| status | string | ไม่ | active (default), inactive |

**Response 201:** Voucher object

### 3. ดู Voucher รายละเอียด

```
GET /api/vouchers/{id}
```

**Response 200:** Voucher พร้อม customerVouchers

### 4. แก้ไข Voucher

```
PUT /api/vouchers/{id}
```

ส่งเฉพาะ field ที่ต้องการแก้

### 5. ลบ Voucher

```
DELETE /api/vouchers/{id}
```

**Response 200:** `{ "success": true }`

### 6. Voucher Files

```
GET    /api/vouchers/{id}/files
POST   /api/vouchers/{id}/files        — FormData: file
DELETE /api/vouchers/{id}/files?fileId=xxx
```

---

## Users API

> Super Admin only

### ดูรายการ Users

```
GET /api/users
```

**Response 200:**

```json
[
  {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "System Admin",
    "isSuperAdmin": true,
    "isActive": true,
    "avatarUrl": null,
    "createdAt": "...",
    "userBrands": [
      {
        "brand": { "id": "...", "name": "My Brand" },
        "role": { "id": "...", "name": "Admin" }
      }
    ]
  }
]
```

### สร้าง User

```
POST /api/users
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | **ใช่** | Username (3+ ตัวอักษร) |
| email | string | ไม่ | อีเมล |
| password | string | **ใช่** | รหัสผ่าน (8+ ตัวอักษร) |
| fullName | string | **ใช่** | ชื่อเต็ม |
| isSuperAdmin | boolean | ไม่ | เป็น Super Admin หรือไม่ (default: false) |

**Response 201:**

```json
{ "id": "...", "username": "newuser", "fullName": "New User" }
```

### แก้ไข User

```
PUT /api/users/{id}
```

| Field | Type | Description |
|-------|------|-------------|
| fullName | string | ชื่อเต็ม |
| username | string | Username |
| email | string | อีเมล |
| password | string | รหัสผ่านใหม่ |
| isActive | boolean | เปิด/ปิดผู้ใช้ |
| isSuperAdmin | boolean | Super Admin |

### ลบ User

```
DELETE /api/users/{id}
```

**Response 200:** `{ "success": true }`

### Assign User เข้า Brand

```
POST /api/users/{id}/brands
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | **ใช่** | Brand ID |
| roleId | string | **ใช่** | Role ID |

**Response 201:** UserBrand object

### ถอด User ออกจาก Brand

```
DELETE /api/users/{id}/brands?brandId=xxx
```

---

## Roles API

### ดูรายการ Roles

```
GET /api/roles?brandId=xxx
```

**Response 200:**

```json
[
  {
    "id": "...",
    "name": "Admin",
    "description": "Full access to all features",
    "isDefault": true,
    "rolePermissions": [
      { "permission": { "id": "...", "resource": "leads", "action": "read" } }
    ],
    "_count": { "userBrands": 3 }
  }
]
```

### สร้าง Role (Super Admin)

```
POST /api/roles
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| brandId | string | **ใช่** | Brand ID |
| name | string | **ใช่** | ชื่อ Role |
| description | string | ไม่ | คำอธิบาย |
| permissions | string[] | ไม่ | รายการ permission เช่น `["leads:read", "leads:write"]` |

**Response 201:** Role object พร้อม permissions

### แก้ไข Role (Super Admin)

```
PUT /api/roles/{id}
```

| Field | Type | Description |
|-------|------|-------------|
| name | string | ชื่อใหม่ |
| description | string | คำอธิบาย |
| permissions | string[] | รายการ permission ใหม่ |

### ลบ Role (Super Admin)

```
DELETE /api/roles/{id}
```

### รายการ Permissions ทั้งหมด

| Resource | Actions |
|----------|---------|
| leads | read, write, delete |
| customers | read, write, delete |
| deals | read, write, delete |
| tickets | read, write, delete |
| campaigns | read, write, delete |
| reports | read |
| comments | read, write, delete |

---

## Notifications API

### ดูรายการ Notifications

```
GET /api/notifications
```

**Response 200:**

```json
{
  "notifications": [
    {
      "id": "...",
      "type": "lead_assigned",
      "title": "Lead ใหม่ถูก assign ให้คุณ",
      "message": "Lead 'สมชาย ใจดี' ถูก assign ให้คุณแล้ว",
      "link": "/leads",
      "isRead": false,
      "createdAt": "..."
    }
  ],
  "unreadCount": 3
}
```

### Actions (Mark Read)

```
POST /api/notifications
```

#### อ่านแจ้งเตือนรายการเดียว

```json
{ "action": "markRead", "id": "NOTIFICATION_ID" }
```

#### อ่านทั้งหมด

```json
{ "action": "markAllRead" }
```

#### สร้าง Notification ใหม่

```json
{
  "userId": "TARGET_USER_ID",
  "brandId": "BRAND_ID",
  "type": "custom",
  "title": "หัวข้อ",
  "message": "ข้อความ",
  "link": "/leads/xxx"
}
```

### แก้ไข Notification

```
PUT /api/notifications/{id}
```

### ลบ Notification

```
DELETE /api/notifications/{id}
```

---

## Reports API

```
GET /api/reports?brandId=xxx&type=sales&dateFrom=2026-01-01&dateTo=2026-12-31
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| brandId | string | activeBrand | Brand ID |
| type | string | sales | ประเภทรายงาน (ดูด้านล่าง) |
| dateFrom | string | — | วันเริ่ม (YYYY-MM-DD) |
| dateTo | string | — | วันสิ้นสุด (YYYY-MM-DD) |

### ประเภทรายงาน

#### 1. Sales Report (`type=sales`)

```json
{
  "type": "sales",
  "summary": {
    "totalRevenue": 5000000,
    "closedWonRevenue": 2500000,
    "dealCount": 30,
    "openDeals": 12,
    "closedWon": 10,
    "closedLost": 8,
    "avgDealSize": 166666.67,
    "winRate": 55.6
  },
  "monthly": [{ "month": "2026-01", "count": 5, "value": 500000 }],
  "dealsByStage": [{ "stage": "Proposal", "count": 5, "value": 500000 }]
}
```

#### 2. Customers Report (`type=customers`)

```json
{
  "type": "customers",
  "summary": { "totalCount": 150 },
  "monthly": [{ "month": "2026-01", "count": 12, "value": 0 }],
  "statusBreakdown": [{ "status": "Active", "count": 120 }],
  "sourceBreakdown": [{ "source": "Facebook", "count": 45 }],
  "stageBreakdown": [{ "stage": "New", "count": 30 }]
}
```

#### 3. Leads Report (`type=leads`)

```json
{
  "type": "leads",
  "summary": {
    "totalLeads": 80,
    "closedWon": 15,
    "qualified": 30,
    "conversionRate": 18.8,
    "qualificationRate": 37.5
  },
  "monthly": [...],
  "stageBreakdown": [...],
  "sourceBreakdown": [...]
}
```

#### 4. Vouchers Report (`type=vouchers`)

```json
{
  "type": "vouchers",
  "summary": {
    "totalVouchers": 20,
    "activeVouchers": 15,
    "totalAssigned": 200,
    "totalUsed": 42,
    "totalValue": 50000
  },
  "monthly": [...],
  "assignmentMonthly": [...],
  "statusBreakdown": [...],
  "typeBreakdown": [...]
}
```

#### 5. Campaigns Report (`type=campaigns`)

```json
{
  "type": "campaigns",
  "summary": {
    "totalCampaigns": 8,
    "activeCampaigns": 3,
    "totalMembers": 500
  },
  "monthly": [...],
  "statusBreakdown": [...],
  "typeBreakdown": [...],
  "membersByVia": [{ "via": "Add", "count": 300 }],
  "topCampaigns": [{ "name": "Summer Sale", "members": 120, "status": "running" }]
}
```

---

## รหัสข้อผิดพลาด

| Status | ความหมาย |
|--------|----------|
| 200 | สำเร็จ |
| 201 | สร้างสำเร็จ |
| 400 | ข้อมูลไม่ถูกต้อง (Bad Request) |
| 401 | ไม่ได้ล็อกอิน / API key ไม่ถูกต้อง |
| 403 | ไม่มีสิทธิ์ (Forbidden) |
| 404 | ไม่พบข้อมูล (Not Found) |
| 409 | ขัดแย้ง (Conflict) เช่น ข้อมูลซ้ำ |
| 500 | ข้อผิดพลาดเซิร์ฟเวอร์ |

---

## สรุป API ทั้งหมด

### Leads & Lead Stages

| Endpoint | GET | POST | PUT | DELETE | หมายเหตุ |
|----------|-----|------|-----|--------|----------|
| `/api/leads` | รายการ | สร้าง | — | — | |
| `/api/leads/{id}` | รายละเอียด | — | แก้ไข | ลบ | |
| `/api/leads/{id}/convert` | — | แปลงเป็น Customer | — | — | |
| `/api/leads/{id}/comments` | ดึง | เพิ่ม | แก้ไข | ลบ | owner / Super Admin |
| `/api/leads/{id}/chat-logs` | ดึง | เพิ่ม | — | ลบ | |
| `/api/leads/{id}/extras` | ดึง | เพิ่ม | แก้ไข | ลบ | |
| `/api/leads/{id}/files` | — | อัปโหลด | — | ลบ | multipart/form-data |
| `/api/leads/pipeline` | Kanban | — | — | — | |
| `/api/leads/import` | — | นำเข้า CSV | — | — | multipart/form-data |
| `/api/leads/export` | ส่งออก CSV | — | — | — | |
| `/api/lead-stages` | รายการ | สร้าง | แก้ไข (bulk) | ลบ | Super Admin |

### Customers

| Endpoint | GET | POST | PUT | DELETE | หมายเหตุ |
|----------|-----|------|-----|--------|----------|
| `/api/customers` | รายการ | สร้าง | — | — | |
| `/api/customers/{id}` | รายละเอียด | — | แก้ไข | ลบ | |
| `/api/customers/{id}/comments` | ดึง | เพิ่ม | แก้ไข | ลบ | owner / Super Admin |
| `/api/customers/{id}/chat-logs` | ดึง | เพิ่ม | — | ลบ | |
| `/api/customers/{id}/extras` | ดึง | เพิ่ม | แก้ไข | ลบ | |
| `/api/customers/{id}/files` | — | อัปโหลด | — | ลบ | multipart/form-data |
| `/api/customers/{id}/rewards` | ดูสะสม | เพิ่มคะแนน | — | — | |
| `/api/customers/{id}/vouchers` | ดู | Assign | แก้ไข | ลบ | |
| `/api/customers/{id}/campaigns` | ดู | — | — | — | |
| `/api/customers/{id}/deals` | ดู | — | — | — | |
| `/api/customers/import` | — | นำเข้า CSV | — | — | multipart/form-data |
| `/api/customers/export` | ส่งออก CSV | — | — | — | |

### Deals & Activities

| Endpoint | GET | POST | PUT | DELETE | หมายเหตุ |
|----------|-----|------|-----|--------|----------|
| `/api/deals` | รายการ | สร้าง | — | — | |
| `/api/deals/{id}` | รายละเอียด | — | แก้ไข | ลบ | auto close logic |
| `/api/activities` | รายการ | สร้าง | — | — | |

### Campaigns

| Endpoint | GET | POST | PUT | DELETE | หมายเหตุ |
|----------|-----|------|-----|--------|----------|
| `/api/campaigns` | รายการ | สร้าง | — | — | |
| `/api/campaigns/{id}` | รายละเอียด | — | แก้ไข | ลบ | |
| `/api/campaigns/{id}/members` | ดูสมาชิก | เพิ่มสมาชิก | แก้ไขสมาชิก | ลบสมาชิก | |
| `/api/campaigns/{id}/members/{mId}` | รายละเอียด | — | — | — | |
| `/api/campaigns/{id}/members/{mId}/checklists` | — | เพิ่ม | แก้ไข | ลบ | |
| `/api/campaigns/{id}/members/{mId}/comments` | — | เพิ่ม | — | ลบ | |
| `/api/campaigns/{id}/members/{mId}/attachments` | — | อัปโหลด | — | ลบ | multipart/form-data |
| `/api/campaigns/{id}/members/import` | — | นำเข้า CSV | — | — | multipart/form-data |
| `/api/campaigns/{id}/stages` | ดู Stages | เพิ่ม | แก้ไข (bulk) | ลบ | |

### Tickets

| Endpoint | GET | POST | PUT | DELETE | หมายเหตุ |
|----------|-----|------|-----|--------|----------|
| `/api/tickets` | รายการ | สร้าง | — | — | |
| `/api/tickets/{id}` | รายละเอียด | — | แก้ไข | ลบ | |

### Vouchers

| Endpoint | GET | POST | PUT | DELETE | หมายเหตุ |
|----------|-----|------|-----|--------|----------|
| `/api/vouchers` | รายการ | สร้าง | — | — | |
| `/api/vouchers/{id}` | รายละเอียด | — | แก้ไข | ลบ | |
| `/api/vouchers/{id}/files` | ดูไฟล์ | อัปโหลด | — | ลบ | multipart/form-data |

### Management (Super Admin)

| Endpoint | GET | POST | PUT | DELETE | หมายเหตุ |
|----------|-----|------|-----|--------|----------|
| `/api/brands` | รายการ | สร้าง | — | — | Super Admin |
| `/api/brands/{id}` | รายละเอียด | — | แก้ไข | ลบ | Super Admin |
| `/api/brands/with-roles` | รายการ+Roles | — | — | — | Super Admin |
| `/api/users` | รายการ | สร้าง | — | — | Super Admin |
| `/api/users/{id}` | — | — | แก้ไข | ลบ | Super Admin |
| `/api/users/{id}/brands` | — | เพิ่ม Brand | — | ถอด Brand | Super Admin |
| `/api/roles` | รายการ | สร้าง | — | — | |
| `/api/roles/{id}` | รายละเอียด | — | แก้ไข | ลบ | Super Admin |
| `/api/sources` | รายการ | สร้าง | — | — | Super Admin |
| `/api/sources/{id}` | — | — | แก้ไข | ลบ | Super Admin |
| `/api/api-keys` | รายการ | สร้าง | — | — | Super Admin, Session only |
| `/api/api-keys/{id}` | รายละเอียด | — | แก้ไข | ลบ | Super Admin, Session only |

### Utilities

| Endpoint | GET | POST | PUT | DELETE | หมายเหตุ |
|----------|-----|------|-----|--------|----------|
| `/api/entities/check` | ตรวจซ้ำ | — | — | — | |
| `/api/dashboard` | สถิติ | — | — | — | |
| `/api/reports` | รายงาน | — | — | — | 5 ประเภท |
| `/api/notifications` | แจ้งเตือน | Actions/สร้าง | — | — | |
| `/api/notifications/{id}` | — | — | แก้ไข | ลบ | |

**รวมทั้งหมด: 58 route files, 130+ operations**

---

## ขั้นตอนแนะนำสำหรับ n8n / Agent

1. เรียก `GET /api/entities/check?externalId={รหัส}` ← brandId ไม่ต้องส่ง (ใช้จาก API key)
2. ถ้า `exists: true` → ใช้ข้อมูลที่มี หรืออัปเดตด้วย PUT
3. ถ้า `exists: false` → สร้างใหม่ด้วย `POST /api/leads` หรือ `POST /api/customers` พร้อม `externalId`
4. เพิ่ม Comment / Chat Log → `POST /api/leads/{id}/comments` หรือ `/chat-logs`
5. เมื่อ Lead พร้อม → `POST /api/leads/{id}/convert` เพื่อแปลงเป็น Customer
6. สร้าง Deal ด้วย `POST /api/deals` ผูกกับ Lead หรือ Customer
7. ดูรายงาน → `GET /api/reports?type=sales` (sales, customers, leads, vouchers, campaigns)
8. ดู Dashboard → `GET /api/dashboard`

### Flow ตัวอย่าง: รับ Lead จาก Facebook

```
1. Webhook รับข้อมูล → ได้ชื่อ, เบอร์, email
2. GET /api/entities/check?externalId=FB-12345
3. ถ้า exists=false:
   POST /api/leads { title: "ชื่อลูกค้า", phone: "08x", email: "...", externalId: "FB-12345", source: "Facebook" }
4. POST /api/leads/{id}/comments { text: "สนใจจากโฆษณา Facebook campaign X" }
5. POST /api/activities { entityType: "lead", entityId: "{id}", type: "note", title: "Lead from Facebook" }
```
