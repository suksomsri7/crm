# CRM API สำหรับ Agent OpenCLaw

เอกสารนี้ออกแบบมาให้ Agent อ่านและเรียกใช้ API ได้ถูกต้อง

> Base URL: `{BASE_URL}/api/...`

---

## สรุป Endpoints ที่ใช้บ่อย

| # | Method | Endpoint | ใช้เมื่อ |
|---|--------|----------|----------|
| 1 | GET | /api/entities/check | ตรวจสอบก่อนเพิ่มข้อมูล (กันซ้ำ) |
| 2 | POST | /api/leads | สร้าง Lead ใหม่ |
| 3 | PUT | /api/leads/{id} | แก้ไข Lead |
| 4 | GET | /api/leads | ดึงรายการ Leads |
| 5 | GET | /api/leads/{id} | ดึงรายละเอียด Lead |
| 6 | POST | /api/customers | สร้าง Customer ใหม่ |
| 7 | PUT | /api/customers/{id} | แก้ไข Customer |
| 8 | GET | /api/customers | ดึงรายการ Customers |
| 9 | GET | /api/customers/{id} | ดึงรายละเอียด Customer |
| 10 | GET | /api/sources?active=true | ดึงรายการ Sources |
| 11 | POST | /api/leads/{id}/chat-logs | บันทึก log การสนทนา |
| 12 | POST | /api/customers/{id}/chat-logs | บันทึก log การสนทนา |

---

## ข้อกำหนดก่อนเรียก API

1. **Login ก่อน** - POST ไปที่ `/api/auth/callback/credentials` พร้อม `username` และ `password`
2. **เก็บ Cookie** - ใช้ `credentials: 'include'` ในทุก request
3. **brandId** - ต้องมี (จาก session หรือส่งใน request)

---

## 1. ตรวจสอบข้อมูลซ้ำ (ต้องเรียกก่อนเพิ่ม)

```http
GET {BASE}/api/entities/check?externalId={CUSTOMER_ID}&brandId={BRAND_ID}
```

**ตัวอย่าง:** `GET /api/entities/check?externalId=CUST-2025-001&brandId=clxxx`

**Response:**
```json
{
  "exists": true,
  "externalId": "CUST-2025-001",
  "brandId": "clxxx",
  "inLeads": true,
  "inCustomers": false,
  "lead": { "id": "...", "title": "...", "email": "...", "stage": "..." },
  "customer": null
}
```

- ถ้า `exists: false` → สามารถสร้าง Lead/Customer ใหม่ได้
- ถ้า `exists: true` → มีอยู่แล้ว ใช้ `lead.id` หรือ `customer.id` เพื่ออัปเดตแทน

---

## 2. สร้าง Lead

```http
POST {BASE}/api/leads
Content-Type: application/json
```

**Body (ตัวอย่าง):**
```json
{
  "brandId": "clxxx",
  "title": "สมชาย ใจดี",
  "externalId": "CUST-2025-001",
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "firstNameTh": "สมชาย",
  "lastNameTh": "ใจดี",
  "titlePrefixTh": "นาย",
  "phone": "0812345678",
  "email": "somchai@example.com",
  "source": "LINE",
  "stage": "prospecting",
  "interest": "ดำน้ำ",
  "notes": "ติดต่อผ่าน LINE"
}
```

**ฟิลด์สำคัญ:** `title` (บังคับ), `externalId` (แนะนำเพื่อกันซ้ำ)

**stage:** prospecting | qualification | proposal | negotiation | closed_won | closed_lost

---

## 3. สร้าง Customer

```http
POST {BASE}/api/customers
Content-Type: application/json
```

**Body (ตัวอย่าง):**
```json
{
  "brandId": "clxxx",
  "name": "สมชาย ใจดี",
  "externalId": "CUST-2025-001",
  "firstName": "สมชาย",
  "lastName": "ใจดี",
  "firstNameTh": "สมชาย",
  "lastNameTh": "ใจดี",
  "phone": "0812345678",
  "email": "somchai@example.com",
  "source": "LINE",
  "stage": "new",
  "status": "active"
}
```

**ฟิลด์สำคัญ:** `name` (บังคับ), `externalId` (แนะนำเพื่อกันซ้ำ)

**status:** active | inactive | prospect

---

## 4. แก้ไข Lead

```http
PUT {BASE}/api/leads/{LEAD_ID}
Content-Type: application/json
```

ส่งเฉพาะฟิลด์ที่ต้องการแก้ไข เช่น `{ "stage": "qualification", "notes": "อัปเดต" }`

---

## 5. แก้ไข Customer

```http
PUT {BASE}/api/customers/{CUSTOMER_ID}
Content-Type: application/json
```

ส่งเฉพาะฟิลด์ที่ต้องการแก้ไข

---

## 6. บันทึก Chat Log

```http
POST {BASE}/api/leads/{LEAD_ID}/chat-logs
Content-Type: application/json
```

**Body:**
```json
{
  "channel": "LINE",
  "senderName": "ลูกค้า",
  "message": "สวัสดีครับ สนใจคอร์สดำน้ำ",
  "sentAt": "2025-03-08T10:30:00.000Z"
}
```

**channel:** LINE | Facebook | Instagram | WhatsApp | WeChat | Telegram | Phone | Email | Walk-in | Other

---

## 7. ดึงรายการ Leads

```http
GET {BASE}/api/leads?brandId={BRAND_ID}&search={คำค้น}&stage={STAGE}&page=1&limit=50
```

---

## 8. ดึงรายการ Customers

```http
GET {BASE}/api/customers?brandId={BRAND_ID}&search={คำค้น}&status={STATUS}&page=1&limit=20
```

---

## Flow แนะนำสำหรับ Agent

```
1. รับข้อมูลลูกค้าใหม่ (มีรหัส เช่น CUST-001)
2. GET /api/entities/check?externalId=CUST-001&brandId=xxx
3a. ถ้า exists=false → POST /api/leads หรือ POST /api/customers (ส่ง externalId ด้วย)
3b. ถ้า exists=true และ inLeads → PUT /api/leads/{lead.id} เพื่ออัปเดต
3c. ถ้า exists=true และ inCustomers → PUT /api/customers/{customer.id} เพื่ออัปเดต
```

---

## รหัส Error

- **400** - ข้อมูลไม่ครบ/ผิดรูปแบบ
- **401** - ยังไม่ login
- **403** - ไม่มีสิทธิ์เข้าถึง brand
- **404** - ไม่พบ Lead/Customer
- **409** - ข้อมูลขัดแย้ง (เช่น แปลง Lead ซ้ำ)
