# CRM API Manual — Complete Reference

> Base URL: `https://your-crm-domain.com/api/...`

---

## สารบัญ

1. [Authentication](#authentication)
2. [API Keys Management](#api-keys-management)
3. [Entities — ตรวจสอบข้อมูลซ้ำ](#entities--ตรวจสอบข้อมูลซ้ำ)
4. [Leads API](#leads-api)
5. [Lead Stages API](#lead-stages-api)
6. [Customers API](#customers-api)
7. [Deals API](#deals-api)
8. [Activities API](#activities-api)
9. [Dashboard API](#dashboard-api)
10. [Sources API](#sources-api)
11. [รหัสข้อผิดพลาด](#รหัสข้อผิดพลาด)

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

### 9. Extras (Lead)

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

### 10. Files (Lead)

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

### 11. นำเข้า Leads (CSV)

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

### 12. ส่งออก Leads (CSV)

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

### 7. Extras (Customer)

เหมือนกับ Lead Extras — รองรับ type: addresses, jobs, education, emergencyContacts, medical, diving, socials

```
GET    /api/customers/{id}/extras
POST   /api/customers/{id}/extras        — { "type": "addresses", "data": {...} }
PUT    /api/customers/{id}/extras        — { "type": "addresses", "recordId": "xxx", "data": {...} }
DELETE /api/customers/{id}/extras?type=addresses&recordId=xxx
```

### 8. Files (Customer)

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

### 9. Rewards (Customer)

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

### 10. Vouchers (Customer)

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

### 11. Campaigns ของ Customer

```
GET /api/customers/{id}/campaigns
```

แสดง campaigns ที่ลูกค้าเป็นสมาชิก พร้อม campaign info, stage, addedBy

### 12. Deals ของ Customer

```
GET /api/customers/{id}/deals
```

แสดง deals ที่ผูกกับลูกค้า พร้อม lead, openedBy, closedBy

### 13. นำเข้า Customers (CSV)

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

### 14. ส่งออก Customers (CSV)

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

| Endpoint | GET | POST | PUT | DELETE | หมายเหตุ |
|----------|-----|------|-----|--------|----------|
| `/api/leads` | ✅ รายการ | ✅ สร้าง | — | — | |
| `/api/leads/{id}` | ✅ รายละเอียด | — | ✅ แก้ไข | ✅ ลบ | |
| `/api/leads/{id}/convert` | — | ✅ แปลงเป็น Customer | — | — | |
| `/api/leads/{id}/chat-logs` | ✅ ดึง | ✅ เพิ่ม | — | ✅ ลบ | |
| `/api/leads/{id}/extras` | ✅ ดึง | ✅ เพิ่ม | ✅ แก้ไข | ✅ ลบ | |
| `/api/leads/{id}/files` | — | ✅ อัปโหลด | — | ✅ ลบ | multipart/form-data |
| `/api/leads/pipeline` | ✅ Kanban | — | — | — | |
| `/api/leads/import` | — | ✅ นำเข้า CSV | — | — | multipart/form-data |
| `/api/leads/export` | ✅ ส่งออก CSV | — | — | — | |
| `/api/lead-stages` | ✅ รายการ | ✅ สร้าง | ✅ แก้ไข (bulk) | ✅ ลบ | Super Admin |
| `/api/customers` | ✅ รายการ | ✅ สร้าง | — | — | |
| `/api/customers/{id}` | ✅ รายละเอียด | — | ✅ แก้ไข | ✅ ลบ | |
| `/api/customers/{id}/chat-logs` | ✅ ดึง | ✅ เพิ่ม | — | ✅ ลบ | |
| `/api/customers/{id}/extras` | ✅ ดึง | ✅ เพิ่ม | ✅ แก้ไข | ✅ ลบ | |
| `/api/customers/{id}/files` | — | ✅ อัปโหลด | — | ✅ ลบ | multipart/form-data |
| `/api/customers/{id}/rewards` | ✅ ดูสะสม | ✅ เพิ่มคะแนน | — | — | |
| `/api/customers/{id}/vouchers` | ✅ ดู | ✅ Assign | ✅ แก้ไข | ✅ ลบ | |
| `/api/customers/{id}/campaigns` | ✅ ดู | — | — | — | |
| `/api/customers/{id}/deals` | ✅ ดู | — | — | — | |
| `/api/customers/import` | — | ✅ นำเข้า CSV | — | — | multipart/form-data |
| `/api/customers/export` | ✅ ส่งออก CSV | — | — | — | |
| `/api/deals` | ✅ รายการ | ✅ สร้าง | — | — | |
| `/api/deals/{id}` | ✅ รายละเอียด | — | ✅ แก้ไข | ✅ ลบ | auto close logic |
| `/api/activities` | ✅ รายการ | ✅ สร้าง | — | — | |
| `/api/dashboard` | ✅ สถิติ | — | — | — | |
| `/api/entities/check` | ✅ ตรวจซ้ำ | — | — | — | |
| `/api/sources` | ✅ รายการ | ✅ สร้าง | — | — | Super Admin |
| `/api/sources/{id}` | — | — | ✅ แก้ไข | ✅ ลบ | Super Admin |
| `/api/api-keys` | ✅ รายการ | ✅ สร้าง | — | — | Super Admin, Session only |
| `/api/api-keys/{id}` | ✅ รายละเอียด | — | ✅ แก้ไข | ✅ ลบ | Super Admin, Session only |

**รวมทั้งหมด: 30 endpoints, 72 operations**

---

## ขั้นตอนแนะนำสำหรับ n8n / Agent

1. เรียก `GET /api/entities/check?externalId={รหัส}&brandId={brandId}`
2. ถ้า `exists: true` → ใช้ข้อมูลที่มี หรืออัปเดตด้วย PUT
3. ถ้า `exists: false` → สร้างใหม่ด้วย `POST /api/leads` หรือ `POST /api/customers` พร้อม `externalId`
4. เมื่อ Lead พร้อม → `POST /api/leads/{id}/convert` เพื่อแปลงเป็น Customer
5. สร้าง Deal ด้วย `POST /api/deals` ผูกกับ Lead หรือ Customer
